import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../../db/index.js';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { claimLimiter, validateBody } from '../../middleware/security.js';
import { notifyAdmins } from '../../realtime.js';
import { notifyAdminsByMail } from '../../utils/mailer.js';
import { PATTERN_LABELS, isWinningCard } from '../../domain/bingo.js';
import { CLAIM_SELECT, adminClaimView, claimView, findClaim } from './claims.service.js';

const router = Router({ mergeParams: true });

/** Fecha y hora exactas del reclamo en hora de Costa Rica (para el correo de la Asociación). */
const crDateTime = (d) =>
  new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', dateStyle: 'full', timeStyle: 'medium' }).format(new Date(d));

const requireEvent = async (req, res, next) => {
  if (!/^[a-z0-9-]{3,64}$/.test(req.params.eventId)) return res.status(404).json({ error: 'NOT_FOUND' });
  req.event = await one('select id, name, pattern, round, status from app.events where id = $1', [req.params.eventId]);
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

  // Un reclamo activo por cartón y ronda: en una ronda nueva el mismo cartón puede volver a ganar.
  const activeClaim = `${CLAIM_SELECT} where cl.card_id = $1 and cl.round = $2 and cl.status <> 'REJECTED'`;
  const existing = await one(activeClaim, [card.id, event.round]);
  if (existing) return res.json(claimView(existing));

  const called = (
    await query('select number from app.draws where event_id = $1 and round = $2 order by seq', [event.id, event.round])
  ).map((r) => r.number);
  if (!isWinningCard(card.grid, called, event.pattern)) return res.status(422).json({ error: 'NOT_A_WINNER' });

  // El índice único parcial impide dos reclamos activos del mismo cartón aunque lleguen a la vez.
  const created = await one(
    `insert into app.claims (event_id, card_id, user_id, called_count, called_at_claim, round, pattern)
     values ($1, $2, $3, $4, $5, $6, $7) on conflict do nothing returning id`,
    [event.id, card.id, req.user.id, called.length, called, event.round, event.pattern]
  );
  const claim = await (created ? findClaim(created.id) : one(activeClaim, [card.id, event.round]));
  if (!created) return res.json(claimView(claim));

  const patternLabel = PATTERN_LABELS[event.pattern] ?? event.pattern;
  notifyAdmins('claim:new', { ...adminClaimView(claim), pattern: event.pattern, patternLabel });

  // Correo a la Asociación (ADMIN_NOTIFY_EMAILS) con todo lo necesario para auditar el reclamo.
  const accountCards = await query(
    "select serial from app.cards where event_id = $1 and owner_id = $2 and status = 'SOLD' order by serial",
    [event.id, req.user.id]
  );
  notifyAdminsByMail({
    subject: `🏆 ¡BINGO CANTADO! Cartón N.° ${card.serial} · ${patternLabel}`,
    text: [
      `¡BINGO CANTADO! en ${event.name}.`,
      `Usuario: ${claim.player_name ?? 'Sin nombre'} (${claim.player_email ?? req.user.email})`,
      `Cartón N.°: ${card.serial}`,
      `Modalidad: ${patternLabel} (ronda ${event.round})`,
      `Hora exacta: ${crDateTime(claim.created_at)} (hora de Costa Rica)`,
      `Bolas cantadas al reclamar: ${called.length}`,
      `Cartones de esta cuenta en el evento (${accountCards.length}): ${accountCards.map((c) => `#${c.serial}`).join(', ')}`,
      '',
      'El sistema ya verificó el cartón contra las bolas cantadas. Confirma el premio desde el panel.',
    ].join('\n'),
    action: { label: 'Revisar reclamo', url: `${env.clientOrigin}/admin/ganadores` },
  });
  res.status(201).json(claimView(claim));
});

export default router;
