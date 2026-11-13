// Envío de correos. Con SMTP_HOST configurado se envían de verdad (nodemailer); si no, se imprimen
// en consola (modo desarrollo). Los últimos envíos quedan en `outbox` (memoria) para pruebas.
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { getNotifyEmails } from '../services/settings.js';
import { query } from '../db/index.js';
import { USABLE_ACCOUNT_SQL } from '../middleware/auth.js';

export const outbox = [];

const isGmail = /(^|\.)(gmail|googlemail)\.com$/i.test(env.smtp.host);

/** "Nombre <correo>" -> { name, address }. Acepta también solo el correo. */
export function parseAddress(value) {
  const match = String(value ?? '').match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim(), address: match[2].trim().toLowerCase() };
  return { name: '', address: String(value ?? '').trim().toLowerCase() };
}

/**
 * Remitente y "responder a". Gmail (y la mayoría de proveedores) solo firma (DKIM/SPF) los correos cuyo
 * remitente es la cuenta con la que se inicia sesión: si MAIL_FROM es otro correo, Hotmail, Outlook o Yahoo
 * los mandan a spam o los rechazan. Por eso el remitente siempre es SMTP_USER y MAIL_FROM queda como
 * "responder a", para que las respuestas sigan llegando a la dirección de la Asociación.
 */
export function senderFor(smtp = env.smtp, gmail = isGmail) {
  const configured = parseAddress(smtp.from);
  const name = configured.name || 'Bingo Hogar Sol';
  const user = String(smtp.user ?? '').trim().toLowerCase();
  const mustAlign = gmail && user.includes('@') && configured.address !== user;
  if (!mustAlign) return { from: { name, address: configured.address || user }, replyTo: undefined };
  return { from: { name, address: user }, replyTo: configured.address.includes('@') ? configured.address : undefined };
}

const sender = senderFor();
if (env.smtp.host && sender.replyTo) {
  logger.warn('mail.from_aligned', {
    hint: 'MAIL_FROM no coincide con SMTP_USER: se envía desde SMTP_USER y MAIL_FROM queda como "responder a".',
  });
}

const transport = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      // Conexiones reutilizadas y a ritmo moderado: con cientos de compras seguidas, Gmail corta con
      // "421 too many connections" o "454 try again later" si se abren muchas a la vez.
      pool: true,
      maxConnections: 2,
      rateDelta: 1000,
      rateLimit: 4,
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    })
  : null;

