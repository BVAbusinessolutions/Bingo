import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../../db/index.js';
import { authenticate } from '../../middleware/auth.js';
import { getFile, sendFile } from '../../services/files.js';
import { releaseExpiredThrottled } from '../reservations/reservations.service.js';
import { publicWinnerName } from '../claims/claims.service.js';
import { publicReads } from '../../utils/microCache.js';

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
    price: e.price, // precio de cada paquete
    bundleSize: e.bundle_size ?? 1, // cartones por paquete ("2 cartones por ₡3 000")
    startsAt: new Date(e.starts_at).toISOString(),
    venue: e.venue ?? '',
    venueArea: e.venue_area ?? '',
    status: e.status,
    stream: e.stream_provider
      ? { provider: e.stream_provider, ...(e.stream_url ? { url: e.stream_url } : { videoId: e.stream_video_id }) }
      : null,
    streamBackup: e.stream_backup ?? null, // misma forma que stream; el reproductor cambia a esta si la principal falla
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
  await releaseExpiredThrottled();
  // Lo piden todos los jugadores al entrar: una consulta cada 2 s como máximo (se invalida en cada escritura).
  const e = await publicReads.get('current', currentEvent);
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
        `select cl.event_id, coalesce(u.name, r.buyer_full_name) as name, c.serial, cl.called_count, cl.channel, cl.round, cl.pattern, cl.prize,
                s.name as series
           from app.claims cl
           join app.cards c on c.id = cl.card_id
           left join app.series_cards sc on sc.id = c.series_card_id
           left join app.card_series s on s.id = sc.series_id
           left join app.users u on u.id = cl.user_id
           left join app.reservations r on r.id = c.reservation_id
          where cl.status = 'CONFIRMED' and cl.event_id = any($1::text[])
          order by cl.created_at`,
        [events.map((e) => e.id)]
      )
    : [];
  // Ganadores del salón anotados a mano (cartones físicos).
  const manual = events.length
    ? await query(
        `select w.event_id, w.name, w.prize, w.pattern, w.serial, coalesce(s.name, w.series_label) as series
           from app.manual_winners w left join app.card_series s on s.id = w.series_id
          where w.event_id = any($1::text[]) order by w.created_at`,
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
          prize: w.prize,
          series: w.series,
        }))
        .concat(
          manual
            .filter((w) => w.event_id === e.id)
            .map((w) => ({
              name: publicWinnerName(w.name),
              serial: w.serial,
              calledCount: null,
              channel: 'SALON',
              round: null,
              pattern: w.pattern,
              prize: w.prize,
              series: w.series,
            }))
        ),
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

/** Cartones del catálogo listos para enviar, o null si el evento no existe. */
async function catalogCards(eventId) {
  const event = await one('select id from app.events where id = $1', [eventId]);
  if (!event) return null;
  const cards = await query(
    `select c.serial, c.grid, c.status, c.series_card_id, sc.image_id, r.status as reservation_status, r.expires_at
       from app.cards c
       left join app.reservations r on r.id = c.reservation_id
       left join app.series_cards sc on sc.id = c.series_card_id
      where c.event_id = $1
      order by c.serial`,
    [eventId]
  );
  return cards.map((c) => {
    const status = c.status === 'RESERVED' && c.reservation_status === 'PROOF_SUBMITTED' ? 'VERIFYING' : c.status;
    return {
      serial: c.serial,
      grid: c.grid,
      status,
      imageUrl: imageUrl(c),
      reservedUntil: status === 'RESERVED' && c.expires_at ? new Date(c.expires_at).toISOString() : null,
    };
  });
}

/**
 * Catálogo público del evento. Nunca expone quién compró/reservó.
 * status: AVAILABLE | RESERVED (esperando pago, con reservedUntil) | VERIFYING (comprobante enviado) | SOLD
 */
router.get('/:eventId/cards/catalog', async (req, res) => {
  if (!eventIdParam.safeParse(req.params.eventId).success) return res.status(404).json({ error: 'NOT_FOUND' });
  await releaseExpiredThrottled();
  // Cada jugador en el catálogo lo pide cada 15 s: con cientos a la vez, todos comparten una consulta cada 2 s
  // (y se recalcula al instante cuando alguien reserva, paga o se libera un cartón).
  const cards = await publicReads.get(`catalog:${req.params.eventId}`, () => catalogCards(req.params.eventId));
  if (!cards) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ serverTime: new Date().toISOString(), cards }); // la hora del servidor siempre es la actual
});

/** Imagen original del cartón (PNG importado). Pública: es la misma que se muestra en el catálogo. */
cardImagesRouter.get('/:seriesCardId', async (req, res) => {
  if (!z.string().uuid().safeParse(req.params.seriesCardId).success) return res.status(404).json({ error: 'NOT_FOUND' });
  const row = await one('select image_id from app.series_cards where id = $1', [req.params.seriesCardId]);
  sendFile(res, await getFile(row?.image_id), { cache: true });
});

export default router;
