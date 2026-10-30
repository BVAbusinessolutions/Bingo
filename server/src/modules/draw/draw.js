import { Router } from 'express';
import { z } from 'zod';
import { one, query, tx } from '../../db/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/security.js';
import { notifyAdmins, registerAuthenticatedNamespace } from '../../realtime.js';
import { audit, actorFrom } from '../../services/audit.js';
import { isWinningCard, MAX_BALL } from '../../domain/bingo.js';
import { EVENT_SELECT, publicEvent } from '../events/events.routes.js';

let drawNs; // namespace de Socket.io

const eventIdSchema = z.string().regex(/^[a-z0-9-]{3,64}$/);

async function stateOf(eventId) {
  const event = await one(`${EVENT_SELECT} where e.id = $1`, [eventId]);
  const called = await query('select number from app.draws where event_id = $1 order by seq', [eventId]);
  return { event: event ? publicEvent(event) : null, called: called.map((r) => r.number) };
}

export const broadcast = async (eventId) => drawNs?.to(`event:${eventId}`).emit('draw:state', await stateOf(eventId));

/**
 * Verificación automática: cartones vendidos (en línea o en el salón) que ya completaron el patrón
 * con las bolas cantadas, con el estado de su reclamo. Así el admin ve un bingo aunque nadie lo cante.
 */
export async function winningCards(eventId) {
  const event = await one('select pattern from app.events where id = $1', [eventId]);
  if (!event) return [];
  const called = (await query('select number from app.draws where event_id = $1', [eventId])).map((r) => r.number);
  if (called.length < 4) return []; // ningún patrón se completa con menos de 4 bolas
  const cards = await query(
    `select c.id, c.serial, c.grid, coalesce(u.name, r.buyer_full_name) as holder, r.channel, cl.status as claim_status
       from app.cards c
       left join app.users u on u.id = c.owner_id
       left join app.reservations r on r.id = c.reservation_id
       left join lateral (
         select status from app.claims where card_id = c.id order by created_at desc limit 1
       ) cl on true
      where c.event_id = $1 and c.status = 'SOLD'`,
    [eventId]
  );
  const calledSet = new Set(called);
  return cards
    .filter((c) => isWinningCard(c.grid, calledSet, event.pattern))
    .map((c) => ({
      cardId: c.id,
      serial: c.serial,
      holder: c.holder ?? null,
      channel: c.channel ?? null, // WEB | MANUAL (vendido en el salón)
      claimStatus: c.claim_status ?? null, // null = nadie ha cantado bingo con este cartón
    }))
    .sort((a, b) => Number(a.serial) - Number(b.serial));
}

/** Avisa al panel de administración qué cartones tienen bingo tras cada bola. */
const notifyWinningCards = async (eventId) => notifyAdmins('draw:winning-cards', { eventId, cards: await winningCards(eventId) });

/** Namespace /draw: solo usuarios autenticados; los clientes solo escuchan, nunca cantan. */
export function registerDrawSocket(io) {
  drawNs = registerAuthenticatedNamespace(io, '/draw', (socket) => {
    socket.on('event:join', async (eventId) => {
      if (!eventIdSchema.safeParse(eventId).success) return;
      const state = await stateOf(eventId).catch(() => null);
      if (!state?.event) return;
      socket.join(`event:${eventId}`);
      socket.emit('draw:state', state);
    });
  });
}

export const drawRouter = Router({ mergeParams: true });

const requireEvent = async (req, res, next) => {
  if (!eventIdSchema.safeParse(req.params.eventId).success) return res.status(404).json({ error: 'NOT_FOUND' });
  req.event = await one('select id, status from app.events where id = $1', [req.params.eventId]);
  return req.event ? next() : res.status(404).json({ error: 'NOT_FOUND' });
};

/** Solo se canta en eventos programados o en vivo; el primer número pone el evento EN VIVO. */
const requirePlayable = (req, res, next) =>
  ['SCHEDULED', 'LIVE'].includes(req.event.status) ? next() : res.status(409).json({ error: 'EVENT_NOT_PLAYABLE' });

