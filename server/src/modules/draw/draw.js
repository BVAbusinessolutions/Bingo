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

// Estado compartido por sala: tras un reinicio del servidor cientos de jugadores se reconectan a la vez y cada
// 'event:join' pediría el mismo estado a la base de datos. Se reutiliza 1 s; cada cambio lo invalida.
const STATE_TTL_MS = 1000;
const stateCache = new Map(); // eventId -> { at, promise }
const cachedStateOf = (eventId) => {
  const hit = stateCache.get(eventId);
  if (hit && Date.now() - hit.at < STATE_TTL_MS) return hit.promise;
  const promise = stateOf(eventId);
  stateCache.set(eventId, { at: Date.now(), promise });
  promise.catch(() => stateCache.delete(eventId));
  return promise;
};

export const broadcast = async (eventId) => {
  stateCache.delete(eventId);
  drawNs?.to(`event:${eventId}`).emit('draw:state', await cachedStateOf(eventId));
};

// Cartones vendidos con su grilla y titular: no cambian entre bolas, así que se reutilizan mientras la huella de
// ventas (cantidad + suma de ids) sea la misma. Así cada bola no vuelve a leer miles de grillas.
const SOLD_TTL_MS = 60_000; // por si cambia solo el nombre de un titular
const soldCache = new Map(); // eventId -> { key, at, cards }
async function soldCards(eventId) {
  const { key } = await one(
    `select count(*) || ':' || coalesce(sum(hashtext(id::text)), 0) as key from app.cards where event_id = $1 and status = 'SOLD'`,
    [eventId]
  );
  const hit = soldCache.get(eventId);
  if (hit && hit.key === key && Date.now() - hit.at < SOLD_TTL_MS) return hit.cards;
  const cards = await query(
    `select c.id, c.serial, c.grid, coalesce(u.name, r.buyer_full_name) as holder, r.channel
       from app.cards c
       left join app.users u on u.id = c.owner_id
       left join app.reservations r on r.id = c.reservation_id
      where c.event_id = $1 and c.status = 'SOLD'`,
    [eventId]
  );
  soldCache.set(eventId, { key, at: Date.now(), cards });
  return cards;
}

/**
 * Verificación automática: cartones vendidos (en línea o en el salón) que ya completaron el patrón
 * con las bolas cantadas, con el estado de su reclamo. Así el admin ve un bingo aunque nadie lo cante.
 */
