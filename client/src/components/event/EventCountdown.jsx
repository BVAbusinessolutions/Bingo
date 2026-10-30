import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';
import { COSTA_RICA_TZ } from '../../config/site';
import { CONTACT_ANCHORS, PATHS } from '../../routing/paths';

const dateFmt = new Intl.DateTimeFormat('es-CR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: COSTA_RICA_TZ });
const timeFmt = new Intl.DateTimeFormat('es-CR', { hour: 'numeric', minute: '2-digit', timeZone: COSTA_RICA_TZ });

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Fecha y hora del evento en hora de Costa Rica, sin importar desde dónde se visite el sitio. */
export const eventDateLabel = (iso) => capitalize(dateFmt.format(new Date(iso)));
export const eventTimeLabel = (iso) => timeFmt.format(new Date(iso));

/** "Salón de Eventos de Tinamaste, Higuito" (lo que se haya configurado en el panel). */
export const eventPlace = (event) => [event?.venue, event?.venueArea].filter(Boolean).join(', ');


const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * Cuenta regresiva (días, horas, minutos, segundos) hasta `startsAt`.
 * Los lectores de pantalla reciben una sola frase y no cada segundo (role="timer" no se anuncia solo).
 * `compact` para versiones pequeñas (Resultados). `onDoneSlot` se muestra cuando llega la hora.
 */
export default function EventCountdown({ startsAt, compact = false, onDoneSlot = null }) {
  const t = useCountdown(startsAt);
  if (t.done) return onDoneSlot;

  const units = [
    ['Días', t.days],
    ['Horas', t.hours],
    ['Min', t.minutes],
    ['Seg', t.seconds],
  ];
  const summary = `Faltan ${plural(t.days, 'día', 'días')}, ${plural(t.hours, 'hora', 'horas')} y ${plural(t.minutes, 'minuto', 'minutos')}`;

  return (
    <div role="timer" aria-label={summary} className={`grid grid-cols-4 ${compact ? 'gap-1.5' : 'gap-2 sm:gap-3'}`}>
      {units.map(([label, v]) => (
        <div
          key={label}
          aria-hidden
          className={`overflow-hidden rounded-2xl bg-navy-950 text-center shadow-inner ring-1 ring-sol-gold/20 ${compact ? 'p-1.5' : 'p-2 sm:p-3'}`}
        >
          {/* Ficha siempre oscura: colores fijos (sol-gold, slate-200) que el escenario claro no reasigna. */}
          <div className={`font-display font-bold tabular-nums text-sol-gold ${compact ? 'text-2xl' : 'text-3xl sm:text-5xl'}`}>
            {/* La key cambia con el valor: cada cambio repite la pequeña animación de "caída". */}
            <span key={v} className="inline-block animate-tick">
              {String(v).padStart(2, '0')}
            </span>
          </div>
          <div className={`font-semibold uppercase tracking-wider text-slate-200 ${compact ? 'text-[0.65rem]' : 'text-xs sm:text-sm'}`}>{label}</div>
        </div>
      ))}
    </div>
  );
}

/** Fecha, hora y lugar del evento (con enlace al mapa del salón si el panel definió el lugar). */
export function EventFacts({ event, className = '' }) {
  const place = eventPlace(event);
  return (
    <ul className={`grid gap-2 text-lg ${className}`}>
      <li className="flex items-start gap-2">
        <CalendarDays className="mt-1 h-5 w-5 shrink-0 text-brand" aria-hidden />
        <time dateTime={event.startsAt}>{eventDateLabel(event.startsAt)}</time>
      </li>
      <li className="flex items-start gap-2">
        <Clock className="mt-1 h-5 w-5 shrink-0 text-brand" aria-hidden />
        <span>{eventTimeLabel(event.startsAt)} (hora de Costa Rica)</span>
      </li>
      {place && (
        <li className="flex items-start gap-2">
          <MapPin className="mt-1 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <span>
            {place} ·{' '}
            {/* Lleva al mapa del salón en Contacto (centrado y resaltado), no a otra pestaña ni al pie de página. */}
            <Link
              to={`${PATHS.contact}#${CONTACT_ANCHORS.map}`}
              className="font-semibold text-sol-blue underline underline-offset-4 dark:text-accent"
            >
              Cómo llegar
            </Link>
          </span>
        </li>
      )}
    </ul>
  );
}
