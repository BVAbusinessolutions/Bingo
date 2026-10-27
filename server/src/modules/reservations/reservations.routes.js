import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { one, query, tx } from '../../db/index.js';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { reservationLimiter, validateBody } from '../../middleware/security.js';
import { notifyAdmins } from '../../realtime.js';
import { notifyAdminsByMail, sendMail } from '../../utils/mailer.js';
import { formatCRC } from '../../utils/format.js';
import { ALLOWED_FILES, getFile, hasValidSignature, saveFile, sendFile } from '../../services/files.js';
import { PAYMENT_DETAIL_TEXT } from '../../services/settings.js';
import {
  RESERVATION_TTL_MS,
  closeReservation,
  findOwnReservation,
  paymentDuplicates,
  releaseExpiredReservations,
  reservationDetailView,
  RESERVATION_SELECT,
  reservationView,
} from './reservations.service.js';
import { HttpError } from '../../utils/httpError.js';

const router = Router();
const MAX_CARDS_PER_RESERVATION = 20;
const MAX_PENDING_PER_USER = 3;

const createSchema = z
  .object({
    eventId: z.string().min(1).max(64),
    quantity: z.number().int().min(1).max(MAX_CARDS_PER_RESERVATION).optional(),
    serials: z
      .array(z.string().regex(/^\d{1,8}$/))
      .min(1)
      .max(MAX_CARDS_PER_RESERVATION)
      .optional(),
  })
  .refine((d) => Boolean(d.quantity) !== Boolean(d.serials), { message: 'Envía quantity O serials' });

// Paso 1: aparta los cartones e inicia el temporizador de pago.
router.post('/', authenticate, reservationLimiter, validateBody(createSchema), async (req, res) => {
  await releaseExpiredReservations();
  const { eventId, quantity, serials } = req.body;

  const user = await one('select email_verified from app.users where id = $1', [req.user.id]);
  if (!user?.email_verified) return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' });

  try {
    const reservationId = await tx(async (q) => {
      const [event] = await q("select id, price from app.events where id = $1 and status = 'SCHEDULED' for share", [eventId]);
      if (!event) throw new HttpError(409, 'EVENT_NOT_ON_SALE');

      const [{ pending }] = await q("select count(*)::int as pending from app.reservations where user_id = $1 and status = 'PENDING'", [
        req.user.id,
      ]);
      if (pending >= MAX_PENDING_PER_USER) throw new HttpError(429, 'TOO_MANY_PENDING');

      const wanted = serials ? [...new Set(serials)] : null;
      const count = wanted ? wanted.length : quantity;
      const [r] = await q(
        `insert into app.reservations (event_id, user_id, status, total, expires_at)
         values ($1, $2, 'PENDING', $3, $4) returning id`,
        [eventId, req.user.id, count * event.price, new Date(Date.now() + RESERVATION_TTL_MS)]
      );

      // Solo se apartan cartones que siguen AVAILABLE en este instante: dos personas no pueden apartar el mismo.
      const taken = wanted
        ? await q(
            `update app.cards set status = 'RESERVED', reservation_id = $1
              where event_id = $2 and serial = any($3::text[]) and status = 'AVAILABLE' returning id`,
            [r.id, eventId, wanted]
          )
        : await q(
            `update app.cards set status = 'RESERVED', reservation_id = $1
              where id in (select id from app.cards where event_id = $2 and status = 'AVAILABLE'
                            order by serial limit $3 for update skip locked)
              returning id`,
            [r.id, eventId, quantity]
          );
      if (taken.length !== count) throw new HttpError(409, wanted ? 'CARDS_NOT_AVAILABLE' : 'NOT_ENOUGH_CARDS');

      await q('insert into app.reservation_cards (reservation_id, card_id) select $1, unnest($2::uuid[])', [r.id, taken.map((c) => c.id)]);
      return r.id;
    });
    res.status(201).json(await reservationDetailView(await findOwnReservation(reservationId, req.user.id)));
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.code });
    throw err;
  }
});

router.get('/mine', authenticate, async (req, res) => {
  await releaseExpiredReservations();
  const rows = await query(`${RESERVATION_SELECT} where r.user_id = $1 order by r.created_at desc limit 100`, [req.user.id]);
  res.json(await Promise.all(rows.map(reservationView)));
});

/** Carga la reserva del usuario: la propiedad se verifica en la consulta (evita IDOR). */
async function ownReservation(req, res, next) {
  await releaseExpiredReservations();
  req.reservation = await findOwnReservation(req.params.id, req.user.id);
  return req.reservation ? next() : res.status(404).json({ error: 'NOT_FOUND' });
}

const requirePending = (req, res, next) =>
  req.reservation.status === 'PENDING' ? next() : res.status(409).json({ error: 'RESERVATION_NOT_PENDING' });

