import { metricsApi } from '../../api/endpoints';
import { tabId } from '../../lib/sessionHello';

// Como máximo un aviso de cada tipo cada 30 s por pestaña: una red inestable no debe inundar al servidor.
const MIN_GAP_MS = 30_000;
const lastSent = new Map();

/** Avisa al panel que el video de este jugador se cortó, se reconectó o pasó al respaldo. Nunca rompe el reproductor. */
export function reportStream(kind, provider, detail) {
  const now = Date.now();
  if (now - (lastSent.get(kind) ?? 0) < MIN_GAP_MS) return;
  lastSent.set(kind, now);
  metricsApi.player(tabId, { kind, provider, ...(detail && { detail: String(detail).slice(0, 80) }) }).catch(() => {});
}
