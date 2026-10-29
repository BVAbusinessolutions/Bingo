// Datos de demostración SOLO para desarrollo (nunca en producción: ver env.seedDemoData).
// Es idempotente: si ya hay usuarios, no hace nada.
import bcrypt from 'bcryptjs';
import { one, query, tx } from './index.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { createGeneratedSeries, assignSeriesToEvent } from '../modules/series/series.service.js';

const DEMO_USERS = [
  { name: 'Administración Hogar Sol', email: 'admin@hogarsol.org', password: 'Admin123!', role: 'ADMIN' },
  { name: 'Cliente Demo', email: 'cliente@hogarsol.org', password: 'Cliente123!', role: 'CLIENTE' },
  { name: 'Jugador Demo', email: 'jugador@hogarsol.org', password: 'Jugador123!', role: 'CLIENTE' },
];

export const DEMO_EVENT_ID = 'evt-2026-hogar-sol';

// Sin decided_by: son cartones de prueba, no dinero recibido, y no suman a la recaudación.
async function demoPurchase(userId, eventId, serials, buyer) {
  await tx(async (q) => {
    const [event] = await q('select price from app.events where id = $1', [eventId]);
    const [r] = await q(
      `insert into app.reservations (event_id, user_id, status, total, buyer_full_name, buyer_national_id, buyer_phone, buyer_email,
                                     payment_method, payment_reference, expires_at, decided_at, proof_uploaded_at)
       values ($1, $2, 'APPROVED', $3, $4, '1-1111-1111', '8888-0000', $5, 'SINPE', 'DEMO0001', now(), now(), now()) returning id`,
      [eventId, userId, serials.length * event.price, buyer.name, buyer.email]
    );
    const cards = await q(
      "update app.cards set status = 'SOLD', owner_id = $1, reservation_id = $2 where event_id = $3 and serial = any($4::text[]) returning id",
      [userId, r.id, eventId, serials]
    );
    await q('insert into app.reservation_cards (reservation_id, card_id) select $1, unnest($2::uuid[])', [r.id, cards.map((c) => c.id)]);
  });
}

export async function seedDemoData() {
  if (!env.seedDemoData) return;
  const existing = await one('select count(*)::int as n from app.users');
  if (existing.n > 0) return;

  const users = {};
  for (const u of DEMO_USERS) {
    const row = await one(
      'insert into app.users (name, email, password_hash, role, email_verified, terms_accepted_at) values ($1, $2, $3, $4, true, now()) returning id',
      [u.name, u.email, await bcrypt.hash(u.password, 12), u.role]
    );
    users[u.email] = { id: row.id, ...u };
  }
  const actor = { actorId: users['admin@hogarsol.org'].id, ip: null };

  await query(
    `insert into app.events (id, name, description, pattern, price, starts_at, venue, venue_area, stream_provider, stream_video_id)
     values ($1, 'Gran Bingo Hogar Sol', '¡Gana 1 moto y muchos premios más! Lo recaudado apoya a la niñez de la Asociación.',
             'FULL', 2000, '2026-11-15T13:00:00-06:00', 'Salón de Eventos de Tinamaste', 'Higuito, San José',
             'youtube', 'jfKfPfyJRdk')`,
    [DEMO_EVENT_ID]
  );
  const seriesId = await createGeneratedSeries({ name: 'Serie de prueba (generada)', count: 300, startSerial: 1001 }, actor);
  await assignSeriesToEvent(DEMO_EVENT_ID, seriesId, actor);

  await demoPurchase(users['cliente@hogarsol.org'].id, DEMO_EVENT_ID, ['1001', '1002', '1003', '1004'], users['cliente@hogarsol.org']);
  await demoPurchase(users['jugador@hogarsol.org'].id, DEMO_EVENT_ID, ['1005', '1006'], users['jugador@hogarsol.org']);
  logger.info('db.demo_seeded', { users: DEMO_USERS.length, cards: 300 });
}