drawRouter.get('/draw', authenticate, requireEvent, async (req, res) => res.json(await stateOf(req.params.eventId)));

drawRouter.post(
  '/draw/call',
  authenticate,
  authorize('ADMIN'),
  requireEvent,
  requirePlayable,
  validateBody(z.object({ number: z.number().int().min(1).max(MAX_BALL) })),
  async (req, res) => {
    const inserted = await tx(async (q) => {
      const rows = await q(
        'insert into app.draws (event_id, number, called_by) values ($1, $2, $3) on conflict do nothing returning number',
        [req.event.id, req.body.number, req.user.id]
      );
      if (!rows.length) return false;
      await q("update app.events set status = 'LIVE', updated_at = now() where id = $1 and status = 'SCHEDULED'", [req.event.id]);
      await audit(
        { ...actorFrom(req), action: 'draw.call', targetType: 'event', targetId: req.event.id, details: { number: req.body.number } },
        q
      );
      return true;
    });
    if (!inserted) return res.status(409).json({ error: 'ALREADY_CALLED' });
    await broadcast(req.event.id);
    await notifyWinningCards(req.event.id);
    res.json(await stateOf(req.event.id));
  }
);

drawRouter.post('/draw/undo', authenticate, authorize('ADMIN'), requireEvent, requirePlayable, async (req, res) => {
  const removed = await one(
    `delete from app.draws where event_id = $1
       and seq = (select max(seq) from app.draws where event_id = $1) returning number`,
    [req.event.id]
  );
  if (removed) {
    await audit({
      ...actorFrom(req),
      action: 'draw.undo',
      targetType: 'event',
      targetId: req.event.id,
      details: { number: removed.number },
    });
  }
  await broadcast(req.event.id);
  await notifyWinningCards(req.event.id);
  res.json(await stateOf(req.event.id));
});

/**
 * Ganador del salón: el admin verificó el cartón físico en voz alta y lo registra. El servidor vuelve a
 * validar el patrón con las bolas cantadas; el premio queda confirmado y aparece en Resultados al instante.
 */
drawRouter.post(
  '/draw/salon-winner',
  authenticate,
  authorize('ADMIN'),
  requireEvent,
  validateBody(z.object({ cardId: z.string().uuid() })),
  async (req, res) => {
    const card = await one(
      `select c.id, c.serial, c.grid, c.owner_id, e.pattern
         from app.cards c join app.events e on e.id = c.event_id
        where c.id = $1 and c.event_id = $2 and c.status = 'SOLD'`,
      [req.body.cardId, req.event.id]
    );
    if (!card) return res.status(404).json({ error: 'NOT_FOUND' });
    const called = (await query('select number from app.draws where event_id = $1 order by seq', [req.event.id])).map((r) => r.number);
    if (!isWinningCard(card.grid, called, card.pattern)) return res.status(422).json({ error: 'NOT_A_WINNER' });

    const claim = await tx(async (q) => {
      // El índice único parcial impide dos reclamos activos del mismo cartón (p. ej. si el jugador ya lo reclamó en línea).
      const [row] = await q(
        `insert into app.claims (event_id, card_id, user_id, channel, status, called_count, called_at_claim, decided_at, decided_by)
         values ($1, $2, $3, 'SALON', 'CONFIRMED', $4, $5, now(), $6)
         on conflict do nothing returning id`,
        [req.event.id, card.id, card.owner_id, called.length, called, req.user.id]
      );
      if (row) {
        await audit(
          { ...actorFrom(req), action: 'claim.salon_confirmed', targetType: 'claim', targetId: row.id, details: { serial: card.serial } },
          q
        );
      }
      return row;
    });
    if (!claim) return res.status(409).json({ error: 'ALREADY_CLAIMED' });
    await notifyWinningCards(req.event.id);
    res.status(201).json({ id: claim.id, serial: card.serial, status: 'CONFIRMED', channel: 'SALON' });
  }
);

drawRouter.get('/draw/winning-cards', authenticate, authorize('ADMIN'), requireEvent, async (req, res) =>
  res.json(await winningCards(req.event.id))
);
