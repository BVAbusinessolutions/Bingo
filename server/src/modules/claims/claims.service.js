import { one, query, tx } from '../../db/index.js';
import { notifyAdmins, notifyUser } from '../../realtime.js';
import { sendMail } from '../../utils/mailer.js';
import { audit } from '../../services/audit.js';

/** Nombre público del ganador: "María G." (no se publica el nombre completo). */
export const publicWinnerName = (name = '') => {
  const [first = '', last = ''] = name.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first;
};

export const CLAIM_SELECT = `
  select cl.*, c.serial, c.grid, u.name as player_name, u.email as player_email, u.phone as player_phone, e.name as event_name
    from app.claims cl
    join app.cards c on c.id = cl.card_id
    join app.users u on u.id = cl.user_id
    join app.events e on e.id = cl.event_id`;

const iso = (d) => (d ? new Date(d).toISOString() : null);

export const claimView = (c) => ({
  id: c.id,
  eventId: c.event_id,
  serial: c.serial,
  status: c.status, // PENDING | CONFIRMED | REJECTED
  calledCount: c.called_count,
  createdAt: iso(c.created_at),
  decidedAt: iso(c.decided_at),
});

/** Vista para administración: incluye cartón completo, balotas al momento del reclamo y datos del jugador. */
export const adminClaimView = (c) => ({
  ...claimView(c),
  grid: c.grid,
  calledAtClaim: c.called_at_claim,
  player: { name: c.player_name, email: c.player_email, phone: c.player_phone },
});

export const findClaim = (id) => one(`${CLAIM_SELECT} where cl.id = $1`, [id]);
export const listClaims = (eventId) =>
  query(`${CLAIM_SELECT} where ($1::text is null or cl.event_id = $1) order by cl.created_at limit 200`, [eventId || null]);

export async function decideClaim(id, approve, actor) {
  const updated = await tx(async (q) => {
    const [row] = await q(
      `update app.claims set status = $2, decided_at = now(), decided_by = $3
        where id = $1 and status = 'PENDING' returning id`,
      [id, approve ? 'CONFIRMED' : 'REJECTED', actor.actorId]
    );
    if (row) await audit({ ...actor, action: approve ? 'claim.confirmed' : 'claim.rejected', targetType: 'claim', targetId: id }, q);
    return row;
  });
  if (!updated) return null;
  const c = await findClaim(id);
  sendMail({
    to: c.player_email,
    subject: approve ? `🏆 ¡Ganaste! · ${c.event_name}` : `Reclamo de bingo no confirmado · ${c.event_name}`,
    text: approve
      ? `Hola ${c.player_name}, confirmamos tu bingo con el cartón #${c.serial}. Te contactaremos para entregarte el premio.`
      : `Hola ${c.player_name}, revisamos tu reclamo con el cartón #${c.serial} y no pudo confirmarse. Si tienes dudas, contáctanos.`,
  });
  notifyUser(c.user_id, 'claim:updated', claimView(c));
  notifyAdmins('claim:updated', adminClaimView(c));
  return claimView(c);
}
