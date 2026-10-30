import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { one, query, tx } from '../../db/index.js';
import { validateBody } from '../../middleware/security.js';
import { notifyAdmins } from '../../realtime.js';
import { audit, actorFrom } from '../../services/audit.js';
import { ALLOWED_FILES, getFile, hasValidSignature, saveFile, sendFile } from '../../services/files.js';
import { toCsv } from '../../utils/csv.js';
import { findReservation, reservationView } from '../reservations/reservations.service.js';

/**
 * Finanzas del evento: ingresos verificados (virtuales = compra en línea, físicos = venta en el salón),
 * gastos con su factura o recibo, balance y comprobantes.
 * "Verificado" es lo mismo que en el panel: aprobado por una persona administradora con el método de cobro
 * registrado; las compras de demostración nunca cuentan como dinero.
 */
// Se monta dentro de /api/admin (admin.routes.js), que ya exige sesión de administrador.
const router = Router();

const VERIFIED = "r.status = 'APPROVED' and r.decided_by is not null and r.payment_method is not null";
export const EXPENSE_CATEGORIES = ['PREMIOS', 'LOCAL', 'PUBLICIDAD', 'LOGISTICA', 'IMPRESION', 'OTROS'];
const METHODS = ['SINPE', 'TRANSFER', 'CASH'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 12, parts: 14 },
  fileFilter: (req, file, cb) => cb(null, Boolean(ALLOWED_FILES[file.mimetype])),
});
const uuid = z.string().uuid();

const findEvent = async (req, res, next) => {
  if (!/^[a-z0-9-]{3,64}$/.test(req.params.eventId)) return res.status(404).json({ error: 'NOT_FOUND' });
  req.event = await one('select id, name, price from app.events where id = $1', [req.params.eventId]);
  return req.event ? next() : res.status(404).json({ error: 'NOT_FOUND' });
};
const requireUuid = (req, res, next) => (uuid.safeParse(req.params.id).success ? next() : res.status(404).json({ error: 'NOT_FOUND' }));

/** Error del archivo subido, o null si sirve: debe ser imagen o PDF de verdad (firma), no solo declararlo. */
const fileProblem = (file, required) => {
  if (!file) return required ? 'FILE_REQUIRED' : null;
  return hasValidSignature(file.mimetype, file.buffer) ? null : 'INVALID_FILE';
};

const iso = (d) => (d ? new Date(d).toISOString() : null);
const dateOnly = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));

