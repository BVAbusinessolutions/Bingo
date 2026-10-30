import { connectedCount, notifyAdmins } from '../realtime.js';
import { one } from '../db/index.js';

/**
 * Personas en el sitio ahora mismo, sin datos personales: cada pestaña abierta envía un latido con un
 * identificador aleatorio propio (no es la sesión ni la IP) y se cuenta como "en línea" mientras siga latiendo.
 * Vive en memoria: con una sola instancia del servidor es exacto; al reiniciar empieza de cero.
 */
const ONLINE_MS = 90_000; // la pestaña late cada 45 s; dos latidos perdidos = ya no está
const MAX_TABS = 20_000; // tope de memoria ante abuso
const seen = new Map(); // id -> último latido (ms)

const prune = (now = Date.now()) => {
  for (const [id, at] of seen) if (now - at > ONLINE_MS) seen.delete(id);
};

export function heartbeat(id) {
  if (!seen.has(id) && seen.size >= MAX_TABS) prune();
  if (!seen.has(id) && seen.size >= MAX_TABS) return;
  const isNew = !seen.has(id);
  seen.set(id, Date.now());
  if (isNew) pushMetrics();
}

export const leave = (id) => seen.delete(id) && pushMetrics();

export function onlineNow() {
  prune();
  return seen.size;
}

/** Visitas de hoy (día de Costa Rica, UTC-6) y presencia actual: lo que el panel muestra en vivo. */
export async function liveMetrics() {
  const today = await one(
    "select coalesce(sum(visits), 0)::int as n from app.site_visits where day = (now() at time zone 'UTC' - interval '6 hours')::date"
  );
  return { online: onlineNow(), playersLive: connectedCount('/draw'), visitsToday: today.n, at: new Date().toISOString() };
}

// Avisos al panel agrupados: como máximo uno cada 3 s aunque entren muchas visitas a la vez.
let timer = null;
export function pushMetrics() {
  if (timer) return;
  timer = setTimeout(async () => {
    timer = null;
    try {
      notifyAdmins('metrics:update', await liveMetrics());
    } catch {
      // sin base de datos no hay aviso; el panel se actualiza en la siguiente consulta
    }
  }, 3000);
  timer.unref?.();
}

// Las pestañas que se cierran sin despedirse salen del conteo: revisión periódica.
setInterval(() => {
  const before = seen.size;
  prune();
  if (seen.size !== before) pushMetrics();
}, 30_000).unref();
