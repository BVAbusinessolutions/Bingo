import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN,
  CLIENTE,
  DEMO_EVENT_ID,
  TINY_PNG,
  api,
  auth,
  buildZip,
  login,
  newVerifiedClient,
  one,
  query,
  startApp,
  stopApp,
} from './helpers.js';

let admin;
let adminId;
before(async () => {
  await startApp();
  const s = await login(...ADMIN);
  admin = s.token;
  adminId = s.user.id;
});
after(stopApp);

const waitForSeries = async (id) => {
  for (let i = 0; i < 50; i++) {
    const s = (await api().get(`/api/admin/series/${id}`).set(auth(admin))).body;
    if (s.status !== 'PROCESSING') return s;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('la importación no terminó');
};

describe('sorteo y reclamos', () => {
  it('solo acepta balotas del 1 al 75 y no repite', async () => {
    assert.equal((await api().post(`/api/events/${DEMO_EVENT_ID}/draw/call`).set(auth(admin)).send({ number: 76 })).status, 400);
    assert.equal((await api().post(`/api/events/${DEMO_EVENT_ID}/draw/call`).set(auth(admin)).send({ number: 7 })).status, 200);
    assert.equal(
      (await api().post(`/api/events/${DEMO_EVENT_ID}/draw/call`).set(auth(admin)).send({ number: 7 })).body.error,
      'ALREADY_CALLED'
    );
    const undo = await api().post(`/api/events/${DEMO_EVENT_ID}/draw/undo`).set(auth(admin));
    assert.deepEqual(undo.body.called, []);
  });

  it('un cliente no puede cantar balotas', async () => {
    const client = await login(...CLIENTE);
    assert.equal((await api().post(`/api/events/${DEMO_EVENT_ID}/draw/call`).set(auth(client.token)).send({ number: 8 })).status, 403);
  });

  it('el servidor valida el bingo y el admin lo confirma', async () => {
    const client = await login(...CLIENTE);
    const mine = (await api().get(`/api/events/${DEMO_EVENT_ID}/cards/mine`).set(auth(client.token))).body.cards;
    const [winner, other] = mine;
    for (const n of winner.grid.flat().filter(Boolean)) {
      await api().post(`/api/events/${DEMO_EVENT_ID}/draw/call`).set(auth(admin)).send({ number: n });
    }
    const loser =
      mine.find((c) =>
        c.grid
          .flat()
          .filter(Boolean)
          .some((n) => !winner.grid.flat().includes(n))
      ) ?? other;
    assert.equal(
      (await api().post(`/api/events/${DEMO_EVENT_ID}/claims`).set(auth(client.token)).send({ cardId: loser.id })).body.error,
      'NOT_A_WINNER'
    );

    const stranger = await newVerifiedClient();
    assert.equal(
      (await api().post(`/api/events/${DEMO_EVENT_ID}/claims`).set(auth(stranger.token)).send({ cardId: winner.id })).status,
      404
    );

    const [a, b] = await Promise.all([
      api().post(`/api/events/${DEMO_EVENT_ID}/claims`).set(auth(client.token)).send({ cardId: winner.id }),
      api().post(`/api/events/${DEMO_EVENT_ID}/claims`).set(auth(client.token)).send({ cardId: winner.id }),
    ]);
    assert.equal(a.body.id, b.body.id, 'dos reclamos simultáneos del mismo cartón quedan en uno');

    const claims = (await api().get('/api/admin/claims').set(auth(admin))).body;
    assert.equal(claims.length, 1);
    assert.equal(claims[0].calledAtClaim.length, winner.grid.flat().filter(Boolean).length);
    const ok = await api().post(`/api/admin/claims/${a.body.id}/decision`).set(auth(admin)).send({ approve: true });
    assert.equal(ok.body.status, 'CONFIRMED');
    const results = (await api().get('/api/events/results')).body;
    assert.equal(results[0].winners[0].name, 'Cliente D.');
  });

  it('no se canta en un evento finalizado', async () => {
    const created = await api()
      .post('/api/admin/events')
      .set(auth(admin))
      .send({ name: 'Evento cerrado', pattern: 'LINE', price: 1000, startsAt: '2026-12-01T19:00:00-06:00' });
    await api().patch(`/api/admin/events/${created.body.id}`).set(auth(admin)).send({ status: 'LIVE' });
    await api().patch(`/api/admin/events/${created.body.id}`).set(auth(admin)).send({ status: 'FINISHED' });
    const call = await api().post(`/api/events/${created.body.id}/draw/call`).set(auth(admin)).send({ number: 5 });
    assert.equal(call.body.error, 'EVENT_NOT_PLAYABLE');
    const back = await api().patch(`/api/admin/events/${created.body.id}`).set(auth(admin)).send({ status: 'SCHEDULED' });
    assert.equal(back.body.error, 'INVALID_STATUS_CHANGE');
  });
});

describe('eventos', () => {
  it('no permite cambiar precio con ventas, sí la transmisión', async () => {
    const price = await api().patch(`/api/admin/events/${DEMO_EVENT_ID}`).set(auth(admin)).send({ price: 5000 });
    assert.equal(price.body.error, 'EVENT_HAS_SALES');
    const stream = await api()
      .patch(`/api/admin/events/${DEMO_EVENT_ID}`)
      .set(auth(admin))
      .send({ stream: { provider: 'vimeo', videoId: '123456' } });
    assert.equal(stream.status, 200);
    assert.deepEqual(stream.body.stream, { provider: 'vimeo', videoId: '123456' });
  });

  it('rechaza ID de video con caracteres peligrosos', async () => {
    const res = await api()
      .patch(`/api/admin/events/${DEMO_EVENT_ID}`)
      .set(auth(admin))
      .send({ stream: { provider: 'youtube', videoId: '"><script>' } });
    assert.equal(res.status, 400);
  });
});

describe('series de cartones', () => {
  let eventId;
  before(async () => {
    eventId = (
      await api()
        .post('/api/admin/events')
        .set(auth(admin))
        .send({ name: 'Bingo de prueba', pattern: 'FULL', price: 1500, startsAt: '2026-12-20T19:00:00-06:00' })
    ).body.id;
  });

  it('genera una serie nueva y la asigna a un evento sin ventas', async () => {
    const s = await api().post('/api/admin/series/generate').set(auth(admin)).send({ name: 'Serie nueva', count: 25, startSerial: 5001 });
    assert.equal(s.status, 201);
    assert.equal(s.body.cardCount, 25);
    const assign = await api().post(`/api/admin/events/${eventId}/series`).set(auth(admin)).send({ seriesId: s.body.id });
    assert.equal(assign.body.cards, 25);
    const catalog = (await api().get(`/api/events/${eventId}/cards/catalog`)).body.cards;
    assert.equal(catalog[0].serial, '5001');
  });

  it('no cambia la serie de un evento con ventas', async () => {
    const s = await api().post('/api/admin/series/generate').set(auth(admin)).send({ name: 'Otra', count: 5, startSerial: 9001 });
    const res = await api().post(`/api/admin/events/${DEMO_EVENT_ID}/series`).set(auth(admin)).send({ seriesId: s.body.id });
    assert.equal(res.body.error, 'EVENT_ALREADY_STARTED');
  });

  it('importa un ZIP de imágenes, ignora lo que no es PNG y marca lo ilegible para revisión', async () => {
    const zip = buildZip([
      { name: 'cartones/carton_7001.png', data: TINY_PNG },
      { name: 'cartones/carton_7002.png', data: TINY_PNG },
      { name: '__MACOSX/._carton_7001.png', data: TINY_PNG },
      { name: 'leeme.txt', data: Buffer.from('hola') },
      { name: 'falso.png', data: Buffer.from('no soy png') },
    ]);
    const res = await api()
      .post('/api/admin/series/import')
      .set(auth(admin))
      .field('name', 'Serie ZIP')
      .attach('file', zip, { filename: 'series.zip', contentType: 'application/zip' });
    assert.equal(res.status, 202);
    const series = await waitForSeries(res.body.id);
    assert.equal(series.status, 'READY');
    assert.equal(series.cardCount, 2);
    const cards = (await api().get(`/api/admin/series/${series.id}/cards`).set(auth(admin))).body.cards;
    assert.deepEqual(cards.map((c) => c.serial).sort(), ['7001', '7002']);
    assert.ok(cards[0].imageUrl);
    const image = await api().get(cards[0].imageUrl);
    assert.equal(image.headers['content-type'], 'image/png');

    const blocked = await api().post(`/api/admin/events/${eventId}/series`).set(auth(admin)).send({ seriesId: series.id });
    assert.equal(blocked.body.error, 'SERIES_NEEDS_REVIEW', 'no se juega una serie con cartones sin revisar');

    const grid = [
      [11, 27, 42, 52, 63],
      [15, 23, 33, 58, 73],
      [8, 20, null, 57, 70],
      [6, 19, 40, 54, 64],
      [3, 17, 31, 55, 68],
    ];
    const bad = await api()
      .put(`/api/admin/series-cards/${cards[0].id}`)
      .set(auth(admin))
      .send({ serial: '7001', grid: grid.map((r, i) => (i === 0 ? [80, ...r.slice(1)] : r)) });
    assert.equal(bad.status, 400);
    for (const [i, c] of cards.entries()) {
      const g = grid.map((r) => [...r]);
      g[0][0] = 11 - i; // números distintos por cartón
      const ok = await api().put(`/api/admin/series-cards/${c.id}`).set(auth(admin)).send({ serial: c.serial, grid: g });
      assert.equal(ok.status, 204);
    }
    const assigned = await api().post(`/api/admin/events/${eventId}/series`).set(auth(admin)).send({ seriesId: series.id });
    assert.equal(assigned.body.cards, 2);
  });

  it('rechaza por completo un ZIP con rutas maliciosas (../)', async () => {
    const zip = buildZip([{ name: '../../etc/evil.png', data: TINY_PNG }]);
    const res = await api()
      .post('/api/admin/series/import')
      .set(auth(admin))
      .attach('file', zip, { filename: 'malo.zip', contentType: 'application/zip' });
    assert.equal(res.body.error, 'INVALID_ZIP');
  });

  it('rechaza un archivo que no es ZIP', async () => {
    const res = await api()
      .post('/api/admin/series/import')
      .set(auth(admin))
      .attach('file', Buffer.from('nada'), { filename: 'x.zip', contentType: 'application/zip' });
    assert.equal(res.body.error, 'INVALID_ZIP');
  });
});

describe('usuarios, bitácora y configuración', () => {
  it('desactivar un usuario corta su acceso al instante', async () => {
    const client = await newVerifiedClient();
    const res = await api().patch(`/api/admin/users/${client.id}`).set(auth(admin)).send({ status: 'DISABLED' });
    assert.equal(res.body.status, 'DISABLED');
    assert.equal((await api().get('/api/auth/me').set(auth(client.token))).status, 401);
  });

  it('el admin no puede quitarse el rol a sí mismo', async () => {
    const res = await api().patch(`/api/admin/users/${adminId}`).set(auth(admin)).send({ role: 'CLIENTE' });
    assert.equal(res.body.error, 'CANNOT_CHANGE_SELF');
  });

  it('crea otro administrador sin usar datos de demostración', async () => {
    const res = await api()
      .post('/api/admin/users')
      .set(auth(admin))
      .send({ name: 'Segunda Admin', email: 'admin2@example.com', password: 'Segura12345', role: 'ADMIN' });
    assert.equal(res.status, 201);
    await login('admin2@example.com', 'Segura12345');
  });

  it('las acciones quedan en la bitácora', async () => {
    const res = await api().get('/api/admin/audit').set(auth(admin));
    const actions = res.body.entries.map((e) => e.action);
    assert.ok(actions.includes('user.updated'));
    assert.ok(actions.includes('draw.call'));
    assert.ok(res.body.entries.every((e) => !JSON.stringify(e.details).includes('password')));
  });

  it('los datos de cobro se editan desde el panel y llegan a las reservas', async () => {
    const payment = {
      holder: 'Asociación Infantil Hogar Sol',
      holderId: '3-002-123456',
      sinpePhone: '6027-1658',
      bank: 'Banco de Costa Rica',
      iban: 'CR05 0152 0200 1026 2840 66',
    };
    const res = await api().put('/api/admin/settings/payment').set(auth(admin)).send(payment);
    assert.equal(res.body.sinpePhone, '6027-1658');
    const [any] = (await api().get('/api/admin/reservations').set(auth(admin))).body;
    assert.equal(any.payment.bank, 'Banco de Costa Rica');
    assert.equal(any.payment.detail, 'Bingo');
  });

  it('las tablas tienen RLS activado (Supabase no las expone)', async () => {
    const rows = await query(
      "select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'app' and c.relkind = 'r' and not c.relrowsecurity and relname <> 'schema_migrations'"
    );
    assert.deepEqual(rows, []);
    const hashes = await one("select count(*)::int as n from app.users where password_hash not like '$2%'");
    assert.equal(hashes.n, 0, 'todas las contraseñas con bcrypt');
  });
});
