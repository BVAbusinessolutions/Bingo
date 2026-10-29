import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, DEMO_EVENT_ID, TINY_PNG, api, auth, login, newVerifiedClient, one, query, startApp, stopApp } from './helpers.js';

let admin;
let adminId;
before(async () => {
  await startApp();
  const s = await login(...ADMIN);
  admin = s.token;
  adminId = s.user.id;
});
after(stopApp);

const sanction = (id, body) => api().post(`/api/admin/users/${id}/sanction`).set(auth(admin)).send(body);
const loginRaw = (email) => api().post('/api/auth/login').send({ email, password: 'Clave12345' });

describe('sanciones a cuentas', () => {
  it('una suspensión corta el acceso al instante e informa hasta cuándo al iniciar sesión', async () => {
    const c = await newVerifiedClient();
    const res = await sanction(c.id, { type: 'SUSPEND', days: 7, reason: 'Comprobante alterado' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'SUSPENDED');
    assert.equal(res.body.sanctionReason, 'Comprobante alterado');
    assert.ok(new Date(res.body.suspendedUntil) > new Date());

    assert.equal((await api().get('/api/auth/me').set(auth(c.token))).status, 401);
    const again = await loginRaw(c.email);
    assert.equal(again.status, 403);
    assert.equal(again.body.error, 'ACCOUNT_SUSPENDED');
    assert.ok(again.body.until);
  });

  it('con contraseña incorrecta no revela que la cuenta está sancionada', async () => {
    const c = await newVerifiedClient();
    await sanction(c.id, { type: 'BAN', reason: 'Uso de bots' });
    const res = await api().post('/api/auth/login').send({ email: c.email, password: 'Incorrecta123' });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'INVALID_CREDENTIALS');
  });

  it('una suspensión vencida se levanta sola al iniciar sesión', async () => {
    const c = await newVerifiedClient();
    await sanction(c.id, { type: 'SUSPEND', days: 1, reason: 'Revisión de pagos' });
    await query("update app.users set suspended_until = now() - interval '1 minute' where id = $1", [c.id]);
    const res = await loginRaw(c.email);
    assert.equal(res.status, 200);
    const row = await one('select status, suspended_until from app.users where id = $1', [c.id]);
    assert.equal(row.status, 'ACTIVE');
    assert.equal(row.suspended_until, null);
  });

  it('el baneo es permanente hasta que un admin lo levanta', async () => {
    const c = await newVerifiedClient();
    assert.equal((await sanction(c.id, { type: 'BAN', reason: 'Fraude con comprobantes' })).body.status, 'BANNED');
    assert.equal((await loginRaw(c.email)).body.error, 'ACCOUNT_BANNED');
    const lifted = await sanction(c.id, { type: 'LIFT' });
    assert.equal(lifted.body.status, 'ACTIVE');
    assert.equal(lifted.body.sanctionReason, null);
    assert.equal((await loginRaw(c.email)).status, 200);
    assert.equal((await sanction(c.id, { type: 'LIFT' })).body.error, 'NOT_SANCTIONED');
  });

  it('libera los cartones apartados sin pagar de la cuenta sancionada', async () => {
    const c = await newVerifiedClient();
    const r = await api().post('/api/reservations').set(auth(c.token)).send({ eventId: DEMO_EVENT_ID, serials: ['1201'] });
    assert.equal(r.status, 201);
    await sanction(c.id, { type: 'SUSPEND', days: 3, reason: 'Acaparamiento de cartones' });
    assert.equal((await one('select status from app.reservations where id = $1', [r.body.id])).status, 'CANCELLED');
    assert.equal((await one("select status from app.cards where event_id = $1 and serial = '1201'", [DEMO_EVENT_ID])).status, 'AVAILABLE');
  });

  it('no permite sancionarse a sí mismo ni sancionar a un administrador', async () => {
    assert.equal((await sanction(adminId, { type: 'BAN', reason: 'Prueba de seguridad' })).body.error, 'CANNOT_CHANGE_SELF');
    const other = await newVerifiedClient();
    await api().patch(`/api/admin/users/${other.id}`).set(auth(admin)).send({ role: 'ADMIN' });
    assert.equal((await sanction(other.id, { type: 'BAN', reason: 'Prueba de seguridad' })).body.error, 'CANNOT_SANCTION_ADMIN');
  });

  it('valida el motivo y los días, y un cliente no puede sancionar', async () => {
    const c = await newVerifiedClient();
    assert.equal((await sanction(c.id, { type: 'BAN', reason: 'x' })).status, 400);
    assert.equal((await sanction(c.id, { type: 'SUSPEND', days: 0, reason: 'Motivo válido' })).status, 400);
    const other = await newVerifiedClient();
    const res = await api().post(`/api/admin/users/${c.id}/sanction`).set(auth(other.token)).send({ type: 'BAN', reason: 'Motivo válido' });
    assert.equal(res.status, 403);
  });

  it('filtra por estado y queda en la bitácora', async () => {
    const c = await newVerifiedClient();
    await sanction(c.id, { type: 'BAN', reason: 'Suplantación de identidad' });
    const list = (await api().get('/api/admin/users').query({ status: 'BANNED' }).set(auth(admin))).body;
    assert.ok(list.users.some((u) => u.id === c.id));
    assert.ok(list.users.every((u) => u.status === 'BANNED'));
    const entry = await one("select details from app.audit_log where action = 'user.banned' and target_id = $1", [c.id]);
    assert.equal(entry.details.reason, 'Suplantación de identidad');
  });
});

