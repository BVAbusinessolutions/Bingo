import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db.js';
import { authenticate, authorize, verifyAccessToken } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/security.js';

let drawNs; // namespace de Socket.io

const stateOf = (eventId) => ({ event: db.events.get(eventId), called: db.draws.get(eventId) ?? [] });
const broadcast = (eventId) => drawNs?.to(`event:${eventId}`).emit('draw:state', stateOf(eventId));

/** Namespace /draw: solo usuarios autenticados; los clientes solo escuchan, nunca cantan. */
export function registerDrawSocket(io) {
  drawNs = io.of('/draw');
  drawNs.use((socket, next) => {
    try {
      socket.user = verifyAccessToken(socket.handshake.auth?.token);
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });
  drawNs.on('connection', (socket) => {
    socket.on('event:join', (eventId) => {
      if (typeof eventId !== 'string' || !db.events.has(eventId)) return;
      socket.join(`event:${eventId}`);
      socket.emit('draw:state', stateOf(eventId));
    });
  });
}

export const drawRouter = Router({ mergeParams: true });

const requireEvent = (req, res, next) => (db.events.has(req.params.eventId) ? next() : res.status(404).json({ error: 'NOT_FOUND' }));

drawRouter.get('/draw', authenticate, requireEvent, (req, res) => res.json(stateOf(req.params.eventId)));

drawRouter.post(
  '/draw/call',
  authenticate,
  authorize('ADMIN'),
  requireEvent,
  validateBody(z.object({ number: z.number().int().min(1).max(90) })),
  (req, res) => {
    const called = db.draws.get(req.params.eventId);
    if (called.includes(req.body.number)) return res.status(409).json({ error: 'ALREADY_CALLED' });
    called.push(req.body.number);
    db.events.get(req.params.eventId).status = 'LIVE';
    broadcast(req.params.eventId);
    res.json(stateOf(req.params.eventId));
  }
);

drawRouter.post('/draw/undo', authenticate, authorize('ADMIN'), requireEvent, (req, res) => {
  db.draws.get(req.params.eventId).pop();
  broadcast(req.params.eventId);
  res.json(stateOf(req.params.eventId));
});
