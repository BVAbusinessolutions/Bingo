import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../../db/index.js';
import { authenticate } from '../../middleware/auth.js';
import { getFile, sendFile } from '../../services/files.js';
import { releaseExpiredReservations } from '../reservations/reservations.service.js';
import { publicWinnerName } from '../claims/claims.service.js';

const router = Router();
export const cardImagesRouter = Router();

/** Evento con conteo de cartones. */
export const EVENT_SELECT = `
  select e.*,
         (select count(*)::int from app.cards c where c.event_id = e.id) as total_cards,
         (select count(*)::int from app.cards c where c.event_id = e.id and c.status = 'AVAILABLE') as available_cards,
         s.name as series_name
    from app.events e
    left join app.card_series s on s.id = e.series_id`;

export function publicEvent(e) {
  return {
    id: e.id,
    name: e.name,
    description: e.description,
    pattern: e.pattern,
    round: e.round ?? 1,
    price: e.price,
    startsAt: new Date(e.starts_at).toISOString(),
    venue: e.venue ?? '',
    venueArea: e.venue_area ?? '',
    status: e.status,
    stream: e.stream_provider
      ? { provider: e.stream_provider, ...(e.stream_url ? { url: e.stream_url } : { videoId: e.stream_video_id }) }
      : null,
    available: e.available_cards ?? 0,
    total: e.total_cards ?? 0,
  };
}

/** Evento "actual": el que está en vivo, o el próximo programado. */
export const currentEvent = () =>
  one(`${EVENT_SELECT}
        where e.status in ('LIVE', 'SCHEDULED')
        order by (e.status = 'LIVE') desc, e.starts_at asc
        limit 1`);

const eventIdParam = z.string().regex(/^[a-z0-9-]{3,64}$/);

router.get('/current', async (req, res) => {
  await releaseExpiredReservations();
  const e = await currentEvent();
  if (!e) return res.status(404).json({ error: 'NO_EVENT' });
  res.json(publicEvent(e));
});

router.get('/', async (req, res) => {
  const rows = await query(`${EVENT_SELECT} where e.status <> 'CANCELLED' order by e.starts_at asc limit 50`);
  res.json(rows.map(publicEvent));
});

/** Resultados públicos: eventos en vivo o finalizados con sus ganadores confirmados. */
router.get('/results', async (req, res) => {
  const events = await query(
    `select e.id, e.name, e.description, e.pattern, e.round, e.starts_at, e.status,
            (select count(*)::int from app.draws d where d.event_id = e.id and d.round = e.round) as called_count
       from app.events e
      where e.status in ('LIVE', 'FINISHED')
      order by e.starts_at desc
      limit 30`
  );
  const winners = events.length
    ? await query(
        `select cl.event_id, coalesce(u.name, r.buyer_full_name) as name, c.serial, cl.called_count, cl.channel, cl.round, cl.pattern
           from app.claims cl
           join app.cards c on c.id = cl.card_id
           left join app.users u on u.id = cl.user_id
           left join app.reservations r on r.id = c.reservation_id
          where cl.status = 'CONFIRMED' and cl.event_id = any($1::text[])
          order by cl.created_at`,
        [events.map((e) => e.id)]
      )
    : [];
  res.json(
    events.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      pattern: e.pattern,
      round: e.round,
      startsAt: new Date(e.starts_at).toISOString(),
      status: e.status,
      calledCount: e.called_count,
      winners: winners
        .filter((w) => w.event_id === e.id)
        .map((w) => ({
          name: publicWinnerName(w.name ?? ''),
          serial: w.serial,
          calledCount: w.called_count,
          channel: w.channel,
          round: w.round,
          pattern: w.pattern,
        })),
    }))
  );
});

const imageUrl = (c) => (c.image_id ? `/api/card-images/${c.series_card_id}` : null);

router.get('/:eventId/cards/mine', authenticate, async (req, res) => {
  if (!eventIdParam.safeParse(req.params.eventId).success) return res.status(404).json({ error: 'NOT_FOUND' });
  const cards = await query(
    `select c.id, c.serial, c.grid, c.series_card_id, sc.image_id
       from app.cards c left join app.series_cards sc on sc.id = c.series_card_id
      where c.event_id = $1 and c.owner_id = $2 and c.status = 'SOLD'
      order by c.serial`,
    [req.params.eventId, req.user.id]
  );
  res.json({ cards: cards.map((c) => ({ id: c.id, serial: c.serial, grid: c.grid, imageUrl: imageUrl(c) })) });
});

/**
 * Catálogo público del evento. Nunca expone quién compró/reservó.
 * status: AVAILABLE | RESERVED (esperando pago, con reservedUntil) | VERIFYING (comprobante enviado) | SOLD
 */
router.get('/:eventId/cards/catalog', async (req, res) => {
  if (!eventIdParam.safeParse(req.params.eventId).success) return res.status(404).json({ error: 'NOT_FOUND' });
  const event = await one('select id from app.events where id = $1', [req.params.eventId]);
  if (!event) return res.status(404).json({ error: 'NOT_FOUND' });
  await releaseExpiredReservations();
  const cards = await query(
    `select c.serial, c.grid, c.status, c.series_card_id, sc.image_id, r.status as reservation_status, r.expires_at
       from app.cards c
       left join app.reservations r on r.id = c.reservation_id
       left join app.series_cards sc on sc.id = c.series_card_id
      where c.event_id = $1
      order by c.serial`,
    [req.params.eventId]
  );
  res.json({
    serverTime: new Date().toISOString(),
    cards: cards.map((c) => {
      const status = c.status === 'RESERVED' && c.reservation_status === 'PROOF_SUBMITTED' ? 'VERIFYING' : c.status;
      return {
        serial: c.serial,
        grid: c.grid,
        status,
        imageUrl: imageUrl(c),
        reservedUntil: status === 'RESERVED' && c.expires_at ? new Date(c.expires_at).toISOString() : null,
      };
    }),
  });
});

/** Imagen original del cartón (PNG importado). Pública: es la misma que se muestra en el catálogo. */
cardImagesRouter.get('/:seriesCardId', async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.seriesCardId).success) return res.status(404).json({ error: 'NOT_FOUND' });
  const row = await one('select image_id from app.series_cards where id = $1', [req.params.seriesCardId]);
  sendFile(res, await getFile(row?.image_id), { cache: true });
});

export default router;
