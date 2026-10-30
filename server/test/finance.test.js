import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, CLIENTE, DEMO_EVENT_ID, TINY_PNG, api, auth, login, newVerifiedClient, startApp, stopApp } from './helpers.js';

let admin;
before(async () => {
  await startApp();
  admin = (await login(...ADMIN)).token;
});
after(stopApp);

const finance = async () => (await api().get(`/api/admin/events/${DEMO_EVENT_ID}/finance`).set(auth(admin))).body;
const stats = async () => (await api().get(`/api/admin/events/${DEMO_EVENT_ID}/stats`).set(auth(admin))).body;
const attachProof = (id, token = admin, file = TINY_PNG, type = 'image/png') =>
  api()
    .post(`/api/admin/reservations/${id}/proof`)
    .set(auth(token))
    .attach('proof', file, { filename: 'comprobante.png', contentType: type });

describe('finanzas: ingresos reales virtuales y físicos', () => {
  let salonSale;

  it('sin pagos verificados todo está en ₡0 (las compras de demostración no son dinero)', async () => {
    const f = await finance();
    assert.equal(f.income, 0);
    assert.deepEqual(f.channels.WEB, { orders: 0, amount: 0, cards: 0 });
    assert.deepEqual(f.channels.MANUAL, { orders: 0, amount: 0, cards: 0 });
    assert.equal(f.cards.sold, f.cards.soldWeb + f.cards.soldSalon + f.cards.soldUnverified);
  });

  it('una venta en el salón cuenta como física, en efectivo, y queda pendiente de comprobante', async () => {
    const res = await api()
      .post('/api/admin/manual-sales')
      .set(auth(admin))
      .send({
        eventId: DEMO_EVENT_ID,
        serials: ['1290', '1291'],
        fullName: 'Ana Salón',
        nationalId: '1-1111-2222',
        phone: '8888-0000',
        method: 'CASH',
      });
    assert.equal(res.status, 201);
    salonSale = res.body;
    const f = await finance();
    assert.deepEqual(f.channels.MANUAL, { orders: 1, amount: salonSale.total, cards: 2 });
    assert.deepEqual(f.byMethod.CASH, { orders: 1, amount: salonSale.total });
    assert.equal(f.income, salonSale.total);
    assert.equal(f.withoutProof, 1);
    assert.deepEqual(
      f.missingProofs.map((m) => m.id),
      [salonSale.id]
    );
    assert.deepEqual(f.missingProofs[0].serials, ['1290', '1291']);
    const s = await stats();
    assert.equal(s.soldSalon, 2);
    assert.deepEqual(s.byMethod.CASH, { orders: 1, amount: salonSale.total }, 'el efectivo aparece en el gráfico del panel');
  });

  it('la administración adjunta el comprobante; solo imágenes o PDF reales y solo en compras vigentes', async () => {
    const client = await login(...CLIENTE);
    assert.equal((await attachProof(salonSale.id, client.token)).status, 403);
    assert.equal((await attachProof(salonSale.id, admin, Buffer.from('no soy una imagen'))).status, 400);
    const ok = await attachProof(salonSale.id);
    assert.equal(ok.status, 200);
    assert.equal(ok.body.hasProof, true);
    const f = await finance();
    assert.equal(f.withoutProof, 0);
    assert.deepEqual(f.missingProofs, []);
    const file = await api().get(`/api/admin/reservations/${salonSale.id}/proof`).set(auth(admin));
    assert.equal(file.headers['content-type'], 'image/png');

    // Una reserva sin pagar no recibe comprobantes de la administración.
    const buyer = await newVerifiedClient();
    const pending = await api()
      .post('/api/reservations')
      .set(auth(buyer.token))
      .send({ eventId: DEMO_EVENT_ID, serials: ['1295'] });
    assert.equal((await attachProof(pending.body.id)).body.error, 'PROOF_NOT_ATTACHABLE');
  });

  it('una compra en línea aprobada cuenta como virtual', async () => {
    const buyer = await newVerifiedClient();
    const r = await api()
      .post('/api/reservations')
      .set(auth(buyer.token))
      .send({ eventId: DEMO_EVENT_ID, serials: ['1296', '1297', '1298'] });
    const proof = api().post(`/api/reservations/${r.body.id}/proof`).set(auth(buyer.token));
    Object.entries({
      fullName: 'Luis Web',
      nationalId: '1-3333-4444',
      phone: '8888-1111',
      email: buyer.email,
      method: 'SINPE',
      reference: 'WEB12345',
    }).forEach(([k, v]) => proof.field(k, v));
    await proof.attach('proof', TINY_PNG, { filename: 'p.png', contentType: 'image/png' });
    await api().post(`/api/admin/reservations/${r.body.id}/decision`).set(auth(admin)).send({ approve: true, method: 'SINPE' });
    const f = await finance();
    assert.deepEqual(f.channels.WEB, { orders: 1, amount: r.body.total, cards: 3 });
    assert.equal(f.income, f.channels.WEB.amount + f.channels.MANUAL.amount);
    // Serie diaria: 14 días y hoy suma todo lo verificado en la prueba (virtual y físico por separado).
    assert.equal(f.incomeByDay.length, 14);
    assert.deepEqual(f.incomeByDay.at(-1), { day: f.incomeByDay.at(-1).day, web: f.channels.WEB.amount, salon: f.channels.MANUAL.amount });
    assert.equal((await stats()).soldWeb, 3);
  });
});

