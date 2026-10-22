import { db } from '../../db.js';
import { notifyAdmins, notifyUser } from '../../realtime.js';
import { sendMail } from '../../utils/mailer.js';

/** Nombre público del ganador: "María G." (no se publica el nombre completo). */
export const publicWinnerName = (name = '') => {
  const [first = '', last = ''] = name.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first;
};

export function claimView(c) {
  const card = db.cards.get(c.cardId);
  return {
    id: c.id,
    eventId: c.eventId,
    serial: card?.serial,
    status: c.status, // PENDING | CONFIRMED | REJECTED
    calledCount: c.calledCount,
    createdAt: new Date(c.createdAt).toISOString(),
    decidedAt: c.decidedAt ? new Date(c.decidedAt).toISOString() : null,
  };
}

/** Vista para administración: incluye cartón completo, balotas al momento del reclamo y datos del jugador. */
export function adminClaimView(c) {
  const user = db.users.get(c.userId);
  return {
    ...claimView(c),
    grid: db.cards.get(c.cardId)?.grid,
    calledAtClaim: c.calledAtClaim,
    player: user ? { name: user.name, email: user.email, phone: user.phone } : null,
  };
}

export function decideClaim(c, approve) {
  c.status = approve ? 'CONFIRMED' : 'REJECTED';
  c.decidedAt = Date.now();
  const view = claimView(c);
  const user = db.users.get(c.userId);
  const event = db.events.get(c.eventId);
  if (user) {
    sendMail({
      to: user.email,
      subject: approve ? `🏆 ¡Ganaste! · ${event?.name}` : `Reclamo de bingo no confirmado · ${event?.name}`,
      text: approve
        ? `Hola ${user.name}, confirmamos tu bingo con el cartón #${view.serial}. Te contactaremos para entregarte el premio.`
        : `Hola ${user.name}, revisamos tu reclamo con el cartón #${view.serial} y no pudo confirmarse. Si tienes dudas, contáctanos.`,
    });
  }
  notifyUser(c.userId, 'claim:updated', view);
  notifyAdmins('claim:updated', adminClaimView(c));
  return view;
}
