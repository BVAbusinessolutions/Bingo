import { Router } from 'express';
import path from 'node:path';
import { z } from 'zod';
import { db, generateCards, createEvent, UPLOAD_DIR } from '../../db.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/security.js';
import { cardsOf, publicEvent } from '../events/events.routes.js';
import {
  approveReservation,
  rejectReservation,
  releaseExpiredReservations,
  reservationView,
} from '../reservations/reservations.service.js';

const router = Router();
router.use(authenticate, authorize('ADMIN'));

const findEvent = (req, res, next) => {
  req.event = db.events.get(req.params.eventId);
  return req.event ? next() : res.status(404).json({ error: 'NOT_FOUND' });
};

// ---------- Dashboard ----------
router.get('/events/:eventId/stats', findEvent, (req, res) => {
  releaseExpiredReservations();
  const cards = cardsOf(req.event.id);
  const count = (st) => cards.filter((c) => c.status === st).length;
  const reservations = [...db.reservations.values()].filter((r) => r.eventId === req.event.id);
  const sold = count('SOLD');
  res.json({
    total: cards.length,
    sold,
    available: count('AVAILABLE'),
    reserved: count('RESERVED'),
    revenue: sold * req.event.price,
    pendingReview: reservations.filter((r) => r.status === 'PROOF_SUBMITTED').length,
    awaitingPayment: reservations.filter((r) => r.status === 'PENDING').length,
    called: db.draws.get(req.event.id)?.length ?? 0,
  });
});

// ---------- Eventos ----------
const streamSchema = z.object({
  provider: z.enum(['youtube', 'twitch', 'vimeo']),
  videoId: z.string().regex(/^[A-Za-z0-9_-]{2,64}$/),
});
const eventSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(300).optional().default(''),
  pattern: z.enum(['LINE', 'DOUBLE_LINE', 'FULL']),
  price: z.number().int().min(0).max(1_000_000),
  startsAt: z.string().datetime({ offset: true }),
  stream: streamSchema.nullable().optional(),
});

router.get('/events', (req, res) => {
  releaseExpiredReservations();
  res.json([...db.events.values()].sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt)).map(publicEvent));
});

router.post('/events', validateBody(eventSchema), (req, res) => res.status(201).json(publicEvent(createEvent(req.body))));

router.patch(
  '/events/:eventId',
  findEvent,
  validateBody(
    eventSchema.partial().extend({ status: z.enum(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED']).optional() })
  ),
  (req, res) => {
    Object.assign(req.event, req.body);
    res.json(publicEvent(req.event));
  }
);

// ---------- Cartones ----------
router.get('/events/:eventId/cards', findEvent, (req, res) => {
  releaseExpiredReservations();
  const status = ['AVAILABLE', 'RESERVED', 'SOLD'].includes(req.query.status) ? req.query.status : null;
  const q = String(req.query.q ?? '').replace(/\D/g, '').slice(0, 4);
  const all = cardsOf(req.event.id);
  const summary = { AVAILABLE: 0, RESERVED: 0, SOLD: 0 };
  all.forEach((c) => summary[c.status]++);
  const filtered = all.filter((c) => (!status || c.status === status) && (!q || c.serial.includes(q)));
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = 50;
  res.json({
    summary,
    total: filtered.length,
    page,
    pageSize,
    cards: filtered.slice((page - 1) * pageSize, page * pageSize).map((c) => ({
      id: c.id,
      serial: c.serial,
      status: c.status,
      grid: c.grid,
      owner: c.ownerId ? db.users.get(c.ownerId)?.name : null,
    })),
  });
});

router.post(
  '/events/:eventId/cards/generate',
  findEvent,
  validateBody(z.object({ count: z.number().int().min(1).max(5000) })),
  (req, res) => res.status(201).json({ created: generateCards(req.event.id, req.body.count).length })
);

// ---------- Pagos ----------
router.get('/reservations', (req, res) => {
  releaseExpiredReservations();
  const status = String(req.query.status ?? '');
  res.json(
    [...db.reservations.values()]
      .filter((r) => !status || r.status === status)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(reservationView)
  );
});

router.get('/reservations/:id/proof', (req, res) => {
  const r = db.reservations.get(req.params.id);
  if (!r?.proof) return res.status(404).json({ error: 'NOT_FOUND' });
  res.type(r.proof.mimetype);
  res.set('Content-Disposition', 'inline');
  res.sendFile(path.join(UPLOAD_DIR, r.proof.filename));
});

router.post('/reservations/:id/decision', validateBody(z.object({ approve: z.boolean() })), (req, res) => {
  const r = db.reservations.get(req.params.id);
  if (!r || !['PENDING', 'PROOF_SUBMITTED'].includes(r.status)) return res.status(409).json({ error: 'NOT_DECIDABLE' });
  if (req.body.approve) approveReservation(r);
  else rejectReservation(r);
  res.json(reservationView(r));
});

export default router;
