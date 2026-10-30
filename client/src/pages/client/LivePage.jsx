import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Hand, LogOut, PartyPopper, Printer, Sparkles, Trophy, Volume2, VolumeX, Wifi, WifiOff, ZoomIn, ZoomOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useCurrentEvent } from '../../hooks/useCurrentEvent';
import { useSocket } from '../../hooks/useSocket';
import { cardsApi, claimsApi, drawApi } from '../../api/endpoints';
import BingoCard from '../../components/bingo/BingoCard';
import ClaimButton from '../../components/bingo/ClaimButton';
import LiveStream from '../../components/player/LiveStream';
import CalledNumbersBoard from '../../components/player/CalledNumbersBoard';
import { BrandBadge } from '../../components/brand/BrandLogo';
import AccessibilityButton from '../../components/accessibility/AccessibilityButton';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Celebration from '../../components/bingo/Celebration';
import { missingFor, PATTERNS } from '../../constants/patterns';
import { isSoundOn, playMark, playWin, setSoundOn } from '../../lib/sound';
import { MARKERS, readMarker, saveMarker } from '../../constants/markers';
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
        return result; // el servidor ya validó el cartón contra las balotas oficiales
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

// Botones de la barra de controles: misma altura (44 px), forma de píldora y vidrio.
const PILL =
  'inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-extrabold ring-1 backdrop-blur-md transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50';
const PILL_ON = `${PILL} bg-sol-blue text-white ring-sol-blue dark:bg-sol-gold dark:text-sol-blue dark:ring-sol-gold`;
const PILL_OFF = `${PILL} bg-card/60 text-fg ring-line hover:ring-sol-blue dark:hover:ring-sol-gold`;

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
  const [bigCards, setBigCards] = useState(true); // zoom: cartones grandes (1 columna) o compactos (2)
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

  const pattern = event?.pattern ?? 'FULL';
  const isLive = event?.status === 'LIVE';
  // Lo que cuenta para el ¡Bingo! es lo marcado en el cartón: automático = todo lo cantado;
  // manual = solo las marcas de la persona que además fueron cantadas (nunca una balota no cantada).
  const marksFor = useCallback(
    (card) => (autoMark ? called : new Set([...(manualMarks[card.id] ?? EMPTY)].filter((n) => called.has(n)))),
    [autoMark, called, manualMarks]
  );
  const missingById = useMemo(
    () => Object.fromEntries(cards.map((c) => [c.id, missingFor(c.grid, marksFor(c), pattern)])),
    [cards, marksFor, pattern]
  );
  const winners = cards.filter((c) => missingById[c.id] === 0);
  const unclaimedWinners = winners.filter((c) => !claims[c.serial] || claims[c.serial].status === 'REJECTED');

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
        <ConfirmDialog title="¿Cerrar sesión?" confirmLabel="Cerrar sesión" confirmVariant="danger" onConfirm={logout} onCancel={() => setConfirmLogout(false)}>
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
          El marcado automático es una herramienta de asistencia. Recomendamos verificar manualmente tus números para asegurar una experiencia de
          juego óptima.
        </ConfirmDialog>
      )}
      {celebrating && <Celebration serial={celebrating} onDone={endCelebration} />}

      <main id="contenido" className="container-page grid gap-5 pt-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Stream + tablero (fijo al hacer scroll en escritorio) */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start print:hidden">
          <LiveStream provider={event?.stream?.provider} videoId={event?.stream?.videoId} url={event?.stream?.url} title={event?.name} />
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
            </div>
            <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Controles de los cartones">
              <button
                type="button"
                onClick={() => (autoMark ? setAutoMark(false) : setAskAutoMark(true))}
                aria-pressed={autoMark}
                className={autoMark ? PILL_ON : PILL_OFF}
              >
                {autoMark ? <Sparkles className="h-5 w-5" aria-hidden /> : <Hand className="h-5 w-5" aria-hidden />}
                {autoMark ? 'Marcado automático' : 'Marcado manual'}
              </button>
              <label className={`${PILL_OFF} cursor-pointer pr-2`}>
                <span className="sr-only sm:not-sr-only">Marcador</span>
                <select
                  value={marker}
                  onChange={(e) => {
                    setMarker(e.target.value);
                    saveMarker(e.target.value);
                  }}
                  aria-label="Estilo del marcador"
                  className="h-9 cursor-pointer rounded-full bg-transparent pr-1 font-extrabold text-fg outline-none"
                >
                  {Object.entries(MARKERS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={toggleSound}
                aria-pressed={soundOn}
                aria-label={soundOn ? 'Silenciar efectos de sonido' : 'Activar efectos de sonido'}
                className={soundOn ? PILL_ON : PILL_OFF}
              >
                {soundOn ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
                <span className="hidden sm:inline">Sonido</span>
              </button>
              <button
                type="button"
                onClick={() => setBigCards((v) => !v)}
                aria-pressed={bigCards}
                aria-label={bigCards ? 'Ver cartones más pequeños' : 'Ver cartones más grandes'}
                className={PILL_OFF}
                disabled={cards.length < 2}
              >
                {bigCards ? <ZoomOut className="h-5 w-5" aria-hidden /> : <ZoomIn className="h-5 w-5" aria-hidden />}
                <span className="hidden sm:inline">{bigCards ? 'Alejar' : 'Acercar'}</span>
              </button>
              <button type="button" onClick={() => window.print()} disabled={cards.length === 0} className={PILL_OFF}>
                <Printer className="h-5 w-5" aria-hidden />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
            </div>
          </div>

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

          {/* Zoom: grande = 1 columna (máx. legible), compacto = 2 columnas incluso en celular. min-w-0 evita desbordes. */}
          <div className={`print-cards grid gap-4 ${bigCards ? 'mx-auto max-w-xl grid-cols-1' : 'grid-cols-2'}`}>
            {cards.map((card) => {
              const claimed = claims[card.serial];
              return (
                <div key={card.id} className="min-w-0 space-y-2">
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
        </section>
      </main>

      {/* Botón ¡BINGO! siempre a mano: aparece solo cuando un cartón completa el patrón con las balotas cantadas. */}
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
