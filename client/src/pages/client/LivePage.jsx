import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut, PartyPopper, Sparkles, Trophy, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useCurrentEvent } from '../../hooks/useCurrentEvent';
import { useSocket } from '../../hooks/useSocket';
import { cardsApi, claimsApi, drawApi } from '../../api/endpoints';
import BingoCard from '../../components/bingo/BingoCard';
import ClaimButton from '../../components/bingo/ClaimButton';
import CardControls from '../../components/bingo/CardControls';
import CardSwitcher from '../../components/bingo/CardSwitcher';
import LiveStream from '../../components/player/LiveStream';
import CalledNumbersBoard from '../../components/player/CalledNumbersBoard';
import { BrandBadge } from '../../components/brand/BrandLogo';
import AccessibilityButton from '../../components/accessibility/AccessibilityButton';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Celebration from '../../components/bingo/Celebration';
import { countedMarks, missingFor, PATTERNS } from '../../constants/patterns';
import { isSoundOn, playMark, playReady, playWin, setSoundOn } from '../../lib/sound';
import { readMarker, saveMarker } from '../../constants/markers';
import { gridClassFor, readCardView, resolveView, saveCardView } from '../../constants/cardViews';
import { scrollToTarget } from '../../lib/scrollToTarget';
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
        return result; // el servidor ya validó el cartón contra las bolas oficiales
      } catch (err) {
        setErrors((e) => ({ ...e, [card.id]: errorMessage(err) }));
        return null;
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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy-950/90 text-white shadow-md backdrop-blur-xl print:hidden">
      <div className="container-page flex h-16 items-center justify-between gap-2">
        <Link to={PATHS.home} className="flex min-w-0 items-center gap-2 font-black" aria-label="Volver al inicio">
          <ArrowLeft className="h-6 w-6 shrink-0" aria-hidden />
          <BrandBadge className="h-11 w-11 rounded-xl" />
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
          <AccessibilityButton />
          <button
            type="button"
            onClick={onLogout}
            aria-label="Cerrar sesión"
            className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"
          >
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
  const { event: currentEvent, loading, error: eventError } = useCurrentEvent();
  const eventId = currentEvent?.id;

  const [event, setEvent] = useState(null);
  const [cards, setCards] = useState([]);
  const [calledList, setCalledList] = useState([]);
  // Apagado por defecto: la persona marca sus números; el automático es una ayuda que se activa con aviso.
  const [autoMark, setAutoMark] = useState(false);
  const [askAutoMark, setAskAutoMark] = useState(false);
  const [marker, setMarker] = useState(readMarker);
  const [manualMarks, setManualMarks] = useState({}); // { [cardId]: Set<number> }
  const [error, setError] = useState('');
  const [soundOn, setSoundState] = useState(isSoundOn);
  const [view, setView] = useState(readCardView); // auto | large | single | grid | mini (ver constants/cardViews)
  const [activeId, setActiveId] = useState(null); // cartón visible en la vista "Una a la vez"
  const [slideFrom, setSlideFrom] = useState(24); // dirección de la animación al cambiar de cartón
  const [celebrating, setCelebrating] = useState(null); // serie del cartón ganador recién aceptado
  const [confirmLogout, setConfirmLogout] = useState(false);
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

  // El sonido va fuera del actualizador de estado (en StrictMode React lo ejecuta dos veces).
  const marksRef = useRef(manualMarks);
  marksRef.current = manualMarks;
  const markerRef = useRef(marker);
  markerRef.current = marker;
  const toggle = useCallback((cardId, n) => {
    playMark(!marksRef.current[cardId]?.has(n), markerRef.current);
    setManualMarks((prev) => {
      const next = new Set(prev[cardId]);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return { ...prev, [cardId]: next };
    });
  }, []);

  const toggleSound = () => {
    setSoundOn(!soundOn);
    setSoundState(!soundOn);
  };
  const chooseView = (v) => {
    setView(v);
    saveCardView(v);
  };
  const chooseMarker = (m) => {
    setMarker(m);
    saveMarker(m);
  };
  const chooseAutoMark = (on) => (on ? setAskAutoMark(true) : setAutoMark(false));

  const effectiveView = resolveView(view, cards.length);
  const paged = effectiveView === 'single' && cards.length > 1;
  const shownId = cards.some((c) => c.id === activeId) ? activeId : cards[0]?.id;
  const selectCard = (id) => {
    if (paged) {
      const from = cards.findIndex((c) => c.id === shownId);
      setSlideFrom(cards.findIndex((c) => c.id === id) < from ? -24 : 24);
      setActiveId(id);
    } else {
      scrollToTarget(`carton-${cards.find((c) => c.id === id)?.serial}`);
    }
  };

  const pattern = event?.pattern ?? 'FULL';
  const isLive = event?.status === 'LIVE';
  // Lo que cuenta para el ¡Bingo! es lo marcado en el cartón: automático = todo lo cantado;
  // manual = solo las marcas de la persona que además fueron cantadas (nunca una bola no cantada).
  const marksFor = useCallback((card) => countedMarks(autoMark, called, manualMarks[card.id] ?? EMPTY), [autoMark, called, manualMarks]);
  const missingById = useMemo(
    () => Object.fromEntries(cards.map((c) => [c.id, missingFor(c.grid, marksFor(c), pattern)])),
    [cards, marksFor, pattern]
  );
  const winners = cards.filter((c) => missingById[c.id] === 0);
  const bestMissing = cards.length ? Math.min(...cards.map((c) => missingById[c.id])) : 0;
  const unclaimedWinners = winners.filter((c) => !claims[c.serial] || claims[c.serial].status === 'REJECTED');

  // Aviso sonoro una sola vez por cartón, en el momento en que completa el patrón (el botón se habilita).
  const readyKey = isLive ? unclaimedWinners.map((c) => c.id).join(',') : '';
  const announcedRef = useRef(new Set());
  useEffect(() => {
    if (!readyKey) return;
    const fresh = readyKey.split(',').filter((id) => !announcedRef.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => announcedRef.current.add(id));
    playReady();
  }, [readyKey]);

  const claimAndCelebrate = async (card) => {
    const result = await claim(card);
    if (result) {
      playWin();
      setCelebrating(card.serial);
    }
  };
  const endCelebration = useCallback(() => setCelebrating(null), []);

  return (
    <div className="min-h-screen pb-12">
      <LiveHeader connected={connected} onLogout={() => setConfirmLogout(true)} />
      {confirmLogout && (
        <ConfirmDialog
          title="¿Cerrar sesión?"
          confirmLabel="Cerrar sesión"
          confirmVariant="danger"
          onConfirm={logout}
          onCancel={() => setConfirmLogout(false)}
        >
          Saldrás del sorteo en vivo. Tus cartones quedan guardados y podrás volver a entrar.
        </ConfirmDialog>
      )}
      {askAutoMark && (
        <ConfirmDialog
          title="¿Activar el marcado automático?"
          icon={Sparkles}
          confirmLabel="Activar marcado"
          onConfirm={() => {
            setAutoMark(true);
            setAskAutoMark(false);
          }}
          onCancel={() => setAskAutoMark(false)}
        >
          El marcado automático es una herramienta de asistencia. Recomendamos verificar manualmente tus números para asegurar una
          experiencia de juego óptima.
        </ConfirmDialog>
      )}
      {celebrating && <Celebration serial={celebrating} onDone={endCelebration} />}

      {/* Celular y tablet: todo apilado (transmisión → tablero → cartones). Dos columnas solo desde xl,
          donde a los cartones les queda espacio real; overflow-x-clip evita la barra horizontal. */}
      <main id="contenido" className="container-page grid gap-5 overflow-x-clip pt-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Stream + tablero (fijo al hacer scroll en escritorio) */}
        <div className="min-w-0 space-y-4 xl:sticky xl:top-20 xl:self-start print:hidden">
          <LiveStream provider={event?.stream?.provider} videoId={event?.stream?.videoId} url={event?.stream?.url} title={event?.name} />
          <CalledNumbersBoard calledList={calledList} />
        </div>

        {/* Cartones comprados */}
        <section aria-labelledby="my-cards" className="min-w-0 scroll-mt-24 space-y-4">
          <div className="surface space-y-4 p-4 print:hidden">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <h1 id="my-cards" className="text-2xl font-black text-brand">
                Mis cartones <span className="tabular-nums">({cards.length})</span>
              </h1>
              <p className="text-fg-muted">
                Se juega: <b className="text-fg">{PATTERNS[pattern]?.label}</b>
                {cards.length > 0 && (
                  <>
                    {' · '}
                    {bestMissing === 0 ? (
                      <b className="text-sol-red dark:text-sol-gold">¡tienes un cartón completo!</b>
                    ) : (
                      <>
                        al mejor le {bestMissing === 1 ? 'falta' : 'faltan'} <b className="tabular-nums text-fg">{bestMissing}</b>
                      </>
                    )}
                  </>
                )}
              </p>
            </div>
            <CardControls
              autoMark={autoMark}
              onAutoMark={chooseAutoMark}
              view={view}
              effectiveView={effectiveView}
              onView={chooseView}
              marker={marker}
              onMarker={chooseMarker}
              soundOn={soundOn}
              onSound={toggleSound}
              canPrint={cards.length > 0}
            />
          </div>

          {cards.length > 1 && (
            <div className="print:hidden">
              <CardSwitcher cards={cards} missingById={missingById} activeId={shownId} onSelect={selectCard} paged={paged} />
            </div>
          )}

          {unclaimedWinners.length > 0 && (
            <div
              role="alert"
              className="flex animate-pop items-center gap-3 rounded-2xl border-4 border-white bg-sol-gold p-4 font-black text-sol-blue shadow-lg print:hidden"
            >
              <Trophy className="h-10 w-10 shrink-0" aria-hidden />
              <p className="text-xl">
                ¡Tienes BINGO en {unclaimedWinners.map((c) => `#${c.serial}`).join(', ')}! Pulsa “¡Bingo!” debajo del cartón.
              </p>
            </div>
          )}
          {error && <Alert tone="error">{error}</Alert>}
          {!loading && !currentEvent && eventError && (
            <Alert tone="error">No pudimos conectar con el servidor. Reintentamos solos en unos segundos.</Alert>
          )}
          {!loading && !currentEvent && !eventError && <Alert>No hay ningún bingo programado por ahora.</Alert>}
          {eventId && !error && cards.length === 0 && (
            <Alert
              title="Aún no tienes cartones aprobados para este bingo"
              action={
                <Button to={PATHS.catalog} variant="gold">
                  Comprar cartones
                </Button>
              }
            >
              Si ya pagaste, te avisaremos aquí cuando se apruebe.
            </Alert>
          )}

          {/* Columnas según la vista y el ancho real del panel (@container), no el de la pantalla. */}
          <div className="@container">
            <div className={`print-cards grid gap-4 ${gridClassFor(effectiveView)}`}>
              {cards.map((card, i) => {
                const claimed = claims[card.serial];
                const hidden = paged && card.id !== shownId;
                return (
                  <div
                    key={paged && !hidden ? `${card.id}-shown` : card.id}
                    id={`carton-${card.serial}`}
                    className={`min-w-0 scroll-mt-24 space-y-2 rounded-2xl ${
                      hidden ? 'hidden print:block' : paged ? 'motion-safe:animate-card-in' : 'motion-safe:animate-fade-up'
                    }`}
                    style={paged ? { '--from-x': `${slideFrom}px` } : { '--delay': `${Math.min(i, 8) * 60}ms` }}
                  >
                    <BingoCard
                      card={card}
                      called={called}
                      autoMark={autoMark}
                      marker={marker}
                      manualMarks={manualMarks[card.id] ?? EMPTY}
                      pattern={pattern}
                      onToggle={toggle}
                    />
                    {(isLive || claimed) && (
                      <div className="print:hidden">
                        <ClaimButton
                          compact={effectiveView === 'mini'}
                          claim={claimed}
                          canClaim={isLive}
                          missing={missingById[card.id]}
                          uncalled={autoMark ? 0 : [...(manualMarks[card.id] ?? EMPTY)].filter((n) => !called.has(n)).length}
                          loading={pending[card.id]}
                          error={errors[card.id]}
                          onClaim={() => claimAndCelebrate(card)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Botón ¡BINGO! siempre a mano: aparece solo cuando un cartón completa el patrón con las bolas cantadas. */}
      {isLive && unclaimedWinners.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-20 print:hidden">
          <Button
            variant="gold"
            size="lg"
            icon={PartyPopper}
            loading={pending[unclaimedWinners[0].id]}
            onClick={() => claimAndCelebrate(unclaimedWinners[0])}
            className="w-full max-w-md animate-pop border-4 border-white text-2xl shadow-2xl"
            aria-label={`¡Bingo! Reclamar premio con el cartón número ${unclaimedWinners[0].serial}`}
          >
            ¡BINGO! · #{unclaimedWinners[0].serial}
          </Button>
        </div>
      )}
    </div>
  );
}
