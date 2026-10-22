import { Router } from 'express';
import { db } from '../../db.js';
import { authenticate } from '../../middleware/auth.js';
import { releaseExpiredReservations } from '../reservations/reservations.service.js';
import { publicWinnerName } from '../claims/claims.service.js';

const router = Router();

export const cardsOf = (eventId) => [...db.cards.values()].filter((c) => c.eventId === eventId);

export function publicEvent(e) {
  const cards = cardsOf(e.id);
  return {
    id: e.id,
    name: e.name,
    description: e.description,
    pattern: e.pattern,
    price: e.price,
    startsAt: e.startsAt,
    status: e.status,
    stream: e.stream,
    available: cards.filter((c) => c.status === 'AVAILABLE').length,
    total: cards.length,
  };
}

/** Evento "actual": el que está en vivo, o el próximo programado. */
export function currentEvent() {
  const events = [...db.events.values()];
  return (
    events.find((e) => e.status === 'LIVE') ??
    events
      .filter((e) => e.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0] ??
    null
  );
}

router.get('/current', (req, res) => {
  releaseExpiredReservations();
  const e = currentEvent();
  if (!e) return res.status(404).json({ error: 'NO_EVENT' });
  res.json(publicEvent(e));
});

router.get('/', (req, res) => {
  res.json(
    [...db.events.values()]
      .filter((e) => e.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
      .map(publicEvent)
  );
});

/** Resultados públicos: eventos en vivo o finalizados con sus ganadores confirmados. */
router.get('/results', (req, res) => {
  const results = [...db.events.values()]
    .filter((e) => e.status === 'LIVE' || e.status === 'FINISHED')
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
    .map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      pattern: e.pattern,
      startsAt: e.startsAt,
      status: e.status,
      calledCount: db.draws.get(e.id)?.length ?? 0,
      winners: [...db.claims.values()]
        .filter((c) => c.eventId === e.id && c.status === 'CONFIRMED')
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((c) => ({
          name: publicWinnerName(db.users.get(c.userId)?.name),
          serial: db.cards.get(c.cardId)?.serial,
          calledCount: c.calledCount,
        })),
    }));
  res.json(results);
});

router.get('/:eventId/cards/mine', authenticate, (req, res) => {
  const cards = cardsOf(req.params.eventId).filter((c) => c.ownerId === req.user.id && c.status === 'SOLD');
  res.json({ cards: cards.map(({ id, serial, grid }) => ({ id, serial, grid })) });
});

/**
 * Catálogo público del evento. Nunca expone quién compró/reservó.
 * status: AVAILABLE | RESERVED (esperando pago, con reservedUntil) | VERIFYING (comprobante enviado) | SOLD
 */
router.get('/:eventId/cards/catalog', (req, res) => {
  if (!db.events.has(req.params.eventId)) return res.status(404).json({ error: 'NOT_FOUND' });
  releaseExpiredReservations();
  res.json({
    serverTime: new Date().toISOString(),
    cards: cardsOf(req.params.eventId).map((c) => {
      const r = c.reservationId ? db.reservations.get(c.reservationId) : null;
      let status = c.status;
      if (c.status === 'RESERVED' && r?.status === 'PROOF_SUBMITTED') status = 'VERIFYING';
      return {
        serial: c.serial,
        grid: c.grid,
        status,
        reservedUntil: status === 'RESERVED' && r ? new Date(r.expiresAt).toISOString() : null,
      };
    }),
  });
});

export default router;