/** Resumen financiero real del evento (también lo usa el Panel para sus gráficos y conteos). */
export async function financeSummary(eventId) {
  const byChannel = await query(
    `select r.channel, count(rc.card_id)::int as cards
       from app.reservations r join app.reservation_cards rc on rc.reservation_id = r.id
      where r.event_id = $1 and ${VERIFIED}
      group by r.channel`,
    [eventId]
  );
  // Montos en otra consulta: sumar r.total en el join con cartones lo multiplicaría por cada cartón.
  const amounts = await query(
    `select r.channel, r.payment_method as method, count(*)::int as orders, coalesce(sum(r.total), 0)::int as amount,
            count(*) filter (where r.proof_file_id is null)::int as without_proof
       from app.reservations r where r.event_id = $1 and ${VERIFIED}
      group by r.channel, r.payment_method`,
    [eventId]
  );
  const [other] = await query(
    `select
       coalesce(sum(total) filter (where status = 'PROOF_SUBMITTED'), 0)::int as review_amount,
       count(*) filter (where status = 'PROOF_SUBMITTED')::int as review_orders,
       coalesce(sum(total) filter (where status = 'PENDING' and expires_at > now()), 0)::int as awaiting_amount,
       count(*) filter (where status = 'PENDING' and expires_at > now())::int as awaiting_orders,
       coalesce(sum(total) filter (where status = 'REFUNDED'), 0)::int as refunded_amount,
       count(*) filter (where status = 'REFUNDED')::int as refunded_orders
     from app.reservations where event_id = $1`,
    [eventId]
  );
  const [cards] = await query(
    `select count(*)::int as total,
            count(*) filter (where status = 'SOLD')::int as sold,
            count(*) filter (where status = 'AVAILABLE')::int as available,
            count(*) filter (where status = 'RESERVED')::int as reserved
       from app.cards where event_id = $1`,
    [eventId]
  );
  const expenses = await query(
    `select category, count(*)::int as count, coalesce(sum(amount), 0)::int as amount,
            count(*) filter (where receipt_file_id is null)::int as without_receipt
       from app.expenses where event_id = $1 group by category`,
    [eventId]
  );

  const channel = (ch) => {
    const rows = amounts.filter((a) => a.channel === ch);
    return {
      orders: rows.reduce((s, a) => s + a.orders, 0),
      amount: rows.reduce((s, a) => s + a.amount, 0),
      cards: byChannel.find((c) => c.channel === ch)?.cards ?? 0,
    };
  };
  const web = channel('WEB');
  const salon = channel('MANUAL');
  const income = web.amount + salon.amount;
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  return {
    income,
    expenses: spent,
    balance: income - spent,
    // Virtual = comprado en línea; físico = vendido en el salón (venta manual).
    channels: { WEB: web, MANUAL: salon },
    byMethod: Object.fromEntries(
      METHODS.map((m) => {
        const rows = amounts.filter((a) => a.method === m);
        return [m, { orders: rows.reduce((s, a) => s + a.orders, 0), amount: rows.reduce((s, a) => s + a.amount, 0) }];
      })
    ),
    withoutProof: amounts.reduce((s, a) => s + a.without_proof, 0),
    pendingReview: { orders: other.review_orders, amount: other.review_amount },
    awaitingPayment: { orders: other.awaiting_orders, amount: other.awaiting_amount },
    refunded: { orders: other.refunded_orders, amount: other.refunded_amount },
    cards: {
      ...cards,
      soldWeb: web.cards,
      soldSalon: salon.cards,
      // Vendidos sin una compra verificada detrás (p. ej. compras de demostración): se muestran aparte, nunca como dinero.
      soldUnverified: Math.max(cards.sold - web.cards - salon.cards, 0),
    },
    expensesByCategory: Object.fromEntries(
      EXPENSE_CATEGORIES.map((c) => {
        const e = expenses.find((x) => x.category === c);
        return [c, { count: e?.count ?? 0, amount: e?.amount ?? 0 }];
      })
    ),
    expensesWithoutReceipt: expenses.reduce((s, e) => s + e.without_receipt, 0),
  };
}

router.get('/events/:eventId/finance', findEvent, async (req, res) => {
  const summary = await financeSummary(req.event.id);
  // Ventas verificadas sin comprobante adjunto: la lista para ponerse al día (más recientes primero).
  const missing = await query(
    `select r.id, r.channel, r.payment_method, r.total, r.buyer_full_name, r.payment_reference, r.decided_at,
            array(select c.serial from app.reservation_cards rc join app.cards c on c.id = rc.card_id
                   where rc.reservation_id = r.id order by c.serial) as serials
       from app.reservations r
      where r.event_id = $1 and ${VERIFIED} and r.proof_file_id is null
      order by r.decided_at desc limit 50`,
    [req.event.id]
  );
  // Ingresos verificados por día (día de Costa Rica = UTC-6), últimos 14 días, separados en virtual y físico.
  const daily = await query(
    `select to_char(g.day, 'YYYY-MM-DD') as day,
            coalesce(sum(r.total) filter (where r.channel = 'WEB'), 0)::int as web,
            coalesce(sum(r.total) filter (where r.channel = 'MANUAL'), 0)::int as salon
       from generate_series((now() at time zone 'UTC' - interval '6 hours')::date - 13,
                            (now() at time zone 'UTC' - interval '6 hours')::date, interval '1 day') as g(day)
       left join app.reservations r
         on r.event_id = $1 and ${VERIFIED}
        and (r.decided_at at time zone 'UTC' - interval '6 hours')::date = g.day::date
      group by g.day order by g.day`,
    [req.event.id]
  );
  res.json({
    ...summary,
    incomeByDay: daily.map((d) => ({ day: d.day, web: d.web, salon: d.salon })),
    missingProofs: missing.map((r) => ({
      id: r.id,
      channel: r.channel,
      method: r.payment_method,
      total: r.total,
      buyer: r.buyer_full_name,
      reference: r.payment_reference,
      serials: r.serials,
      decidedAt: iso(r.decided_at),
    })),
  });
});

