import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { z } from 'zod';
import { one, query, tx } from '../../db/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody, validateQuery, zipUploadLimiter } from '../../middleware/security.js';
import { notifyAdmins } from '../../realtime.js';
import { sendMail } from '../../utils/mailer.js';
import { audit, actorFrom } from '../../services/audit.js';
import { getFile, sendFile } from '../../services/files.js';
import { getPayment, updatePayment } from '../../services/settings.js';
import { HttpError } from '../../utils/httpError.js';
import { toCsv } from '../../utils/csv.js';
import { EVENT_SELECT, publicEvent } from '../events/events.routes.js';
import { broadcast } from '../draw/draw.js';
import { revokeAllFor } from '../auth/auth.routes.js';
import { emailField, nameField, newPasswordField } from '../auth/auth.schemas.js';
import {
  RESERVATION_SELECT,
  approveReservation,
  closeReservation,
  findReservation,
  paymentDuplicates,
  releaseExpiredReservations,
  reservationDetailView,
  reservationView,
} from '../reservations/reservations.service.js';
import { adminClaimView, decideClaim, listClaims } from '../claims/claims.service.js';
import {
  assignSeriesToEvent,
  createGeneratedSeries,
  deleteSeries,
  getSeries,
  listSeries,
  listSeriesCards,
  startImport,
  updateSeriesCard,
} from '../series/series.service.js';
import { readPngsFromZip } from '../series/zipReader.js';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

const uuid = z.string().uuid();
const eventIdSchema = z.string().regex(/^[a-z0-9-]{3,64}$/);

/** Convierte HttpError en respuesta; cualquier otro error sigue al manejador global (500 genérico). */
const send = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.code, ...(err.problems && { problems: err.problems }) });
    throw err;
  }
};

const findEvent = async (req, res, next) => {
  if (!eventIdSchema.safeParse(req.params.eventId).success) return res.status(404).json({ error: 'NOT_FOUND' });
  req.event = await one(`${EVENT_SELECT} where e.id = $1`, [req.params.eventId]);
  return req.event ? next() : res.status(404).json({ error: 'NOT_FOUND' });
};

const requireUuid = (param) => (req, res, next) =>
  uuid.safeParse(req.params[param]).success ? next() : res.status(404).json({ error: 'NOT_FOUND' });

const adminEvent = (e) => ({ ...publicEvent(e), seriesId: e.series_id, seriesName: e.series_name });

// ---------------------------------------------------------------- Dashboard
router.get('/events/:eventId/stats', findEvent, async (req, res) => {
  await releaseExpiredReservations();
  const [s] = await query(
    `select
       count(*)::int as total,
       count(*) filter (where status = 'SOLD')::int as sold,
       count(*) filter (where status = 'AVAILABLE')::int as available,
       count(*) filter (where status = 'RESERVED')::int as reserved,
       (select count(*)::int from app.reservations where event_id = $1 and status = 'PROOF_SUBMITTED') as pending_review,
       (select count(*)::int from app.reservations where event_id = $1 and status = 'PENDING') as awaiting_payment,
       (select coalesce(sum(total), 0)::int from app.reservations where event_id = $1 and status = 'APPROVED') as revenue,
       (select count(*)::int from app.draws where event_id = $1) as called
     from app.cards where event_id = $1`,
    [req.event.id]
  );
  res.json({
    total: s.total,
    sold: s.sold,
    available: s.available,
    reserved: s.reserved,
    revenue: s.revenue,
    pendingReview: s.pending_review,
    awaitingPayment: s.awaiting_payment,
    called: s.called,
  });
});

// ---------------------------------------------------------------- Eventos
const streamSchema = z.object({
  provider: z.enum(['youtube', 'twitch', 'vimeo']),
  videoId: z.string().regex(/^[A-Za-z0-9_-]{2,64}$/),
});
const eventSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(300).optional().default(''),
  pattern: z.enum(['LINE', 'FOUR_CORNERS', 'X', 'FULL']),
  price: z.number().int().min(0).max(1_000_000),
  startsAt: z.string().datetime({ offset: true }),
  stream: streamSchema.nullable().optional(),
});

