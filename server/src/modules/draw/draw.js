import { Router } from 'express';
import { z } from 'zod';
import { one, query, tx } from '../../db/index.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/security.js';
import { registerAuthenticatedNamespace } from '../../realtime.js';
import { audit, actorFrom } from '../../services/audit.js';
import { MAX_BALL } from '../../domain/bingo.js';
import { EVENT_SELECT, publicEvent } from '../events/events.routes.js';

let drawNs; // namespace de Socket.io

const eventIdSchema = z.string().regex(/^[a-z0-9-]{3,64}$/);

async function stateOf(eventId) {
  const event = await one(`${EVENT_SELECT} where e.id = $1`, [eventId]);
  const called = await query('select number from app.draws where event_id = $1 order by seq', [eventId]);
  return { event: event ? publicEvent(event) : null, called: called.map((r) => r.number) };
}

export const broadcast = async (eventId) => drawNs?.to(`event:${eventId}`).emit('draw:state', await stateOf(eventId));

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
  res.json(await stateOf(req.event.id));
});