export async function winningCards(eventId) {
  const event = await one('select pattern, round from app.events where id = $1', [eventId]);
  if (!event) return [];
  const called = await calledIn(eventId);
  if (called.length < 4) return []; // ningún patrón se completa con menos de 4 bolas
  const calledSet = new Set(called);
  const winners = (await soldCards(eventId)).filter((c) => isWinningCard(c.grid, calledSet, event.pattern));
  if (!winners.length) return [];
  // Los reclamos sí se leen siempre (cambian en cualquier momento), pero solo los de los cartones ganadores.
  const claims = await query(
    `select distinct on (card_id) card_id, status from app.claims
      where event_id = $1 and round = $2 and card_id = any($3::uuid[]) order by card_id, created_at desc`,
    [eventId, event.round, winners.map((c) => c.id)]
  );
  const claimOf = new Map(claims.map((c) => [c.card_id, c.status]));
  return winners
    .map((c) => ({
      cardId: c.id,
      serial: c.serial,
      holder: c.holder ?? null,
      channel: c.channel ?? null, // WEB | MANUAL (vendido en el salón)
      claimStatus: claimOf.get(c.id) ?? null, // null = nadie ha cantado bingo con este cartón
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
      const state = await cachedStateOf(eventId).catch(() => null);
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

/**
 * Solo se canta en eventos programados o en vivo. Cantar NO cambia el estado: "En vivo" lo decide la administración
 * (Bingo Master o Eventos). Antes de eso las bolas son de prueba y nadie puede reclamar premios.
 */
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
    await audit(
      { ...actorFrom(req), action: 'draw.pattern', targetType: 'event', targetId: e.id, details: { round: e.round, pattern } },
      q
    );
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

/**
 * Deja el evento coherente tras borrar rondas: la ronda vigente pasa a ser la última que queda (con su modalidad)
 * y, si ya no queda ninguna bola cantada, el evento vuelve a "Programado" para reabrir la venta en línea.
 */
async function settleRounds(q, e) {
  let [{ last }] = await q('select max(round)::int as last from app.event_rounds where event_id = $1', [e.id]);
  if (!last) {
    await q('insert into app.event_rounds (event_id, round, pattern) values ($1, 1, $2)', [e.id, e.pattern]);
    last = 1;
  }
  await q(
    `update app.events set round = $2, updated_at = now(),
            pattern = (select pattern from app.event_rounds where event_id = $1 and round = $2)
      where id = $1`,
    [e.id, last]
  );
  return { round: last };
}

const afterRoundsChanged = async (e) => {
  await broadcast(e.id);
  await notifyWinningCards(e.id);
  notifyAdmins('draw:round', { eventId: e.id });
};

/**
 * Borra una ronda (p. ej. de prueba) con sus bolas y sus reclamos, también los premios confirmados en ella.
 * Las rondas siguientes se renumeran para que no queden huecos. Queda en la bitácora con lo que se borró.
 */
drawRouter.delete('/draw/rounds/:round', authenticate, authorize('ADMIN'), requireEvent, requirePlayable, async (req, res) => {
  const target = Number(req.params.round);
  if (!Number.isInteger(target) || target < 1 || target > 99) return res.status(404).json({ error: 'NOT_FOUND' });
  const e = req.event;
  const result = await tx(async (q) => {
    const [exists] = await q('select 1 from app.event_rounds where event_id = $1 and round = $2', [e.id, target]);
    if (!exists) return null;
    const [{ balls }] = await q('select count(*)::int as balls from app.draws where event_id = $1 and round = $2', [e.id, target]);
    const removedClaims = await q('delete from app.claims where event_id = $1 and round = $2 returning status', [e.id, target]);
    await q('delete from app.draws where event_id = $1 and round = $2', [e.id, target]);
    await q('delete from app.event_rounds where event_id = $1 and round = $2', [e.id, target]);
    // Renumerar de una en una (la clave única incluye la ronda): la 3 pasa a 2, luego la 4 a 3…
    const later = await q('select round from app.event_rounds where event_id = $1 and round > $2 order by round', [e.id, target]);
    for (const { round } of later) {
      for (const table of ['app.draws', 'app.claims', 'app.event_rounds']) {
        await q(`update ${table} set round = $3 where event_id = $1 and round = $2`, [e.id, round, round - 1]);
      }
    }
    const settled = await settleRounds(q, e);
    await audit(
      {
        ...actorFrom(req),
        action: 'draw.round_deleted',
        targetType: 'event',
        targetId: e.id,
        details: {
          round: target,
          balls,
          claims: removedClaims.length,
          confirmed: removedClaims.filter((c) => c.status === 'CONFIRMED').length,
        },
      },
      q
    );
    return settled;
  });
  if (!result) return res.status(404).json({ error: 'NOT_FOUND' });
  await afterRoundsChanged(e);
  res.json(await stateOf(e.id));
});

/** Borra TODAS las rondas del evento (pruebas antes del bingo real): queda la ronda 1 vacía. El estado no cambia. */
drawRouter.delete('/draw/rounds', authenticate, authorize('ADMIN'), requireEvent, requirePlayable, async (req, res) => {
  const e = req.event;
  await tx(async (q) => {
    const [{ balls }] = await q('select count(*)::int as balls from app.draws where event_id = $1', [e.id]);
    const removedClaims = await q('delete from app.claims where event_id = $1 returning status', [e.id]);
    await q('delete from app.draws where event_id = $1', [e.id]);
    const [{ rounds }] = await q('select count(*)::int as rounds from app.event_rounds where event_id = $1', [e.id]);
    await q('delete from app.event_rounds where event_id = $1', [e.id]);
    await settleRounds(q, e);
    await audit(
      {
        ...actorFrom(req),
        action: 'draw.rounds_reset',
        targetType: 'event',
        targetId: e.id,
        details: { rounds, balls, claims: removedClaims.length },
      },
      q
    );
  });
  await afterRoundsChanged(e);
  res.json(await stateOf(e.id));
});

/**
 * Corrige la modalidad de una ronda del historial (también la actual, aunque ya tenga bolas): por ejemplo, si se
 * eligió la modalidad equivocada. No se permite si la ronda ya tiene reclamos vigentes, porque se ganaron con la
 * modalidad anterior: en ese caso hay que rechazarlos o borrar la ronda.
 */
drawRouter.patch(
  '/draw/rounds/:round',
  authenticate,
  authorize('ADMIN'),
  requireEvent,
  requirePlayable,
  patternBody,
  async (req, res) => {
    const target = Number(req.params.round);
    if (!Number.isInteger(target) || target < 1 || target > 99) return res.status(404).json({ error: 'NOT_FOUND' });
    const e = req.event;
    const { pattern } = req.body;
    const result = await tx(async (q) => {
      const [row] = await q('select pattern from app.event_rounds where event_id = $1 and round = $2', [e.id, target]);
      if (!row) return 'NOT_FOUND';
      const [{ claims }] = await q(
        "select count(*)::int as claims from app.claims where event_id = $1 and round = $2 and status <> 'REJECTED'",
        [e.id, target]
      );
      if (claims > 0) return 'ROUND_HAS_CLAIMS';
      await q('update app.event_rounds set pattern = $3 where event_id = $1 and round = $2', [e.id, target, pattern]);
      if (target === e.round) await q('update app.events set pattern = $2, updated_at = now() where id = $1', [e.id, pattern]);
      await audit(
        {
          ...actorFrom(req),
          action: 'draw.round_edited',
          targetType: 'event',
          targetId: e.id,
          details: { round: target, from: row.pattern, to: pattern },
        },
        q
      );
      return 'OK';
    });
    if (result === 'NOT_FOUND') return res.status(404).json({ error: 'NOT_FOUND' });
    if (result === 'ROUND_HAS_CLAIMS') return res.status(409).json({ error: 'ROUND_HAS_CLAIMS' });
    await afterRoundsChanged(e);
    res.json(await stateOf(e.id));
  }
);

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
