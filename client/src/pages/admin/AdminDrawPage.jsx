import { useCallback, useEffect, useState } from 'react';
import { Dices, History, Keyboard, Layers3, Undo2 } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { drawApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import WinningCardsPanel from '../../components/admin/WinningCardsPanel';
import PatternPicker, { PatternPreview } from '../../components/bingo/PatternPreview';
import { COLUMN_RANGES, LETTERS, MAX_BALL, PATTERNS, letterFor } from '../../constants/patterns';
import { LETTER_COLORS } from '../../constants/ballColors';
import { errorMessage, formatDate } from '../../lib/format';

const colorFor = (n) => LETTER_COLORS[LETTERS.indexOf(letterFor(n))];

/** Bola al azar entre las que faltan (crypto: no predecible), para sorteos sin tómbola física. */
function randomRemaining(called) {
  const taken = new Set(called);
  const left = Array.from({ length: MAX_BALL }, (_, i) => i + 1).filter((n) => !taken.has(n));
  if (!left.length) return null;
  const [r] = crypto.getRandomValues(new Uint32Array(1));
  return left[r % left.length];
}

/** Bola grande con rebote al cambiar (se apaga con "reducir animaciones"). */
function BigBall({ n }) {
  return (
    <div
      key={n ?? 'none'}
      className={`grid h-28 w-28 shrink-0 place-items-center rounded-full border-4 border-white text-white shadow-xl ring-4 ring-sol-gold motion-safe:animate-pop ${
        n ? colorFor(n) : 'bg-slate-400'
      }`}
      aria-live="polite"
      aria-label={n ? `Última bola: ${letterFor(n)} ${n}` : 'Aún no se canta ninguna bola'}
    >
      {n ? (
        <span className="text-center leading-none">
          <span className="block text-2xl font-black">{letterFor(n)}</span>
          <span className="block text-5xl font-black tabular-nums">{n}</span>
        </span>
      ) : (
        <span className="text-4xl font-black">–</span>
      )}
    </div>
  );
}

/**
 * Bingo Master: la administración elige la modalidad de cada ronda, canta las bolas (tocando el tablero,
 * escribiendo el número o al azar) y abre rondas nuevas. El servidor difunde todo por Socket.io al instante.
 */
export default function AdminDrawPage() {
  const { eventId, event, reloadEvents } = useAdmin();
  const [called, setCalled] = useState([]);
  const [live, setLive] = useState(null); // evento según el sorteo (modalidad y ronda al día)
  const [rounds, setRounds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');
  const [nextPattern, setNextPattern] = useState(null); // diálogo "Nueva ronda" abierto con esta modalidad

  const loadRounds = useCallback(() => {
    if (eventId)
      drawApi
        .rounds(eventId)
        .then(setRounds)
        .catch(() => {});
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;
    drawApi.state(eventId).then((d) => {
      setCalled(d.called);
      setLive(d.event);
    });
    loadRounds();
  }, [eventId, loadRounds]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      const state = await fn();
      setCalled(state.called);
      setLive(state.event);
      loadRounds();
      if (event?.status !== state.event?.status || event?.pattern !== state.event?.pattern) reloadEvents();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const current = live ?? event;
  const pattern = current?.pattern ?? 'FULL';
  const round = current?.round ?? 1;
  const last = called.at(-1);
  const recent = called.slice(-8, -1).reverse();
  const closed = ['FINISHED', 'CANCELLED'].includes(current?.status);
  const started = called.length > 0;
  const canCall = !busy && eventId && !closed;

  const callNumber = (n) => run(() => drawApi.call(eventId, n));
  const submitTyped = async (e) => {
    e.preventDefault();
    const n = Number(typed);
    if (!Number.isInteger(n) || n < 1 || n > MAX_BALL) return setError('Escribe un número del 1 al 75.');
    if (called.includes(n)) return setError(`La bola ${letterFor(n)} ${n} ya salió en esta ronda.`);
    if (await callNumber(n)) setTyped('');
  };
  const callRandom = () => {
    const n = randomRemaining(called);
    if (n) callNumber(n);
  };
  const startRound = async () => {
    if (await run(() => drawApi.newRound(eventId, nextPattern))) setNextPattern(null);
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-brand">Bingo Master</h1>
          <p className="text-lg text-fg-muted">Elige la modalidad de la ronda y canta las bolas: los jugadores las ven al instante.</p>
        </div>
        {current && <StatusBadge status={current.status} />}
      </header>

      {/* Estado de la ronda */}
      <div className="surface grid gap-5 p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
        <BigBall n={last} />
        <div className="min-w-0 space-y-2">
          <p className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sol-blue px-3 py-1 text-sm font-black text-white dark:bg-sol-gold dark:text-sol-blue">
              Ronda {round}
            </span>
            <span className="truncate text-xl font-black text-fg">{current?.name}</span>
          </p>
          <div className="flex items-center gap-3">
            <PatternPreview pattern={pattern} active className="h-12 w-12" />
            <p className="text-fg-muted">
              Se juega <b className="text-fg">{PATTERNS[pattern]?.label}</b>
              <span className="block text-sm">{PATTERNS[pattern]?.hint}</span>
            </p>
          </div>
          <div aria-hidden className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-linear-to-r from-sol-blue to-sol-gold transition-[width] duration-500"
              style={{ width: `${(called.length / MAX_BALL) * 100}%` }}
            />
          </div>
          <p className="text-sm font-semibold text-fg-muted">
            <span className="tabular-nums text-fg">{called.length}</span>/75 bolas en esta ronda
          </p>
          {recent.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Bolas anteriores">
              {recent.map((n) => (
                <span key={n} className={`grid h-9 w-9 place-items-center rounded-full text-xs font-black text-white ${colorFor(n)}`}>
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-1">
          <Button icon={Dices} variant="gold" disabled={!canCall || called.length >= MAX_BALL} onClick={callRandom}>
            Bola al azar
          </Button>
          <Button variant="outline" icon={Undo2} disabled={busy || !started || closed} onClick={() => run(() => drawApi.undo(eventId))}>
            Deshacer última
          </Button>
          <Button variant="outline" icon={Layers3} disabled={busy || !started || closed} onClick={() => setNextPattern(pattern)}>
            Nueva ronda
          </Button>
        </div>
      </div>

      {closed && (
        <Alert tone="warning">
          Este evento está {current.status === 'FINISHED' ? 'finalizado' : 'cancelado'}: ya no se pueden cantar bolas.
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      {/* Modalidad de la ronda: se elige antes de la primera bola */}
      <div className="surface space-y-3 p-5">
        <PatternPicker
          label={`Modalidad de la ronda ${round}`}
          value={pattern}
          disabled={busy || started || closed}
          onChange={(p) => p !== pattern && run(() => drawApi.setPattern(eventId, p))}
        />
        <p className="text-sm text-fg-muted">
          {started
            ? 'La ronda ya empezó: su modalidad queda fija. Para jugar otra modalidad, abre una nueva ronda.'
            : 'Elige cómo se gana esta ronda antes de cantar la primera bola. Los jugadores la ven en su pantalla al instante.'}
        </p>
      </div>

      {/* Cantar escribiendo el número (tómbola física) */}
      <form onSubmit={submitTyped} className="surface flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-40 flex-1">
          <span className="flex items-center gap-2 font-bold text-fg">
            <Keyboard className="h-5 w-5 text-brand" aria-hidden /> Cantar por número
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value.replace(/\D/g, '').slice(0, 2))}
            inputMode="numeric"
            placeholder="Ej. 42 y Enter"
            disabled={!canCall}
            className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-line bg-card px-4 text-xl font-black tabular-nums text-fg outline-none focus:border-sol-blue focus:ring-4 focus:ring-sol-gold/40"
          />
        </label>
        <Button type="submit" disabled={!canCall || !typed}>
          Cantar {typed ? `${letterFor(Number(typed) || 1)} ${typed}` : ''}
        </Button>
      </form>

      {/* Tablero */}
      <div className="surface space-y-2 p-3 sm:p-4">
        {LETTERS.map((letter, i) => {
          const [min, max] = COLUMN_RANGES[i];
          return (
            <div key={letter} className="grid grid-cols-[2.5rem_repeat(15,minmax(0,1fr))] items-center gap-1">
              <span className={`grid aspect-square place-items-center rounded-lg text-lg font-black text-white ${LETTER_COLORS[i]}`}>
                {letter}
              </span>
              {Array.from({ length: max - min + 1 }, (_, k) => min + k).map((n) => {
                const done = called.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={!canCall || done}
                    onClick={() => callNumber(n)}
                    aria-label={`Cantar ${letter} ${n}`}
                    className={`aspect-square rounded-lg text-xs font-black tabular-nums transition duration-150 sm:text-base ${
                      done
                        ? `${LETTER_COLORS[i]} text-white ${n === last ? 'ring-4 ring-sol-gold motion-safe:animate-pop' : ''}`
                        : 'bg-muted text-fg hover:-translate-y-0.5 hover:bg-sol-gold-light hover:shadow active:scale-90 disabled:opacity-50'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      <WinningCardsPanel eventId={eventId} calledCount={called.length} round={round} />

      {/* Historial de rondas */}
      {rounds.length > 0 && (
        <div className="surface p-4">
          <h2 className="mb-3 flex items-center gap-2 font-black text-fg">
            <History className="h-5 w-5 text-brand" aria-hidden /> Rondas de este evento
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {rounds.map((r) => (
              <li
                key={r.round}
                className={`flex items-center gap-3 rounded-xl p-3 ring-1 ${r.current ? 'bg-sol-blue/5 ring-sol-blue dark:ring-sol-gold' : 'ring-line'}`}
              >
                <PatternPreview pattern={r.pattern} active={r.current} className="h-11 w-11" />
                <div className="min-w-0 text-sm">
                  <p className="font-black text-fg">
                    Ronda {r.round} · {PATTERNS[r.pattern]?.label}
                    {r.current && <span className="ml-1.5 rounded-full bg-sol-gold px-2 text-xs text-sol-blue">en curso</span>}
                  </p>
                  <p className="text-fg-muted">
                    {r.called} bolas · {r.winners} {r.winners === 1 ? 'ganador' : 'ganadores'} · {formatDate(r.startedAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {nextPattern && (
        <ConfirmDialog
          title={`¿Empezar la ronda ${round + 1}?`}
          icon={Layers3}
          confirmLabel={`Empezar con ${PATTERNS[nextPattern]?.label}`}
          loading={busy}
          onConfirm={startRound}
          onCancel={() => setNextPattern(null)}
          wide
        >
          <p>
            El tablero se vacía para todos los jugadores y cada cartón puede volver a ganar. Las bolas y los ganadores de la ronda {round}{' '}
            se conservan.
          </p>
          <div className="mt-4 text-left">
            <PatternPicker compact label="Modalidad de la nueva ronda" value={nextPattern} onChange={setNextPattern} />
          </div>
        </ConfirmDialog>
      )}
    </section>
  );
}
