import { one, query, tx } from '../../db/index.js';
import { audit } from '../../services/audit.js';
import { saveFile } from '../../services/files.js';
import { cardSignature, generateCard, gridProblems } from '../../domain/bingo.js';
import { HttpError } from '../../utils/httpError.js';
import { logger } from '../../utils/logger.js';
import { recognizeCard } from './cardRecognizer.js';

const EMPTY_GRID = Array.from({ length: 5 }, () => Array(5).fill(null));
const iso = (d) => (d ? new Date(d).toISOString() : null);

export const seriesView = (s) => ({
  id: s.id,
  name: s.name,
  source: s.source, // GENERATED | IMPORT
  fileName: s.file_name,
  status: s.status, // PROCESSING | READY | FAILED
  cardCount: s.card_count,
  needsReview: s.needs_review ?? 0,
  withImages: s.with_images ?? 0,
  notes: s.notes,
  createdAt: iso(s.created_at),
  events: s.events ?? [],
});

export async function listSeries() {
  const rows = await query(
    `select s.*,
            (select count(*)::int from app.series_cards sc where sc.series_id = s.id and sc.needs_review) as needs_review,
            (select count(*)::int from app.series_cards sc where sc.series_id = s.id and sc.image_id is not null) as with_images,
            coalesce((select json_agg(json_build_object('id', e.id, 'name', e.name, 'status', e.status) order by e.starts_at desc)
                        from app.events e where e.series_id = s.id), '[]') as events
       from app.card_series s
      order by s.created_at desc
      limit 100`
  );
  return rows.map(seriesView);
}

export const getSeries = async (id) => {
  const rows = await query(
    `select s.*, (select count(*)::int from app.series_cards sc where sc.series_id = s.id and sc.needs_review) as needs_review
       from app.card_series s where s.id = $1`,
    [id]
  );
  return rows[0] ? seriesView(rows[0]) : null;
};

/** Serie de cartones generados al azar (pruebas o eventos sin imágenes). Seriales consecutivos desde `startSerial`. */
export async function createGeneratedSeries({ name, count, startSerial }, actor) {
  const seen = new Set();
  const cards = [];
  while (cards.length < count) {
    const grid = generateCard();
    const sig = cardSignature(grid);
    if (seen.has(sig)) continue;
    seen.add(sig);
    cards.push({ serial: String(startSerial + cards.length), grid });
  }
  return tx(async (q) => {
    const [s] = await q(
      "insert into app.card_series (name, source, status, card_count, created_by) values ($1, 'GENERATED', 'READY', $2, $3) returning id",
      [name, count, actor.actorId]
    );
    await q(
      `insert into app.series_cards (series_id, serial, grid)
       select $1, x.serial, x.grid from jsonb_to_recordset($2::jsonb) as x(serial text, grid jsonb)`,
      [s.id, JSON.stringify(cards)]
    );
    await audit({ ...actor, action: 'series.generated', targetType: 'series', targetId: s.id, details: { name, count } }, q);
    return s.id;
  });
}

/** Número de serie a partir del nombre del archivo ("carton_1001.png" -> "1001"), si la imagen no lo trae legible. */
const serialFromName = (name) => name.match(/(\d{1,8})(?=\D*$)/)?.[1] ?? null;

/**
 * Importa un ZIP de imágenes PNG como una serie nueva. Responde rápido y procesa en segundo plano:
 * cada imagen se guarda y se leen sus 24 números y su serie. Lo que no se lee con certeza queda "por revisar".
 */
export async function startImport({ name, fileName, pngs }, actor) {
  const series = await one(
    "insert into app.card_series (name, source, file_name, status, created_by) values ($1, 'IMPORT', $2, 'PROCESSING', $3) returning id",
    [name, fileName, actor.actorId]
  );
  await audit({
    ...actor,
    action: 'series.import_started',
    targetType: 'series',
    targetId: series.id,
    details: { fileName, images: pngs.length },
  });
  processImport(series.id, pngs).catch(async (err) => {
    logger.error('series.import_failed', { series: series.id, message: err.message });
    await query("update app.card_series set status = 'FAILED', notes = $2 where id = $1", [
      series.id,
      'La importación falló. Revisa el ZIP e inténtalo de nuevo.',
    ]);
  });
  return series.id;
}

async function processImport(seriesId, pngs) {
  const usedSerials = new Set();
  let imported = 0;
  let duplicates = 0;
  for (const png of pngs) {
    const result = await recognizeCard(png.data).catch((err) => {
      logger.warn('series.recognize_failed', { file: png.name, message: err.message });
      return { serial: null, grid: null };
    });
    const serial = result.serial ?? serialFromName(png.name);
    if (!serial || usedSerials.has(serial)) {
      duplicates += 1;
      continue;
    }
    usedSerials.add(serial);
    const grid = result.grid ?? EMPTY_GRID;
    const needsReview = !result.grid || gridProblems(grid).length > 0;
    await tx(async (q) => {
      const imageId = await saveFile(q, { kind: 'CARD_IMAGE', mime: 'image/png', data: png.data });
      await q('insert into app.series_cards (series_id, serial, grid, image_id, needs_review) values ($1, $2, $3, $4, $5)', [
        seriesId,
        serial,
        JSON.stringify(grid),
        imageId,
        needsReview,
      ]);
    });
    imported += 1;
    if (imported % 50 === 0) await query('update app.card_series set card_count = $2 where id = $1', [seriesId, imported]);
  }
  const notes = duplicates ? `${duplicates} imagen(es) omitidas por serie repetida o ilegible.` : '';
  await query("update app.card_series set status = 'READY', card_count = $2, notes = $3 where id = $1", [seriesId, imported, notes]);
  logger.info('series.import_done', { series: seriesId, imported, duplicates });
}

