import { useCallback, useEffect, useState } from 'react';
import { eventsApi } from '../api/endpoints';

export function useCurrentEvent() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(
    () =>
      eventsApi
        .current()
        .then(setEvent)
        .catch(() => setEvent(null))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    reload();
  }, [reload]);

  return { event, loading, reload };
}
