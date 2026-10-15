// Envío de correos SIMULADO: se imprime en consola y se guarda en db.outbox.
// En producción reemplazar por nodemailer (SMTP) o un servicio como Resend / SendGrid.
import { db } from '../db.js';

export function sendMail({ to, subject, text }) {
  const mail = { to, subject, text, sentAt: new Date().toISOString() };
  db.outbox.push(mail);
  console.log(`\n📧 Correo a ${to}\n   Asunto: ${subject}\n   ${text.replace(/\n/g, '\n   ')}\n`);
  return mail;
}
