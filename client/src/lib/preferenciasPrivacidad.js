// Decisión de la persona sobre cookies opcionales, guardada en su navegador.
const KEY = 'hs-consent';
const VERSION = 1; // subirla si cambian las categorías: se vuelve a preguntar
export const CONSENT_EVENT = 'hs:consent';
export const SETTINGS_EVENT = 'hs:cookie-settings';

/** { analytics: boolean, at: ISO } o null si todavía no decidió. */
export function readConsent() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return v?.v === VERSION && typeof v.analytics === 'boolean' ? v : null;
  } catch {
    return null; // modo privado / almacenamiento bloqueado: se vuelve a preguntar
  }
}

export function saveConsent(analytics) {
  const value = { v: VERSION, analytics: Boolean(analytics), at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // sin persistencia: la decisión dura solo esta visita
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  return value;
}

/** Reabre el aviso de cookies (desde el pie de página o la Política de cookies). */
export const openCookieSettings = () => window.dispatchEvent(new Event(SETTINGS_EVENT));