router.get('/events', async (req, res) => {
  await releaseExpiredReservations();
  const rows = await query(`${EVENT_SELECT} order by e.starts_at desc limit 100`);
  res.json(rows.map(adminEvent));
});

router.post('/events', validateBody(eventSchema), async (req, res) => {
  const { name, description, pattern, price, startsAt, stream } = req.body;
  const e = await one(
    `insert into app.events (name, description, pattern, price, starts_at, stream_provider, stream_video_id)
     values ($1, $2, $3, $4, $5, $6, $7) returning id`,
    [name, description, pattern, price, startsAt, stream?.provider ?? null, stream?.videoId ?? null]
  );
  await audit({ ...actorFrom(req), action: 'event.created', targetType: 'event', targetId: e.id, details: { name } });
  res.status(201).json(adminEvent(await one(`${EVENT_SELECT} where e.id = $1`, [e.id])));
});

// Transiciones válidas: programado -> en vivo / cancelado; en vivo -> finalizado / cancelado.
const TRANSITIONS = { SCHEDULED: ['LIVE', 'CANCELLED'], LIVE: ['FINISHED', 'CANCELLED'], FINISHED: [], CANCELLED: [] };

router.patch(
  '/events/:eventId',
  findEvent,
  validateBody(eventSchema.partial().extend({ status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED']).optional() })),
  send(async (req, res) => {
    const e = req.event;
    const b = req.body;
    if (b.status && b.status !== e.status && !TRANSITIONS[e.status].includes(b.status)) throw new HttpError(409, 'INVALID_STATUS_CHANGE');
    if (['FINISHED', 'CANCELLED'].includes(e.status) && Object.keys(b).some((k) => k !== 'status'))
      throw new HttpError(409, 'EVENT_CLOSED');
    const [{ sales }] = await query(
      "select count(*)::int as sales from app.reservations where event_id = $1 and status in ('PENDING', 'PROOF_SUBMITTED', 'APPROVED')",
      [e.id]
    );
    // Con ventas, precio y patrón quedan fijos: cambiarlos alteraría lo que la gente ya compró.
    if (sales > 0 && ((b.price !== undefined && b.price !== e.price) || (b.pattern && b.pattern !== e.pattern))) {
      throw new HttpError(409, 'EVENT_HAS_SALES');
    }
    const stream = b.stream === undefined ? undefined : b.stream;
    await query(
      `update app.events set
         name = coalesce($2, name), description = coalesce($3, description), pattern = coalesce($4, pattern),
         price = coalesce($5, price), starts_at = coalesce($6, starts_at), status = coalesce($7, status),
         stream_provider = case when $8 then $9 else stream_provider end,
         stream_video_id = case when $8 then $10 else stream_video_id end,
         updated_at = now()
       where id = $1`,
      [
        e.id,
        b.name ?? null,
        b.description ?? null,
        b.pattern ?? null,
        b.price ?? null,
        b.startsAt ?? null,
        b.status ?? null,
        stream !== undefined,
        stream?.provider ?? null,
        stream?.videoId ?? null,
      ]
    );
    // Cancelar un evento cierra las compras sin aprobar y avisa a quienes ya enviaron comprobante.
    // Las compras aprobadas se reembolsan una por una desde Compras (queda registro de cada devolución).
    if (b.status === 'CANCELLED') {
      const open = await query(
        "select id, buyer_email, buyer_full_name from app.reservations where event_id = $1 and status in ('PENDING', 'PROOF_SUBMITTED')",
        [e.id]
      );
      for (const r of open) {
        await closeReservation(r.id, 'CANCELLED', actorFrom(req));
        if (r.buyer_email) {
          sendMail({
            to: r.buyer_email,
            subject: `Evento cancelado · ${e.name}`,
            text: `Hola ${r.buyer_full_name}, el evento ${e.name} fue cancelado. Si ya realizaste el pago, la Asociación te contactará para la devolución.`,
          });
        }
      }
    }
    await audit({ ...actorFrom(req), action: 'event.updated', targetType: 'event', targetId: e.id, details: { fields: Object.keys(b) } });
    await broadcast(e.id);
    res.json(adminEvent(await one(`${EVENT_SELECT} where e.id = $1`, [e.id])));
  })
);

router.post(
  '/events/:eventId/series',
  findEvent,
  validateBody(z.object({ seriesId: uuid })),
  send(async (req, res) => {
    const cards = await assignSeriesToEvent(req.event.id, req.body.seriesId, actorFrom(req));
    res.json({ cards, event: adminEvent(await one(`${EVENT_SELECT} where e.id = $1`, [req.event.id])) });
  })
);

// ---------------------------------------------------------------- Cartones del evento
const cardsQuery = z.object({
  status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD']).optional(),
  q: z
    .string()
    .regex(/^\d{0,8}$/)
    .optional()
    .default(''),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
});

router.get('/events/:eventId/cards', findEvent, validateQuery(cardsQuery), async (req, res) => {
  await releaseExpiredReservations();
  const { status, q, page } = req.validQuery;
  const pageSize = 50;
  const [summaryRow] = await query(
    `select count(*) filter (where status = 'AVAILABLE')::int as available, count(*) filter (where status = 'RESERVED')::int as reserved,
            count(*) filter (where status = 'SOLD')::int as sold
       from app.cards where event_id = $1`,
    [req.event.id]
  );
  const params = [req.event.id, status ?? null, q ? `%${q}%` : null];
  const where = 'c.event_id = $1 and ($2::text is null or c.status = $2) and ($3::text is null or c.serial like $3)';
  const [{ total }] = await query(`select count(*)::int as total from app.cards c where ${where}`, params);
  const rows = await query(
    `select c.id, c.serial, c.status, c.grid, c.series_card_id, sc.image_id, u.name as owner, r.buyer_full_name
       from app.cards c
       left join app.users u on u.id = c.owner_id
       left join app.reservations r on r.id = c.reservation_id
       left join app.series_cards sc on sc.id = c.series_card_id
      where ${where}
      order by length(c.serial), c.serial limit ${pageSize} offset $4`,
    [...params, (page - 1) * pageSize]
  );
  res.json({
    summary: { AVAILABLE: summaryRow.available, RESERVED: summaryRow.reserved, SOLD: summaryRow.sold },
    total,
    page,
    pageSize,
    cards: rows.map((c) => ({
      id: c.id,
      serial: c.serial,
      status: c.status,
      grid: c.grid,
      owner: c.owner ?? c.buyer_full_name ?? null,
      imageUrl: c.image_id ? `/api/card-images/${c.series_card_id}` : null,
    })),
  });
});

/** Todos los cartones de un rango para imprimir en lote (máx. 200 por vez). */
router.get(
  '/events/:eventId/cards/print',
  findEvent,
  validateQuery(z.object({ from: z.string().regex(/^\d{1,8}$/), to: z.string().regex(/^\d{1,8}$/) })),
  async (req, res) => {
    const { from, to } = req.validQuery;
    const rows = await query(
      `select c.serial, c.grid, c.series_card_id, sc.image_id
         from app.cards c left join app.series_cards sc on sc.id = c.series_card_id
        where c.event_id = $1 and c.serial ~ '^[0-9]+$' and c.serial::bigint between $2::bigint and $3::bigint
        order by c.serial::bigint limit 200`,
      [req.event.id, from, to]
    );
    res.json({
      event: adminEvent(req.event),
      cards: rows.map((c) => ({ serial: c.serial, grid: c.grid, imageUrl: c.image_id ? `/api/card-images/${c.series_card_id}` : null })),
    });
  }
);

// ---------------------------------------------------------------- Compras
const reservationsQuery = z.object({
  status: z.enum(['PENDING', 'PROOF_SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'REFUNDED', '']).optional().default(''),
  eventId: z
    .string()
    .regex(/^[a-z0-9-]{0,64}$/)
    .optional()
    .default(''),
});

const listReservations = (status, eventId, limit = 500) =>
  query(
    `${RESERVATION_SELECT}
      where ($1::text = '' or r.status = $1) and ($2::text = '' or r.event_id = $2)
      order by r.created_at desc limit ${Number(limit)}`,
    [status, eventId]
  );

router.get('/reservations', validateQuery(reservationsQuery), async (req, res) => {
  await releaseExpiredReservations();
  const rows = await listReservations(req.validQuery.status, req.validQuery.eventId);
  res.json(await Promise.all(rows.map(reservationView)));
});

/** Exporta compras a CSV (abre en Excel). Filtros iguales a la lista. */
router.get('/reservations/export.csv', validateQuery(reservationsQuery), async (req, res) => {
  const rows = await listReservations(req.validQuery.status, req.validQuery.eventId, 20_000);
  const METHOD = { SINPE: 'SINPE Móvil', TRANSFER: 'Transferencia', CASH: 'Efectivo' };
  const csv = toCsv(
    [
      'Fecha',
      'Evento',
      'Estado',
      'Canal',
      'Comprador',
      'Cédula',
      'Teléfono',
      'Correo',
      'Cartones',
      'Cantidad',
      'Total (₡)',
      'Método',
      'N.º comprobante',
      'Decidida',
    ],
    rows.map((r) => [
      new Date(r.created_at).toISOString(),
      r.event_name,
      r.status,
      r.channel,
      r.buyer_full_name ?? '',
      r.buyer_national_id ?? '',
      r.buyer_phone ?? '',
      r.buyer_email ?? '',
      (r.serials ?? []).join(' '),
      (r.serials ?? []).length,
      r.total,
      METHOD[r.payment_method] ?? '',
      r.payment_reference ?? '',
      r.decided_at ? new Date(r.decided_at).toISOString() : '',
    ])
  );
  await audit({ ...actorFrom(req), action: 'reservations.exported', details: { rows: rows.length, ...req.validQuery } });
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="compras-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

router.get('/reservations/:id', requireUuid('id'), async (req, res) => {
  await releaseExpiredReservations();
  const r = await findReservation(req.params.id);
  if (!r) return res.status(404).json({ error: 'NOT_FOUND' });
  const account = r.user_id ? await one('select name, email, phone, email_verified from app.users where id = $1', [r.user_id]) : null;
  res.json({
    ...(await reservationDetailView(r)),
    account: account && { name: account.name, email: account.email, phone: account.phone, emailVerified: account.email_verified },
    duplicates: await paymentDuplicates(r),
  });
});

router.get('/reservations/:id/proof', requireUuid('id'), async (req, res) => {
  const r = await one('select proof_file_id from app.reservations where id = $1', [req.params.id]);
  sendFile(res, await getFile(r?.proof_file_id));
});

// Solo se decide sobre compras con comprobante enviado (y que no hayan vencido).
router.post('/reservations/:id/decision', requireUuid('id'), validateBody(z.object({ approve: z.boolean() })), async (req, res) => {
  await releaseExpiredReservations();
  const view = req.body.approve
    ? await approveReservation(req.params.id, actorFrom(req))
    : await closeReservation(req.params.id, 'REJECTED', actorFrom(req), { from: ['PROOF_SUBMITTED'] });
  if (!view) return res.status(409).json({ error: 'NOT_DECIDABLE' });
  res.json(view);
});

/** Reembolso de una compra aprobada: los cartones dejan de pertenecer al comprador y vuelven a la venta. */
router.post('/reservations/:id/refund', requireUuid('id'), async (req, res) => {
  const r = await one(
    `select r.event_id, e.status as event_status, (select count(*)::int from app.draws d where d.event_id = r.event_id) as drawn
       from app.reservations r join app.events e on e.id = r.event_id where r.id = $1`,
    [req.params.id]
  );
  if (!r) return res.status(404).json({ error: 'NOT_FOUND' });
  // Con el sorteo en marcha solo se reembolsa si el evento se canceló (si no, alguien podría devolver un cartón perdedor).
  if (r.drawn > 0 && r.event_status !== 'CANCELLED') return res.status(409).json({ error: 'EVENT_ALREADY_STARTED' });
  const view = await closeReservation(req.params.id, 'REFUNDED', actorFrom(req), { from: ['APPROVED'] });
  if (!view) return res.status(409).json({ error: 'NOT_REFUNDABLE' });
  res.json(view);
});

/** Venta manual (efectivo o SINPE recibido en persona): queda aprobada al instante. */
const manualSaleSchema = z.object({
  eventId: eventIdSchema,
  serials: z
    .array(z.string().regex(/^\d{1,8}$/))
    .min(1)
    .max(50),
  fullName: nameField,
  nationalId: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z-]{5,20}$/),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{8,15}$/),
  email: emailField.optional().or(z.literal('').transform(() => undefined)),
  method: z.enum(['CASH', 'SINPE', 'TRANSFER']),
  reference: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z-]{1,30}$/)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

router.post(
  '/manual-sales',
  validateBody(manualSaleSchema),
  send(async (req, res) => {
    await releaseExpiredReservations();
    const b = req.body;
    const actor = actorFrom(req);
    const id = await tx(async (q) => {
      const [event] = await q("select id, price from app.events where id = $1 and status in ('SCHEDULED', 'LIVE')", [b.eventId]);
      if (!event) throw new HttpError(409, 'EVENT_NOT_ON_SALE');
      // Si el comprador tiene cuenta con ese correo, los cartones aparecen en su sesión para jugar en línea.
      const [owner] = b.email ? await q("select id from app.users where email = $1 and status = 'ACTIVE'", [b.email]) : [];
      const serials = [...new Set(b.serials)];
      const [r] = await q(
        `insert into app.reservations
           (event_id, user_id, channel, status, total, buyer_full_name, buyer_national_id, buyer_phone, buyer_email,
            payment_method, payment_reference, expires_at, decided_at, decided_by)
         values ($1, $2, 'MANUAL', 'APPROVED', $3, $4, $5, $6, $7, $8, $9, now(), now(), $10) returning id`,
        [
          event.id,
          owner?.id ?? null,
          serials.length * event.price,
          b.fullName,
          b.nationalId,
          b.phone,
          b.email ?? null,
          b.method,
          b.reference ?? null,
          actor.actorId,
        ]
      );
      const taken = await q(
        `update app.cards set status = 'SOLD', reservation_id = $1, owner_id = $2
          where event_id = $3 and serial = any($4::text[]) and status = 'AVAILABLE' returning id`,
        [r.id, owner?.id ?? null, event.id, serials]
      );
      if (taken.length !== serials.length) throw new HttpError(409, 'CARDS_NOT_AVAILABLE');
      await q('insert into app.reservation_cards (reservation_id, card_id) select $1, unnest($2::uuid[])', [r.id, taken.map((c) => c.id)]);
      await audit(
        { ...actor, action: 'reservation.manual_sale', targetType: 'reservation', targetId: r.id, details: { serials, method: b.method } },
        q
      );
      return r.id;
    });
    const view = await reservationView(await findReservation(id));
    notifyAdmins('reservation:updated', view);
    res.status(201).json(view);
  })
);

// ---------------------------------------------------------------- Reclamos de bingo
router.get(
  '/claims',
  validateQuery(
    z.object({
      eventId: z
        .string()
        .regex(/^[a-z0-9-]{0,64}$/)
        .optional()
        .default(''),
    })
  ),
  async (req, res) => {
    res.json((await listClaims(req.validQuery.eventId)).map(adminClaimView));
  }
);

router.post('/claims/:id/decision', requireUuid('id'), validateBody(z.object({ approve: z.boolean() })), async (req, res) => {
  const view = await decideClaim(req.params.id, req.body.approve, actorFrom(req));
  if (!view) return res.status(409).json({ error: 'NOT_DECIDABLE' });
  res.json(view);
});

// ---------------------------------------------------------------- Usuarios
const usersQuery = z.object({
  q: z.string().trim().max(80).optional().default(''),
  role: z.enum(['ADMIN', 'CLIENTE', '']).optional().default(''),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
});

const adminUserView = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  status: u.status,
  emailVerified: u.email_verified,
  lockedUntil: u.locked_until && new Date(u.locked_until) > new Date() ? new Date(u.locked_until).toISOString() : null,
  createdAt: new Date(u.created_at).toISOString(),
  purchases: u.purchases ?? 0,
});

router.get('/users', validateQuery(usersQuery), async (req, res) => {
  const { q, role, page } = req.validQuery;
  const pageSize = 25;
  const params = [q ? `%${q.toLowerCase()}%` : null, role || null];
  const where = '($1::text is null or lower(u.name) like $1 or u.email like $1 or u.phone like $1) and ($2::text is null or u.role = $2)';
  const [{ total }] = await query(`select count(*)::int as total from app.users u where ${where}`, params);
  const rows = await query(
    `select u.*, (select count(*)::int from app.reservations r where r.user_id = u.id and r.status = 'APPROVED') as purchases
       from app.users u where ${where} order by u.created_at desc limit ${pageSize} offset $3`,
    [...params, (page - 1) * pageSize]
  );
  res.json({ total, page, pageSize, users: rows.map(adminUserView) });
});

router.post(
  '/users',
  validateBody(z.object({ name: nameField, email: emailField, password: newPasswordField, role: z.enum(['ADMIN', 'CLIENTE']) })),
  async (req, res) => {
    const { name, email, password, role } = req.body;
    const u = await one(
      `insert into app.users (name, email, password_hash, role, email_verified) values ($1, $2, $3, $4, true)
       on conflict (email) do nothing returning *`,
      [name, email, await bcrypt.hash(password, 12), role]
    );
    if (!u) return res.status(409).json({ error: 'EMAIL_TAKEN' });
    await audit({ ...actorFrom(req), action: 'user.created', targetType: 'user', targetId: u.id, details: { role } });
    res.status(201).json(adminUserView(u));
  }
);

router.patch(
  '/users/:id',
  requireUuid('id'),
  validateBody(
    z.object({
      role: z.enum(['ADMIN', 'CLIENTE']).optional(),
      status: z.enum(['ACTIVE', 'DISABLED']).optional(),
      unlock: z.literal(true).optional(),
    })
  ),
  async (req, res) => {
    if (req.params.id === req.user.id && (req.body.role === 'CLIENTE' || req.body.status === 'DISABLED')) {
      return res.status(409).json({ error: 'CANNOT_CHANGE_SELF' }); // evita quedarse sin acceso por error
    }
    const u = await one(
      `update app.users set role = coalesce($2, role), status = coalesce($3, status),
              failed_logins = case when $4 then 0 else failed_logins end,
              locked_until = case when $4 then null else locked_until end, updated_at = now()
        where id = $1 returning *`,
      [req.params.id, req.body.role ?? null, req.body.status ?? null, Boolean(req.body.unlock)]
    );
    if (!u) return res.status(404).json({ error: 'NOT_FOUND' });
    if (req.body.status === 'DISABLED' || req.body.role) await revokeAllFor(u.id); // aplica de inmediato
    await audit({ ...actorFrom(req), action: 'user.updated', targetType: 'user', targetId: u.id, details: req.body });
    res.json(adminUserView(u));
  }
);

// ---------------------------------------------------------------- Bitácora
const auditQuery = z.object({
  action: z
    .string()
    .regex(/^[a-z_.]{0,64}$/)
    .optional()
    .default(''),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
});

router.get('/audit', validateQuery(auditQuery), async (req, res) => {
  const { action, page } = req.validQuery;
  const pageSize = 50;
  const params = [action ? `${action}%` : null];
  const [{ total }] = await query('select count(*)::int as total from app.audit_log where ($1::text is null or action like $1)', params);
  const rows = await query(
    `select a.id, a.action, a.target_type, a.target_id, a.details, a.ip, a.created_at, u.name as actor_name, u.email as actor_email
       from app.audit_log a left join app.users u on u.id = a.actor_id
      where ($1::text is null or a.action like $1)
      order by a.id desc limit ${pageSize} offset $2`,
    [...params, (page - 1) * pageSize]
  );
  res.json({
    total,
    page,
    pageSize,
    entries: rows.map((a) => ({
      id: a.id,
      action: a.action,
      targetType: a.target_type,
      targetId: a.target_id,
      details: a.details,
      ip: a.ip,
      createdAt: new Date(a.created_at).toISOString(),
      actor: a.actor_name ? { name: a.actor_name, email: a.actor_email } : null,
    })),
  });
});

// ---------------------------------------------------------------- Configuración de cobro
const paymentSchema = z.object({
  holder: z.string().trim().min(3).max(120),
  holderId: z.string().trim().min(3).max(30),
  sinpePhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{8,15}$/),
  bank: z.string().trim().min(3).max(80),
  iban: z
    .string()
    .trim()
    .regex(/^CR[0-9\s]{20,30}$/i),
});

router.get('/settings/payment', async (req, res) => res.json(await getPayment()));

router.put('/settings/payment', validateBody(paymentSchema), async (req, res) => {
  const payment = await updatePayment(req.body, req.user.id);
  await audit({ ...actorFrom(req), action: 'settings.payment_updated', details: { sinpePhone: req.body.sinpePhone } });
  res.json(payment);
});

// ---------------------------------------------------------------- Series de cartones
const zipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024, files: 1, fields: 5, parts: 6 },
  fileFilter: (req, file, cb) => cb(null, /\.zip$/i.test(file.originalname) || /zip/.test(file.mimetype)),
});

