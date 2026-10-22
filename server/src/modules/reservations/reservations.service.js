import { db } from '../../db.js';
import { env } from '../../config/env.js';
import path from 'node:path';
import { UPLOAD_DIR } from '../../db.js';
import { notifyAdmins, notifyUser } from '../../realtime.js';
import { sendMail } from '../../utils/mailer.js';
import { formatCRC } from '../../utils/format.js';

export const RESERVATION_TTL_MS = env.reservationTtlMin * 60_000;

const releaseCards = (r) =>
  r.cardIds.forEach((id) => Object.assign(db.cards.get(id), { status: 'AVAILABLE', reservationId: null, ownerId: null }));

/** Libera cartones de reservas vencidas. En producción: job programado + transacción en BD. */
export function releaseExpiredReservations() {
  const now = Date.now();
  for (const r of db.reservations.values()) {
    if (r.status === 'PENDING' && r.expiresAt <= now) {
      r.status = 'EXPIRED';
      releaseCards(r);
    }
  }
}

const serialsOf = (r) => r.cardIds.map((id) => db.cards.get(id).serial);

export function approveReservation(r) {
  r.status = 'APPROVED';
  r.decidedAt = Date.now();
  r.cardIds.forEach((id) => Object.assign(db.cards.get(id), { status: 'SOLD', ownerId: r.userId }));
  const event = db.events.get(r.eventId);
  sendMail({
    to: r.buyer.email,
    subject: `✅ Pago confirmado · ${event.name}`,
    text:
      `Hola ${r.buyer.fullName}, confirmamos tu pago de ${formatCRC(r.total)}.\n` +
      `Tus cartones: ${serialsOf(r).map((s) => `#${s}`).join(', ')}.\n` +
      `Los verás en la sección "En vivo" al iniciar sesión. ¡Gracias por apoyar a la Asociación Infantil Hogar Sol!`,
  });
  notifyAdmins('reservation:updated', reservationView(r));
  notifyUser(r.userId, 'reservation:updated', reservationView(r));
}

export function rejectReservation(r, status = 'REJECTED') {
  r.status = status;
  r.decidedAt = Date.now();
  releaseCards(r);
  if (status === 'REJECTED' && r.buyer) {
    sendMail({
      to: r.buyer.email,
      subject: 'Pago no verificado · Bingo Hogar Sol',
      text: `Hola ${r.buyer.fullName}, no pudimos verificar tu pago (ref. ${r.proof?.reference ?? '—'}). Los cartones fueron liberados. Si crees que es un error, contáctanos.`,
    });
  }
  notifyAdmins('reservation:updated', reservationView(r));
  if (status === 'REJECTED') notifyUser(r.userId, 'reservation:updated', reservationView(r));
}

/** Envía el comprobante adjunto; 404 si la reserva solo tiene número de referencia. */
export function sendProofFile(res, r) {
  if (!r?.proof?.filename) return res.status(404).json({ error: 'NOT_FOUND' });
  res.type(r.proof.mimetype);
  res.set('Content-Disposition', 'inline');
  res.set('Content-Security-Policy', 'sandbox'); // un PDF o imagen no puede ejecutar scripts en nuestro origen
  res.sendFile(path.join(UPLOAD_DIR, r.proof.filename));
}

/** Detalle para el dueño de la reserva: incluye los cartones completos para verlos o imprimirlos. */
export const reservationDetailView = (r) => ({
  ...reservationView(r),
  cards: r.cardIds.map((id) => {
    const { serial, grid } = db.cards.get(id);
    return { id, serial, grid };
  }),
});

export function reservationView(r) {
  const event = db.events.get(r.eventId);
  return {
    id: r.id,
    eventId: r.eventId,
    eventName: event?.name,
    status: r.status, // PENDING | PROOF_SUBMITTED | APPROVED | REJECTED | EXPIRED | CANCELLED
    buyer: r.buyer ?? null,
    serials: serialsOf(r),
    total: r.total,
    createdAt: new Date(r.createdAt).toISOString(),
    expiresAt: new Date(r.expiresAt).toISOString(),
    reference: r.proof?.reference ?? null,
    method: r.proof?.method ?? null,
    hasProof: Boolean(r.proof?.filename),
    payment: env.payment,
  };
}
