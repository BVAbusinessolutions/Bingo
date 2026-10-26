import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, CLIENTE, api, auth, lastMailToken, login, newVerifiedClient, one, query, startApp, stopApp } from './helpers.js';

before(startApp);
after(stopApp);

const XHR = { 'X-Requested-With': 'XMLHttpRequest' };
const refreshCookie = (res) => res.headers['set-cookie']?.find((c) => c.startsWith('hs_rt='))?.split(';')[0];

describe('registro y verificación de correo', () => {
  const email = `nuevo${Date.now()}@example.com`;

  it('exige aceptar los términos', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Ana Pérez', email, password: 'Clave12345' });
    assert.equal(res.status, 400);
  });

  it('nunca acepta el rol desde el cliente y deja el correo sin verificar', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Ana Pérez', email, password: 'Clave12345', acceptTerms: true, role: 'ADMIN' });
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, 'CLIENTE');
    assert.equal(res.body.user.emailVerified, false);
    assert.ok(!('password_hash' in res.body.user));
  });

  it('rechaza el correo repetido', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'Ana Pérez', email, password: 'Clave12345', acceptTerms: true });
    assert.equal(res.status, 409);
  });

  it('el enlace de verificación funciona una sola vez', async () => {
    const token = lastMailToken('/verificar-correo');
    assert.ok(token);
    const ok = await api().post('/api/auth/verify-email').send({ token });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.emailVerified, true);
    const again = await api().post('/api/auth/verify-email').send({ token });
    assert.equal(again.status, 400);
  });

  it('solo se guarda el hash del token', async () => {
    const rows = await query('select token_hash from app.one_time_tokens');
    for (const r of rows) assert.match(r.token_hash, /^[a-f0-9]{64}$/);
  });
});

describe('inicio de sesión y bloqueo por cuenta', () => {
  it('mensaje idéntico para correo inexistente y contraseña errónea', async () => {
    const a = await api().post('/api/auth/login').send({ email: 'noexiste@example.com', password: 'Clave12345' });
    const b = await api().post('/api/auth/login').send({ email: CLIENTE[0], password: 'Incorrecta1' });
    assert.equal(a.status, 401);
    assert.deepEqual(a.body, b.body);
  });

  it('bloquea la cuenta tras varios intentos fallidos y queda en la bitácora', async () => {
    const { email } = await newVerifiedClient();
    for (let i = 0; i < 3; i++) await api().post('/api/auth/login').send({ email, password: 'Incorrecta1' });
    const locked = await api().post('/api/auth/login').send({ email, password: 'Clave12345' });
    assert.equal(locked.status, 429, 'ni con la contraseña correcta entra mientras está bloqueada');
    const log = await one("select count(*)::int as n from app.audit_log where action = 'auth.account_locked'");
    assert.ok(log.n >= 1);
  });

  it('un usuario desactivado no puede usar su token', async () => {
    const client = await newVerifiedClient();
    await query("update app.users set status = 'DISABLED' where id = $1", [client.id]);
    const res = await api().get('/api/auth/me').set(auth(client.token));
    assert.equal(res.status, 401);
  });

  it('rechaza tokens con otro algoritmo o sin firma', async () => {
    const forged = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"sub":"x","role":"ADMIN"}').toString('base64url')}.`;
    const res = await api().get('/api/admin/events').set(auth(forged));
    assert.equal(res.status, 401);
  });
});

describe('sesiones: rotación de refresh token', () => {
  it('rota el token y detecta su reutilización', async () => {
    const first = await api().post('/api/auth/login').send({ email: ADMIN[0], password: ADMIN[1] });
    const cookie1 = refreshCookie(first);
    const second = await api().post('/api/auth/refresh').set(XHR).set('Cookie', cookie1);
    assert.equal(second.status, 200);
    const cookie2 = refreshCookie(second);
    assert.notEqual(cookie1, cookie2);

    const reused = await api().post('/api/auth/refresh').set(XHR).set('Cookie', cookie1);
    assert.equal(reused.status, 401, 'reusar un token ya usado se rechaza');
    const afterReuse = await api().post('/api/auth/refresh').set(XHR).set('Cookie', cookie2);
    assert.equal(afterReuse.status, 401, 'y además se revocan todas las sesiones');
  });

  it('exige la cabecera anti-CSRF', async () => {
    const res = await api().post('/api/auth/refresh');
    assert.equal(res.status, 403);
  });

  it('la cookie es HttpOnly, SameSite=Strict y limitada a /api/auth', async () => {
    const res = await api().post('/api/auth/login').send({ email: CLIENTE[0], password: CLIENTE[1] });
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('hs_rt='));
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Path=\/api\/auth/);
  });
});

describe('perfil y contraseña', () => {
  it('el perfil no permite cambiar rol ni correo', async () => {
    const client = await newVerifiedClient();
    const res = await api()
      .patch('/api/auth/me')
      .set(auth(client.token))
      .send({ name: 'Nombre Nuevo', phone: '8888-1234', role: 'ADMIN', email: 'x@x.com' });
    assert.equal(res.status, 200);
    assert.equal(res.body.role, 'CLIENTE');
    assert.equal(res.body.email, client.email);
    assert.equal(res.body.phone, '8888-1234');
  });

  it('cambiar la contraseña exige la actual y cierra las otras sesiones', async () => {
    const client = await newVerifiedClient();
    const other = await login(client.email, 'Clave12345');
    const wrong = await api()
      .post('/api/auth/change-password')
      .set(auth(client.token))
      .send({ currentPassword: 'mala', newPassword: 'Nueva12345' });
    assert.equal(wrong.status, 400);
    const ok = await api()
      .post('/api/auth/change-password')
      .set(auth(client.token))
      .send({ currentPassword: 'Clave12345', newPassword: 'Nueva12345' });
    assert.equal(ok.status, 200);
    const reuse = await api()
      .post('/api/auth/refresh')
      .set(XHR)
      .set('Cookie', other.cookie.find((c) => c.startsWith('hs_rt=')).split(';')[0]);
    assert.equal(reuse.status, 401);
  });

  it('recuperar contraseña no revela si el correo existe y el enlace es de un solo uso', async () => {
    const client = await newVerifiedClient();
    const unknown = await api().post('/api/auth/forgot-password').send({ email: 'nadie@example.com' });
    const known = await api().post('/api/auth/forgot-password').send({ email: client.email });
    assert.equal(unknown.status, 204);
    assert.equal(known.status, 204);
    const token = lastMailToken('/restablecer');
    const reset = await api().post('/api/auth/reset-password').send({ token, password: 'Otra12345' });
    assert.equal(reset.status, 204);
    const again = await api().post('/api/auth/reset-password').send({ token, password: 'Otra54321' });
    assert.equal(again.status, 400);
    await login(client.email, 'Otra12345');
  });
});