router.get('/series', async (req, res) => res.json(await listSeries()));

router.post(
  '/series/generate',
  validateBody(
    z.object({
      name: z.string().trim().min(1).max(120),
      count: z.number().int().min(1).max(5000),
      startSerial: z.number().int().min(1).max(99_990_000),
    })
  ),
  async (req, res) => {
    const id = await createGeneratedSeries(req.body, actorFrom(req));
    res.status(201).json(await getSeries(id));
  }
);

router.post(
  '/series/import',
  zipUploadLimiter,
  zipUpload.single('file'),
  send(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'ZIP_REQUIRED' });
    const name = z.string().trim().min(1).max(120).safeParse(req.body?.name).data ?? req.file.originalname.replace(/\.zip$/i, '');
    const pngs = await readPngsFromZip(req.file.buffer);
    const id = await startImport({ name, fileName: req.file.originalname.slice(0, 200), pngs }, actorFrom(req));
    res.status(202).json(await getSeries(id));
  })
);

router.get('/series/:id', requireUuid('id'), async (req, res) => {
  const s = await getSeries(req.params.id);
  if (!s) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(s);
});

router.get(
  '/series/:id/cards',
  requireUuid('id'),
  validateQuery(
    z.object({
      page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
      review: z.enum(['true', 'false']).optional(),
      q: z
        .string()
        .regex(/^\d{0,8}$/)
        .optional()
        .default(''),
    })
  ),
  async (req, res) => {
    const { page, review, q } = req.validQuery;
    res.json(await listSeriesCards(req.params.id, { page, onlyReview: review === 'true', q }));
  }
);

const gridSchema = z.array(z.array(z.number().int().min(1).max(75).nullable()).length(5)).length(5);

router.put(
  '/series-cards/:id',
  requireUuid('id'),
  validateBody(z.object({ serial: z.string().regex(/^\d{1,8}$/), grid: gridSchema })),
  send(async (req, res) => {
    await updateSeriesCard(req.params.id, req.body, actorFrom(req));
    res.status(204).end();
  })
);

router.delete(
  '/series/:id',
  requireUuid('id'),
  send(async (req, res) => {
    await deleteSeries(req.params.id, actorFrom(req));
    res.status(204).end();
  })
);

export default router;
