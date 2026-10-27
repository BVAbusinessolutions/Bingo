import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, DEMO_EVENT_ID, TINY_PNG, api, auth, login, newVerifiedClient, startApp, stopApp } from './helpers.js';

let admin;
before(async () => {
  await startApp();
  admin = (await login(...ADMIN)).token;
});
after(stopApp);

const buyer = { fullName: 'Ana Duplicada', nationalId: '1-1111-1111', phone: '8888-1111', email: 'ana@example.com', method: 'SINPE' };

/** Reserva y envía comprobante. Devuelve el id de la reserva. */
async function purchase(serial, reference, image = TINY_PNG) {
  const client = await newVerifiedClient();
  const r = await api().post('/api/reservations').set(auth(client.token)).send({ eventId: DEMO_EVENT_ID, serials: [serial] });
  assert.equal(r.status, 201);
  const req = api().post(`/api/reservations/${r.body.id}/proof`).set(auth(client.token));
  Object.entries({ ...buyer, reference }).forEach(([k, v]) => req.field(k, v));
  const sent = await req.attach('proof', image, { filename: 'sinpe.png', contentType: 'image/png' });
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  return r.body.id;
}

const detail = async (id) => (await api().get(`/api/admin/reservations/${id}`).set(auth(admin))).body;

describe('comprobantes repetidos', () => {
  let first;
  let second;

  before(async () => {
    first = await purchase('1291', 'SNP-99911');
    // Mismo número de comprobante escrito distinto y la misma foto.
    second = await purchase('1292', 'snp99911');
  });

  it('detecta el mismo n.º de comprobante (sin importar guiones o mayúsculas) y la misma foto', async () => {
    const d = await detail(second);
    assert.equal(d.duplicates.length, 1);
    assert.equal(d.duplicates[0].id, first);
    assert.equal(d.duplicates[0].sameReference, true);
    assert.equal(d.duplicates[0].sameImage, true);
  });

  it('la detección es simétrica: la compra original también ve a la repetida', async () => {
    const d = await detail(first);
    assert.deepEqual(
      d.duplicates.map((x) => x.id),
      [second]
    );
  });

  it('una foto idéntica con otro número de comprobante se marca solo como misma foto', async () => {
    const third = await purchase('1293', 'OTRO-555', TINY_PNG);
    const d = await detail(third);
    const hit = d.duplicates.find((x) => x.id === first);
    assert.ok(hit, 'debe encontrar la compra con la misma foto');
    assert.equal(hit.sameReference, false);
    assert.equal(hit.sameImage, true);
  });

  it('un comprobante distinto no genera alertas', async () => {
    const other = await purchase('1294', 'UNICO-777', Buffer.concat([TINY_PNG, Buffer.from('distinta')]));
    const d = await detail(other);
    assert.deepEqual(d.duplicates, []);
  });
});
