import { Router } from 'express';
import { z } from 'zod';
import { contactLimiter, validateBody } from '../../middleware/security.js';
import { getPayment } from '../../services/settings.js';
import { notifyAdminsByMail } from '../../utils/mailer.js';
import { logger } from '../../utils/logger.js';
import { emailField, nameField, phoneField } from '../auth/auth.schemas.js';

const router = Router();

/** Datos públicos de SINPE Móvil / transferencia para la página de contacto (los mismos que ve quien compra). */
router.get('/payment', async (req, res) => {
  const p = await getPayment();
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ holder: p.holder, holderId: p.holderId, sinpePhone: p.sinpePhone, bank: p.bank, iban: p.iban, detail: p.detail });
});

export const CONTACT_TOPICS = Object.freeze({
  COMPRA: 'Compra o pago de cartones',
  PREMIO: 'Premios y ganadores',
  CUENTA: 'Mi cuenta',
  DATOS: 'Mis datos personales (Ley 8968)',
  OTRO: 'Otro tema',
});

const messageSchema = z.object({
  name: nameField,
  email: emailField,
  phone: z.union([phoneField, z.literal('')]).optional(), // opcional: el formulario lo envía vacío
  topic: z.enum(Object.keys(CONTACT_TOPICS)),
  message: z.string().trim().min(10).max(1500),
  website: z.string().max(0).optional(), // campo trampa: invisible para personas, los bots lo llenan
});

/** Formulario de contacto: llega por correo a ADMIN_NOTIFY_EMAILS con "responder a" la persona. */
router.post('/message', contactLimiter, validateBody(messageSchema), (req, res) => {
  const { name, email, phone, topic, message } = req.body;
  notifyAdminsByMail({
    subject: `✉️ Contacto · ${CONTACT_TOPICS[topic]} · ${name}`,
    text: [`Nombre: ${name}`, `Correo: ${email}`, phone ? `Teléfono: ${phone}` : undefined, `Tema: ${CONTACT_TOPICS[topic]}`, '', message]
      .filter((line) => line !== undefined)
      .join('\n'),
    replyTo: email,
  });
  logger.info('contact.message', { topic });
  res.status(202).json({ ok: true });
});

export default router;
