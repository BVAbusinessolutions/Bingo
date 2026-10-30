import { Router } from 'express';
import { z } from 'zod';
import { one, query, tx } from '../../db/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/security.js';
import { notifyAdmins, registerAuthenticatedNamespace } from '../../realtime.js';
import { audit, actorFrom } from '../../services/audit.js';
import { isWinningCard, MAX_BALL, PATTERN_IDS, PATTERN_LABELS } from '../../domain/bingo.js';
import { EVENT_SELECT, publicEvent } from '../events/events.routes.js';

let drawNs; // namespace de Socket.io

const eventIdSchema = z.string().regex(/^[a-z0-9-]{3,64}$/);

/** Bolas de la ronda en curso del evento, en el orden en que salieron. */
const calledIn = async (eventId) =>
  (
    await query(
      `select d.number from app.draws d join app.events e on e.id = d.event_id
        where d.event_id = $1 and d.round = e.round order by d.seq`,
      [eventId]
    )
  ).map((r) => r.number);

async function stateOf(eventId) {
  const event = await one(`${EVENT_SELECT} where e.id = $1`, [eventId]);
  return { event: event ? publicEvent(event) : null, called: event ? await calledIn(eventId) : [] };
}

export const broadcast = async (eventId) => drawNs?.to(`event:${eventId}`).emit('draw:state', await stateOf(eventId));

/**
 * Verificación automática: cartones vendidos (en línea o en el salón) que ya completaron el patrón
 * con las bolas cantadas, con el estado de su reclamo. Así el admin ve un bingo aunque nadie lo cante.
 */
