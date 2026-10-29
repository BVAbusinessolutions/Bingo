import { one, query, tx } from '../../db/index.js';
import { env } from '../../config/env.js';
import { notifyAdmins, notifyUser } from '../../realtime.js';
import { sendMail } from '../../utils/mailer.js';
import { formatCRC } from '../../utils/format.js';
import { getPayment } from '../../services/settings.js';
import { audit } from '../../services/audit.js';
import { logger } from '../../utils/logger.js';

export const RESERVATION_TTL_MS = env.reservationTtlMin * 60_000;

/** Columnas de una reserva + nombre del evento + series de sus cartones (historial, aunque se hayan liberado). */
export const RESERVATION_SELECT = `
  select r.*, e.name as event_name,
         coalesce((select array_agg(c.serial order by c.serial)
                     from app.reservation_cards rc join app.cards c on c.id = rc.card_id
                    where rc.reservation_id = r.id), '{}') as serials
    from app.reservations r
    join app.events e on e.id = r.event_id`;

const iso = (d) => (d ? new Date(d).toISOString() : null);

/** Vista pública de una reserva (para el dueño y el admin). */
export async function reservationView(r) {
  return {
    id: r.id,
    eventId: r.event_id,
    eventName: r.event_name,
    status: r.status, // PENDING | PROOF_SUBMITTED | APPROVED | REJECTED | EXPIRED | CANCELLED | REFUNDED
    channel: r.channel,
    buyer: r.buyer_full_name
      ? { fullName: r.buyer_full_name, nationalId: r.buyer_national_id, phone: r.buyer_phone, email: r.buyer_email }
      : null,
    serials: r.serials ?? [],
    total: r.total,
    createdAt: iso(r.created_at),
    expiresAt: iso(r.expires_at),
    reference: r.payment_reference ?? null,
    method: r.payment_method ?? null,
    hasProof: Boolean(r.proof_file_id),
    proofUploadedAt: iso(r.proof_uploaded_at),
    decidedAt: iso(r.decided_at),
    refundedAt: iso(r.refunded_at),
    payment: await getPayment(),
  };
}

export const findReservation = (id) => one(`${RESERVATION_SELECT} where r.id = $1`, [id]);

/** N.º de comprobante normalizado en SQL (igual que el índice de 002_payment_duplicates.sql). */
const normRef = (col) => `upper(regexp_replace(${col}, '[^0-9A-Za-z]', '', 'g'))`;

/**
 * Otras compras que usan el mismo n.º de comprobante o la misma foto (posible reutilización de un pago).
 * El admin lo ve antes de aprobar; no bloquea nada por sí solo.
 */
export async function paymentDuplicates(r) {
  if (!r.payment_reference && !r.proof_file_id) return [];
  const rows = await query(
    `with me as (
       select ${normRef('$2::text')} as ref, (select sha256 from app.files where id = $3) as sha256
     ),
     same_img as (
       select f.id from app.files f, me
        where f.kind = 'PROOF' and me.sha256 is not null and f.sha256 = me.sha256
     )
     select o.id, o.status, o.buyer_full_name, o.total, o.proof_uploaded_at, o.created_at, e.name as event_name,
            (me.ref <> '' and ${normRef('o.payment_reference')} = me.ref) as same_reference,
            (o.proof_file_id in (select id from same_img)) as same_image
       from app.reservations o
       join app.events e on e.id = o.event_id
       cross join me
      where o.id <> $1
        and ((me.ref <> '' and o.payment_reference is not null and ${normRef('o.payment_reference')} = me.ref)
          or o.proof_file_id in (select id from same_img))
      order by coalesce(o.proof_uploaded_at, o.created_at) desc
      limit 10`,
    [r.id, r.payment_reference ?? '', r.proof_file_id ?? null]
  );
  return rows.map((o) => ({
    id: o.id,
    status: o.status,
    buyerName: o.buyer_full_name,
    eventName: o.event_name,
    total: o.total,
    at: iso(o.proof_uploaded_at ?? o.created_at),
    sameReference: o.same_reference,
    sameImage: o.same_image,
  }));
}

/** Cédula normalizada en SQL (igual que el índice de 003_sanctions_streaming.sql). */
const normId = (col) => `upper(regexp_replace(${col}, '[^0-9A-Za-z]', '', 'g'))`;

/**
 * Otras cuentas que compraron con la misma cédula o DIMEX: una persona con varias cuentas, o una cuenta
 * sancionada que vuelve con otro correo. El admin lo ve antes de aprobar; no bloquea nada por sí solo.
 */
export async function identityDuplicates(r) {
  if (!r.buyer_national_id || !r.user_id) return [];
  const rows = await query(
    `select u.id, u.name, u.email, u.status, count(o.id)::int as purchases
       from app.reservations o
       join app.users u on u.id = o.user_id
      where o.user_id <> $1
        and o.buyer_national_id is not null
        and ${normId('o.buyer_national_id')} = ${normId('$2::text')}
      group by u.id
      order by (u.status = 'BANNED') desc, max(o.created_at) desc
      limit 10`,
    [r.user_id, r.buyer_national_id]
  );
  return rows.map((u) => ({ userId: u.id, name: u.name, email: u.email, status: u.status, purchases: u.purchases }));
}

/** Reserva del usuario: la propiedad va en la consulta misma (un id ajeno simplemente no existe). */
export const findOwnReservation = (id, userId) => one(`${RESERVATION_SELECT} where r.id = $1 and r.user_id = $2`, [id, userId]);

