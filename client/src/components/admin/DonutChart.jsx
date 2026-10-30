import { useId, useState } from 'react';

const R = 42; // radio del anillo (viewBox de 100 x 100)
const STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * R;
const GAP = 1.6; // separación entre porciones (en unidades del viewBox, ~2 px en pantalla)

const pct = (value, total) => (total ? Math.round((value / total) * 100) : 0);

/**
 * Gráfico de anillo (donut) en SVG, sin librerías. Accesible: la leyenda es también la tabla de datos
 * (etiqueta, valor y porcentaje en texto), el color nunca va solo y cada porción responde a hover y teclado.
 *
 * items: [{ key, label, value, color }] — color es un token CSS (var(--series-n)), en orden fijo.
 * format: cómo mostrar cada valor (p. ej. formatCRC). center: { value, label } por defecto en el centro.
 */
export default function DonutChart({ title, description, items, format = String, center }) {
  const titleId = useId();
  const [active, setActive] = useState(null);
  const total = items.reduce((sum, i) => sum + i.value, 0);
  const visible = items.filter((i) => i.value > 0);
  const gap = visible.length > 1 ? GAP : 0;

  let offset = 0;
  const arcs = visible.map((item) => {
    const length = (item.value / total) * CIRCUMFERENCE;
    const arc = { item, dash: Math.max(length - gap, 0.5), offset };
    offset += length;
    return arc;
  });

  const focused = items.find((i) => i.key === active);
  const centerValue = focused ? `${pct(focused.value, total)}%` : center?.value;
  const centerLabel = focused ? focused.label : center?.label;

  return (
    <figure className="viz-root surface flex flex-col gap-4 p-4" aria-labelledby={titleId}>
      <figcaption>
        <h3 id={titleId} className="font-bold text-fg">
          {title}
        </h3>
        {description && <p className="text-sm text-fg-muted">{description}</p>}
      </figcaption>

      <div className="flex flex-wrap items-center gap-5">
        <div className="relative mx-auto h-36 w-36 shrink-0 sm:mx-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--viz-track)" strokeWidth={STROKE} />
            {arcs.map(({ item, dash, offset: start }) => (
              <circle
                key={item.key}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={item.color}
                strokeWidth={active === item.key ? STROKE + 4 : STROKE}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-start}
                className="cursor-pointer transition-[stroke-width,opacity] duration-200"
                opacity={active && active !== item.key ? 0.45 : 1}
                onPointerEnter={() => setActive(item.key)}
                onPointerLeave={() => setActive(null)}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 grid place-content-center px-6 text-center" aria-hidden>
            {total === 0 ? (
              <span className="text-sm font-semibold text-fg-muted">Sin datos aún</span>
            ) : (
              <>
                <span className="text-2xl font-black tabular-nums leading-none text-fg">{centerValue}</span>
                <span className="mt-1 text-xs font-semibold leading-tight text-fg-muted">{centerLabel}</span>
              </>
            )}
          </div>
        </div>

        <ul className="min-w-[11rem] flex-1 space-y-1">
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onPointerEnter={() => setActive(item.key)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(item.key)}
                onBlur={() => setActive(null)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                  active === item.key ? 'bg-muted' : ''
                }`}
              >
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: item.color }} aria-hidden />
                <span className="flex-1 font-semibold text-fg">{item.label}</span>
                <span className="font-black tabular-nums text-fg">{format(item.value)}</span>
                <span className="w-10 text-right tabular-nums text-fg-muted">{pct(item.value, total)}%</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
