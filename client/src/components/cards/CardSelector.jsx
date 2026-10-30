import { memo, useMemo, useState } from 'react';
import { Check, Clock, Search } from 'lucide-react';
import { CARD_STATUS, formatSerial } from '../../constants/cardStatus';

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
      className={`group relative flex min-h-14 flex-col items-center justify-center rounded-xl border-2 py-2 text-lg font-black tabular-nums transition ${
        selected
          ? 'scale-105 border-sol-gold bg-sol-blue text-white shadow-lg ring-2 ring-sol-gold dark:bg-sol-gold dark:text-sol-blue'
          : meta.tile
      } ${selectable ? 'cursor-pointer active:scale-95' : 'cursor-not-allowed'}`}
    >
      {card.serial}
      {selected && <Check className="absolute right-1 top-1 h-4 w-4" aria-hidden />}
      {card.status === 'RESERVED' && remainingMs != null && (
        <span className="mt-0.5 flex items-center gap-1 text-xs font-bold">
          <Clock className="h-3 w-3" aria-hidden /> {mmss(remainingMs)}
        </span>
      )}
      {/* Tooltip visual (hover / foco de teclado). En táctil se usa el aria-label y la leyenda. */}
      <span
        role="presentation"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-max max-w-44 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-sm font-medium text-white no-underline shadow-lg group-hover:block group-focus-visible:block"
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
    <section aria-labelledby="catalog-title" className="surface min-w-0 space-y-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="catalog-title" className="text-2xl font-black text-brand">
          Catálogo de cartones
        </h2>
        <label className="flex min-h-12 items-center gap-2 rounded-full border-2 border-line bg-page px-4">
          <Search className="h-5 w-5 text-fg-subtle" aria-hidden />
          <span className="sr-only">Buscar número de cartón</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/\D/g, '').slice(0, 8))}
            inputMode="numeric"
            placeholder="Buscar #"
            className="w-full min-w-0 bg-transparent sm:w-36 py-2 text-base text-fg outline-none placeholder:text-fg-subtle"
          />
        </label>
      </div>

      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {/* Sin ventas ni reservas reales no se muestran "Vendidos 0" / "Reservados 0": solo lo que existe. */}
        {FILTERS.filter(([key]) => key === 'ALL' || key === 'AVAILABLE' || counts[key] > 0).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`flex min-h-11 items-center gap-2 rounded-full px-4 font-extrabold transition ${
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
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-fg-muted">
        {['AVAILABLE', 'RESERVED', 'VERIFYING', 'SOLD'].filter((s) => s === 'AVAILABLE' || cards.some((c) => c.status === s)).map((s) => (
          <li key={s} className="flex items-center gap-1">
            <span aria-hidden>{CARD_STATUS[s].emoji}</span> {CARD_STATUS[s].label}
          </li>
        ))}
        {maxSelectable && <li className="ml-auto">Máximo {maxSelectable} por compra</li>}
      </ul>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-fg-muted">No hay cartones con ese filtro.</p>
      ) : (
        <div className="grid max-h-[60vh] grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-2 overflow-y-auto overflow-x-hidden p-1 pt-8 -mt-6">
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