/** Revisa al arrancar que el SMTP acepta la conexión y la contraseña; si no, lo deja claro en los registros. */
export async function verifyMailTransport() {
  if (!transport) return { ok: false, reason: 'SMTP_NOT_CONFIGURED' };
  try {
    await transport.verify();
    logger.info('mail.ready', { host: env.smtp.host, from: sender.from.address });
    return { ok: true };
  } catch (err) {
    logger.error('mail.verify_failed', { host: env.smtp.host, code: err.code, response: err.response, message: err.message });
    return { ok: false, reason: err.code || 'SMTP_ERROR', message: err.response || err.message };
  }
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Plantilla HTML sencilla con la marca; `text` se escapa, `action` agrega un botón con enlace. */
function toHtml({ subject, text, action }) {
  const paragraphs = escapeHtml(text)
    .split('\n')
    .map((line) => `<p style="margin:0 0 10px;font-size:16px;line-height:1.5;color:#0f172a">${line || '&nbsp;'}</p>`)
    .join('');
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="background:#ffc700;color:#0e4a8e;font-weight:800;font-size:17px;padding:14px 22px;border-radius:12px;text-decoration:none;display:inline-block">${escapeHtml(action.label)}</a></p>` +
      `<p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#475569">Si el botón no funciona, copia este enlace en tu navegador:<br>${escapeHtml(action.url)}</p>`
    : '';
  // Texto de vista previa (lo que la bandeja muestra junto al asunto); invisible dentro del correo.
  const preheader = escapeHtml(text.split('\n').find((l) => l.trim()) ?? subject).slice(0, 140);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#0e4a8e;color:#fff;border-bottom:6px solid #ffc700;border-radius:16px 16px 0 0;padding:18px 22px">
<p style="margin:0;font-size:20px;font-weight:800">Hogar Sol · Bingo Benéfico</p></div>
<div style="background:#fff;border-radius:0 0 16px 16px;padding:22px">
<h1 style="margin:0 0 14px;font-size:21px;color:#0e4a8e">${escapeHtml(subject)}</h1>${paragraphs}${button}</div>
<p style="text-align:center;color:#64748b;font-size:12px;line-height:1.5">Asociación Infantil Hogar Sol · Costa Rica<br>Recibes este correo por tu cuenta o tu compra en el Bingo Benéfico.</p></div></body></html>`;
}

// Errores temporales del servidor de correo o de la red: vale la pena reintentar.
const isTransient = (err) =>
  (err.responseCode >= 400 && err.responseCode < 500) || ['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNRESET', 'EDNS'].includes(err.code);

const RETRY_DELAYS_MS = [2_000, 10_000, 30_000];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Envía un mensaje a un destinatario, con reintentos ante fallas temporales. Lanza el último error. */
async function deliver(message) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await transport.sendMail(message);
    } catch (err) {
      if (attempt >= RETRY_DELAYS_MS.length || !isTransient(err)) throw err;
      logger.warn('mail.retry', { to: message.to, attempt: attempt + 1, code: err.code, responseCode: err.responseCode });
      await wait(RETRY_DELAYS_MS[attempt]);
    }
  }
}

function messageFor(recipient, { subject, text, action, replyTo }) {
  const body = action ? `${text}\n\n${action.label}: ${action.url}` : text;
  return {
    from: sender.from,
    to: recipient,
    replyTo: replyTo || sender.replyTo,
    subject,
    text: body,
    html: toHtml({ subject, text, action }),
    // Marca el correo como automático (transaccional): evita respuestas automáticas en bucle y ayuda a los filtros.
    headers: { 'Auto-Submitted': 'auto-generated', 'X-Auto-Response-Suppress': 'All' },
  };
}

/**
 * Envía un correo sin bloquear ni romper la petición que lo origina: si el SMTP falla, se registra el error.
 * Con varios destinatarios se envía un mensaje a cada uno (nadie ve las direcciones de los demás y una
 * dirección que rebota no frena a las otras).
 * - action: { label, url } botón opcional
 * - replyTo: a quién responde el destinatario (p. ej. la persona que escribió por el formulario de contacto)
 */
export function sendMail({ to, subject, text, action, replyTo }) {
  const recipients = [...new Set([to].flat().filter(Boolean))];
  if (recipients.length === 0) return null;
  const body = action ? `${text}\n\n${action.label}: ${action.url}` : text;
  const mail = { to: recipients, subject, text: body, replyTo, sentAt: new Date().toISOString() };
  outbox.push(mail);
  if (outbox.length > 200) outbox.shift();

  if (!transport) {
    if (env.isTest) return mail;
    console.log(`\n📧 Correo a ${recipients.join(', ')}\n   Asunto: ${subject}\n   ${body.replace(/\n/g, '\n   ')}\n`);
    return mail;
  }

  for (const recipient of recipients) {
    deliver(messageFor(recipient, { subject, text, action, replyTo })).catch((err) =>
      logger.error('mail.send_failed', {
        subject,
        domain: recipient.split('@')[1],
        code: err.code,
        responseCode: err.responseCode,
        message: err.response || err.message,
      })
    );
  }
  return mail;
}

/**
 * Prueba desde el panel: envía un correo y espera la respuesta del servidor de correo, para ver de inmediato
 * si llega a Hotmail, Outlook, Yahoo, etc. o por qué falla. Sin SMTP configurado solo queda en la consola.
 */
export async function sendTestMail(to) {
  const mail = {
    subject: 'Correo de prueba del Bingo Hogar Sol',
    text: 'Si recibiste este correo, los avisos del bingo llegan bien a esta dirección.\nSi llegó a spam, márcalo como «No es spam» y agrega al remitente a tus contactos.',
  };
  if (!transport) {
    sendMail({ to, ...mail });
    return { ok: false, reason: 'SMTP_NOT_CONFIGURED' };
  }
  try {
    const info = await deliver(messageFor(to, mail));
    return { ok: true, from: sender.from.address, accepted: info.accepted?.length ?? 1 };
  } catch (err) {
    logger.error('mail.test_failed', { domain: to.split('@')[1], code: err.code, responseCode: err.responseCode });
    return { ok: false, reason: err.code || 'SMTP_ERROR', message: err.response || err.message };
  }
}

/** Correos de todas las cuentas con rol ADMIN que pueden entrar (las deshabilitadas o sancionadas no). */
const adminAccountEmails = async () =>
  (await query(`select email from app.users where role = 'ADMIN' and ${USABLE_ACCOUNT_SQL}`)).map((r) => r.email);

/**
 * Avisa a los administradores: cada cuenta con rol ADMIN, ADMIN_NOTIFY_EMAILS del servidor y los correos
 * agregados en el panel (Administración → Datos de cobro → Correos de avisos). Devuelve una promesa: quien quiera
 * el correo ya en la bandeja de salida (p. ej. las pruebas) la espera; el envío por SMTP nunca bloquea la petición.
 */
export async function notifyAdminsByMail(mail) {
  const lists = await Promise.allSettled([adminAccountEmails(), getNotifyEmails()]);
  const extra = lists.flatMap((r) => {
    if (r.status === 'fulfilled') return r.value;
    logger.error('mail.notify_list_failed', { message: r.reason?.message }); // sin una lista, igual llegan las demás
    return [];
  });
  return sendMail({
    ...mail,
    to: [...new Set([...env.adminNotifyEmails, env.superAdminEmail, ...extra].filter(Boolean).map((e) => e.toLowerCase()))],
  });
}
