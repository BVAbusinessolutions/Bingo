import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { goLive, ADMIN, CLIENTE, DEMO_EVENT_ID, api, auth, login, newVerifiedClient, one, outbox, startApp, stopApp } from './helpers.js';

let admin;
before(async () => {
  await startApp();
  admin = (await login(...ADMIN)).token;
});
after(stopApp);

const draw = (path) => `/api/events/${DEMO_EVENT_ID}/draw${path}`;
const call = (number) => api().post(draw('/call')).set(auth(admin)).send({ number });

describe('paquete fijo: 2 cartones por ₡3 000, sin cartones sueltos', () => {
  let eventId;
  before(async () => {
    eventId = (
      await api()
        .post('/api/admin/events')
        .set(auth(admin))
        .send({ name: 'Bingo por paquetes', pattern: 'FULL', price: 1000, bundleSize: 1, startsAt: '2026-12-20T19:00:00-06:00' })
    ).body.id;
    const s = await api()
      .post('/api/admin/series/generate')
      .set(auth(admin))
      .send({ name: 'Serie paquetes', count: 10, startSerial: 6001 });
    await api().post(`/api/admin/events/${eventId}/series`).set(auth(admin)).send({ seriesId: s.body.id });
  });

  it('el evento publica el paquete y solo se compra de 2 en 2, a ₡3 000 cada par', async () => {
    const pub = (await api().get('/api/events')).body.find((e) => e.id === eventId);
    assert.equal(pub.bundleSize, 2);
    assert.equal(pub.price, 3000);
    const buyer = await newVerifiedClient();
    const single = await api()
      .post('/api/reservations')
      .set(auth(buyer.token))
      .send({ eventId, serials: ['6001'] });
    assert.equal(single.status, 400);
    assert.equal(single.body.error, 'BUNDLE_SIZE');
    const four = await api()
      .post('/api/reservations')
      .set(auth(buyer.token))
      .send({ eventId, serials: ['6001', '6002', '6003', '6004'] });
    assert.equal(four.status, 201);
    assert.equal(four.body.total, 6000);
  });

  it('la venta en el salón también va por paquetes', async () => {
    const sale = (serials) =>
      api()
        .post('/api/admin/manual-sales')
        .set(auth(admin))
        .send({ eventId, serials, fullName: 'Ana Pares', nationalId: '1-1111-1111', phone: '8888-1111', method: 'CASH' });
    assert.equal((await sale(['6005'])).body.error, 'BUNDLE_SIZE');
    const ok = await sale(['6005', '6006']);
    assert.equal(ok.status, 201);
    assert.equal(ok.body.total, 3000);
  });

  it('el panel no puede cambiar el paquete ni su precio', async () => {
    const res = await api().patch(`/api/admin/events/${eventId}`).set(auth(admin)).send({ bundleSize: 1, price: 500 });
    assert.equal(res.status, 200);
    const e = await one('select price, bundle_size from app.events where id = $1', [eventId]);
    assert.deepEqual([e.price, e.bundle_size], [3000, 2]);
  });
});

describe('correos de avisos de compras', () => {
  it('la administración agrega correos y reciben la confirmación de cada compra', async () => {
    const client = await login(...CLIENTE);
    assert.equal((await api().put('/api/admin/settings/notify-emails').set(auth(client.token)).send({ emails: [] })).status, 403);
    assert.equal(
      (
        await api()
          .put('/api/admin/settings/notify-emails')
          .set(auth(admin))
          .send({ emails: ['no-es-correo'] })
      ).status,
      400
    );
    const put = await api()
      .put('/api/admin/settings/notify-emails')
      .set(auth(admin))
      .send({ emails: ['Tesoreria@Hogarsol.org', 'junta@hogarsol.org'] });
    assert.deepEqual(put.body.emails, ['tesoreria@hogarsol.org', 'junta@hogarsol.org']);
    assert.deepEqual((await api().get('/api/admin/settings/notify-emails').set(auth(admin))).body.emails, put.body.emails);

    const before = outbox.length;
    await api()
      .post('/api/admin/manual-sales')
      .set(auth(admin))
      .send({
        eventId: DEMO_EVENT_ID,
        serials: ['1280', '1281'],
        fullName: 'Rita Copia',
        nationalId: '1-2222-1111',
        phone: '8888-2222',
        method: 'SINPE',
      });
    const mail = outbox.slice(before).find((m) => m.subject.includes('Venta en el salón'));
    assert.ok(mail, 'aviso de la venta');
    assert.ok(mail.to.includes('tesoreria@hogarsol.org') && mail.to.includes('junta@hogarsol.org'));
    assert.match(mail.text, /Rita Copia/);
  });

  it('cada cuenta administradora recibe los avisos; al quitarle el rol deja de recibirlos', async () => {
    const nuevo = await newVerifiedClient();
    const venta = async (serials) => {
      const before = outbox.length;
      const res = await api()
        .post('/api/admin/manual-sales')
        .set(auth(admin))
        .send({ eventId: DEMO_EVENT_ID, serials, fullName: 'Rita Copia', nationalId: '1-2222-1111', phone: '8888-2222', method: 'CASH' });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      return outbox.slice(before).find((m) => m.subject.includes('Venta en el salón'));
    };
    const setRole = (role) => api().patch(`/api/admin/users/${nuevo.id}`).set(auth(admin)).send({ role });

    assert.equal((await setRole('ADMIN')).status, 200);
    const conRol = await venta(['1282', '1283']);
    assert.ok(conRol.to.includes(nuevo.email), 'el nuevo admin recibe el aviso');
    assert.ok(conRol.to.includes(ADMIN[0]), 'el admin original también');

    assert.equal((await setRole('CLIENTE')).status, 200);
    assert.ok(!(await venta(['1284', '1285'])).to.includes(nuevo.email), 'sin el rol ya no lo recibe');
  });
});