// ---------------------------------------------------------------- Comprobantes adjuntados por la administración
const attachSchema = z.object({
  reference: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z-]{1,30}$/)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

/**
 * Adjunta o reemplaza el comprobante de una compra (ventas del salón, pagos recibidos por otro medio).
 * Solo en compras vigentes (aprobadas o con comprobante en revisión); queda en la bitácora quién lo subió.
 */
router.post('/reservations/:id/proof', requireUuid, upload.single('proof'), validateBody(attachSchema), async (req, res) => {
  const problem = fileProblem(req.file, true);
  if (problem) return res.status(400).json({ error: problem });
  const file = req.file;
  const updated = await tx(async (q) => {
    const [current] = await q(
      "select proof_file_id from app.reservations where id = $1 and status in ('APPROVED', 'PROOF_SUBMITTED') for update",
      [req.params.id]
    );
    if (!current) return null;
    const fileId = await saveFile(q, { kind: 'PROOF', mime: file.mimetype, data: file.buffer });
    const [row] = await q(
      `update app.reservations
          set proof_file_id = $2, proof_uploaded_at = now(), proof_attached_by = $3,
              payment_reference = coalesce($4, payment_reference)
        where id = $1 returning id`,
      [req.params.id, fileId, req.user.id, req.body.reference ?? null]
    );
    await audit(
      {
        ...actorFrom(req),
        action: 'reservation.proof_attached',
        targetType: 'reservation',
        targetId: req.params.id,
        details: { replaced: Boolean(current.proof_file_id), mime: file.mimetype },
      },
      q
    );
    return row;
  });
  if (!updated) return res.status(409).json({ error: 'PROOF_NOT_ATTACHABLE' });
  const view = await reservationView(await findReservation(req.params.id));
  notifyAdmins('reservation:updated', view);
  res.json(view);
});