/** Al iniciar el servidor, una importación interrumpida no puede quedar "procesando" para siempre. */
export const failInterruptedImports = () =>
  query(
    "update app.card_series set status = 'FAILED', notes = 'La importación se interrumpió (reinicio del servidor). Vuelve a subir el ZIP.' where status = 'PROCESSING'"
  );

export async function listSeriesCards(seriesId, { page = 1, onlyReview = false, q = '' }) {
  const pageSize = 48;
  const filters = ['series_id = $1'];
  const params = [seriesId];
  if (onlyReview) filters.push('needs_review');
  if (q) {
    params.push(`%${q}%`);
    filters.push(`serial like $${params.length}`);
  }
  const where = filters.join(' and ');
  const [{ total }] = await query(`select count(*)::int as total from app.series_cards where ${where}`, params);
  const rows = await query(
    `select id, serial, grid, image_id, needs_review from app.series_cards where ${where}
      order by needs_review desc, length(serial), serial limit ${pageSize} offset $${params.length + 1}`,
    [...params, (page - 1) * pageSize]
  );
  return {
    total,
    page,
    pageSize,
    cards: rows.map((c) => ({
      id: c.id,
      serial: c.serial,
      grid: c.grid,
      needsReview: c.needs_review,
      imageUrl: c.image_id ? `/api/card-images/${c.id}` : null,
      problems: c.needs_review ? gridProblems(c.grid) : [],
    })),
  };
}

/** Corrección manual de un cartón leído mal desde la imagen. */
export async function updateSeriesCard(id, { serial, grid }, actor) {
  const problems = gridProblems(grid);
  if (problems.length) throw Object.assign(new HttpError(400, 'INVALID_GRID'), { problems });
  return tx(async (q) => {
    const [card] = await q('select series_id from app.series_cards where id = $1', [id]);
    if (!card) throw new HttpError(404, 'NOT_FOUND');
    const [inUse] = await q('select 1 from app.events where series_id = $1 limit 1', [card.series_id]);
    if (inUse) throw new HttpError(409, 'SERIES_IN_USE');
    const rows = await q(
      `update app.series_cards set serial = $2, grid = $3, needs_review = false where id = $1
       and not exists (select 1 from app.series_cards o where o.series_id = series_cards.series_id and o.serial = $2 and o.id <> $1)
       returning id`,
      [id, serial, JSON.stringify(grid)]
    );
    if (!rows.length) throw new HttpError(409, 'SERIAL_TAKEN');
    await audit({ ...actor, action: 'series.card_corrected', targetType: 'series_card', targetId: id, details: { serial } }, q);
    return true;
  });
}

export async function deleteSeries(id, actor) {
  return tx(async (q) => {
    const [inUse] = await q('select 1 from app.events where series_id = $1 limit 1', [id]);
    if (inUse) throw new HttpError(409, 'SERIES_IN_USE');
    const images = await q('delete from app.series_cards where series_id = $1 returning image_id', [id]);
    const ids = images.map((r) => r.image_id).filter(Boolean);
    if (ids.length) await q('delete from app.files where id = any($1::uuid[])', [ids]);
    const [s] = await q('delete from app.card_series where id = $1 returning name', [id]);
    if (!s) throw new HttpError(404, 'NOT_FOUND');
    await audit({ ...actor, action: 'series.deleted', targetType: 'series', targetId: id, details: { name: s.name } }, q);
    return true;
  });
}

/**
 * Elige qué serie se juega en un evento: reemplaza sus cartones por los de la serie.
 * Solo antes de vender: si el evento ya tiene reservas o balotas cantadas, se rechaza.
 */
export async function assignSeriesToEvent(eventId, seriesId, actor) {
  return tx(async (q) => {
    const [event] = await q('select id, status from app.events where id = $1 for update', [eventId]);
    if (!event) throw new HttpError(404, 'NOT_FOUND');
    if (event.status !== 'SCHEDULED') throw new HttpError(409, 'EVENT_ALREADY_STARTED');
    const [sold] = await q('select 1 from app.reservations where event_id = $1 limit 1', [eventId]);
    if (sold) throw new HttpError(409, 'EVENT_HAS_SALES');
    const [series] = await q(
      `select s.status, (select count(*)::int from app.series_cards sc where sc.series_id = s.id and sc.needs_review) as needs_review
         from app.card_series s where s.id = $1`,
      [seriesId]
    );
    if (!series) throw new HttpError(404, 'NOT_FOUND');
    if (series.status !== 'READY') throw new HttpError(409, 'SERIES_NOT_READY');
    if (series.needs_review > 0) throw new HttpError(409, 'SERIES_NEEDS_REVIEW');

    await q('delete from app.cards where event_id = $1', [eventId]);
    const inserted = await q(
      `insert into app.cards (event_id, series_card_id, serial, grid)
       select $1, sc.id, sc.serial, sc.grid from app.series_cards sc where sc.series_id = $2
       returning id`,
      [eventId, seriesId]
    );
    await q('update app.events set series_id = $2, updated_at = now() where id = $1', [eventId, seriesId]);
    await audit(
      { ...actor, action: 'event.series_assigned', targetType: 'event', targetId: eventId, details: { seriesId, cards: inserted.length } },
      q
    );
    return inserted.length;
  });
}
