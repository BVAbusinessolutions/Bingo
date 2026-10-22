import { useEffect, useState } from 'react';
import { CalendarDays, Radio, Trophy } from 'lucide-react';
import { eventsApi } from '../../api/endpoints';
import PageHeader from '../../components/ui/PageHeader';
import PageLoader from '../../components/ui/PageLoader';
import StatusBadge from '../../components/ui/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import { PATTERNS } from '../../constants/patterns';
import { formatDate } from '../../lib/format';
import { PATHS } from '../../routing/paths';

function EventResult({ event }) {
  const isLive = event.status === 'LIVE';
  return (
    <article className="surface overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-fg">{event.name}</h2>
          <p className="mt-1 flex items-center gap-2 text-fg-muted">
            <CalendarDays className="h-5 w-5 shrink-0" aria-hidden /> {formatDate(event.startsAt)}
          </p>
        </div>
        <StatusBadge status={event.status} />
      </header>
      <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr]">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-1">
          <div className="rounded-2xl bg-muted p-4 text-center">
            <dt className="text-sm font-bold text-fg-muted">Patrón</dt>
            <dd className="text-xl font-black text-brand">{PATTERNS[event.pattern]?.label}</dd>
          </div>
          <div className="rounded-2xl bg-muted p-4 text-center">
            <dt className="text-sm font-bold text-fg-muted">Balotas cantadas</dt>
            <dd className="text-xl font-black text-brand">{event.calledCount} / 90</dd>
          </div>
        </dl>
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-lg font-black text-fg">
            <Trophy className="h-6 w-6 text-sol-gold" aria-hidden /> Ganadores
          </h3>
          {event.winners.length === 0 ? (
            <p className="rounded-2xl border-2 border-dashed border-line p-4 text-fg-muted">
              {isLive ? 'Aún no hay ganadores confirmados. ¡El sorteo sigue en juego!' : 'No hubo ganadores confirmados en este evento.'}
            </p>
          ) : (
            <ol className="grid gap-2">
              {event.winners.map((w, i) => (
                <li key={`${w.serial}-${i}`} className="flex items-center gap-3 rounded-2xl bg-sol-gold/15 p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sol-gold text-lg font-black text-sol-blue">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-black text-fg">{w.name}</span>
                    <span className="text-fg-muted">
                      Cartón #{w.serial} · con {w.calledCount} balotas
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ResultsPage() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    eventsApi
      .results()
      .then(setResults)
      .catch(() => setError(true));
  }, []);

  const hasLive = results?.some((e) => e.status === 'LIVE');

  return (
    <main className="container-page space-y-6 py-10">
      <PageHeader
        eyebrow="Transparencia"
        title="Resultados y ganadores"
        description="Consulta los eventos en vivo y finalizados, y quiénes ganaron."
        actions={hasLive && <Button to={PATHS.live} variant="danger" icon={Radio}>Ver sorteo en vivo</Button>}
      />
      {error && <Alert tone="error">No pudimos cargar los resultados. Intenta de nuevo más tarde.</Alert>}
      {!results && !error && <PageLoader />}
      {results?.length === 0 && (
        <Alert title="Todavía no hay resultados" action={<Button to={PATHS.catalog} variant="gold">Comprar cartones</Button>}>
          Los resultados aparecerán aquí cuando empiece el primer sorteo.
        </Alert>
      )}
      <div className="grid gap-5">
        {results?.map((e) => (
          <EventResult key={e.id} event={e} />
        ))}
      </div>
    </main>
  );
}
