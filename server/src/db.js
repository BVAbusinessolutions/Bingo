// Almacenamiento EN MEMORIA para desarrollo (se reinicia al reiniciar el servidor). Reemplazar por
// PostgreSQL/MongoDB con consultas parametrizadas (Prisma, Knex, pg con $1...) antes de producción.
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { generateCard, cardSignature } from './utils/cardGenerator.js';

export const ROLES = Object.freeze({ ADMIN: 'ADMIN', CLIENTE: 'CLIENTE' });

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = {
  users: new Map(), // id -> { id, name, email, phone, role, passwordHash, emailVerified }
  refreshTokens: new Map(), // jti -> { userId, expiresAt }
  events: new Map(), // id -> { id, name, description, pattern, price, startsAt, status, stream }
  cards: new Map(), // id -> { id, eventId, serial, grid, status, ownerId, reservationId }
  reservations: new Map(), // id -> ver modules/reservations
  draws: new Map(), // eventId -> number[]
  claims: new Map(), // id -> { id, eventId, cardId, userId, status, calledCount, createdAt, decidedAt }
  passwordResets: new Map(), // sha256(token) -> { userId, expiresAt }
  emailVerifications: new Map(), // sha256(token) -> { userId, expiresAt }
  outbox: [], // correos enviados (simulados)
};

export async function createUser({ name, email, password, role = ROLES.CLIENTE, emailVerified = false }) {
  const id = randomUUID();
  const user = { id, name, email, phone: null, role, emailVerified, passwordHash: await bcrypt.hash(password, 12) };
  db.users.set(id, user);
  return user;
}

export function createEvent({ id = `evt-${randomUUID().slice(0, 8)}`, stream = null, description = '', ...data }) {
  const event = { id, description, stream, status: 'SCHEDULED', ...data };
  db.events.set(id, event);
  db.draws.set(id, []);
  return event;
}

export function generateCards(eventId, count) {
  const existing = [...db.cards.values()].filter((c) => c.eventId === eventId);
  const seen = new Set(existing.map((c) => cardSignature(c.grid)));
  let serial = existing.length;
  const created = [];
  while (created.length < count) {
    const grid = generateCard();
    const sig = cardSignature(grid);
    if (seen.has(sig)) continue;
    seen.add(sig);
    const card = {
      id: randomUUID(),
      eventId,
      serial: String(++serial).padStart(3, '0'),
      grid,
      status: 'AVAILABLE', // AVAILABLE | RESERVED | SOLD
      ownerId: null,
      reservationId: null,
    };
    db.cards.set(card.id, card);
    created.push(card);
  }
  return created;
}

export async function seed() {
  await createUser({ name: 'Administración Hogar Sol', email: 'admin@hogarsol.org', password: 'Admin123!', role: ROLES.ADMIN, emailVerified: true });
  const cliente = await createUser({ name: 'Cliente Demo', email: 'cliente@hogarsol.org', password: 'Cliente123!', emailVerified: true });
  // Cuenta de prueba anterior (se mantiene para quien ya la usaba).
  const jugador = await createUser({ name: 'Jugador Demo', email: 'jugador@hogarsol.org', password: 'Jugador123!', emailVerified: true });

  const event = createEvent({
    id: 'evt-2026-hogar-sol',
    name: 'Gran Bingo Navideño',
    description: 'Lo recaudado se destina a la remodelación del comedor infantil.',
    pattern: 'FULL',
    price: 2000,
    startsAt: '2026-12-12T19:00:00-06:00',
    stream: { provider: 'youtube', videoId: 'jfKfPfyJRdk' }, // reemplazar por el ID del live real
  });
  generateCards(event.id, 500);

  // El cliente demo ya tiene 4 cartones comprados; otros 18 aparecen vendidos en el catálogo.
  const cards = [...db.cards.values()];
  cards.slice(0, 4).forEach((c) => Object.assign(c, { status: 'SOLD', ownerId: cliente.id }));
  cards.slice(4, 6).forEach((c) => Object.assign(c, { status: 'SOLD', ownerId: jugador.id }));
  [12, 27, 33, 48, 51, 66, 79, 90, 104, 117, 150, 188, 203, 256, 301, 333, 402, 477].forEach((i) =>
    Object.assign(cards[i], { status: 'SOLD' })
  );
}
