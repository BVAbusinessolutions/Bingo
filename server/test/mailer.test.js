import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN, api, auth, login, newVerifiedClient, startApp, stopApp } from './helpers.js';
import { parseAddress, senderFor } from '../src/utils/mailer.js';

describe('remitente de los correos', () => {
  it('lee "Nombre <correo>" y también solo el correo', () => {
    assert.deepEqual(parseAddress('Bingo Hogar Sol <Info@HogarSol.org>'), { name: 'Bingo Hogar Sol', address: 'info@hogarsol.org' });
    assert.deepEqual(parseAddress('"Hogar Sol" <a@b.cr>'), { name: 'Hogar Sol', address: 'a@b.cr' });
    assert.deepEqual(parseAddress('bingo@gmail.com'), { name: '', address: 'bingo@gmail.com' });
  });

  it('con Gmail envía siempre desde la cuenta que inicia sesión y deja MAIL_FROM como "responder a"', () => {
    // Si el remitente no es la cuenta autenticada, Hotmail/Outlook/Yahoo lo mandan a spam o lo rechazan.
    const s = senderFor({ from: 'Bingo Hogar Sol <promotor@hogarsol.org>', user: 'bingohogarsol@gmail.com' }, true);
    assert.deepEqual(s.from, { name: 'Bingo Hogar Sol', address: 'bingohogarsol@gmail.com' });
    assert.equal(s.replyTo, 'promotor@hogarsol.org');
  });

  it('si MAIL_FROM ya es la cuenta de Gmail no cambia nada', () => {
    const s = senderFor({ from: 'Bingo <BingoHogarSol@gmail.com>', user: 'bingohogarsol@gmail.com' }, true);
    assert.deepEqual(s.from, { name: 'Bingo', address: 'bingohogarsol@gmail.com' });
    assert.equal(s.replyTo, undefined);
  });

  it('con un proveedor con dominio propio (Brevo, Resend, SES) respeta MAIL_FROM', () => {
    const s = senderFor({ from: 'Bingo Hogar Sol <avisos@hogarsol.org>', user: 'apikey' }, false);
    assert.deepEqual(s.from, { name: 'Bingo Hogar Sol', address: 'avisos@hogarsol.org' });
    assert.equal(s.replyTo, undefined);
  });
});

describe('correo de prueba desde el panel', () => {
  let adminToken;
  before(async () => {
    await startApp();
    adminToken = (await login(...ADMIN)).token;
  });
  after(stopApp);

  it('solo la administración lo usa y avisa si no hay SMTP configurado', async () => {
    const cliente = await newVerifiedClient();
    const denied = await api().post('/api/admin/settings/mail-test').set(auth(cliente.token)).send({ to: 'alguien@hotmail.com' });
    assert.equal(denied.status, 403);

    const bad = await api().post('/api/admin/settings/mail-test').set(auth(adminToken)).send({ to: 'no-es-correo' });
    assert.equal(bad.status, 400);

    const res = await api().post('/api/admin/settings/mail-test').set(auth(adminToken)).send({ to: 'alguien@hotmail.com' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: false, reason: 'SMTP_NOT_CONFIGURED' });
  });
});
