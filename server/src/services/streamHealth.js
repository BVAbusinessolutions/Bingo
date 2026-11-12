import { logger } from '../utils/logger.js';

/**
 * Salud de la transmisión vista desde los jugadores: cada reproductor avisa cuando se corta, se reconecta o cambia
 * a la de respaldo. Sin datos personales (solo un id aleatorio de pestaña) y en memoria, igual que la presencia.
 * El panel muestra cuántas pestañas distintas tuvieron cada problema en los últimos minutos.
 */
export const STREAM_REPORT_KINDS = ['error', 'reconnect', 'fallback', 'recovered'];
const WINDOW_MS = 15 * 60_000;
const MAX_ENTRIES = 50_000; // tope de memoria ante abuso
const reports = []; // { at, kind, tab }

const prune = (now = Date.now()) => {
  while (reports.length && now - reports[0].at > WINDOW_MS) reports.shift();
};

export function reportStream({ kind, provider, tab, detail }) {
  prune();
  if (reports.length >= MAX_ENTRIES) return;
  reports.push({ at: Date.now(), kind, tab });
  if (kind !== 'recovered') logger.warn('stream.player_issue', { kind, provider, detail });
}

/** Pestañas distintas con cada tipo de problema en los últimos 15 minutos. */
export function streamIssues() {
  prune();
  const tabs = Object.fromEntries(STREAM_REPORT_KINDS.map((k) => [k, new Set()]));
  for (const r of reports) tabs[r.kind].add(r.tab);
  return Object.fromEntries(STREAM_REPORT_KINDS.map((k) => [k, tabs[k].size]));
}
