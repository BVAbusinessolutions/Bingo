import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, CreditCard, HeartHandshake, MousePointerClick, PartyPopper, Radio, Ticket, Trophy, UserPlus } from 'lucide-react';
import { eventsApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useCurrentEvent } from '../../hooks/useCurrentEvent';
import { usePageMeta } from '../../hooks/usePageMeta';
import Button from '../../components/ui/Button';
import EventCountdown, { EventFacts, eventPlace } from '../../components/event/EventCountdown';
import PrizesShowcase from '../../components/event/PrizesShowcase';
import { BrandBadge } from '../../components/brand/BrandLogo';
import { PATTERNS } from '../../constants/patterns';
import { formatCRC, formatDate } from '../../lib/format';
import { PATHS } from '../../routing/paths';

const STEPS = [
  { icon: UserPlus, title: 'Crea tu cuenta', text: 'Solo necesitas tu nombre y tu correo.' },
  { icon: MousePointerClick, title: 'Elige tus cartones', text: 'Escoge los que más te gusten del catálogo.' },
  { icon: CreditCard, title: 'Paga con SINPE', text: 'O por transferencia. Envíanos el comprobante.' },
  { icon: PartyPopper, title: '¡Juega en vivo!', text: 'Marca tus números al salir cada bola. Si completas, pulsa “¡Bingo!”.' },
];

const IMPACT = [
  ['120+', 'niños apoyados'],
  ['15', 'años de servicio'],
  ['100 %', 'de lo recaudado va a la causa'],
];

