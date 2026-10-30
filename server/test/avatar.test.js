import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, TINY_PNG, api, auth, login, newVerifiedClient, one, startApp, stopApp } from './helpers.js';

before(startApp);
after(stopApp);

const XHR = { 'X-Requested-With': 'XMLHttpRequest' };
const upload = (token, buffer, contentType = 'image/png') =>
  api().put('/api/auth/me/avatar').set(auth(token)).set(XHR).attach('avatar', buffer, { filename: 'yo.png', contentType });

describe('foto de perfil', () => {
  it('sube, reemplaza (borra la anterior) y quita la foto', async () => {
    const { token } = await newVerifiedClient();
    const first = await upload(token, TINY_PNG);
    assert.equal(first.status, 200);
    assert.match(first.body.avatarUrl, /^\/api\/auth\/avatars\/[0-9a-f-]{36}$/);

    const img = await api().get(first.body.avatarUrl);
    assert.equal(img.status, 200);
    assert.equal(img.headers['content-type'], 'image/png');
    assert.equal(img.headers['cross-origin-resource-policy'], 'cross-origin');

    const second = await upload(token, TINY_PNG);
    assert.notEqual(second.body.avatarUrl, first.body.avatarUrl);
    assert.equal((await api().get(first.body.avatarUrl)).status, 404); // la vieja ya no existe

    const removed = await api().delete('/api/auth/me/avatar').set(auth(token)).set(XHR);
    assert.equal(removed.status, 200);
    assert.equal(removed.body.avatarUrl, null);
  });

  it('rechaza archivos que no son imagen aunque digan serlo, y PDF', async () => {
    const { token } = await newVerifiedClient();
    assert.equal((await upload(token, Buffer.from('<script>alert(1)</script>'))).status, 400);
    assert.equal((await upload(token, Buffer.from('%PDF-1.4 x'), 'application/pdf')).status, 400);
  });

  it('exige sesión y cabecera anti-CSRF', async () => {
    assert.equal((await api().put('/api/auth/me/avatar').set(XHR)).status, 401);
    const { token } = await login(...ADMIN);
    const res = await api().put('/api/auth/me/avatar').set(auth(token)).attach('avatar', TINY_PNG, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(res.status, 403);
  });

  it('la ruta pública nunca sirve comprobantes de pago', async () => {
    const proof = await one("insert into app.files (kind, mime, size, data) values ('PROOF', 'image/png', $1, $2) returning id", [
      TINY_PNG.length,
      TINY_PNG,
    ]);
    assert.equal((await api().get(`/api/auth/avatars/${proof.id}`)).status, 404);
  });
});
