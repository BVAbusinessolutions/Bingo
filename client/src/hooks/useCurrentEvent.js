import { useCallback, useEffect, useState } from 'react';
import { eventsApi } from '../api/endpoints';

// Varias partes de una misma pantalla (portada, cuenta regresiva, reglamento) usan el evento vigente:
// se pide una sola vez y se reutiliza por 30 s. Sin evento programado (404) el resultado es null.
const TTL_MS = 30_000;
let cache = { at: 0, promise: null };

function fetchCurrent(force = false) {
  if (force || !cache.promise || Date.now() - cache.at > TTL_MS) {
    cache = { at: Date.now(), promise: eventsApi.current().catch(() => null) };
  }
  return cache.promise;
}

/** Evento vigente (en vivo o el próximo programado), tal como lo configuró el panel de administración. */
export function useCurrentEvent() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(
    (force = true) =>
      fetchCurrent(force)
        .then(setEvent)
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    reload(false);
  }, [reload]);

  return { event, loading, reload };
}
