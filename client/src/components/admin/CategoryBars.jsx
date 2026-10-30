import { useId } from 'react';
import { formatCRC } from '../../lib/format';

/**
 * Barras horizontales de una sola serie (gastos por categoría), ordenadas de mayor a menor, con la etiqueta
 * y el monto en texto: se leen sin depender del color. Las categorías sin gasto quedan atenuadas al final.
 */
export default function CategoryBars({ title, description, items }) {
  const titleId = useId();
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...sorted.map((i) => i.value));
  const total = sorted.reduce((s, i) => s + i.value, 0);

  return (
    <figure className="surface flex flex-col gap-3 p-4" aria-labelledby={titleId}>
      <figcaption>
        <span id={titleId} className="block font-bold text-fg">
          {title}
        </span>
        {description && <span className="text-sm text-fg-muted">{description}</span>}
      </figcaption>
      {total === 0 ? (
        <p className="grid flex-1 place-items-center py-6 text-sm text-fg-muted">Sin gastos registrados todavía.</p>
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((i) => (
            <li key={i.key} className={i.value === 0 ? 'opacity-45' : ''}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-semibold text-fg">
                  {i.label}
                  {i.count > 0 && <span className="font-normal text-fg-muted"> · {i.count}</span>}
                </span>
                <span className="shrink-0 font-black tabular-nums text-fg">{formatCRC(i.value)}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className="h-full rounded-full bg-sol-red/80 transition-[width] duration-700 dark:bg-red-400/80"
                  style={{ width: `${(i.value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
