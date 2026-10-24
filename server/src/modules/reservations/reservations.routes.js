import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db, UPLOAD_DIR } from '../../db.js';
import { authenticate } from '../../middleware/auth.js';
import { reservationLimiter, validateBody } from '../../middleware/security.js';
import { notifyAdmins } from '../../realtime.js';
import { env } from '../../config/env.js';
import { notifyAdminsByMail, sendMail } from '../../utils/mailer.js';
import { formatCRC } from '../../utils/format.js';
import { cardsOf } from '../events/events.routes.js';
import {
  PAYMENT_DETAIL_TEXT,
  RESERVATION_TTL_MS,
  rejectReservation,
  releaseExpiredReservations,
  reservationDetailView,
  reservationView,
  sendProofFile,
} from './reservations.service.js';

const router = Router();
const MAX_CARDS_PER_RESERVATION = 20;

const createSchema = z
  .object({
    eventId: z.string().min(1).max(64),
    quantity: z.number().int().min(1).max(MAX_CARDS_PER_RESERVATION).optional(),
    serials: z.array(z.string().regex(/^\d{3,4}$/)).min(1).max(MAX_CARDS_PER_RESERVATION).optional(),
  })
  .refine((d) => Boolean(d.quantity) !== Boolean(d.serials), { message: 'Envía quantity O serials' });

// Paso 1: aparta los cartones e inicia el temporizador de pago.
router.post('/', authenticate, reservationLimiter, validateBody(createSchema), (req, res) => {
  releaseExpiredReservations();
  if (!db.users.get(req.user.id)?.emailVerified) return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' });
  const { eventId, quantity, serials } = req.body;
  const event = db.events.get(eventId);
  if (!event || event.status !== 'SCHEDULED') return res.status(409).json({ error: 'EVENT_NOT_ON_SALE' });

  const active = [...db.reservations.values()].filter((r) => r.userId === req.user.id && r.status === 'PENDING');
  if (active.length >= 3) return res.status(429).json({ error: 'TOO_MANY_PENDING' });

  const available = cardsOf(eventId).filter((c) => c.status === 'AVAILABLE');
  let chosen;
  if (serials) {
    const wanted = new Set(serials);
    chosen = available.filter((c) => wanted.has(c.serial));
    if (chosen.length !== wanted.size) return res.status(409).json({ error: 'CARDS_NOT_AVAILABLE' });
  } else {
    if (available.length < quantity) return res.status(409).json({ error: 'NOT_ENOUGH_CARDS' });
    chosen = available.slice(0, quantity);
  }

  // Sin await entre comprobar y escribir => atómico en Node.
  // Con BD real: UPDATE ... WHERE status='AVAILABLE' dentro de una transacción.
  const now = Date.now();
  const r = {
    id: randomUUID(),
    eventId,
    userId: req.user.id,
    buyer: null,
    cardIds: chosen.map((c) => c.id),
    total: chosen.length * event.price,
    status: 'PENDING',
    createdAt: now,
    expiresAt: now + RESERVATION_TTL_MS,
  };
  db.reservations.set(r.id, r);
  chosen.forEach((c) => Object.assign(c, { status: 'RESERVED', reservationId: r.id }));
  res.status(201).json(reservationView(r));
});

