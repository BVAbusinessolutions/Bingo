import { useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { drawApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { COLUMN_RANGES, LETTERS, PATTERNS, letterFor } from '../../constants/patterns';
import { errorMessage } from '../../lib/format';

const LETTER_COLORS = ['bg-sol-blue', 'bg-sol-red', 'bg-emerald-600', 'bg-amber-500', 'bg-violet-600'];

/** Consola donde el administrador marca las balotas; el backend las difunde por Socket.io. */
export default function AdminDrawPage() {
  const { eventId, event, reloadEvents } = useAdmin();
  const [called, setCalled] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (eventId) drawApi.state(eventId).then((d) => setCalled(d.called));
  }, [eventId]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      setCalled((await fn()).called);
      if (event?.status === 'SCHEDULED') reloadEvents(); // al cantar la 1.ª balota el evento pasa a EN VIVO
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const last = called.at(-1);
  const closed = ['FINISHED', 'CANCELLED'].includes(event?.status);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-3xl font-black text-brand">Bingo Master</h1>
        <p className="text-lg text-fg-muted">Toca la balota que salió. Los jugadores la ven al instante en sus cartones.</p>
      </header>

      <div className="surface flex flex-wrap items-center gap-4 p-4">
        <div
          className={`grid h-24 w-24 place-items-center rounded-full border-4 border-white text-white shadow-lg ring-4 ring-sol-gold ${
            last ? LETTER_COLORS[LETTERS.indexOf(letterFor(last))] : 'bg-slate-400'
          }`}
        >
          {last ? (
            <span className="text-center leading-none">
              <span className="block text-xl font-black">{letterFor(last)}</span>
              <span className="block text-4xl font-black">{last}</span>
            </span>
          ) : (
            <span className="text-3xl font-black">–</span>
          )}
        </div>
        <div className="flex-1">
          <p className="text-xl font-black text-fg">{event?.name}</p>
          <p className="text-fg-muted">
            {called.length}/75 balotas · se juega <b className="text-fg">{PATTERNS[event?.pattern]?.label}</b>
          </p>
          {event && <StatusBadge status={event.status} />}
        </div>
        <Button variant="outline" icon={Undo2} disabled={busy || !called.length || closed} onClick={() => run(() => drawApi.undo(eventId))}>
          Deshacer última
        </Button>
      </div>

      {closed && (
        <Alert tone="warning">
          Este evento está {event.status === 'FINISHED' ? 'finalizado' : 'cancelado'}: ya no se pueden cantar balotas.
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

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
                    disabled={busy || done || !eventId || closed}
                    onClick={() => run(() => drawApi.call(eventId, n))}
                    aria-label={`Cantar ${letter} ${n}`}
                    className={`aspect-square rounded-lg text-xs font-black tabular-nums sm:text-base ${
                      done
                        ? `${LETTER_COLORS[i]} text-white`
                        : 'bg-muted text-fg hover:bg-sol-gold-light active:scale-95 disabled:opacity-50'
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
    </section>
  );
}
