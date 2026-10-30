import { useId } from 'react';
import { Check } from 'lucide-react';
import { PATTERNS, PATTERN_IDS, isFreeCell, patternCells } from '../../constants/patterns';

const GRID = [0, 1, 2, 3, 4];

/** Mini cartón 5x5 con las casillas del patrón pintadas (el centro libre lleva una estrella). */
export function PatternPreview({ pattern, className = 'h-14 w-14', active = false }) {
  const cells = patternCells(pattern);
  return (
    <span className={`grid shrink-0 grid-cols-5 grid-rows-5 gap-[2px] rounded-lg bg-[#0f4c9c] p-[3px] ${className}`} aria-hidden>
      {GRID.flatMap((r) =>
        GRID.map((c) => {
          const on = cells.has(`${r}-${c}`);
          return (
            <span
              key={`${r}-${c}`}
              className={`grid place-items-center rounded-[22%] text-[0.5rem] leading-none transition-colors duration-300 ${
                on ? (active ? 'bg-sol-gold' : 'bg-sol-red') : 'bg-white/90'
              }`}
            >
              {isFreeCell(r, c) && <span className={on ? 'text-white' : 'text-sol-gold-dark'}>★</span>}
            </span>
          );
        })
      )}
    </span>
  );
}

/**
 * Selector de modalidad con muestra visual de cada una (radio accesible). `disabled` bloquea el cambio,
 * p. ej. con la ronda ya empezada; `compact` usa menos columnas (dentro de un diálogo).
 */
export default function PatternPicker({ value, onChange, disabled = false, label = 'Modalidad', compact = false }) {
  const labelId = useId();
  return (
    <div className="space-y-2">
      <p id={labelId} className="text-xs font-extrabold uppercase tracking-wider text-fg-muted">
        {label}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className={`grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 ${compact ? 'md:grid-cols-3' : 'sm:grid-cols-3 xl:grid-cols-5'}`}
      >
        {PATTERN_IDS.map((id) => {
          const p = PATTERNS[id];
          const active = id === value;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled && !active}
              onClick={() => onChange(id)}
              title={p.hint}
              className={`relative flex min-w-0 items-center gap-2.5 rounded-2xl p-2.5 text-left ring-2 transition duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${
                active
                  ? 'bg-sol-blue/10 ring-sol-blue dark:bg-sol-gold/10 dark:ring-sol-gold'
                  : 'bg-card ring-line enabled:hover:-translate-y-0.5 enabled:hover:ring-sol-blue/60'
              }`}
            >
              <PatternPreview pattern={id} active={active} className="h-12 w-12" />
              <span className="min-w-0">
                <span className="block text-sm font-black leading-tight text-fg">{p.label}</span>
                <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-fg-muted">{p.hint}</span>
              </span>
              {active && (
                <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-sol-blue text-white shadow ring-2 ring-card motion-safe:animate-stamp dark:bg-sol-gold dark:text-sol-blue">
                  <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
