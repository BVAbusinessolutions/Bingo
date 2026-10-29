import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, DEMO_EVENT_ID, TINY_PNG, api, auth, login, newVerifiedClient, one, startApp, stopApp } from './helpers.js';

let admin;
before(async () => {
  await startApp();
  admin = (await login(...ADMIN)).token;
});
after(stopApp);

const revenue = async () => (await api().get(`/api/admin/events/${DEMO_EVENT_ID}/stats`).set(auth(admin))).body.revenue;

describe('recaudación', () => {
  it('es ₡0 mientras ningún pago fue verificado (los cartones de demostración no cuentan)', async () => {
    assert.equal(await revenue(), 0);
  });

  it('una reserva apartada o con comprobante sin revisar no suma; al aprobarla suma con el método confirmado', async () => {
    const client = await newVerifiedClient();
    const r = await api().post('/api/reservations').set(auth(client.token)).send({ eventId: DEMO_EVENT_ID, serials: ['1250', '1251'] });
    assert.equal(r.status, 201);
    assert.equal(await revenue(), 0, 'apartada');

    const proof = api().post(`/api/reservations/${r.body.id}/proof`).set(auth(client.token));
    Object.entries({ fullName: 'Rosa Prueba', nationalId: '1-2222-3333', phone: '8888-4444', email: client.email, method: 'SINPE', reference: 'REV12345' }).forEach(
      ([k, v]) => proof.field(k, v)
    );
    assert.equal((await proof.attach('proof', TINY_PNG, { filename: 'p.png', contentType: 'image/png' })).status, 200);
    assert.equal(await revenue(), 0, 'comprobante sin revisar');

    const decision = await api().post(`/api/admin/reservations/${r.body.id}/decision`).set(auth(admin)).send({ approve: true, method: 'TRANSFER' });
    assert.equal(decision.status, 200);
    assert.equal(await revenue(), r.body.total);
    const row = await one('select payment_method from app.reservations where id = $1', [r.body.id]);
    assert.equal(row.payment_method, 'TRANSFER', 'el método que confirmó la administración');
  });

  it('rechaza un método de cobro desconocido', async () => {
    const res = await api()
      .post('/api/admin/reservations/00000000-0000-4000-8000-000000000000/decision')
      .set(auth(admin))
      .send({ approve: true, method: 'BITCOIN' });
    assert.equal(res.status, 400);
  });
});
