import { metricsApi } from '../api/endpoints';

const KEY = 'hs-visit-counted';

/** Suma una visita anónima por sesión del navegador (recargar o navegar no la repite). Nunca rompe la app. */
export function countVisitOnce() {
  try {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, '1');
  } catch {
    return; // sin almacenamiento no se puede evitar el doble conteo: mejor no contar
  }
  metricsApi.visit().catch(() => {});
}

const BEAT_MS = 45_000; // el servidor considera "en línea" hasta 90 s sin latido

/**
 * "Personas en el sitio ahora" para el panel: cada pestaña late cada 45 s mientras está visible, con un
 * identificador aleatorio propio (no es la sesión, ni la IP, ni se guarda). Al ocultarse o cerrarse avisa
 * que se fue; al volver, late de inmediato.
 */
export function startPresence() {
  const tab = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`.replace('.', '')).slice(0, 36);
  let timer = null;
  const beat = () => metricsApi.presence(tab).catch(() => {});
  const leave = () => {
    clearInterval(timer);
    timer = null;
    try {
      navigator.sendBeacon?.(`${import.meta.env.VITE_API_URL ?? '/api'}/site/ping/bye?tab=${tab}`);
    } catch {
      // sin sendBeacon: el servidor la quita sola a los 90 s
    }
  };
  const start = () => {
    if (timer) return;
    beat();
    timer = setInterval(beat, BEAT_MS);
  };
  document.addEventListener('visibilitychange', () => (document.visibilityState === 'visible' ? start() : leave()));
  window.addEventListener('pagehide', leave);
  if (document.visibilityState === 'visible') start();
}
