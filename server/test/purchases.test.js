import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, DEMO_EVENT_ID, TINY_PNG, api, auth, login, newVerifiedClient, one, outbox, query, startApp, stopApp } from './helpers.js';

let admin;
before(async () => {
  await startApp();
  admin = (await login(...ADMIN)).token;
});
after(stopApp);

const buyer = {
  fullName: 'María González Rojas',
  nationalId: '1-2345-6789',
  phone: '8888-1234',
  email: 'maria@example.com',
  method: 'SINPE',
};

const reserve = (token, serials) => api().post('/api/reservations').set(auth(token)).send({ eventId: DEMO_EVENT_ID, serials });

const sendProof = (token, id, fields, withFile = true) => {
  const req = api().post(`/api/reservations/${id}/proof`).set(auth(token));
  Object.entries(fields).forEach(([k, v]) => req.field(k, v));
  if (withFile) req.attach('proof', TINY_PNG, { filename: 'sinpe.png', contentType: 'image/png' });
  return req;
};

describe('reservas', () => {
  it('exige correo verificado para comprar', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Sin Verificar', email: `sv${Date.now()}@example.com`, password: 'Clave12345', acceptTerms: true });
    const r = await reserve(res.body.accessToken, ['1100']);
    assert.equal(r.status, 403);
    assert.equal(r.body.error, 'EMAIL_NOT_VERIFIED');
  });

  it('dos personas no pueden apartar el mismo cartón al mismo tiempo', async () => {
    const [a, b] = await Promise.all([newVerifiedClient(), newVerifiedClient()]);
    const results = await Promise.all([reserve(a.token, ['1200', '1201']), reserve(b.token, ['1201', '1202'])]);
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409]);
    const card = await one("select status from app.cards where event_id = $1 and serial = '1202'", [DEMO_EVENT_ID]);
    assert.equal(card.status, results[1].status === 409 ? 'AVAILABLE' : 'RESERVED', 'la reserva fallida no deja cartones apartados');
  });

  it('nadie puede ver ni pagar la reserva de otra persona (IDOR)', async () => {
    const [owner, other] = await Promise.all([newVerifiedClient(), newVerifiedClient()]);
    const r = await reserve(owner.token, ['1210']);
    assert.equal((await api().get(`/api/reservations/${r.body.id}`).set(auth(other.token))).status, 404);
    assert.equal((await sendProof(other.token, r.body.id, { ...buyer, reference: 'ABC1234' })).status, 404);
    assert.equal((await api().delete(`/api/reservations/${r.body.id}`).set(auth(other.token))).status, 404);
  });

  it('la reserva vencida libera sus cartones', async () => {
    const client = await newVerifiedClient();
    const r = await reserve(client.token, ['1215']);
    await query("update app.reservations set expires_at = now() - interval '1 minute' where id = $1", [r.body.id]);
    const again = await reserve((await newVerifiedClient()).token, ['1215']);
    assert.equal(again.status, 201);
    const old = await one('select status from app.reservations where id = $1', [r.body.id]);
    assert.equal(old.status, 'EXPIRED');
  });
});