describe('finanzas: gastos con factura y balance', () => {
  const create = (fields, file) => {
    const req = api().post(`/api/admin/events/${DEMO_EVENT_ID}/expenses`).set(auth(admin));
    Object.entries(fields).forEach(([k, v]) => req.field(k, v));
    return file ? req.attach('receipt', file, { filename: 'factura.png', contentType: 'image/png' }) : req;
  };
  const base = {
    concept: 'Alquiler del salón',
    category: 'LOCAL',
    amount: '150000',
    spentOn: '2026-11-10',
    method: 'TRANSFER',
    reference: 'FAC-001',
  };

  it('registra gastos con o sin factura y los resta del balance', async () => {
    const before = await finance();
    const withReceipt = await create(base, TINY_PNG);
    assert.equal(withReceipt.status, 201);
    assert.equal(withReceipt.body.hasReceipt, true);
    assert.equal(withReceipt.body.amount, 150000);
    const noReceipt = await create({ ...base, concept: 'Volantes', category: 'IMPRESION', amount: '20000', reference: '' });
    assert.equal(noReceipt.body.hasReceipt, false);

    const f = await finance();
    assert.equal(f.expenses, before.expenses + 170000);
    assert.equal(f.balance, f.income - f.expenses);
    assert.deepEqual(f.expensesByCategory.LOCAL, { count: 1, amount: 150000 });
    assert.equal(f.expensesWithoutReceipt, 1);

    // La factura se puede agregar después.
    const added = await api()
      .post(`/api/admin/expenses/${noReceipt.body.id}/receipt`)
      .set(auth(admin))
      .attach('receipt', TINY_PNG, { filename: 'f.png', contentType: 'image/png' });
    assert.equal(added.body.hasReceipt, true);
    assert.equal((await finance()).expensesWithoutReceipt, 0);
    const receipt = await api().get(`/api/admin/expenses/${withReceipt.body.id}/receipt`).set(auth(admin));
    assert.equal(receipt.headers['content-type'], 'image/png');
    assert.equal(receipt.headers['content-security-policy'], 'sandbox');
  });

  it('valida los datos y solo la administración puede registrar o ver gastos', async () => {
    assert.equal((await create({ ...base, category: 'INVENTADA' })).status, 400);
    assert.equal((await create({ ...base, amount: '-5' })).status, 400);
    const client = await login(...CLIENTE);
    assert.equal((await api().get(`/api/admin/events/${DEMO_EVENT_ID}/expenses`).set(auth(client.token))).status, 403);
    assert.equal((await api().get(`/api/admin/events/${DEMO_EVENT_ID}/finance`)).status, 401);
  });

  it('borrar un gasto lo saca del balance y queda en la bitácora', async () => {
    const list = (await api().get(`/api/admin/events/${DEMO_EVENT_ID}/expenses`).set(auth(admin))).body;
    const before = (await finance()).expenses;
    assert.equal((await api().delete(`/api/admin/expenses/${list[0].id}`).set(auth(admin))).status, 204);
    assert.equal((await finance()).expenses, before - list[0].amount);
    const audit = (await api().get('/api/admin/audit?action=expense').set(auth(admin))).body.entries.map((e) => e.action);
    assert.ok(audit.includes('expense.deleted'));
  });

  it('el libro para Excel trae cada ingreso y cada gasto con su comprobante', async () => {
    const res = await api().get(`/api/admin/events/${DEMO_EVENT_ID}/finance/export.csv`).set(auth(admin));
    assert.match(res.headers['content-type'], /text\/csv/);
    assert.match(res.text, /"Ingreso","Físico \(salón\)",.*,"4000","","Sí"/);
    assert.match(res.text, /"Gasto","LOCAL","Alquiler del salón","Transferencia","FAC-001","","150000","Sí"/);
    assert.match(res.text, /Virtual \(en línea\)/);
    assert.match(res.text, /Gasto/);
  });
});