/** Precio, patrón y cartones disponibles del evento vigente. */
function EventStats({ event }) {
  return (
    <dl className="grid grid-cols-3 gap-2 text-center">
      {[
        ['Precio', formatCRC(event.price)],
        ['Se juega', PATTERNS[event.pattern]?.label],
        ['Disponibles', event.available],
      ].map(([k, v]) => (
        <div key={k} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <dt className="text-xs font-semibold uppercase tracking-wider text-white/60">{k}</dt>
          <dd className="font-display text-lg font-semibold text-white">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function LiveNow() {
  return (
    <div className="space-y-3 rounded-2xl bg-sol-red/90 p-5 text-center text-white">
      <p className="flex items-center justify-center gap-2 font-display text-2xl font-bold">
        <Radio className="h-7 w-7 animate-pulse text-accent" aria-hidden /> ¡El bingo está en curso!
      </p>
      <Button to={PATHS.live} variant="gold" size="lg" className="w-full">
        Entrar al sorteo en vivo
      </Button>
    </div>
  );
}

/** Tarjeta de vidrio del evento: cuenta regresiva, fecha, hora y lugar tal como los definió el panel. */
function EventCard({ event, loading, error, onRetry }) {
  if (loading || (error && !event)) {
    if (error) {
      return (
        <div className="glass space-y-3 rounded-3xl p-6 text-center" role="alert">
          <BrandBadge className="mx-auto h-20 w-20" decorative={false} />
          <h2 className="font-display text-2xl font-bold">Conectando con el bingo…</h2>
          <p className="text-white/80">No pudimos cargar el evento. Lo reintentamos solos en unos segundos.</p>
          <Button variant="light" size="sm" onClick={() => onRetry()}>
            Reintentar ahora
          </Button>
        </div>
      );
    }
    return (
      <div className="glass space-y-4 rounded-3xl p-6" role="status" aria-label="Cargando el próximo evento">
        <div className="h-6 w-1/2 animate-pulse rounded-lg bg-white/10" />
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
        <div className="h-20 animate-pulse rounded-2xl bg-white/10" />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="glass space-y-3 rounded-3xl p-6 text-center">
        <BrandBadge className="mx-auto h-20 w-20" decorative={false} />
        <h2 className="font-display text-2xl font-bold">Próximo bingo en preparación</h2>
        <p className="text-white/80">Crea tu cuenta y te avisaremos por correo en cuanto se abra la venta de cartones.</p>
      </div>
    );
  }
  const isLive = event.status === 'LIVE';
  const place = eventPlace(event);
  return (
    <div className="glass relative animate-fade-up space-y-5 rounded-3xl p-5 shadow-neon sm:p-7" style={{ '--delay': '150ms' }}>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">{place ? 'Presencial y en línea' : 'Próximo bingo'}</p>
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{event.name}</h2>
      </div>
      {isLive ? <LiveNow /> : <EventCountdown startsAt={event.startsAt} onDoneSlot={<LiveNow />} />}
      <EventFacts event={event} className="text-white/85 [&_svg]:text-accent [&_a]:text-accent" />
      <EventStats event={event} />
    </div>
  );
}

/** Evento más reciente con ganadores confirmados (los resultados llegan del más nuevo al más viejo). */
const latestWithWinners = (results) => results.find((e) => e.winners.length > 0) ?? null;

function LatestWinnerPanel({ state }) {
  if (state.status === 'loading') {
    return (
      <div role="status" aria-label="Cargando el último ganador" className="grid gap-3">
        <div className="h-6 w-1/2 animate-pulse rounded-lg bg-white/10" />
        <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
      </div>
    );
  }
  const event = state.status === 'ready' ? state.event : null;
  if (!event) {
    return (
      <div className="space-y-4 text-center lg:text-left">
        <p className="font-display text-2xl font-bold">¡Aún no hay ganadores registrados!</p>
        <p className="text-lg text-white/85">
          El gran sorteo se acerca. <b className="text-white">¡Tú podrías ser el próximo ganador y apoyar a la infancia de Costa Rica!</b>
        </p>
        <Button to={PATHS.catalog} variant="gold" icon={Ticket}>
          Comprar cartones
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Último evento con ganadores</p>
        <h3 className="font-display text-2xl font-bold">{event.name}</h3>
        <p className="mt-1 flex items-center gap-2 text-white/75">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden /> {formatDate(event.startsAt)}
        </p>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {event.winners.map((w, i) => (
          <li key={`${w.serial}-${i}`} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent font-display font-bold text-navy-950">{i + 1}</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{w.name}</span>
              <span className="text-sm text-white/70">
                Cartón #{w.serial} · {w.channel === 'SALON' ? 'en el salón' : 'en línea'}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LatestWinnerSection() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState({ status: 'idle' });
  const panelId = useId();
  const panelRef = useRef(null);

  const toggle = () => {
    setOpen((v) => !v);
    if (state.status === 'idle' || state.status === 'error') {
      setState({ status: 'loading' });
      eventsApi
        .results()
        .then((r) => setState({ status: 'ready', event: latestWithWinners(r) }))
        .catch(() => setState({ status: 'error' }));
    }
  };

  // Al abrir, el panel entra en pantalla con desplazamiento suave (instantáneo si se reducen las animaciones).
  useEffect(() => {
    if (!open) return;
    const reduce = document.documentElement.dataset.motion === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
    panelRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }, [open]);

  return (
    <section className="container-page py-16" aria-labelledby="latest-winner-title">
      <div className="reveal relative overflow-hidden stage rounded-3xl p-8 shadow-xl ring-1 ring-white/10 sm:p-12">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col items-center gap-5 text-center lg:flex-row lg:text-left">
          <Trophy className="h-16 w-16 shrink-0 text-accent" aria-hidden />
          <div className="flex-1">
            <h2 id="latest-winner-title" className="font-display text-3xl font-bold">
              ¿Quién ganó el último bingo?
            </h2>
            <p className="mt-1 text-lg text-white/80">Mira aquí mismo a los ganadores confirmados del evento más reciente.</p>
          </div>
          <Button variant="gold" size="lg" onClick={toggle} aria-expanded={open} aria-controls={panelId}>
            {open ? 'Ocultar ganador' : 'Ver último ganador'}
            <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden />
          </Button>
        </div>
        {/* Altura animada con grid-rows (0fr -> 1fr): se despliega sin saltos ni cambio de ruta. */}
        <div
          id={panelId}
          ref={panelRef}
          className={`relative grid transition-[grid-template-rows,opacity] duration-500 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
          aria-live="polite"
          hidden={!open && state.status === 'idle'}
        >
          <div className="overflow-hidden">
            <div className="glass mt-8 rounded-2xl p-5 sm:p-6">
              {state.status === 'error' ? (
                <p role="alert" className="text-white/85">
                  No pudimos cargar los resultados. Revisa tu conexión y vuelve a intentarlo.
                </p>
              ) : (
                <LatestWinnerPanel state={state} />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { event, loading, error, reload } = useCurrentEvent();
  const { isAuthenticated } = useAuth();
  const isLive = event?.status === 'LIVE';
  const place = eventPlace(event);
  usePageMeta();

  return (
    <main>
      {/* Portada: escenario de marca (azul marino de noche, cielo claro de día) con tarjeta de vidrio */}
      <section className="stage relative overflow-hidden">
        <div className="container-page relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div className="animate-fade-up space-y-6 text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-sm font-semibold ring-1 ring-white/15">
              <HeartHandshake className="h-5 w-5 text-accent" aria-hidden /> Bingo benéfico · Asociación Infantil Hogar Sol
            </p>
            <h1 className="font-display text-4xl font-bold sm:text-5xl lg:text-6xl">
              Juega bingo y <span className="bg-linear-to-r from-accent to-accent-strong bg-clip-text text-transparent">ayuda a la niñez</span>
            </h1>
            <p className="mx-auto max-w-xl text-lg text-white/80 sm:text-xl lg:mx-0">
              {place ? `Juega en el ${place} o desde tu casa. ` : 'Juega desde tu casa o en el salón del evento. '}
              Cada cartón aporta hogar, alimentación y educación a niños en situación de vulnerabilidad.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              {isLive ? (
                <Button to={PATHS.live} variant="danger" size="lg" icon={Radio}>
                  Entrar al sorteo en vivo
                </Button>
              ) : (
                <Button to={PATHS.catalog} variant="gold" size="lg" icon={Ticket}>
                  Comprar cartones{event ? ` · ${formatCRC(event.price)}` : ''}
                </Button>
              )}
              {!isAuthenticated && (
                <Button to={PATHS.register} variant="light" size="lg">
                  Crear cuenta gratis
                </Button>
              )}
            </div>
          </div>
          <EventCard event={event} loading={loading} error={error} onRetry={reload} />
        </div>
      </section>

      <PrizesShowcase />

      {/* Cómo jugar */}
      <section aria-labelledby="how-title" className="container-page py-16">
        <h2 id="how-title" className="text-center font-display text-3xl font-bold text-brand sm:text-4xl">
          ¿Cómo se juega?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-lg text-fg-muted">Fácil, desde tu celular o computadora, en 4 pasos.</p>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="surface lift reveal relative p-6 pt-9">
              <span className="absolute -top-4 left-6 grid h-9 w-9 place-items-center rounded-full bg-accent font-display font-bold text-navy-950 ring-4 ring-page">
                {i + 1}
              </span>
              <Icon className="mb-3 h-9 w-9 text-brand" aria-hidden />
              <h3 className="text-xl font-semibold text-fg">{title}</h3>
              <p className="mt-1 text-fg-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Impacto */}
      <section aria-label="Nuestro impacto" className="bg-muted/60 py-16">
        <div className="container-page grid gap-5 sm:grid-cols-3">
          {IMPACT.map(([n, label]) => (
            <div key={label} className="surface lift reveal p-6 text-center">
              <HeartHandshake className="mx-auto mb-2 h-8 w-8 text-sol-red" aria-hidden />
              <div className="font-display text-4xl font-bold text-brand">{n}</div>
              <div className="text-lg text-fg-muted">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Último ganador: se despliega aquí mismo, sin cambiar de página */}
      <LatestWinnerSection />
    </main>
  );
}
