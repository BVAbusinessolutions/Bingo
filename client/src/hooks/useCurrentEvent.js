import { useCallback, useEffect, useState } from 'react';
import { eventsApi } from '../api/endpoints';

// Varias partes de una misma pantalla (portada, cuenta regresiva, reglamento) usan el evento vigente:
// se pide una sola vez y se reutiliza por 30 s. Sin evento programado (404) el resultado es null.
// Un fallo de red o del servidor NO se guarda: antes se guardaba como null y la portada decía
// "no hay bingo" durante 30 s aunque el evento existiera.
const TTL_MS = 30_000;
const RETRY_MS = 8_000;
let cache = { at: 0, promise: null };

/** Error de conexión (servidor apagado, sin red, 5xx): se distingue de "no hay evento" (404). */
export class EventUnavailableError extends Error {}

function fetchCurrent(force = false) {
  if (force || !cache.promise || Date.now() - cache.at > TTL_MS) {
    const promise = eventsApi.current().catch((err) => {
      if (err?.response?.status === 404) return null;
      if (cache.promise === promise) cache = { at: 0, promise: null };
      throw new EventUnavailableError('No se pudo conectar con el servidor.');
    });
    cache = { at: Date.now(), promise };
  }
  return cache.promise;
}

/**
 * Evento vigente (en vivo o el próximo programado), tal como lo configuró el panel de administración.
 * `error` es true cuando el servidor no respondió; en ese caso se reintenta solo cada pocos segundos.
 */
export function useCurrentEvent() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(
    (force = true) =>
      fetchCurrent(force)
        .then((e) => {
          setEvent(e);
          setError(false);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    reload(false);
  }, [reload]);

  useEffect(() => {
    if (!error) return undefined;
    const id = setInterval(() => reload(false), RETRY_MS);
    return () => clearInterval(id);
  }, [error, reload]);

  return { event, loading, error, reload };
}
