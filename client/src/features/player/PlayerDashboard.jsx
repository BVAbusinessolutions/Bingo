import { useCallback, useEffect, useMemo, useState } from 'react';
import { Hand, LogOut, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useCurrentEvent } from '../../hooks/useCurrentEvent';
import { useSocket } from '../../hooks/useSocket';
import { cardsApi, drawApi } from '../../api/endpoints';
import BingoCard from '../bingo/BingoCard';
import { hasWon, PATTERNS } from '../bingo/patterns';
import LiveStream from './LiveStream';
import ThemeToggle from '../theme/ThemeToggle';
import CalledNumbersBoard from './CalledNumbersBoard';

const EMPTY = new Set();

export default function PlayerDashboard() {
  const { user, logout } = useAuth();
  const { socket, connected } = useSocket('/draw');
  const { event: currentEvent, loading } = useCurrentEvent();
  const eventId = currentEvent?.id;

  const [event, setEvent] = useState(null);
  const [cards, setCards] = useState([]);
  const [calledList, setCalledList] = useState([]);
  const [autoMark, setAutoMark] = useState(true);
  const [manualMarks, setManualMarks] = useState({}); // { [cardId]: Set<number> }
  const [error, setError] = useState('');

  const called = useMemo(() => new Set(calledList), [calledList]);

  // Carga inicial (por si el jugador entra con el sorteo ya iniciado)
  useEffect(() => {
    if (!eventId) return;
    Promise.all([cardsApi.mine(eventId), drawApi.state(eventId)])
      .then(([mine, draw]) => {
        setCards(mine.cards);
        setEvent(draw.event);
        setCalledList(draw.called);
      })
      .catch(() => setError('No se pudieron cargar tus cartones. Recarga la página.'));
  }, [eventId]);

  // Números cantados en tiempo real
  useEffect(() => {
    if (!socket || !eventId) return;
    const join = () => socket.emit('event:join', eventId);
    const onState = (state) => {
      setCalledList(state.called);
      if (state.event) setEvent(state.event);
    };
    socket.on('connect', join);
    socket.on('draw:state', onState);
    if (socket.connected) join();
    return () => {
      socket.off('connect', join);
      socket.off('draw:state', onState);
    };
  }, [socket, eventId]);

  const toggle = useCallback((cardId, n) => {
    setManualMarks((prev) => {
      const next = new Set(prev[cardId]);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return { ...prev, [cardId]: next };
    });
  }, []);

  const pattern = event?.pattern ?? 'FULL';
  const winners = cards.filter((c) => hasWon(c.grid, called, pattern));

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b-4 border-sol-gold bg-sol-blue px-4 py-3 text-white shadow-sm dark:bg-[#0a1628]">
        <Link to="/" className="min-w-0">
          <h1 className="truncate text-lg font-black">Bingo Hogar Sol</h1>
          <p className="truncate text-xs text-white/80">Hola, {user?.name}</p>
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
              connected ? 'bg-emerald-600' : 'bg-muted0'
            }`}
          >
            {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {connected ? 'En línea' : 'Reconectando'}
          </span>
          <ThemeToggle />
          <button onClick={logout} aria-label="Cerrar sesión" className="rounded-full p-2 hover:bg-white/10">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-3 pt-4 sm:px-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Stream + tablero (fijo al hacer scroll en escritorio) */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <LiveStream provider={event?.stream?.provider} videoId={event?.stream?.videoId} title={event?.name} />
          <CalledNumbersBoard calledList={calledList} />
        </div>

        {/* Cartones comprados */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 surface p-3">
            <div className="text-sm">
              <p className="font-bold text-brand">Mis cartones ({cards.length})</p>
              <p className="text-fg-muted">Patrón: {PATTERNS[pattern]?.label}</p>
            </div>
            <button
              onClick={() => setAutoMark((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold ${
                autoMark ? 'bg-sol-blue text-white dark:bg-sol-blue-light' : 'bg-sol-gold text-sol-blue'
              }`}
            >
              {autoMark ? <Sparkles className="h-4 w-4" /> : <Hand className="h-4 w-4" />}
              {autoMark ? 'Marcado automático' : 'Marcado manual'}
            </button>
          </div>

          {winners.length > 0 && (
            <div
              role="alert"
              className="rounded-2xl border-4 border-white bg-sol-gold p-3 text-center font-black text-sol-blue shadow-lg"
            >
              ¡BINGO en {winners.map((c) => `N.º ${c.serial}`).join(', ')}! La Asociación validará tu premio.
            </div>
          )}
          {error && <p className="surface p-3 text-sol-red">{error}</p>}
          {!loading && !currentEvent && <p className="surface p-3 text-fg-muted">No hay ningún bingo programado.</p>}
          {eventId && !error && cards.length === 0 && (
            <p className="surface p-4 text-center text-fg-muted">
              Aún no tienes cartones aprobados para este bingo.{' '}
              <Link to="/cartones" className="font-semibold text-sol-red hover:underline dark:text-sol-gold">Comprar cartones</Link>
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {cards.map((card) => (
              <BingoCard
                key={card.id}
                card={card}
                called={called}
                autoMark={autoMark}
                manualMarks={manualMarks[card.id] ?? EMPTY}
                pattern={pattern}
                onToggle={toggle}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