describe('compra completa: comprobante, aviso al admin y aprobación', () => {
  let client;
  let reservationId;

  before(async () => {
    client = await newVerifiedClient();
    const r = await reserve(client.token, ['1250', '1251']);
    assert.equal(r.status, 201);
    assert.equal(r.body.payment.detail, 'BINGO');
    assert.equal(r.body.total, 4000);
    reservationId = r.body.id;
  });

  it('no se puede aprobar una compra sin comprobante', async () => {
    const res = await api().post(`/api/admin/reservations/${reservationId}/decision`).set(auth(admin)).send({ approve: true });
    assert.equal(res.status, 409);
  });

  it('exige número de comprobante y foto', async () => {
    assert.equal((await sendProof(client.token, reservationId, buyer)).status, 400);
    const noFile = await sendProof(client.token, reservationId, { ...buyer, reference: 'SNP12345' }, false);
    assert.equal(noFile.body.error, 'PROOF_REQUIRED');
  });

  it('rechaza archivos que dicen ser imagen pero no lo son', async () => {
    const res = await api()
      .post(`/api/reservations/${reservationId}/proof`)
      .set(auth(client.token))
      .field({ ...buyer, reference: 'SNP12345' })
      .attach('proof', Buffer.from('<script>alert(1)</script>'), { filename: 'x.png', contentType: 'image/png' });
    assert.equal(res.body.error, 'INVALID_FILE');
  });

  it('envía la compra y avisa al admin por correo con enlace al detalle', async () => {
    const res = await sendProof(client.token, reservationId, { ...buyer, reference: 'SNP12345' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'PROOF_SUBMITTED');
    const mail = outbox.findLast((m) => m.to.includes('admin-pruebas@example.com'));
    assert.match(mail.subject, /Nueva compra por verificar/);
    assert.ok(mail.text.includes(`/admin/compras/${reservationId}`));
    assert.ok(mail.text.includes('SNP12345'));
  });

  it('el admin ve el formulario, la cuenta y el comprobante (aislado)', async () => {
    const res = await api().get(`/api/admin/reservations/${reservationId}`).set(auth(admin));
    assert.equal(res.body.buyer.nationalId, '1-2345-6789');
    assert.equal(res.body.account.email, client.email);
    assert.equal(res.body.cards.length, 2);
    const proof = await api().get(`/api/admin/reservations/${reservationId}/proof`).set(auth(admin));
    assert.equal(proof.status, 200);
    assert.equal(proof.headers['content-security-policy'], 'sandbox');
    assert.equal(proof.headers['x-content-type-options'], 'nosniff');
  });

  it('un cliente no puede usar la API de administración', async () => {
    const res = await api().get(`/api/admin/reservations/${reservationId}`).set(auth(client.token));
    assert.equal(res.status, 403);
  });

  it('al aprobar, los cartones pasan al cliente y recibe el enlace por correo', async () => {
    const res = await api().post(`/api/admin/reservations/${reservationId}/decision`).set(auth(admin)).send({ approve: true });
    assert.equal(res.body.status, 'APPROVED');
    const mine = await api().get(`/api/events/${DEMO_EVENT_ID}/cards/mine`).set(auth(client.token));
    assert.deepEqual(
      mine.body.cards.map((c) => c.serial),
      ['1250', '1251']
    );
    const mail = outbox.findLast((m) => m.to.includes('maria@example.com'));
    assert.ok(mail.text.includes(`/mis-compras/${reservationId}`));
    const log = await one("select count(*)::int as n from app.audit_log where action = 'reservation.approved' and target_id = $1", [
      reservationId,
    ]);
    assert.equal(log.n, 1);
  });

  it('no se puede decidir dos veces', async () => {
    const res = await api().post(`/api/admin/reservations/${reservationId}/decision`).set(auth(admin)).send({ approve: false });
    assert.equal(res.status, 409);
  });

  it('reembolso: los cartones vuelven a la venta', async () => {
    const res = await api().post(`/api/admin/reservations/${reservationId}/refund`).set(auth(admin));
    assert.equal(res.body.status, 'REFUNDED');
    const card = await one("select status, owner_id from app.cards where event_id = $1 and serial = '1250'", [DEMO_EVENT_ID]);
    assert.equal(card.status, 'AVAILABLE');
    assert.equal(card.owner_id, null);
  });
});

describe('venta manual y exportación', () => {
  it('registra una venta en efectivo ya aprobada', async () => {
    const res = await api()
      .post('/api/admin/manual-sales')
      .set(auth(admin))
      .send({
        eventId: DEMO_EVENT_ID,
        serials: ['1260', '1261'],
        fullName: 'Juan Mora',
        nationalId: '2-2222-2222',
        phone: '8777-0000',
        method: 'CASH',
      });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'APPROVED');
    assert.equal(res.body.channel, 'MANUAL');
    const dup = await api()
      .post('/api/admin/manual-sales')
      .set(auth(admin))
      .send({
        eventId: DEMO_EVENT_ID,
        serials: ['1261'],
        fullName: 'Otra Persona',
        nationalId: '3-3333-3333',
        phone: '8777-1111',
        method: 'CASH',
      });
    assert.equal(dup.body.error, 'CARDS_NOT_AVAILABLE');
  });

  it('exporta a CSV neutralizando fórmulas de Excel', async () => {
    await api()
      .post('/api/admin/manual-sales')
      .set(auth(admin))
      .send({
        eventId: DEMO_EVENT_ID,
        serials: ['1262'],
        fullName: 'Pedro Ruiz',
        nationalId: '4-4444-4444',
        phone: '8777-2222',
        method: 'SINPE',
        reference: '-1234',
      });
    const res = await api().get('/api/admin/reservations/export.csv').set(auth(admin));
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/csv/);
    assert.ok(res.text.includes(`"'-1234"`), 'el comprobante que empieza con "-" queda como texto');
    assert.ok(res.text.includes('Juan Mora'));
  });
});
