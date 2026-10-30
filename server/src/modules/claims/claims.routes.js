import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../../db/index.js';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { claimLimiter, validateBody } from '../../middleware/security.js';
import { notifyAdmins } from '../../realtime.js';
import { notifyAdminsByMail } from '../../utils/mailer.js';
import { isWinningCard } from '../../domain/bingo.js';
import { CLAIM_SELECT, adminClaimView, claimView, findClaim } from './claims.service.js';

const router = Router({ mergeParams: true });

const requireEvent = async (req, res, next) => {
  if (!/^[a-z0-9-]{3,64}$/.test(req.params.eventId)) return res.status(404).json({ error: 'NOT_FOUND' });
  req.event = await one('select id, name, pattern, status from app.events where id = $1', [req.params.eventId]);
  return req.event ? next() : res.status(404).json({ error: 'NOT_FOUND' });
};

router.get('/mine', authenticate, requireEvent, async (req, res) => {
  const rows = await query(`${CLAIM_SELECT} where cl.event_id = $1 and cl.user_id = $2 order by cl.created_at desc limit 50`, [
    req.event.id,
    req.user.id,
  ]);
  res.json(rows.map(claimView));
});

/**
 * "¡Bingo!": el servidor decide. Verifica que el cartón sea del jugador, que el sorteo esté en vivo
 * y que el patrón esté completo con las bolas realmente cantadas. Luego el admin confirma el premio.
 */
router.post('/', claimLimiter, authenticate, requireEvent, validateBody(z.object({ cardId: z.string().uuid() })), async (req, res) => {
  const { event } = req;
  if (event.status !== 'LIVE') return res.status(409).json({ error: 'EVENT_NOT_LIVE' });

  // La propiedad va en la consulta: un cartón ajeno simplemente no existe para este usuario.
  const card = await one("select id, serial, grid from app.cards where id = $1 and event_id = $2 and owner_id = $3 and status = 'SOLD'", [
    req.body.cardId,
    event.id,
    req.user.id,
  ]);
  if (!card) return res.status(404).json({ error: 'NOT_FOUND' });

  const existing = await one(`${CLAIM_SELECT} where cl.card_id = $1 and cl.status <> 'REJECTED'`, [card.id]);
  if (existing) return res.json(claimView(existing));

  const called = (await query('select number from app.draws where event_id = $1 order by seq', [event.id])).map((r) => r.number);
  if (!isWinningCard(card.grid, called, event.pattern)) return res.status(422).json({ error: 'NOT_A_WINNER' });

  // El índice único parcial impide dos reclamos activos del mismo cartón aunque lleguen a la vez.
  const created = await one(
    `insert into app.claims (event_id, card_id, user_id, called_count, called_at_claim)
     values ($1, $2, $3, $4, $5) on conflict do nothing returning id`,
    [event.id, card.id, req.user.id, called.length, called]
  );
  const claim = await (created
    ? findClaim(created.id)
    : one(`${CLAIM_SELECT} where cl.card_id = $1 and cl.status <> 'REJECTED'`, [card.id]));
  if (!created) return res.json(claimView(claim));

  notifyAdmins('claim:new', adminClaimView(claim));
  notifyAdminsByMail({
    subject: `🏆 ¡Bingo reclamado! Cartón #${card.serial}`,
    text: `Un jugador reclamó bingo en ${event.name} con el cartón #${card.serial} tras ${called.length} bolas.\nEl sistema ya verificó el patrón; confirma el premio desde el panel.`,
    action: { label: 'Revisar reclamo', url: `${env.clientOrigin}/admin/ganadores` },
  });
  res.status(201).json(claimView(claim));
});

export default router;