router.get('/mine', authenticate, (req, res) => {
  releaseExpiredReservations();
  res.json(
    [...db.reservations.values()]
      .filter((r) => r.userId === req.user.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(reservationView)
  );
});

/** Carga la reserva y verifica que sea del usuario (evita IDOR). */
function ownReservation(req, res, next) {
  releaseExpiredReservations();
  const r = db.reservations.get(req.params.id);
  if (!r || r.userId !== req.user.id) return res.status(404).json({ error: 'NOT_FOUND' });
  req.reservation = r;
  next();
}

const requirePending = (req, res, next) =>
  req.reservation.status === 'PENDING' ? next() : res.status(409).json({ error: 'RESERVATION_NOT_PENDING' });

router.get('/:id', authenticate, ownReservation, (req, res) => res.json(reservationDetailView(req.reservation)));

router.get('/:id/proof', authenticate, ownReservation, (req, res) => sendProofFile(res, req.reservation));

router.delete('/:id', authenticate, ownReservation, requirePending, (req, res) => {
  rejectReservation(req.reservation, 'CANCELLED');
  res.json(reservationView(req.reservation));
});

// ---------- Paso 2: confirmación de pago (SINPE Móvil / Transferencia) ----------
const ALLOWED = {
  'image/jpeg': { ext: '.jpg', magic: [0xff, 0xd8, 0xff] },
  'image/png': { ext: '.png', magic: [0x89, 0x50, 0x4e, 0x47] },
  'image/webp': { ext: '.webp', magic: [0x52, 0x49, 0x46, 0x46] },
  'application/pdf': { ext: '.pdf', magic: [0x25, 0x50, 0x44, 0x46] },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10 },
  fileFilter: (req, file, cb) => cb(null, Boolean(ALLOWED[file.mimetype])),
});

const confirmSchema = z.object({
  fullName: z.string().trim().min(3).max(80).regex(/^[\p{L}\p{M}\s'.-]+$/u),
  nationalId: z.string().trim().regex(/^[0-9A-Za-z-]{5,20}$/),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{8,15}$/),
  email: z.string().trim().toLowerCase().email().max(120),
  method: z.enum(['SINPE', 'TRANSFER']),
  // Número de comprobante obligatorio: el admin lo compara con el de la foto y con el banco.
  reference: z.string().trim().regex(/^[0-9A-Za-z-]{4,30}$/),
});

router.post(
  '/:id/proof',
  authenticate,
  ownReservation,
  requirePending,
  upload.single('proof'),
  validateBody(confirmSchema),
  async (req, res) => {
    const { reference, method, ...buyer } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'PROOF_REQUIRED' });

    const type = ALLOWED[file.mimetype];
    // El mimetype lo declara el cliente: se verifica también la firma real del archivo.
    if (!type || !type.magic.every((b, i) => file.buffer[i] === b)) return res.status(400).json({ error: 'INVALID_FILE' });
    // Nombre aleatorio: nunca se usa el nombre que envió el usuario (evita path traversal).
    const filename = randomUUID() + type.ext;
    await fs.writeFile(path.join(UPLOAD_DIR, filename), file.buffer);

    const r = req.reservation;
    if (r.status !== 'PENDING') return res.status(409).json({ error: 'RESERVATION_NOT_PENDING' }); // pudo vencer durante la subida
    r.buyer = buyer;
    r.proof = { method, reference, filename, mimetype: file.mimetype, uploadedAt: Date.now() };
    r.status = 'PROOF_SUBMITTED';

    const view = reservationView(r);
    notifyAdmins('reservation:proof', view);
    const serials = view.serials.map((s) => `#${s}`).join(', ');
    sendMail({
      to: buyer.email,
      subject: 'Recibimos tu comprobante · Bingo Hogar Sol',
      text: `Hola ${buyer.fullName}, recibimos tu comprobante. Tus cartones (${serials}) están en verificación; te avisaremos por este medio cuando se apruebe el pago.`,
    });
    notifyAdminsByMail({
      subject: `🛒 Nueva compra por verificar · ${formatCRC(view.total)}`,
      text: [
        `${buyer.fullName} envió un comprobante de pago para ${view.eventName}.`,
        '',
        `Monto: ${formatCRC(view.total)}`,
        `Cartones (${view.serials.length}): ${serials}`,
        `Método: ${method === 'SINPE' ? 'SINPE Móvil' : 'Transferencia'} · N.º de comprobante: ${reference}`,
        `Cédula: ${buyer.nationalId} · Teléfono: ${buyer.phone}`,
        `Correo: ${buyer.email}`,
        '',
        `Recuerda verificar que el detalle de la transferencia diga ${PAYMENT_DETAIL_TEXT}.`,
      ].join('\n'),
      action: { label: 'Revisar la compra', url: `${env.clientOrigin}/admin/compras/${r.id}` },
    });
    res.json(view);
  }
);

export default router;