const uuidParam = (req, res, next) =>
  z.string().uuid().safeParse(req.params.id).success ? next() : res.status(404).json({ error: 'NOT_FOUND' });

router.get('/:id', authenticate, uuidParam, ownReservation, async (req, res) => res.json(await reservationDetailView(req.reservation)));

router.get('/:id/proof', authenticate, uuidParam, ownReservation, async (req, res) =>
  sendFile(res, await getFile(req.reservation.proof_file_id))
);

router.delete('/:id', authenticate, uuidParam, ownReservation, requirePending, async (req, res) => {
  const view = await closeReservation(req.reservation.id, 'CANCELLED', { actorId: req.user.id, ip: req.ip }, { from: ['PENDING'] });
  if (!view) return res.status(409).json({ error: 'RESERVATION_NOT_PENDING' });
  res.json(view);
});

// ---------- Paso 2: confirmación de pago (SINPE Móvil / Transferencia) ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10, parts: 12 },
  fileFilter: (req, file, cb) => cb(null, Boolean(ALLOWED_FILES[file.mimetype])),
});

const confirmSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[\p{L}\p{M}\s'.-]+$/u),
  nationalId: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z-]{5,20}$/),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{8,15}$/),
  email: z.string().trim().toLowerCase().email().max(120),
  method: z.enum(['SINPE', 'TRANSFER']),
  // Número de comprobante obligatorio: el admin lo compara con el de la foto y con el banco.
  reference: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z-]{4,30}$/),
});

router.post(
  '/:id/proof',
  authenticate,
  uuidParam,
  ownReservation,
  requirePending,
  upload.single('proof'),
  validateBody(confirmSchema),
  async (req, res) => {
    const { reference, method, fullName, nationalId, phone, email } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'PROOF_REQUIRED' });
    if (!hasValidSignature(file.mimetype, file.buffer)) return res.status(400).json({ error: 'INVALID_FILE' });

    const ok = await tx(async (q) => {
      const fileId = await saveFile(q, { kind: 'PROOF', mime: file.mimetype, data: file.buffer });
      // Solo si sigue PENDING (pudo vencer durante la subida).
      const [r] = await q(
        `update app.reservations
          set status = 'PROOF_SUBMITTED', buyer_full_name = $3, buyer_national_id = $4, buyer_phone = $5, buyer_email = $6,
              payment_method = $7, payment_reference = $8, proof_file_id = $9, proof_uploaded_at = now()
        where id = $1 and user_id = $2 and status = 'PENDING' and expires_at > now() returning id`,
        [req.reservation.id, req.user.id, fullName, nationalId, phone, email, method, reference, fileId]
      );
      if (!r) throw new HttpError(409, 'RESERVATION_NOT_PENDING');
      return true;
    }).catch((err) => {
      if (err instanceof HttpError) return false;
      throw err;
    });
    if (!ok) return res.status(409).json({ error: 'RESERVATION_NOT_PENDING' });

    const row = await findOwnReservation(req.reservation.id, req.user.id);
    const view = await reservationView(row);
    const duplicates = await paymentDuplicates(row);
    notifyAdmins('reservation:proof', view);
    const serials = view.serials.map((s) => `#${s}`).join(', ');
    const duplicateWarning = duplicates.length
      ? [`⚠ ATENCIÓN: este comprobante ya aparece en ${duplicates.length} compra(s) más. Revísalo antes de aprobar.`, '']
      : [];
    sendMail({
      to: email,
      subject: 'Recibimos tu comprobante · Bingo Hogar Sol',
      text: `Hola ${fullName}, recibimos tu comprobante. Tus cartones (${serials}) están en verificación; te avisaremos por este medio cuando se apruebe el pago.`,
    });
    notifyAdminsByMail({
      subject: `${duplicates.length ? '⚠ Comprobante repetido' : '🛒 Nueva compra por verificar'} · ${formatCRC(view.total)}`,
      text: [
        ...duplicateWarning,
        `${fullName} envió un comprobante de pago para ${view.eventName}.`,
        '',
        `Monto: ${formatCRC(view.total)}`,
        `Cartones (${view.serials.length}): ${serials}`,
        `Método: ${method === 'SINPE' ? 'SINPE Móvil' : 'Transferencia'} · N.º de comprobante: ${reference}`,
        `Cédula: ${nationalId} · Teléfono: ${phone}`,
        `Correo: ${email}`,
        '',
        `Recuerda verificar que el detalle de la transferencia diga ${PAYMENT_DETAIL_TEXT}.`,
      ].join('\n'),
      action: { label: 'Revisar la compra', url: `${env.clientOrigin}/admin/compras/${view.id}` },
    });
    res.json(view);
  }
);

export default router;
