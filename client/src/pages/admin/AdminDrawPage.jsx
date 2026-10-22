import { useEffect, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { drawApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';

const ALL = Array.from({ length: 90 }, (_, i) => i + 1);

/** Consola donde el administrador marca las balotas; el backend las difunde por Socket.io. */
export default function AdminDrawConsole() {
  const { eventId, event, reloadEvents } = useAdmin();
  const [called, setCalled] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (eventId) drawApi.state(eventId).then((d) => setCalled(d.called));
  }, [eventId]);

  const run = async (fn) => {
    setBusy(true);
    try {
      setCalled((await fn()).called);
      if (event?.status === 'SCHEDULED') reloadEvents(); // al cantar la 1.ª balota el evento pasa a EN VIVO
    } finally {
      setBusy(false);
    }
  };

  const last = called.at(-1);

  return (
    <section className="space-y-4">
      <div className="surface flex flex-wrap items-center gap-3 p-4">
        <div className="grid h-20 w-20 place-items-center rounded-full border-4 border-sol-gold bg-sol-red text-3xl font-black text-white shadow-lg">
          {last ?? '–'}
        </div>
        <div className="flex-1">
          <p className="font-bold text-fg">{event?.name}</p>
          <p className="text-sm text-fg-muted">{called.length}/90 balotas cantadas</p>
          {event && <StatusBadge status={event.status} />}
        </div>
        <button
          disabled={busy || !called.length}
          onClick={() => run(() => drawApi.undo(eventId))}
          className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-fg disabled:opacity-50"
        >
          <Undo2 className="h-4 w-4" /> Deshacer última
        </button>
      </div>
      <p className="text-sm text-fg-muted">Toca la balota que salió. Los jugadores la verán al instante en sus cartones.</p>
      <div className="grid grid-cols-9 gap-1.5 sm:grid-cols-10">
        {ALL.map((n) => {
          const done = called.includes(n);
          return (
            <button
              key={n}
              disabled={busy || done || !eventId}
              onClick={() => run(() => drawApi.call(eventId, n))}
              className={`aspect-square rounded-lg text-lg font-black ${
                done ? 'bg-sol-red text-white' : 'bg-card text-brand shadow-sm hover:bg-sol-gold-light active:scale-95'
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </section>
  );
}