describe('ganadores del salón (cartones físicos)', () => {
  it('se anotan con nombre, premio, modalidad, serie y número, y salen en Resultados', async () => {
    await goLive(); // Resultados muestra los eventos en vivo o finalizados
    const series = await one('select s.id, s.name from app.card_series s join app.events e on e.series_id = s.id where e.id = $1', [
      DEMO_EVENT_ID,
    ]);
    const res = await api().post(`/api/admin/events/${DEMO_EVENT_ID}/manual-winners`).set(auth(admin)).send({
      name: 'Marta Salas Rojas',
      prize: 'Motocicleta',
      pattern: 'FULL',
      seriesId: series.id,
      serial: '1150',
      phone: '8888-5555',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.series, series.name);
    assert.equal((await api().get(`/api/admin/events/${DEMO_EVENT_ID}/manual-winners`).set(auth(admin))).body.length, 1);

    // Resultados solo lista eventos en vivo o finalizados: se pone en vivo cantando una bola.
    await call(33);
    const results = (await api().get('/api/events/results')).body.find((e) => e.id === DEMO_EVENT_ID);
    const w = results.winners.find((x) => x.prize === 'Motocicleta');
    assert.deepEqual(
      { name: w.name, serial: w.serial, channel: w.channel, pattern: w.pattern, series: w.series },
      { name: 'Marta S.', serial: '1150', channel: 'SALON', pattern: 'FULL', series: series.name }
    );
    assert.equal(w.phone, undefined, 'el teléfono nunca se publica');
  });

  it('valida los datos, solo la administración los anota y se pueden borrar', async () => {
    const client = await login(...CLIENTE);
    const body = { name: 'Juan Pérez', prize: '₡50 000' };
    assert.equal((await api().post(`/api/admin/events/${DEMO_EVENT_ID}/manual-winners`).set(auth(client.token)).send(body)).status, 403);
    assert.equal(
      (
        await api()
          .post(`/api/admin/events/${DEMO_EVENT_ID}/manual-winners`)
          .set(auth(admin))
          .send({ ...body, serial: 'abc' })
      ).status,
      400
    );
    const ok = await api()
      .post(`/api/admin/events/${DEMO_EVENT_ID}/manual-winners`)
      .set(auth(admin))
      .send({ ...body, seriesLabel: 'Serie impresa B' });
    assert.equal(ok.body.series, 'Serie impresa B');
    assert.equal((await api().delete(`/api/admin/manual-winners/${ok.body.id}`).set(auth(admin))).status, 204);
    const audit = (await api().get('/api/admin/audit?action=winner').set(auth(admin))).body.entries.map((e) => e.action);
    assert.ok(audit.includes('winner.manual_added') && audit.includes('winner.manual_deleted'));
  });
});

describe('borrar rondas de prueba en Bingo Master', () => {
  it('borrar una ronda borra sus bolas y reclamos, y renumera las siguientes', async () => {
    const client = await login(...CLIENTE);
    const [card] = (await api().get(`/api/events/${DEMO_EVENT_ID}/cards/mine`).set(auth(client.token))).body.cards;
    // Ronda 1 (ya tiene la bola 33): se completa el cartón y se reclama; el premio queda anotado.
    for (const n of card.grid.flat().filter(Boolean)) await call(n);
    const claim = await api().post(`/api/events/${DEMO_EVENT_ID}/claims`).set(auth(client.token)).send({ cardId: card.id });
    assert.equal(claim.status, 201);
    const prize = await api().patch(`/api/admin/claims/${claim.body.id}/prize`).set(auth(admin)).send({ prize: 'Canasta' });
    assert.equal(prize.body.prize, 'Canasta');
    assert.equal((await api().patch(`/api/admin/claims/${claim.body.id}/prize`).set(auth(admin)).send({ prize: 'x' })).status, 400);

    await api().post(draw('/round')).set(auth(admin)).send({ pattern: 'X' });
    await call(5);
    await call(10);
    const client2 = await login(...CLIENTE);
    assert.equal((await api().delete(draw('/rounds/1')).set(auth(client2.token))).status, 403);

    const res = await api().delete(draw('/rounds/1')).set(auth(admin));
    assert.equal(res.status, 200);
    assert.equal(res.body.event.round, 1, 'la ronda 2 pasa a ser la 1');
    assert.equal(res.body.event.pattern, 'X');
    assert.deepEqual(res.body.called, [5, 10]);
    assert.equal(await one('select count(*)::int as n from app.claims where id = $1', [claim.body.id]).then((r) => r.n), 0);
    const rounds = (await api().get(draw('/rounds')).set(auth(admin))).body;
    assert.deepEqual(
      rounds.map((r) => [r.round, r.pattern, r.called]),
      [[1, 'X', 2]]
    );
    assert.equal((await api().delete(draw('/rounds/7')).set(auth(admin))).status, 404);
  });

  it('borrar todas las rondas deja la ronda 1 vacía y no cambia el estado: eso lo decide la administración', async () => {
    const res = await api().delete(draw('/rounds')).set(auth(admin));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.called, []);
    assert.equal(res.body.event.round, 1);
    assert.equal(res.body.event.status, 'LIVE');
    const audit = (await api().get('/api/admin/audit?action=draw').set(auth(admin))).body.entries.map((e) => e.action);
    assert.ok(audit.includes('draw.round_deleted') && audit.includes('draw.rounds_reset'));
  });
});