// ---------------------------------------------------------------- Gastos
const expenseSchema = z.object({
  concept: z.string().trim().min(3).max(120),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.coerce.number().int().min(1).max(100_000_000),
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(METHODS),
  reference: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

const expenseView = (e) => ({
  id: e.id,
  concept: e.concept,
  category: e.category,
  amount: e.amount,
  spentOn: dateOnly(e.spent_on),
  method: e.method,
  reference: e.reference,
  hasReceipt: Boolean(e.receipt_file_id),
  createdAt: iso(e.created_at),
  createdBy: e.created_by_name ?? null,
});
const EXPENSE_SELECT = `select x.*, u.name as created_by_name from app.expenses x left join app.users u on u.id = x.created_by`;

router.get('/events/:eventId/expenses', findEvent, async (req, res) => {
  const rows = await query(`${EXPENSE_SELECT} where x.event_id = $1 order by x.spent_on desc, x.created_at desc limit 500`, [req.event.id]);
  res.json(rows.map(expenseView));
});

router.post('/events/:eventId/expenses', findEvent, upload.single('receipt'), validateBody(expenseSchema), async (req, res) => {
  const problem = fileProblem(req.file, false);
  if (problem) return res.status(400).json({ error: problem });
  const file = req.file;
  const b = req.body;
  const id = await tx(async (q) => {
    const fileId = file ? await saveFile(q, { kind: 'RECEIPT', mime: file.mimetype, data: file.buffer }) : null;
    const [row] = await q(
      `insert into app.expenses (event_id, concept, category, amount, spent_on, method, reference, receipt_file_id, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
      [req.event.id, b.concept, b.category, b.amount, b.spentOn, b.method, b.reference ?? null, fileId, req.user.id]
    );
    await audit(
      {
        ...actorFrom(req),
        action: 'expense.created',
        targetType: 'expense',
        targetId: row.id,
        details: { amount: b.amount, category: b.category },
      },
      q
    );
    return row.id;
  });
  notifyAdmins('finance:updated', { eventId: req.event.id });
  res.status(201).json(expenseView(await one(`${EXPENSE_SELECT} where x.id = $1`, [id])));
});

/** Factura o recibo de un gasto registrado sin él (o reemplazarlo). */
router.post('/expenses/:id/receipt', requireUuid, upload.single('receipt'), async (req, res) => {
  const problem = fileProblem(req.file, true);
  if (problem) return res.status(400).json({ error: problem });
  const file = req.file;
  const row = await tx(async (q) => {
    const fileId = await saveFile(q, { kind: 'RECEIPT', mime: file.mimetype, data: file.buffer });
    const [r] = await q('update app.expenses set receipt_file_id = $2 where id = $1 returning id, event_id', [req.params.id, fileId]);
    if (r) await audit({ ...actorFrom(req), action: 'expense.receipt_attached', targetType: 'expense', targetId: r.id }, q);
    return r;
  });
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
  notifyAdmins('finance:updated', { eventId: row.event_id });
  res.json(expenseView(await one(`${EXPENSE_SELECT} where x.id = $1`, [row.id])));
});

router.get('/expenses/:id/receipt', requireUuid, async (req, res) => {
  const row = await one('select receipt_file_id from app.expenses where id = $1', [req.params.id]);
  sendFile(res, await getFile(row?.receipt_file_id));
});

router.delete('/expenses/:id', requireUuid, async (req, res) => {
  const row = await tx(async (q) => {
    const [r] = await q('delete from app.expenses where id = $1 returning id, event_id, concept, amount', [req.params.id]);
    if (r) {
      await audit(
        {
          ...actorFrom(req),
          action: 'expense.deleted',
          targetType: 'expense',
          targetId: r.id,
          details: { concept: r.concept, amount: r.amount },
        },
        q
      );
    }
    return r;
  });
  if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
  notifyAdmins('finance:updated', { eventId: row.event_id });
  res.status(204).end();
});

// ---------------------------------------------------------------- Exportar (Excel)
const CHANNEL = { WEB: 'Virtual (en línea)', MANUAL: 'Físico (salón)' };
const METHOD = { SINPE: 'SINPE Móvil', TRANSFER: 'Transferencia', CASH: 'Efectivo' };

/** Libro del evento: cada ingreso verificado y cada gasto, con su comprobante sí/no, listo para Excel. */
router.get('/events/:eventId/finance/export.csv', findEvent, async (req, res) => {
  const income = await query(
    `select r.decided_at as at, r.channel, r.payment_method, r.total, r.buyer_full_name, r.payment_reference, r.proof_file_id,
            array(select c.serial from app.reservation_cards rc join app.cards c on c.id = rc.card_id where rc.reservation_id = r.id) as serials
       from app.reservations r where r.event_id = $1 and ${VERIFIED} order by r.decided_at`,
    [req.event.id]
  );
  const spent = await query('select * from app.expenses where event_id = $1 order by spent_on, created_at', [req.event.id]);
  const csv = toCsv(
    // Ingreso y gasto en columnas aparte y siempre positivos: un "-" inicial lo neutraliza toCsv (anti fórmulas) y Excel no lo sumaría.
    ['Fecha', 'Tipo', 'Canal o categoría', 'Concepto', 'Método', 'Referencia', 'Ingreso (₡)', 'Gasto (₡)', 'Comprobante'],
    [
      ...income.map((r) => [
        iso(r.at),
        'Ingreso',
        CHANNEL[r.channel] ?? r.channel,
        `${r.buyer_full_name ?? ''} · cartones ${(r.serials ?? []).join(' ')}`,
        METHOD[r.payment_method] ?? '',
        r.payment_reference ?? '',
        r.total,
        '',
        r.proof_file_id ? 'Sí' : 'No',
      ]),
      ...spent.map((e) => [
        dateOnly(e.spent_on),
        'Gasto',
        e.category,
        e.concept,
        METHOD[e.method] ?? e.method,
        e.reference ?? '',
        '',
        e.amount,
        e.receipt_file_id ? 'Sí' : 'No',
      ]),
    ]
  );
  await audit({
    ...actorFrom(req),
    action: 'finance.exported',
    targetType: 'event',
    targetId: req.event.id,
    details: { rows: income.length + spent.length },
  });
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="finanzas-${req.event.id}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

export default router;
