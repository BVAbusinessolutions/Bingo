import { useEffect, useState } from 'react';
import { cardsApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useCurrentEvent } from './useCurrentEvent';

/**
 * "Jugar en vivo" solo tiene sentido cuando el administrador puso el evento EN VIVO (status LIVE)
 * y la persona tiene cartones aprobados para ese evento. Se revisa de nuevo al recibir avisos
 * (p. ej. una compra aprobada) y cada vez que cambia el evento vigente.
 */
export function useCanPlayLive() {
  const { isAuthenticated } = useAuth();
  const { revision } = useNotifications();
  const { event } = useCurrentEvent();
  const isLive = event?.status === 'LIVE';
  const eventId = isLive && isAuthenticated ? event.id : null;
  const [hasCards, setHasCards] = useState(false);

  useEffect(() => {
    if (!eventId) return undefined;
    let active = true;
    cardsApi
      .mine(eventId)
      .then((r) => active && setHasCards(r.cards.length > 0))
      .catch(() => active && setHasCards(false));
    return () => {
      active = false;
    };
  }, [eventId, revision]);

  return Boolean(eventId) && hasCards;
}