describe('"En vivo" lo decide la administración', () => {
  it('cantar bolas de prueba no pone el evento en vivo; la administración lo inicia y puede volverlo a programado', async () => {
    const ev = (
      await api()
        .post('/api/admin/events')
        .set(auth(admin))
        .send({ name: 'Bingo de ensayo', pattern: 'FULL', startsAt: '2026-12-24T19:00:00-06:00' })
    ).body;
    const status = async () => (await one('select status from app.events where id = $1', [ev.id])).status;
    assert.equal((await api().post(`/api/events/${ev.id}/draw/call`).set(auth(admin)).send({ number: 7 })).status, 200);
    assert.equal(await status(), 'SCHEDULED', 'una bola de prueba no inicia el bingo');

    assert.equal((await api().patch(`/api/admin/events/${ev.id}`).set(auth(admin)).send({ status: 'LIVE' })).status, 200);
    assert.equal(await status(), 'LIVE');
    const back = await api().patch(`/api/admin/events/${ev.id}`).set(auth(admin)).send({ status: 'SCHEDULED' });
    assert.equal(back.status, 200);
    assert.equal(await status(), 'SCHEDULED', 'un inicio por error se corrige');
  });
});

describe('editar la modalidad de una ronda del historial', () => {
  it('se corrige aunque la ronda ya tenga bolas; con reclamos vigentes no', async () => {
    const ev = (
      await api().post('/api/admin/events').set(auth(admin)).send({ name: 'Bingo para editar', pattern: 'FULL', startsAt: '2026-12-24T19:00:00-06:00' })
    ).body;
    const url = (path) => `/api/events/${ev.id}/draw${path}`;
    await api().post(url('/call')).set(auth(admin)).send({ number: 3 });
    const client = await login(...CLIENTE);
    assert.equal((await api().patch(url('/rounds/1')).set(auth(client.token)).send({ pattern: 'LINE' })).status, 403);
    const res = await api().patch(url('/rounds/1')).set(auth(admin)).send({ pattern: 'LINE' });
    assert.equal(res.status, 200);
    assert.equal(res.body.event.pattern, 'LINE');
    assert.equal((await api().patch(url('/rounds/4')).set(auth(admin)).send({ pattern: 'LINE' })).status, 404);
    assert.equal((await api().patch(url('/rounds/1')).set(auth(admin)).send({ pattern: 'INVENTADA' })).status, 400);
    const audit = (await api().get('/api/admin/audit?action=draw').set(auth(admin))).body.entries.map((e) => e.action);
    assert.ok(audit.includes('draw.round_edited'));
  });
});
