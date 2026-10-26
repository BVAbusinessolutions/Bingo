import {
  CalendarDays,
  CreditCard,
  HeartHandshake,
  MousePointerClick,
  PartyPopper,
  Radio,
  Sun,
  Ticket,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCountdown } from '../../hooks/useCountdown';
import { useCurrentEvent } from '../../hooks/useCurrentEvent';
import Button from '../../components/ui/Button';
import { PATTERNS } from '../../constants/patterns';
import { formatCRC, formatDate } from '../../lib/format';
import { PATHS } from '../../routing/paths';

const STEPS = [
  { icon: UserPlus, title: 'Crea tu cuenta', text: 'Solo necesitas tu nombre y tu correo.' },
  { icon: MousePointerClick, title: 'Elige tus cartones', text: 'Escoge los que más te gusten del catálogo.' },
  { icon: CreditCard, title: 'Paga con SINPE', text: 'O por transferencia. Envíanos el comprobante.' },
  { icon: PartyPopper, title: '¡Juega en vivo!', text: 'Tus cartones se marcan solos. Si completas, pulsa “¡Bingo!”.' },
];

const IMPACT = [
  ['120+', 'niños apoyados'],
  ['15', 'años de servicio'],
  ['100 %', 'de lo recaudado va a la causa'],
];

function Countdown({ date }) {
  const t = useCountdown(date);
  const units = [
    ['Días', t.days],
    ['Horas', t.hours],
    ['Min', t.minutes],
    ['Seg', t.seconds],
  ];
  return (
    <div
      className="grid grid-cols-4 gap-2 sm:gap-3"
      role="timer"
      aria-label={`Faltan ${t.days} días, ${t.hours} horas y ${t.minutes} minutos`}
    >
      {units.map(([label, v]) => (
        <div key={label} className="rounded-2xl bg-sol-blue p-2 text-center sm:p-3 dark:bg-[#0a1628]">
          <div className="text-3xl font-black tabular-nums text-sol-gold sm:text-4xl">{String(v).padStart(2, '0')}</div>
          <div className="text-sm font-bold uppercase tracking-wider text-white/85">{label}</div>
        </div>
      ))}
    </div>
  );
}

function EventCard({ event }) {
  const isLive = event.status === 'LIVE';
  return (
    <div className="surface space-y-4 p-5 text-left sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold uppercase tracking-widest text-sol-red dark:text-sol-gold">Próximo bingo</p>
        {isLive && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sol-red px-3 py-1 font-black text-white">
            <Radio className="h-4 w-4 animate-pulse" aria-hidden /> EN VIVO
          </span>
        )}
      </div>
      <h2 className="text-2xl font-black text-fg sm:text-3xl">{event.name}</h2>
      <p className="flex items-center gap-2 text-lg text-fg-muted">
        <CalendarDays className="h-5 w-5 shrink-0 text-brand" aria-hidden /> {formatDate(event.startsAt)}
      </p>
      {!isLive && <Countdown date={event.startsAt} />}
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Precio', formatCRC(event.price)],
          ['Se juega', PATTERNS[event.pattern]?.label],
          ['Disponibles', event.available],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-muted p-3">
            <dt className="text-sm font-bold text-fg-muted">{k}</dt>
            <dd className="text-lg font-black text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      {event.description && <p className="text-fg-muted">{event.description}</p>}
    </div>
  );
}

export default function HomePage() {
  const { event } = useCurrentEvent();
  const { isAuthenticated } = useAuth();
  const isLive = event?.status === 'LIVE';

  return (
    <main>
      {/* Portada */}
      <section className="relative overflow-hidden bg-linear-to-br from-sol-blue via-sol-blue-light to-sol-blue text-white dark:from-[#0a1628] dark:via-sol-blue dark:to-[#0a1628]">
        <Sun className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 text-sol-gold/10" aria-hidden />
        <div className="container-page relative grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6 text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 font-bold ring-1 ring-sol-gold/50">
              <HeartHandshake className="h-5 w-5 text-sol-gold" aria-hidden /> Bingo benéfico en línea
            </p>
            <h1 className="text-4xl font-black sm:text-5xl lg:text-6xl">
              Juega bingo y <span className="text-sol-gold">ayuda a la niñez</span>
            </h1>
            <p className="mx-auto max-w-xl text-xl text-white/90 lg:mx-0">
              Cada cartón de la Asociación Infantil Hogar Sol aporta hogar, alimentación y educación a niños en situación de vulnerabilidad.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              {isLive ? (
                <Button to={PATHS.live} variant="danger" size="lg" icon={Radio}>
                  Entrar al sorteo en vivo
                </Button>
              ) : (
                event && (
                  <Button to={PATHS.catalog} variant="gold" size="lg" icon={Ticket}>
                    Comprar cartones · {formatCRC(event.price)}
                  </Button>
                )
              )}
              {!isAuthenticated && (
                <Button to={PATHS.register} variant="light" size="lg">
                  Crear cuenta gratis
                </Button>
              )}
            </div>
          </div>
          {event ? (
            <EventCard event={event} />
          ) : (
            <div className="surface p-6 text-center text-lg text-fg-muted">Pronto anunciaremos el próximo bingo.</div>
          )}
        </div>
      </section>

      {/* Cómo jugar */}
      <section aria-labelledby="how-title" className="container-page py-14">
        <h2 id="how-title" className="text-center text-3xl font-black text-brand sm:text-4xl">
          ¿Cómo se juega?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-lg text-fg-muted">Fácil, desde tu celular o computadora, en 4 pasos.</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="surface relative p-6 pt-8">
              <span className="absolute -top-4 left-6 grid h-9 w-9 place-items-center rounded-full bg-sol-red text-lg font-black text-white ring-4 ring-page">
                {i + 1}
              </span>
              <Icon className="mb-3 h-9 w-9 text-brand" aria-hidden />
              <h3 className="text-xl font-black text-fg">{title}</h3>
              <p className="mt-1 text-fg-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Impacto */}
      <section aria-label="Nuestro impacto" className="bg-muted/60 py-14">
        <div className="container-page grid gap-4 sm:grid-cols-3">
          {IMPACT.map(([n, label]) => (
            <div key={label} className="surface p-6 text-center">
              <HeartHandshake className="mx-auto mb-2 h-8 w-8 text-sol-red" aria-hidden />
              <div className="text-4xl font-black text-brand">{n}</div>
              <div className="text-lg text-fg-muted">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Llamado final */}
      <section className="container-page py-14">
        <div className="flex flex-col items-center gap-5 rounded-3xl bg-sol-red p-8 text-center text-white shadow-xl sm:p-12 lg:flex-row lg:text-left">
          <Trophy className="h-16 w-16 shrink-0 text-sol-gold" aria-hidden />
          <div className="flex-1">
            <h2 className="text-3xl font-black">¿Quién ganó el último bingo?</h2>
            <p className="mt-1 text-lg text-white/90">Consulta los resultados y ganadores de cada evento.</p>
          </div>
          <Button to={PATHS.results} variant="gold" size="lg">
            Ver resultados
          </Button>
        </div>
      </section>
    </main>
  );
}