export async function winningCards(eventId) {
  const event = await one('select pattern, round from app.events where id = $1', [eventId]);
  if (!event) return [];
  const called = await calledIn(eventId);
  if (called.length < 4) return []; // ningún patrón se completa con menos de 4 bolas
  const cards = await query(
    `select c.id, c.serial, c.grid, coalesce(u.name, r.buyer_full_name) as holder, r.channel, cl.status as claim_status
       from app.cards c
       left join app.users u on u.id = c.owner_id
       left join app.reservations r on r.id = c.reservation_id
       left join lateral (
         select status from app.claims where card_id = c.id and round = $2 order by created_at desc limit 1
       ) cl on true
      where c.event_id = $1 and c.status = 'SOLD'`,
    [eventId, event.round]
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
  req.event = await one('select id, status, pattern, round from app.events where id = $1', [req.params.eventId]);
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
        `insert into app.draws (event_id, number, called_by, round)
         values ($1, $2, $3, (select round from app.events where id = $1)) on conflict do nothing returning number`,
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
    `delete from app.draws where event_id = $1 and round = $2
       and seq = (select max(seq) from app.draws where event_id = $1 and round = $2) returning number`,
    [req.event.id, req.event.round]
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
      `select c.id, c.serial, c.grid, c.owner_id, e.pattern, e.round
         from app.cards c join app.events e on e.id = c.event_id
        where c.id = $1 and c.event_id = $2 and c.status = 'SOLD'`,
      [req.body.cardId, req.event.id]
    );
    if (!card) return res.status(404).json({ error: 'NOT_FOUND' });
    const called = await calledIn(req.event.id);
    if (!isWinningCard(card.grid, called, card.pattern)) return res.status(422).json({ error: 'NOT_A_WINNER' });

    const claim = await tx(async (q) => {
      // El índice único parcial impide dos reclamos activos del mismo cartón (p. ej. si el jugador ya lo reclamó en línea).
      const [row] = await q(
        `insert into app.claims
           (event_id, card_id, user_id, channel, status, called_count, called_at_claim, decided_at, decided_by, round, pattern)
         values ($1, $2, $3, 'SALON', 'CONFIRMED', $4, $5, now(), $6, $7, $8)
         on conflict do nothing returning id`,
        [req.event.id, card.id, card.owner_id, called.length, called, req.user.id, card.round, card.pattern]
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

const patternBody = validateBody(z.object({ pattern: z.enum(PATTERN_IDS) }));
const roundBalls = async (q, e) =>
  (await q('select count(*)::int as n from app.draws where event_id = $1 and round = $2', [e.id, e.round]))[0].n;

/**
 * Modalidad de la ronda en curso. Solo antes de cantar la primera bola de la ronda: cambiarla a mitad
 * de juego alteraría los cartones que ya van avanzando. Queda en la bitácora y llega a todos al instante.
 */
drawRouter.put('/draw/pattern', authenticate, authorize('ADMIN'), requireEvent, requirePlayable, patternBody, async (req, res) => {
  const { pattern } = req.body;
  const e = req.event;
  const changed = await tx(async (q) => {
    if ((await roundBalls(q, e)) > 0) return false;
    await q('update app.events set pattern = $2, updated_at = now() where id = $1', [e.id, pattern]);
    await q('update app.event_rounds set pattern = $3 where event_id = $1 and round = $2', [e.id, e.round, pattern]);
    await audit({ ...actorFrom(req), action: 'draw.pattern', targetType: 'event', targetId: e.id, details: { round: e.round, pattern } }, q);
    return true;
  });
  if (!changed) return res.status(409).json({ error: 'ROUND_STARTED' });
  await broadcast(e.id);
  await notifyWinningCards(e.id);
  res.json(await stateOf(e.id));
});

/**
 * Nueva ronda con la modalidad elegida: el tablero queda vacío para todos y cada cartón puede volver a ganar.
 * Las bolas y los ganadores de las rondas anteriores se conservan (Resultados y bitácora).
 */
drawRouter.post('/draw/round', authenticate, authorize('ADMIN'), requireEvent, requirePlayable, patternBody, async (req, res) => {
  const { pattern } = req.body;
  const e = req.event;
  const next = await tx(async (q) => {
    if ((await roundBalls(q, e)) === 0 || e.round >= 99) return null; // la ronda ni empezó: basta con cambiar su modalidad
    const round = e.round + 1;
    await q('update app.events set round = $2, pattern = $3, updated_at = now() where id = $1', [e.id, round, pattern]);
    await q('insert into app.event_rounds (event_id, round, pattern) values ($1, $2, $3)', [e.id, round, pattern]);
    await audit({ ...actorFrom(req), action: 'draw.new_round', targetType: 'event', targetId: e.id, details: { round, pattern } }, q);
    return round;
  });
  if (!next) return res.status(409).json({ error: 'ROUND_NOT_STARTED' });
  await broadcast(e.id);
  await notifyWinningCards(e.id);
  notifyAdmins('draw:round', { eventId: e.id, round: next, pattern, patternLabel: PATTERN_LABELS[pattern] });
  res.status(201).json(await stateOf(e.id));
});

/** Rondas del evento con su modalidad, bolas cantadas y ganadores confirmados (historial de Bingo Master). */
drawRouter.get('/draw/rounds', authenticate, authorize('ADMIN'), requireEvent, async (req, res) => {
  const rows = await query(
    `select er.round, er.pattern, er.started_at,
            (select count(*)::int from app.draws d where d.event_id = er.event_id and d.round = er.round) as called,
            (select count(*)::int from app.claims cl
              where cl.event_id = er.event_id and cl.round = er.round and cl.status = 'CONFIRMED') as winners
       from app.event_rounds er where er.event_id = $1 order by er.round`,
    [req.event.id]
  );
  res.json(
    rows.map((r) => ({
      round: r.round,
      pattern: r.pattern,
      startedAt: new Date(r.started_at).toISOString(),
      called: r.called,
      winners: r.winners,
      current: r.round === req.event.round,
    }))
  );
});

drawRouter.get('/draw/winning-cards', authenticate, authorize('ADMIN'), requireEvent, async (req, res) =>
  res.json(await winningCards(req.event.id))
);
