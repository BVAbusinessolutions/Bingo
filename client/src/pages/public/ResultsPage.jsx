import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Radio, Ticket, Trophy } from 'lucide-react';
import { eventsApi } from '../../api/endpoints';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import { PATTERNS } from '../../constants/patterns';
import { formatDate } from '../../lib/format';
import { PATHS } from '../../routing/paths';
import EventCountdown, { EventFacts } from '../../components/event/EventCountdown';
import PrizesShowcase from '../../components/event/PrizesShowcase';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useCurrentEvent } from '../../hooks/useCurrentEvent';

function EventResult({ event }) {
  const isLive = event.status === 'LIVE';
  return (
    <article className="surface lift reveal overflow-hidden">
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
            <dd className="text-xl font-black text-brand">{event.calledCount} / 75</dd>
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
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sol-gold text-lg font-black text-sol-blue">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-black text-fg">{w.name}</span>
                    <span className="text-fg-muted">
                      Cartón #{w.serial} · con {w.calledCount} balotas · {w.channel === 'SALON' ? 'en el salón' : 'en línea'}
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

/** Lo que se ve mientras no hay ganadores (o si los resultados no cargan): invita a participar en lugar de mostrar un error. */
function NoWinnersYet({ offline, event }) {
  return (
    <section aria-labelledby="no-winners-title" className="surface relative animate-fade-up overflow-hidden p-6 sm:p-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sol-gold/20 blur-3xl" aria-hidden />
      <div className="relative grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4 text-center lg:text-left">
          <span className="mx-auto grid h-20 w-20 animate-float place-items-center rounded-full bg-sol-gold text-sol-blue shadow-lg lg:mx-0">
            <Trophy className="h-11 w-11" aria-hidden />
          </span>
          <h2 id="no-winners-title" className="text-3xl font-black text-brand sm:text-4xl">
            ¡Aún no hay ganadores registrados!
          </h2>
          <p className="text-xl text-fg">
            El gran sorteo se acerca. <b>¡Tú podrías ser el próximo ganador y apoyar a la infancia de Costa Rica!</b>
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Button to={PATHS.catalog} variant="gold" size="lg" icon={Ticket}>
              Comprar cartones
            </Button>
            <Button to={PATHS.rules} variant="outline" size="lg">
              Ver reglamento
            </Button>
          </div>
          {offline && (
            <p role="status" className="text-sm text-fg-muted">
              Los resultados se actualizan solos durante el sorteo. Si esperabas ver alguno, recarga la página en unos minutos.
            </p>
          )}
        </div>
        {event && event.status !== 'LIVE' && (
          <div className="space-y-3 rounded-3xl bg-muted/70 p-5">
            <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-sol-red dark:text-accent">El sorteo empieza en</p>
            <EventCountdown startsAt={event.startsAt} compact />
            <EventFacts event={event} className="text-base text-fg-muted" />
          </div>
        )}
      </div>
    </section>
  );
}

function ResultsSkeleton() {
  return (
    <div role="status" aria-label="Cargando resultados" className="grid gap-5">
      {[0, 1].map((i) => (
        <div key={i} className="surface space-y-4 p-5">
          <div className="skeleton h-8 w-2/3" />
          <div className="skeleton h-5 w-1/3" />
          <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
            <div className="skeleton h-24" />
            <div className="skeleton h-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ResultsPage() {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(false);
  usePageMeta({
    title: 'Resultados y ganadores',
    description: 'Ganadores confirmados y balotas cantadas de cada Bingo Benéfico de la Asociación Infantil Hogar Sol.',
  });

  const { event } = useCurrentEvent();

  const load = useCallback(
    () =>
      eventsApi
        .results()
        .then((r) => {
          setResults(r);
          setError(false);
        })
        .catch(() => setError(true)),
    []
  );

  // Publicación instantánea: se actualiza sola (cada 15 s con un sorteo en vivo, cada minuto si no),
  // y no consulta mientras la pestaña está oculta.
  const live = results?.some((e) => e.status === 'LIVE');
  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === 'visible' && load(), live ? 15_000 : 60_000);
    return () => clearInterval(id);
  }, [load, live]);

  const hasLive = results?.some((e) => e.status === 'LIVE');
  const hasWinners = results?.some((e) => e.winners.length > 0);
  const loading = !results && !error;

  return (
    <main className="space-y-0">
      <div className="container-page space-y-6 py-10">
        <PageHeader
          eyebrow="Transparencia"
          title="Resultados y ganadores"
          description="Consulta los eventos en vivo y finalizados, y quiénes ganaron."
          actions={
            hasLive && (
              <Button to={PATHS.live} variant="danger" icon={Radio}>
                Ver sorteo en vivo
              </Button>
            )
          }
        />
        {loading && <ResultsSkeleton />}
        {!loading && !hasWinners && <NoWinnersYet offline={error} event={event} />}
        <div className="grid gap-5">
          {results
            ?.filter((e) => e.status === 'LIVE' || e.winners.length > 0 || e.calledCount > 0)
            .map((e) => (
              <EventResult key={e.id} event={e} />
            ))}
        </div>
      </div>
      {!loading && !hasWinners && <PrizesShowcase />}
    </main>
  );
}
