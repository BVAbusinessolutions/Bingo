import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, DEMO_EVENT_ID, api, auth, login, newVerifiedClient, one, outbox, startApp, stopApp } from './helpers.js';

let admin;
before(async () => {
  await startApp();
  admin = (await login(...ADMIN)).token;
});
after(stopApp);

describe('datos del evento desde el panel', () => {
  it('guarda fecha, hora y lugar, y los publica', async () => {
    const res = await api().patch(`/api/admin/events/${DEMO_EVENT_ID}`).set(auth(admin)).send({
      startsAt: '2026-11-15T13:00:00-06:00',
      venue: 'Salón de Eventos de Tinamaste',
      venueArea: 'Higuito, San José',
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const current = (await api().get('/api/events/current')).body;
    assert.equal(current.venue, 'Salón de Eventos de Tinamaste');
    assert.equal(current.venueArea, 'Higuito, San José');
    assert.equal(current.startsAt, '2026-11-15T19:00:00.000Z');
  });

  it('cambiar solo el estado no borra la descripción ni el lugar (antes se perdían)', async () => {
    const created = await api()
      .post('/api/admin/events')
      .set(auth(admin))
      .send({ name: 'Evento con datos', description: 'Descripción que no debe perderse', pattern: 'LINE', price: 500, startsAt: '2026-12-01T13:00:00-06:00', venue: 'Salón comunal' });
    const id = created.body.id;
    assert.equal((await api().patch(`/api/admin/events/${id}`).set(auth(admin)).send({ status: 'CANCELLED' })).status, 200);
    const row = await one('select description, venue from app.events where id = $1', [id]);
    assert.equal(row.description, 'Descripción que no debe perderse');
    assert.equal(row.venue, 'Salón comunal');
  });
});

describe('ganadores del salón', () => {
  let cardId;
  before(async () => {
    const sale = await api()
      .post('/api/admin/manual-sales')
      .set(auth(admin))
      .send({ eventId: DEMO_EVENT_ID, serials: ['1240'], fullName: 'Marta Salón Pérez', nationalId: '6-0666-0666', phone: '8777-4444', method: 'CASH' });
    assert.equal(sale.status, 201);
    const card = await one("select id, grid from app.cards where event_id = $1 and serial = '1240'", [DEMO_EVENT_ID]);
    cardId = card.id;
    const url = `/api/events/${DEMO_EVENT_ID}/draw/salon-winner`;
    // Antes de completar el patrón, el servidor lo rechaza.
    assert.equal((await api().post(url).set(auth(admin)).send({ cardId })).body.error, 'NOT_A_WINNER');
    for (const n of card.grid.flat().filter(Boolean)) {
      await api().post(`/api/events/${DEMO_EVENT_ID}/draw/call`).set(auth(admin)).send({ number: n });
    }
  });

  it('el admin registra el cartón ganador y aparece al instante en Resultados', async () => {
    const res = await api().post(`/api/events/${DEMO_EVENT_ID}/draw/salon-winner`).set(auth(admin)).send({ cardId });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const results = (await api().get('/api/events/results')).body;
    const winner = results.find((e) => e.id === DEMO_EVENT_ID).winners.find((w) => w.serial === '1240');
    assert.deepEqual(winner && { name: winner.name, channel: winner.channel }, { name: 'Marta S.', channel: 'SALON' });
  });

  it('no se puede registrar dos veces el mismo cartón', async () => {
    const res = await api().post(`/api/events/${DEMO_EVENT_ID}/draw/salon-winner`).set(auth(admin)).send({ cardId });
    assert.equal(res.body.error, 'ALREADY_CLAIMED');
  });

  it('un cliente no puede registrar ganadores', async () => {
    const c = await newVerifiedClient();
    assert.equal((await api().post(`/api/events/${DEMO_EVENT_ID}/draw/salon-winner`).set(auth(c.token)).send({ cardId })).status, 403);
  });

  it('la lista de ganadores del admin muestra el canal y el nombre del comprador', async () => {
    const claims = (await api().get('/api/admin/claims').set(auth(admin))).body;
    const c = claims.find((x) => x.serial === '1240');
    assert.equal(c.channel, 'SALON');
    assert.equal(c.player.name, 'Marta Salón Pérez');
  });
});

describe('contacto', () => {
  const valid = { name: 'Lucía Prueba', email: 'lucia@example.com', topic: 'COMPRA', message: 'Pagué por SINPE y quiero confirmar mi compra.' };

  it('envía el mensaje a la Asociación con "responder a" la persona', async () => {
    const res = await api().post('/api/contact/message').send({ ...valid, phone: '' });
    assert.equal(res.status, 202);
    const mail = outbox.at(-1);
    assert.match(mail.subject, /Contacto · Compra o pago de cartones · Lucía Prueba/);
    assert.equal(mail.replyTo, 'lucia@example.com');
    assert.doesNotMatch(mail.text, /Teléfono/);
  });

  it('rechaza bots (campo trampa) y mensajes vacíos', async () => {
    assert.equal((await api().post('/api/contact/message').send({ ...valid, website: 'http://spam' })).status, 400);
    assert.equal((await api().post('/api/contact/message').send({ ...valid, message: 'hola' })).status, 400);
  });

  it('publica los datos de SINPE Móvil', async () => {
    const p = (await api().get('/api/contact/payment')).body;
    assert.ok(p.sinpePhone);
    assert.equal(p.detail, 'Bingo');
  });
});