/** Detalle con los cartones completos (para verlos o imprimirlos). */
export async function reservationDetailView(r) {
  const cards = await query(
    `select c.id, c.serial, c.grid, sc.image_id is not null as has_image, sc.id as series_card_id
       from app.reservation_cards rc
       join app.cards c on c.id = rc.card_id
       left join app.series_cards sc on sc.id = c.series_card_id
      where rc.reservation_id = $1
      order by c.serial`,
    [r.id]
  );
  return {
    ...(await reservationView(r)),
    cards: cards.map((c) => ({
      id: c.id,
      serial: c.serial,
      grid: c.grid,
      imageUrl: c.has_image ? `/api/card-images/${c.series_card_id}` : null,
    })),
  };
}

/**
 * Vence reservas sin pagar y libera sus cartones (una sola sentencia, atómica).
 * Se llama periódicamente y antes de cada operación que dependa del estado de los cartones.
 */
export async function releaseExpiredReservations() {
  try {
    await query(
      `with expired as (
         update app.reservations set status = 'EXPIRED'
          where status = 'PENDING' and expires_at <= now()
          returning id
       )
       update app.cards set status = 'AVAILABLE', reservation_id = null, owner_id = null
        where reservation_id in (select id from expired) and status = 'RESERVED'`
    );
  } catch (err) {
    logger.error('reservations.release_failed', { message: err.message });
  }
}

const serialsText = (serials) => serials.map((s) => `#${s}`).join(', ');

/** Aprueba una compra con comprobante: cartones vendidos al dueño y correo con el enlace a sus cartones. */
export async function approveReservation(id, actor, method) {
  const updated = await tx(async (q) => {
    const [r] = await q(
      `update app.reservations set status = 'APPROVED', decided_at = now(), decided_by = $2, payment_method = coalesce($3, payment_method)
        where id = $1 and status = 'PROOF_SUBMITTED' returning *`,
      [id, actor.actorId, method ?? null]
    );
    if (!r) return null;
    await q(`update app.cards set status = 'SOLD', owner_id = $2 where reservation_id = $1`, [id, r.user_id]);
    await audit(
      { ...actor, action: 'reservation.approved', targetType: 'reservation', targetId: id, details: { total: r.total, method: r.payment_method } },
      q
    );
    return r;
  });
  if (!updated) return null;
  const r = await findReservation(id);
  const view = await reservationView(r);
  sendMail({
    to: r.buyer_email,
    subject: `✅ Pago confirmado · ${r.event_name}`,
    text:
      `Hola ${r.buyer_full_name}, confirmamos tu pago de ${formatCRC(r.total)}.\n` +
      `Tus cartones ya están disponibles: ${serialsText(view.serials)}.\n` +
      `Entra a la página con tu cuenta para verlos, imprimirlos y jugar en vivo el día del sorteo.\n` +
      `¡Gracias por apoyar a la Asociación Infantil Hogar Sol!`,
    action: { label: 'Ver mis cartones', url: `${env.clientOrigin}/mis-compras/${id}` },
  });
  notifyAdmins('reservation:updated', view);
  notifyUser(r.user_id, 'reservation:updated', view);
  return view;
}

/**
 * Cierra una reserva y libera sus cartones.
 * status: REJECTED (admin), CANCELLED (el dueño) o REFUNDED (admin, compra aprobada que se devuelve).
 */
export async function closeReservation(id, status, actor, { from = ['PENDING', 'PROOF_SUBMITTED'] } = {}) {
  const updated = await tx(async (q) => {
    const [r] = await q(
      `update app.reservations
          set status = $2, decided_at = coalesce(decided_at, now()), decided_by = coalesce(decided_by, $3),
              refunded_at = case when $2 = 'REFUNDED' then now() else refunded_at end
        where id = $1 and status = any($4::text[]) returning *`,
      [id, status, actor.actorId, from]
    );
    if (!r) return null;
    await q(`update app.cards set status = 'AVAILABLE', reservation_id = null, owner_id = null where reservation_id = $1`, [id]);
    if (status !== 'CANCELLED') {
      await audit(
        { ...actor, action: `reservation.${status.toLowerCase()}`, targetType: 'reservation', targetId: id, details: { total: r.total } },
        q
      );
    }
    return r;
  });
  if (!updated) return null;
  const r = await findReservation(id);
  const view = await reservationView(r);
  if (r.buyer_email && status === 'REJECTED') {
    sendMail({
      to: r.buyer_email,
      subject: 'Pago no verificado · Bingo Hogar Sol',
      text: `Hola ${r.buyer_full_name}, no pudimos verificar tu pago (comprobante ${r.payment_reference ?? '—'}). Los cartones fueron liberados. Si crees que es un error, contáctanos.`,
    });
  }
  if (r.buyer_email && status === 'REFUNDED') {
    sendMail({
      to: r.buyer_email,
      subject: 'Reembolso registrado · Bingo Hogar Sol',
      text: `Hola ${r.buyer_full_name}, registramos el reembolso de tu compra de ${formatCRC(r.total)} (cartones ${serialsText(view.serials)}). Esos cartones ya no participan en el sorteo.`,
    });
  }
  notifyAdmins('reservation:updated', view);
  if (status !== 'CANCELLED') notifyUser(r.user_id, 'reservation:updated', view);
  return view;
}
