import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Dices, History, Keyboard, Layers3, Pencil, Play, Radio, Trash2, Undo2 } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi, drawApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import WinningCardsPanel from '../../components/admin/WinningCardsPanel';
import StreamSettings from '../../components/admin/StreamSettings';
import LiveStream from '../../components/player/LiveStream';
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
  const [streamEditing, setStreamEditing] = useState(false);
  const [streamRemoving, setStreamRemoving] = useState(false); // confirmación para quitar el video
  const [live, setLive] = useState(null); // evento según el sorteo (modalidad y ronda al día)
  const [rounds, setRounds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');
  const [nextPattern, setNextPattern] = useState(null); // diálogo "Nueva ronda" abierto con esta modalidad
  const [deleting, setDeleting] = useState(null); // { round } una ronda, o { all: true } todas (pruebas)
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(null); // { round, pattern }: ronda cuya modalidad se corrige
  const [statusConfirm, setStatusConfirm] = useState(null); // 'LIVE' para iniciar, 'SCHEDULED' para volver a programado

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
    setNotice('');
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
  // Rondas de prueba: se borran con advertencia; el servidor renumera las siguientes. El estado no cambia.
  const removeRounds = async () => {
    const target = deleting;
    const ok = await run(() => (target.all ? drawApi.resetRounds(eventId) : drawApi.deleteRound(eventId, target.round)));
    if (ok) {
      setDeleting(null);
      setNotice(
        target.all ? 'Se borraron todas las rondas. El sorteo empieza de cero en la ronda 1.' : `Se borró la ronda ${target.round}.`
      );
    }
  };

  const saveRound = async () => {
    const target = editing;
    if (await run(() => drawApi.editRound(eventId, target.round, target.pattern))) {
      setEditing(null);
      setNotice(`La ronda ${target.round} ahora se juega con ${PATTERNS[target.pattern]?.label}.`);
    }
  };

  // "En vivo" lo decide la administración: cantar bolas no cambia el estado del evento.
  const changeStatus = async () => {
    const status = statusConfirm;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await adminApi.updateEvent(eventId, { status });
      setLive((l) => (l ? { ...l, status } : l));
      reloadEvents();
      setNotice(
        status === 'LIVE'
          ? '¡El bingo está en vivo! Los jugadores ya pueden reclamar sus premios.'
          : 'El evento volvió a "Programado": regresa la cuenta regresiva y se reabre la venta en línea.'
      );
      setStatusConfirm(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const isLive = current?.status === 'LIVE';

  // Quitar el video: desaparece de la portada y de la vista del jugador. No cambia el estado ni las bolas.
  const removeStream = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await adminApi.updateEvent(eventId, { stream: null });
      setLive((l) => ({ ...(l ?? current), stream: null }));
      await reloadEvents();
      setNotice('Se quitó la transmisión. El video ya no aparece en el inicio ni en la vista de los jugadores.');
      setStreamRemoving(false);
    } catch (err) {
      setError(errorMessage(err));
      setStreamRemoving(false);
    } finally {
      setBusy(false);
    }
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

      {current && (
        <section aria-label="Transmisión de video" className="surface space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black text-fg">
                <Radio className="h-5 w-5 text-brand" aria-hidden /> Transmisión de video
              </h2>
              <p className="text-sm text-fg-muted">
                {current.stream ? 'Enlace configurado para los jugadores.' : 'Todavía no has agregado el enlace de la transmisión.'}
              </p>
            </div>
            {!closed && (
              <div className="flex flex-wrap gap-2">
                <Button icon={Radio} variant="gold" onClick={() => setStreamEditing(true)}>
                  {current.stream ? 'Editar transmisión' : 'Configurar transmisión'}
                </Button>
                {current.stream && (
                  <Button icon={Trash2} variant="outline" disabled={busy} onClick={() => setStreamRemoving(true)} className="text-sol-red!">
                    Quitar transmisión
                  </Button>
                )}
              </div>
            )}
          </div>
          <p className="text-sm text-fg-muted">
            Inicia el video desde tu plataforma de transmisión y agrega su enlace aquí. El botón «Iniciar bingo en vivo» activa el juego y
            cierra las ventas.
          </p>
          {/* Vista previa: el mismo reproductor que ven los jugadores, para comprobar el enlace antes de empezar */}
          <div className="mx-auto w-full max-w-2xl">
            <LiveStream
              provider={current.stream?.provider}
              videoId={current.stream?.videoId}
              url={current.stream?.url}
              title={current.name}
              badge={isLive ? 'EN VIVO' : 'VISTA PREVIA'}
              emptyText="Aquí se verá el video en cuanto guardes el enlace con «Configurar transmisión»."
            />
          </div>
        </section>
      )}

      {/* Estado del bingo: solo la administración decide cuándo empieza */}
      {current && !closed && (
        <div
          className={`flex flex-col gap-3 rounded-2xl p-4 ring-1 sm:flex-row sm:items-center sm:justify-between ${
            isLive ? 'bg-sol-red/10 ring-sol-red/30' : 'bg-sol-gold/15 ring-sol-gold/40'
          }`}
        >
          <div className="flex items-start gap-3">
            {isLive ? (
              <Radio className="mt-0.5 h-6 w-6 shrink-0 animate-pulse text-sol-red" aria-hidden />
            ) : (
              <CalendarClock className="mt-0.5 h-6 w-6 shrink-0 text-sol-gold-dark dark:text-sol-gold" aria-hidden />
            )}
            <div>
              <p className="font-black text-fg">{isLive ? 'El bingo está EN VIVO' : 'El bingo todavía no comienza'}</p>
              <p className="text-sm text-fg-muted">
                {isLive
                  ? 'Los jugadores pueden reclamar premios y la venta en línea está cerrada.'
                  : `El inicio muestra la cuenta regresiva y la venta sigue abierta. ${
                      started ? 'Las bolas cantadas son de prueba: nadie puede reclamar premios.' : 'Puedes cantar bolas de prueba.'
                    }`}
              </p>
            </div>
          </div>
          {isLive ? (
            <Button
              variant="outline"
              icon={CalendarClock}
              disabled={busy}
              onClick={() => setStatusConfirm('SCHEDULED')}
              className="shrink-0"
            >
              Volver a programado
            </Button>
          ) : (
            <Button variant="danger" icon={Play} disabled={busy} onClick={() => setStatusConfirm('LIVE')} className="shrink-0">
              Iniciar bingo en vivo
            </Button>
          )}
        </div>
      )}

      {/* Estado de la ronda */}
      <div className="surface grid gap-5 p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
        <BigBall n={last} />
        <div className="min-w-0 space-y-2">
          <p className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sol-blue px-3 py-1 text-sm font-black text-white dark:bg-sol-gold dark:text-sol-blue">
              Ronda {round}
            </span>
            {current && !closed && !started && (
              <span className="rounded-full bg-muted px-3 py-1 text-sm font-black text-fg-muted">Sin iniciar · falta la primera bola</span>
            )}
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
          disabled={busy || closed}
          onChange={(p) => {
            if (p === pattern) return;
            if (started) setEditing({ round, pattern: p });
            else run(() => drawApi.setPattern(eventId, p));
          }}
        />
        <p className="text-sm text-fg-muted">
          {started
            ? 'La ronda ya empezó. Si elegiste mal la modalidad, toca la correcta y confirma. Para jugar otra modalidad, abre una nueva ronda.'
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-black text-fg">
              <History className="h-5 w-5 text-brand" aria-hidden /> Rondas de este evento
            </h2>
            {!closed && rounds.some((r) => r.called > 0) && (
              <Button
                variant="outline"
                size="sm"
                icon={Trash2}
                onClick={() => setDeleting({ all: true })}
                className="rounded-full! text-sol-red!"
              >
                Borrar todas (pruebas)
              </Button>
            )}
          </div>
          <p className="mb-3 text-sm text-fg-muted">
            ¿Una ronda de prueba o con la modalidad equivocada? Corrígela o bórrala aquí. Al borrar, las rondas siguientes se renumeran.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rounds.map((r) => (
              <li
                key={r.round}
                className={`flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ${r.current ? 'ring-2 ring-sol-blue dark:ring-sol-gold' : 'ring-line'}`}
              >
                <div className="flex items-center gap-3">
                  <PatternPreview pattern={r.pattern} active={r.current} className="h-12 w-12" />
                  <div className="min-w-0 text-sm">
                    <p className="flex flex-wrap items-center gap-1.5 font-black text-fg">
                      Ronda {r.round} · {PATTERNS[r.pattern]?.label}
                      {r.current && (
                        <span className="rounded-full bg-sol-gold px-2 text-xs text-sol-blue">
                          {closed ? 'cerrada' : r.called === 0 ? 'sin iniciar' : isLive ? 'en curso' : 'prueba'}
                        </span>
                      )}
                    </p>
                    <p className="text-fg-muted">
                      {r.called} {r.called === 1 ? 'bola' : 'bolas'} · {r.winners} {r.winners === 1 ? 'ganador' : 'ganadores'}
                    </p>
                    <p className="text-xs text-fg-subtle">Preparada: {formatDate(r.startedAt)}</p>
                  </div>
                </div>
                {!closed && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Pencil}
                      disabled={busy}
                      onClick={() => setEditing({ round: r.round, pattern: r.pattern })}
                      aria-label={`Cambiar la modalidad de la ronda ${r.round}`}
                      className="rounded-full!"
                    >
                      Modalidad
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Trash2}
                      disabled={busy || (r.called === 0 && rounds.length === 1)}
                      title={r.called === 0 && rounds.length === 1 ? 'La única ronda está vacía: no hay nada que borrar' : undefined}
                      onClick={() => setDeleting(r)}
                      aria-label={`Borrar la ronda ${r.round}`}
                      className="rounded-full! text-sol-red!"
                    >
                      Borrar
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notice && (
        <Alert tone="success" title="Listo">
          {notice}
        </Alert>
      )}

      {streamEditing && current && (
        <Modal key={current.id} title="Configurar transmisión de video" icon={Radio} onClose={() => setStreamEditing(false)}>
          <StreamSettings
            event={current}
            onCancel={() => setStreamEditing(false)}
            onSaved={async (updated) => {
              setLive((previous) => ({ ...(previous ?? current), stream: updated.stream }));
              await reloadEvents();
              setStreamEditing(false);
              setNotice('Enlace guardado. Los jugadores ya pueden abrir la transmisión.');
            }}
          />
        </Modal>
      )}

      {streamRemoving && (
        <ConfirmDialog
          title="¿Quitar la transmisión de video?"
          icon={Trash2}
          confirmLabel="Sí, quitar el video"
          confirmVariant="danger"
          loading={busy}
          onConfirm={removeStream}
          onCancel={() => setStreamRemoving(false)}
        >
          El video deja de verse en el inicio de la página y en la vista de los jugadores. El bingo, las bolas y las ventas no cambian.
          Puedes volver a agregar el enlace cuando quieras.
        </ConfirmDialog>
      )}

      {deleting && (
        <ConfirmDialog
          title={deleting.all ? '¿Borrar TODAS las rondas?' : `¿Borrar la ronda ${deleting.round}?`}
          icon={AlertTriangle}
          confirmLabel={deleting.all ? 'Sí, borrar todas' : `Sí, borrar la ronda ${deleting.round}`}
          confirmVariant="danger"
          loading={busy}
          onConfirm={removeRounds}
          onCancel={() => setDeleting(null)}
        >
          <span className="block font-bold text-sol-red dark:text-red-300">Esta acción no se puede deshacer.</span>
          <span className="mt-2 block">
            {deleting.all
              ? `Se borran las ${rounds.length} rondas con todas sus bolas y reclamos, también los premios confirmados. Úsalo solo para limpiar pruebas antes del bingo real.`
              : `Se borran sus ${deleting.called} bolas y sus reclamos${
                  deleting.winners ? `, incluidos ${deleting.winners} premio(s) confirmado(s) que dejarán de salir en Resultados` : ''
                }. Las rondas siguientes se renumeran.`}
          </span>
          <span className="mt-2 block">El estado del evento (programado o en vivo) no cambia. Queda en la bitácora.</span>
        </ConfirmDialog>
      )}

      {statusConfirm && (
        <ConfirmDialog
          title={statusConfirm === 'LIVE' ? '¿Iniciar el bingo en vivo?' : '¿Volver el evento a programado?'}
          icon={statusConfirm === 'LIVE' ? Play : CalendarClock}
          confirmLabel={statusConfirm === 'LIVE' ? 'Sí, iniciar en vivo' : 'Sí, volver a programado'}
          confirmVariant={statusConfirm === 'LIVE' ? 'danger' : 'primary'}
          loading={busy}
          onConfirm={changeStatus}
          onCancel={() => setStatusConfirm(null)}
        >
          {statusConfirm === 'LIVE'
            ? `Se cierra la venta en línea, el inicio cambia la cuenta regresiva por "¡El bingo está en curso!" y los jugadores pueden reclamar premios.${
                started ? ' Si las bolas cantadas fueron de prueba, bórralas antes en "Rondas de este evento".' : ''
              }`
            : 'Vuelve la cuenta regresiva en el inicio y se reabre la venta en línea. Úsalo si se inició por error. Las bolas cantadas no se borran.'}
        </ConfirmDialog>
      )}

      {editing && (
        <Modal title={`Modalidad de la ronda ${editing.round}`} icon={Pencil} onClose={() => setEditing(null)} size="max-w-3xl">
          <div className="space-y-4">
            <p className="text-fg-muted">
              Corrige cómo se gana esta ronda. Las bolas cantadas se conservan y los jugadores ven el cambio al instante. Si la ronda ya
              tiene reclamos de bingo, primero recházalos o borra la ronda.
            </p>
            <PatternPicker
              compact
              label="Nueva modalidad"
              value={editing.pattern}
              onChange={(p) => setEditing((x) => ({ ...x, pattern: p }))}
            />
            {error && <Alert tone="error">{error}</Alert>}
            <div className="flex flex-wrap gap-2">
              <Button icon={Pencil} loading={busy} onClick={saveRound}>
                Guardar modalidad
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </Modal>
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
