import { useId, useState } from 'react';

const dayLabel = (iso, opts) => new Intl.DateTimeFormat('es-CR', { timeZone: 'UTC', ...opts }).format(new Date(`${iso}T00:00:00Z`));

/**
 * Visitas reales por día (últimos 14 días, día de Costa Rica). Barras finas con esquinas redondeadas sobre
 * la línea base, una sola serie (sin leyenda: el título la nombra), tooltip al pasar el mouse o con el teclado
 * y una tabla oculta para lectores de pantalla. Hoy se resalta; el resto en el tono base.
 */
export default function PeopleChart({ days }) {
  const titleId = useId();
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...days.map((d) => d.visits));
  const total = days.reduce((sum, d) => sum + d.visits, 0);
  const shown = active == null ? days.length - 1 : active;
  const focus = days[shown];

  return (
    <figure className="surface flex flex-col gap-3 p-4" aria-labelledby={titleId}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span>
          <span id={titleId} className="block font-bold text-fg">
            Visitas de los últimos 14 días
          </span>
          <span className="text-sm text-fg-muted">{total} en total · una por sesión del navegador, sin datos personales</span>
        </span>
        {focus && (
          <span className="text-right text-sm text-fg-muted" aria-live="polite">
            <b className="text-2xl font-black tabular-nums text-fg">{focus.visits}</b>{' '}
            {shown === days.length - 1 && active == null
              ? 'hoy'
              : dayLabel(focus.day, { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        )}
      </figcaption>

      <div className="relative flex h-40 items-end gap-1 border-b border-line pt-2" onPointerLeave={() => setActive(null)}>
        {/* Línea guía del máximo (recesiva) */}
        <span className="pointer-events-none absolute inset-x-0 top-2 border-t border-dashed border-line" aria-hidden />
        <span
          className="pointer-events-none absolute right-0 top-0 -translate-y-1/2 bg-card px-1 text-[0.65rem] tabular-nums text-fg-subtle"
          aria-hidden
        >
          {max}
        </span>
        {days.map((d, i) => {
          const today = i === days.length - 1;
          const isActive = i === active;
          return (
            <button
              key={d.day}
              type="button"
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${dayLabel(d.day, { weekday: 'long', day: 'numeric', month: 'long' })}: ${d.visits} visitas`}
              className="group relative flex h-full flex-1 items-end justify-center rounded-t-md focus-visible:outline-2 focus-visible:outline-sol-gold"
            >
              <span
                className={`w-full max-w-7 rounded-t-[4px] transition-[height,background-color] duration-500 ${
                  today ? 'bg-sol-gold' : isActive ? 'bg-sol-blue dark:bg-sky-400' : 'bg-sol-blue/55 dark:bg-sky-400/55'
                }`}
                style={{ height: `${Math.max(d.visits ? 4 : 1.5, (d.visits / max) * 100)}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-fg-subtle" aria-hidden>
        <span>{days[0] && dayLabel(days[0].day, { day: 'numeric', month: 'short' })}</span>
        <span>Hoy</span>
      </div>

      <table className="sr-only">
        <caption>Visitas por día</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>{d.visits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
