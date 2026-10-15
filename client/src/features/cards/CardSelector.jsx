import { memo, useMemo, useState } from 'react';
import { Check, Clock, Search } from 'lucide-react';
import { CARD_STATUS, formatSerial } from './cardStatus';

const FILTERS = [
  ['ALL', 'Todos'],
  ['AVAILABLE', 'Disponibles'],
  ['RESERVED', 'Reservados'],
  ['SOLD', 'Vendidos'],
];

const mmss = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const CardTile = memo(function CardTile({ card, selected, remainingMs, onToggle }) {
  const meta = CARD_STATUS[card.status];
  const selectable = card.status === 'AVAILABLE';
  const tooltip =
    card.status === 'RESERVED' && remainingMs != null
      ? `${meta.label} · se libera en ${mmss(remainingMs)}`
      : selected
        ? 'Seleccionado · toca para quitar'
        : `${meta.label} · ${meta.hint}`;

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={() => onToggle(card.serial)}
      aria-pressed={selectable ? selected : undefined}
      aria-label={`Cartón ${formatSerial(card.serial)}: ${tooltip}`}
      className={`group relative flex aspect-square flex-col items-center justify-center rounded-lg border-2 text-sm font-black tabular-nums transition sm:text-base ${
        selected
          ? 'scale-105 border-sol-gold bg-sol-blue text-white shadow-lg ring-2 ring-sol-gold dark:bg-sol-gold dark:text-sol-blue'
          : meta.tile
      } ${selectable ? 'cursor-pointer active:scale-95' : 'cursor-not-allowed'}`}
    >
      {card.serial}
      {selected && (
        <Check className="absolute right-0.5 top-0.5 h-3.5 w-3.5" aria-hidden />
      )}
      {card.status === 'RESERVED' && remainingMs != null && (
        <span className="mt-0.5 flex items-center gap-0.5 text-[9px] font-semibold sm:text-[10px]">
          <Clock className="h-2.5 w-2.5" aria-hidden /> {mmss(remainingMs)}
        </span>
      )}
      {/* Tooltip visual (hover / foco de teclado). En táctil se usa el aria-label y la leyenda. */}
      <span
        role="presentation"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-max max-w-44 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white no-underline shadow-lg group-hover:block group-focus-visible:block"
      >
        {formatSerial(card.serial)} · {tooltip}
      </span>
    </button>
  );
});

/**
 * Selector de cartones del bingo actual.
 *  - cards:     [{ serial, status: AVAILABLE|RESERVED|VERIFYING|SOLD, reservedUntil }]
 *  - selected:  Set<string> de seriales elegidos
 *  - now:       Date.now() corregido con la hora del servidor (para los relojes de reserva)
 *  - onToggle(serial)
 */
export default function CardSelector({ cards, selected, now, onToggle, maxSelectable }) {
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const c = { ALL: cards.length, AVAILABLE: 0, RESERVED: 0, SOLD: 0 };
    cards.forEach((card) => (card.status === 'VERIFYING' ? c.RESERVED++ : c[card.status]++));
    return c;
  }, [cards]);

  const visible = useMemo(() => {
    const q = query.replace(/\D/g, '');
    return cards.filter((c) => {
      const group = c.status === 'VERIFYING' ? 'RESERVED' : c.status;
      return (filter === 'ALL' || group === filter) && (!q || c.serial.includes(q));
    });
  }, [cards, filter, query]);

  return (
    <section aria-labelledby="catalog-title" className="surface space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="catalog-title" className="text-lg font-black text-brand">
          Catálogo de cartones
        </h2>
        <label className="flex items-center gap-2 rounded-full border border-line bg-page px-3">
          <Search className="h-4 w-4 text-fg-subtle" aria-hidden />
          <span className="sr-only">Buscar número de cartón</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="Buscar #"
            className="w-28 bg-transparent py-2 text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
        </label>
      </div>

      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              filter === key ? 'bg-sol-blue text-white dark:bg-sol-gold dark:text-sol-blue' : 'bg-muted text-fg-muted hover:text-fg'
            }`}
          >
            {key !== 'ALL' && <span className={`h-2.5 w-2.5 rounded-full ${CARD_STATUS[key].dot}`} aria-hidden />}
            {label}
            <span className="tabular-nums opacity-75">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* Leyenda */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
        {['AVAILABLE', 'RESERVED', 'VERIFYING', 'SOLD'].map((s) => (
          <li key={s} className="flex items-center gap-1">
            <span aria-hidden>{CARD_STATUS[s].emoji}</span> {CARD_STATUS[s].label}
          </li>
        ))}
        {maxSelectable && <li className="ml-auto">Máximo {maxSelectable} por compra</li>}
      </ul>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-fg-muted">No hay cartones con ese filtro.</p>
      ) : (
        <div className="grid max-h-[60vh] grid-cols-5 gap-1.5 overflow-y-auto p-1 pt-8 -mt-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
          {visible.map((card) => (
            <CardTile
              key={card.serial}
              card={card}
              selected={selected.has(card.serial)}
              remainingMs={card.reservedUntil ? new Date(card.reservedUntil).getTime() - now : null}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </section>
  );
}
