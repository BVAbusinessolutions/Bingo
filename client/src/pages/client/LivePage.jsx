import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Hand, LogOut, Printer, Sparkles, Trophy, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useCurrentEvent } from '../../hooks/useCurrentEvent';
import { useSocket } from '../../hooks/useSocket';
import { cardsApi, claimsApi, drawApi } from '../../api/endpoints';
import BingoCard from '../../components/bingo/BingoCard';
import ClaimButton from '../../components/bingo/ClaimButton';
import LiveStream from '../../components/player/LiveStream';
import CalledNumbersBoard from '../../components/player/CalledNumbersBoard';
import ThemeToggle from '../../components/ui/ThemeToggle';
import TextSizeControl from '../../components/ui/TextSizeControl';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { hasWon, PATTERNS } from '../../constants/patterns';
import { errorMessage } from '../../lib/format';
import { PATHS } from '../../routing/paths';

const EMPTY = new Set();

/** Reclamos del jugador para el evento, indexados por número de serie del cartón. */
function useClaims(eventId) {
  const { revision } = useNotifications();
  const [claims, setClaims] = useState({});
  const [pending, setPending] = useState({}); // { [cardId]: true } mientras se envía
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!eventId) return;
    claimsApi
      .mine(eventId)
      .then((list) => setClaims(Object.fromEntries([...list].reverse().map((c) => [c.serial, c]))))
      .catch(() => {});
  }, [eventId, revision]);

  const claim = useCallback(
    async (card) => {
      setPending((p) => ({ ...p, [card.id]: true }));
      setErrors((e) => ({ ...e, [card.id]: '' }));
      try {
        const result = await claimsApi.create(eventId, card.id);
        setClaims((c) => ({ ...c, [result.serial]: result }));
      } catch (err) {
        setErrors((e) => ({ ...e, [card.id]: errorMessage(err) }));
      } finally {
        setPending((p) => ({ ...p, [card.id]: false }));
      }
    },
    [eventId]
  );

  return { claims, pending, errors, claim };
}

function LiveHeader({ connected, onLogout }) {
  return (
    <header className="sticky top-0 z-20 border-b-4 border-sol-gold bg-sol-blue text-white shadow-md dark:bg-[#0a1628] print:hidden">
      <div className="container-page flex h-16 items-center justify-between gap-2">
        <Link to={PATHS.home} className="flex min-w-0 items-center gap-2 font-black" aria-label="Volver al inicio">
          <ArrowLeft className="h-6 w-6 shrink-0" aria-hidden />
          <span className="truncate text-lg">Bingo Hogar Sol</span>
        </Link>
        <div className="flex items-center gap-2">
          <span
            role="status"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${connected ? 'bg-emerald-600' : 'bg-slate-500'}`}
          >
            {connected ? <Wifi className="h-4 w-4" aria-hidden /> : <WifiOff className="h-4 w-4" aria-hidden />}
            <span className="hidden sm:inline">{connected ? 'En línea' : 'Reconectando…'}</span>
          </span>
          <ThemeToggle />
          <button onClick={onLogout} aria-label="Cerrar sesión" className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10">
            <LogOut className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default function LivePage() {
  const { logout } = useAuth();
  const { socket, connected } = useSocket('/draw');
  const { event: currentEvent, loading } = useCurrentEvent();
  const eventId = currentEvent?.id;

  const [event, setEvent] = useState(null);
  const [cards, setCards] = useState([]);
  const [calledList, setCalledList] = useState([]);
  const [autoMark, setAutoMark] = useState(true);
  const [manualMarks, setManualMarks] = useState({}); // { [cardId]: Set<number> }
  const [error, setError] = useState('');
  const { claims, pending, errors, claim } = useClaims(eventId);

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
  const isLive = event?.status === 'LIVE';
  const winners = cards.filter((c) => hasWon(c.grid, called, pattern));
  const unclaimedWinners = winners.filter((c) => !claims[c.serial] || claims[c.serial].status === 'REJECTED');

  return (
    <div className="min-h-screen pb-12">
      <LiveHeader connected={connected} onLogout={logout} />

      <main id="contenido" className="container-page grid gap-5 pt-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Stream + tablero (fijo al hacer scroll en escritorio) */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start print:hidden">
          <LiveStream provider={event?.stream?.provider} videoId={event?.stream?.videoId} title={event?.name} />
          <CalledNumbersBoard calledList={calledList} />
        </div>

        {/* Cartones comprados */}
        <section aria-labelledby="my-cards" className="space-y-4">
          <div className="surface flex flex-col gap-3 p-4 print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 id="my-cards" className="text-2xl font-black text-brand">
                  Mis cartones ({cards.length})
                </h1>
                <p className="text-lg text-fg-muted">
                  Se juega: <b className="text-fg">{PATTERNS[pattern]?.label}</b>
                </p>
              </div>
              <div className="rounded-full bg-sol-blue p-1 text-white dark:bg-[#0a1628]">
                <TextSizeControl />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAutoMark((v) => !v)}
                aria-pressed={autoMark}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 font-extrabold transition ${
                  autoMark ? 'bg-sol-blue text-white dark:bg-sol-blue-light' : 'bg-sol-gold text-sol-blue'
                }`}
              >
                {autoMark ? <Sparkles className="h-5 w-5" aria-hidden /> : <Hand className="h-5 w-5" aria-hidden />}
                {autoMark ? 'Marcado automático' : 'Marcado manual'}
              </button>
              <Button variant="outline" icon={Printer} onClick={() => window.print()} disabled={cards.length === 0}>
                Imprimir
              </Button>
            </div>
          </div>

          {unclaimedWinners.length > 0 && (
            <div role="alert" className="flex items-center gap-3 rounded-2xl border-4 border-white bg-sol-gold p-4 font-black text-sol-blue shadow-lg print:hidden">
              <Trophy className="h-10 w-10 shrink-0" aria-hidden />
              <p className="text-xl">
                ¡Tienes BINGO en {unclaimedWinners.map((c) => `#${c.serial}`).join(', ')}! Pulsa “¡Bingo!” debajo del cartón.
              </p>
            </div>
          )}
          {error && <Alert tone="error">{error}</Alert>}
          {!loading && !currentEvent && <Alert>No hay ningún bingo programado por ahora.</Alert>}
          {eventId && !error && cards.length === 0 && (
            <Alert title="Aún no tienes cartones aprobados para este bingo" action={<Button to={PATHS.catalog} variant="gold">Comprar cartones</Button>}>
              Si ya pagaste, te avisaremos aquí cuando se apruebe.
            </Alert>
          )}

          <div className="print-cards grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
            {cards.map((card) => {
              const won = winners.includes(card);
              return (
                <div key={card.id} className="space-y-2">
                  <BingoCard
                    card={card}
                    called={called}
                    autoMark={autoMark}
                    manualMarks={manualMarks[card.id] ?? EMPTY}
                    pattern={pattern}
                    onToggle={toggle}
                  />
                  {(won || claims[card.serial]) && (
                    <div className="print:hidden">
                      <ClaimButton
                        claim={claims[card.serial]}
                        canClaim={isLive}
                        loading={pending[card.id]}
                        error={errors[card.id]}
                        onClaim={() => claim(card)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
