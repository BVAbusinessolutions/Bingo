import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '../../db.js';
import { authenticate } from '../../middleware/auth.js';
import { claimLimiter, validateBody } from '../../middleware/security.js';
import { notifyAdmins } from '../../realtime.js';
import { env } from '../../config/env.js';
import { notifyAdminsByMail } from '../../utils/mailer.js';
import { isWinningCard } from '../../utils/patterns.js';
import { adminClaimView, claimView } from './claims.service.js';

const router = Router({ mergeParams: true });

const requireEvent = (req, res, next) => {
  req.event = db.events.get(req.params.eventId);
  return req.event ? next() : res.status(404).json({ error: 'NOT_FOUND' });
};

router.get('/mine', authenticate, requireEvent, (req, res) => {
  res.json(
    [...db.claims.values()]
      .filter((c) => c.eventId === req.event.id && c.userId === req.user.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(claimView)
  );
});

/**
 * "¡Bingo!": el servidor decide. Verifica que el cartón sea del jugador, que el sorteo esté en vivo
 * y que el patrón esté completo con las balotas realmente cantadas. Luego el admin confirma el premio.
 */
router.post('/', claimLimiter, authenticate, requireEvent, validateBody(z.object({ cardId: z.string().uuid() })), (req, res) => {
  const { event } = req;
  if (event.status !== 'LIVE') return res.status(409).json({ error: 'EVENT_NOT_LIVE' });

  const card = db.cards.get(req.body.cardId);
  if (!card || card.eventId !== event.id || card.ownerId !== req.user.id || card.status !== 'SOLD') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

  const existing = [...db.claims.values()].find((c) => c.cardId === card.id && c.status !== 'REJECTED');
  if (existing) return res.json(claimView(existing));

  const called = db.draws.get(event.id) ?? [];
  if (!isWinningCard(card.grid, called, event.pattern)) return res.status(422).json({ error: 'NOT_A_WINNER' });

  const claim = {
    id: randomUUID(),
    eventId: event.id,
    cardId: card.id,
    userId: req.user.id,
    status: 'PENDING',
    calledCount: called.length,
    calledAtClaim: [...called],
    createdAt: Date.now(),
    decidedAt: null,
  };
  db.claims.set(claim.id, claim);
  notifyAdmins('claim:new', adminClaimView(claim));
  notifyAdminsByMail({
    subject: `🏆 ¡Bingo reclamado! Cartón #${card.serial}`,
    text: `Un jugador reclamó bingo en ${event.name} con el cartón #${card.serial} tras ${called.length} balotas.
El sistema ya verificó el patrón; confirma el premio desde el panel.`,
    action: { label: 'Revisar reclamo', url: `${env.clientOrigin}/admin/ganadores` },
  });
  res.status(201).json(claimView(claim));
});

export default router;