describe('misma cédula en varias cuentas', () => {
  const submit = async (client, serial, nationalId, reference) => {
    const r = await api().post('/api/reservations').set(auth(client.token)).send({ eventId: DEMO_EVENT_ID, serials: [serial] });
    assert.equal(r.status, 201);
    const req = api().post(`/api/reservations/${r.body.id}/proof`).set(auth(client.token));
    const fields = { fullName: 'Luis Prueba', nationalId, phone: '8888-2222', email: client.email, method: 'SINPE', reference };
    Object.entries(fields).forEach(([k, v]) => req.field(k, v));
    const proof = Buffer.concat([TINY_PNG, Buffer.from(reference)]);
    assert.equal((await req.attach('proof', proof, { filename: 'p.png', contentType: 'image/png' })).status, 200);
    return r.body.id;
  };

  it('avisa al admin si otra cuenta compró con la misma cédula (aunque se escriba distinto)', async () => {
    const a = await newVerifiedClient();
    const b = await newVerifiedClient();
    await submit(a, '1211', '1-0555-0666', 'REF-A1');
    const second = await submit(b, '1212', '105550666', 'REF-B1');
    const d = (await api().get(`/api/admin/reservations/${second}`).set(auth(admin))).body;
    assert.deepEqual(
      d.sameIdentity.map((u) => u.userId),
      [a.id]
    );
  });

  it('la búsqueda de usuarios encuentra cuentas por cédula', async () => {
    const list = (await api().get('/api/admin/users').query({ q: '1-0555-0666' }).set(auth(admin))).body;
    assert.equal(list.users.length, 2);
  });

  it('una cédula única no genera alertas', async () => {
    const c = await newVerifiedClient();
    const id = await submit(c, '1213', '7-0777-0777', 'REF-C1');
    assert.deepEqual((await api().get(`/api/admin/reservations/${id}`).set(auth(admin))).body.sameIdentity, []);
  });
});

describe('verificación automática de ganadores', () => {
  it('detecta los cartones vendidos con bingo aunque nadie lo haya cantado', async () => {
    const sale = await api()
      .post('/api/admin/manual-sales')
      .set(auth(admin))
      .send({ eventId: DEMO_EVENT_ID, serials: ['1220'], fullName: 'Rosa Salón', nationalId: '5-5555-5555', phone: '8777-3333', method: 'CASH' });
    assert.equal(sale.status, 201);
    const card = await one("select grid from app.cards where event_id = $1 and serial = '1220'", [DEMO_EVENT_ID]);
    const url = `/api/events/${DEMO_EVENT_ID}/draw/winning-cards`;

    assert.deepEqual((await api().get(url).set(auth(admin))).body, []);
    for (const n of card.grid.flat().filter(Boolean)) {
      await api().post(`/api/events/${DEMO_EVENT_ID}/draw/call`).set(auth(admin)).send({ number: n });
    }
    const hit = (await api().get(url).set(auth(admin))).body.find((c) => c.serial === '1220');
    assert.ok(hit, 'el cartón lleno debe aparecer');
    assert.equal(hit.holder, 'Rosa Salón');
    assert.equal(hit.channel, 'MANUAL');
    assert.equal(hit.claimStatus, null);
  });

  it('solo el administrador puede consultarla', async () => {
    const c = await newVerifiedClient();
    assert.equal((await api().get(`/api/events/${DEMO_EVENT_ID}/draw/winning-cards`).set(auth(c.token))).status, 403);
  });
});

describe('transmisión de baja latencia', () => {
  const create = (stream) =>
    api()
      .post('/api/admin/events')
      .set(auth(admin))
      .send({ name: 'Evento stream', pattern: 'LINE', price: 1000, startsAt: '2026-11-15T13:00:00-06:00', stream });

  it('acepta LL-HLS y WebRTC (WHEP) solo desde los orígenes de STREAM_ORIGINS', async () => {
    const hls = await create({ provider: 'hls', url: 'https://stream.example.com/live/bingo.m3u8' });
    assert.equal(hls.status, 201, JSON.stringify(hls.body));
    assert.deepEqual(hls.body.stream, { provider: 'hls', url: 'https://stream.example.com/live/bingo.m3u8' });
    assert.equal((await create({ provider: 'whep', url: 'https://stream.example.com/whep/bingo' })).status, 201);
    assert.equal((await create({ provider: 'hls', url: 'https://otro-sitio.example.org/x.m3u8' })).status, 400);
    assert.equal((await create({ provider: 'hls', url: 'http://stream.example.com/x.m3u8' })).status, 400);
    assert.equal((await create({ provider: 'whep', videoId: 'abc123' })).status, 400);
  });

  it('sigue aceptando YouTube por id de video', async () => {
    const yt = await create({ provider: 'youtube', videoId: 'dQw4w9WgXcQ' });
    assert.equal(yt.status, 201);
    assert.deepEqual(yt.body.stream, { provider: 'youtube', videoId: 'dQw4w9WgXcQ' });
  });

  it('envía Permissions-Policy en cada respuesta', async () => {
    const res = await api().get('/api/health');
    assert.match(res.headers['permissions-policy'], /camera=\(\)/);
  });
});
