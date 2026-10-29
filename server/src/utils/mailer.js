// Envío de correos. Con SMTP_HOST configurado se envían de verdad (nodemailer); si no, se imprimen
// en consola (modo desarrollo). Los últimos envíos quedan en `outbox` (memoria) para pruebas.
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const outbox = [];

const transport = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : null;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Plantilla HTML sencilla con la marca; `text` se escapa, `action` agrega un botón con enlace. */
function toHtml({ subject, text, action }) {
  const paragraphs = escapeHtml(text)
    .split('\n')
    .map((line) => `<p style="margin:0 0 10px;font-size:16px;line-height:1.5;color:#0f172a">${line || '&nbsp;'}</p>`)
    .join('');
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="background:#ffc700;color:#0e4a8e;font-weight:800;font-size:17px;padding:14px 22px;border-radius:12px;text-decoration:none;display:inline-block">${escapeHtml(action.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#0e4a8e;color:#fff;border-bottom:6px solid #ffc700;border-radius:16px 16px 0 0;padding:18px 22px">
<p style="margin:0;font-size:20px;font-weight:800">☀ Hogar Sol · Bingo Benéfico</p></div>
<div style="background:#fff;border-radius:0 0 16px 16px;padding:22px">
<h1 style="margin:0 0 14px;font-size:21px;color:#0e4a8e">${escapeHtml(subject)}</h1>${paragraphs}${button}</div>
<p style="text-align:center;color:#64748b;font-size:12px">Asociación Infantil Hogar Sol</p></div></body></html>`;
}

/**
 * Envía un correo sin bloquear ni romper la petición que lo origina: si el SMTP falla, se registra el error.
 * - action: { label, url } botón opcional
 * - replyTo: a quién responde el destinatario (p. ej. la persona que escribió por el formulario de contacto)
 */
export function sendMail({ to, subject, text, action, replyTo }) {
  const recipients = [to].flat().filter(Boolean);
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

  transport
    .sendMail({ from: env.smtp.from, to: recipients, replyTo, subject, text: body, html: toHtml({ subject, text, action }) })
    .catch((err) => logger.error('mail.send_failed', { subject, message: err.message }));
  return mail;
}

/** Avisa a los administradores configurados en ADMIN_NOTIFY_EMAILS. */
export const notifyAdminsByMail = (mail) => sendMail({ ...mail, to: env.adminNotifyEmails });
