import { useId, useState } from 'react';
import { formatCRC } from '../../lib/format';

const dayLabel = (iso, opts) => new Intl.DateTimeFormat('es-CR', { timeZone: 'UTC', ...opts }).format(new Date(`${iso}T00:00:00Z`));
const SERIES = [
  ['web', 'Virtual (en línea)', 'var(--series-1)'],
  ['salon', 'Físico (salón)', 'var(--series-4)'],
];

/**
 * Ingresos verificados por día (últimos 14 días), apilando virtual y físico. Barras con separación de 2 px
 * entre segmentos, leyenda con totales (dos series: siempre leyenda), detalle al pasar el mouse o con el
 * teclado y tabla oculta para lectores de pantalla.
 */
export default function IncomeChart({ days }) {
  const titleId = useId();
  const [active, setActive] = useState(null);
  const max = Math.max(1, ...days.map((d) => d.web + d.salon));
  const totals = { web: days.reduce((s, d) => s + d.web, 0), salon: days.reduce((s, d) => s + d.salon, 0) };
  const focus = active == null ? null : days[active];

  return (
    <figure className="viz-root surface flex flex-col gap-3 p-4" aria-labelledby={titleId}>
      <figcaption className="flex flex-wrap items-start justify-between gap-2">
        <span>
          <span id={titleId} className="block font-bold text-fg">
            Ingresos por día
          </span>
          <span className="text-sm text-fg-muted">Últimos 14 días · solo pagos verificados</span>
        </span>
        <span className="min-h-10 text-right text-sm text-fg-muted" aria-live="polite">
          {focus ? (
            <>
              <b className="block text-base text-fg">{dayLabel(focus.day, { weekday: 'short', day: 'numeric', month: 'short' })}</b>
              {formatCRC(focus.web)} virtual · {formatCRC(focus.salon)} físico
            </>
          ) : (
            <>
              <b className="block text-base tabular-nums text-fg">{formatCRC(totals.web + totals.salon)}</b>
              en 14 días
            </>
          )}
        </span>
      </figcaption>

      <div className="relative flex h-44 items-end gap-1 border-b border-line pt-3" onPointerLeave={() => setActive(null)}>
        <span className="pointer-events-none absolute inset-x-0 top-3 border-t border-dashed border-line" aria-hidden />
        {totals.web + totals.salon > 0 && (
          <span className="pointer-events-none absolute right-0 top-0 bg-card px-1 text-[0.65rem] tabular-nums text-fg-subtle" aria-hidden>
            {formatCRC(max)}
          </span>
        )}
        {days.map((d, i) => {
          const total = d.web + d.salon;
          return (
            <button
              key={d.day}
              type="button"
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${dayLabel(d.day, { weekday: 'long', day: 'numeric', month: 'long' })}: ${formatCRC(d.web)} virtual, ${formatCRC(d.salon)} físico`}
              className={`flex h-full flex-1 flex-col justify-end rounded-t-md transition focus-visible:outline-2 focus-visible:outline-sol-gold ${
                active != null && active !== i ? 'opacity-50' : ''
              }`}
            >
              {total === 0 ? (
                <span className="mx-auto h-[2px] w-full max-w-8 rounded bg-line" />
              ) : (
                // Apilado: físico arriba, virtual en la base; 2 px de separación entre segmentos.
                <span className="mx-auto flex w-full max-w-8 flex-col gap-[2px]" style={{ height: `${(total / max) * 100}%` }}>
                  {d.salon > 0 && <span className="rounded-t-[4px]" style={{ flexGrow: d.salon, background: 'var(--series-4)' }} />}
                  {d.web > 0 && (
                    <span className={d.salon > 0 ? '' : 'rounded-t-[4px]'} style={{ flexGrow: d.web, background: 'var(--series-1)' }} />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-fg-subtle" aria-hidden>
        <span>{days[0] && dayLabel(days[0].day, { day: 'numeric', month: 'short' })}</span>
        <span>Hoy</span>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {SERIES.map(([key, label, color]) => (
          <li key={key} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: color }} aria-hidden />
            <span className="text-fg">{label}</span>
            <b className="tabular-nums text-fg">{formatCRC(totals[key])}</b>
          </li>
        ))}
      </ul>

      <table className="sr-only">
        <caption>Ingresos verificados por día</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Virtual</th>
            <th scope="col">Físico</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{d.day}</th>
              <td>{d.web}</td>
              <td>{d.salon}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
