import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, api, auth, login, newVerifiedClient, one, startApp, stopApp } from './helpers.js';

// En .env.test, SUPER_ADMIN_EMAIL es la cuenta admin demo (admin@hogarsol.org).
let superToken;
let superId;
before(async () => {
  await startApp();
  superToken = (await login(...ADMIN)).token;
  superId = (await one('select id from app.users where email = $1', [ADMIN[0]])).id;
});
after(stopApp);

const setUser = (token, id, body) => api().patch(`/api/admin/users/${id}`).set(auth(token)).send(body);

describe('admin superior', () => {
  it('solo el admin superior da o quita el rol de admin; a él nadie lo degrada, desactiva ni sanciona', async () => {
    // El superior hace admin a una cuenta.
    const otro = await newVerifiedClient();
    assert.equal((await setUser(superToken, otro.id, { role: 'ADMIN' })).status, 200);
    const otroToken = (await login(otro.email, 'Clave12345')).token; // se cerraron sus sesiones al cambiar el rol

    // La lista marca al superior y dice quién puede manejar admins.
    const lista = await api().get('/api/admin/users').query({ q: ADMIN[0] }).set(auth(otroToken));
    assert.equal(lista.body.canManageAdmins, false);
    assert.equal(lista.body.users.find((u) => u.email === ADMIN[0]).superAdmin, true);
    assert.equal((await api().get('/api/admin/users').set(auth(superToken))).body.canManageAdmins, true);

    // Un admin común no da ni quita el rol, ni crea cuentas admin.
    const tercero = await newVerifiedClient();
    assert.equal((await setUser(otroToken, tercero.id, { role: 'ADMIN' })).body.error, 'SUPER_ADMIN_ONLY');
    const crear = await api()
      .post('/api/admin/users')
      .set(auth(otroToken))
      .send({ name: 'Admin Nuevo', email: `nuevo${Date.now()}@example.com`, password: 'Clave12345', role: 'ADMIN' });
    assert.equal(crear.status, 403);

    // Nadie degrada, desactiva ni sanciona al superior.
    assert.equal((await setUser(otroToken, superId, { role: 'CLIENTE' })).body.error, 'SUPER_ADMIN_PROTECTED');
    assert.equal((await setUser(otroToken, superId, { status: 'DISABLED' })).body.error, 'SUPER_ADMIN_PROTECTED');
    const sancion = await api()
      .post(`/api/admin/users/${superId}/sanction`)
      .set(auth(otroToken))
      .send({ type: 'BAN', reason: 'prueba de baneo' });
    assert.equal(sancion.body.error, 'SUPER_ADMIN_PROTECTED');
    assert.equal((await one('select role, status from app.users where id = $1', [superId])).role, 'ADMIN');

    // Un admin común sí puede manejar clientes (desactivar y reactivar).
    assert.equal((await setUser(otroToken, tercero.id, { status: 'DISABLED' })).status, 200);
    assert.equal((await setUser(otroToken, tercero.id, { status: 'ACTIVE' })).status, 200);

    // El superior le quita el rol.
    assert.equal((await setUser(superToken, otro.id, { role: 'CLIENTE' })).status, 200);
  });
});
