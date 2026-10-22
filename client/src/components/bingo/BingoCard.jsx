import { memo, useMemo } from 'react';
import { Sun, Trophy } from 'lucide-react';
import { missingFor, PATTERNS } from '../../constants/patterns';

/**
 * Cartón de Bingo de 90 balotas (3 filas x 9 columnas).
 *  - card:        { id, serial, grid: (number|null)[][] }
 *  - called:      Set<number> con los números cantados
 *  - manualMarks: Set<number> con las marcas del jugador (modo manual)
 *  - autoMark:    true = se marcan solos los números cantados
 *  - pattern:     'LINE' | 'DOUBLE_LINE' | 'FULL'
 *  - onToggle(cardId, number)
 *  - showStatus:  false = vista previa (catálogo), sin progreso del patrón
 */
function BingoCard({ card, called, manualMarks, autoMark = true, pattern = 'FULL', onToggle, showStatus = true }) {
  const marked = useMemo(() => {
    if (autoMark) return called;
    // En modo manual solo cuentan las marcas que además fueron cantadas (evita "bingos" falsos).
    return new Set([...manualMarks].filter((n) => called.has(n)));
  }, [autoMark, called, manualMarks]);

  const missing = missingFor(card.grid, marked, pattern);
  const won = showStatus && missing === 0;

  return (
    <article
      aria-label={`Cartón #${card.serial}`}
      className={`@container relative overflow-hidden rounded-2xl bg-white shadow-lg ring-4 transition dark:shadow-black/40 ${
        won ? 'ring-sol-gold motion-safe:animate-pulse' : 'ring-sol-red'
      }`}
    >
      {/* Marco superior rojo / dorado */}
      <header className="flex items-center justify-between bg-linear-to-r from-sol-red via-sol-red-dark to-sol-red px-3 py-2 text-white">
        <div className="flex items-center gap-1.5">
          <Sun className="h-5 w-5 text-sol-gold" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-wider">Hogar Sol</span>
        </div>
        <span className="rounded-full bg-sol-gold px-2.5 py-0.5 text-xs font-black text-sol-red-dark">
          #{card.serial}
        </span>
      </header>
      <div className="h-1.5 bg-linear-to-r from-sol-gold via-sol-gold-light to-sol-gold" />

      {/* Matriz 3x9 */}
      <div className="grid grid-cols-9 gap-0.75 bg-sol-blue/10 p-1.5 sm:gap-1 sm:p-2">
        {card.grid.flatMap((row, r) =>
          row.map((n, c) => {
            const key = `${r}-${c}`;
            if (n === null) {
              return <div key={key} className="aspect-square rounded-md bg-sol-blue/85" aria-hidden />;
            }
            const isMarked = marked.has(n);
            const pendingManual = !autoMark && called.has(n) && !isMarked;
            return (
              <button
                key={key}
                type="button"
                disabled={autoMark}
                onClick={() => onToggle?.(card.id, n)}
                aria-pressed={isMarked}
                aria-label={`Número ${n}${isMarked ? ', marcado' : ''}`}
                className={`relative grid aspect-square select-none place-items-center rounded-md text-[clamp(0.7rem,5cqw,1.6rem)] font-black tabular-nums transition active:scale-95 ${
                  isMarked ? 'bg-sol-red text-white shadow-inner' : 'bg-white text-sol-blue'
                } ${!autoMark ? 'cursor-pointer hover:bg-sol-gold-light' : ''} ${
                  pendingManual ? 'ring-2 ring-sol-gold' : ''
                }`}
              >
                {n}
                {isMarked && (
                  <span
                    className="pointer-events-none absolute inset-1 rounded-full border-2 border-sol-gold/80"
                    aria-hidden
                  />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Marco inferior */}
      <div className="h-1.5 bg-linear-to-r from-sol-gold via-sol-gold-light to-sol-gold" />
      <footer className="flex items-center justify-between bg-sol-red px-3 py-1.5 text-xs font-semibold text-white">
        {showStatus ? (
          <>
            <span>{PATTERNS[pattern]?.label}</span>
            <span>{won ? '¡Completo!' : missing === 1 ? '¡Te falta 1!' : `Faltan ${missing}`}</span>
          </>
        ) : (
          <span className="w-full text-center tracking-wider">Asociación Infantil Hogar Sol</span>
        )}
      </footer>

      {won && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-sol-gold/25">
          <div className="flex -rotate-6 items-center gap-2 rounded-2xl border-4 border-white bg-sol-red px-5 py-2 text-3xl font-black text-sol-gold shadow-2xl sm:text-4xl">
            <Trophy className="h-8 w-8" /> ¡BINGO!
          </div>
        </div>
      )}
    </article>
  );
}

export default memo(BingoCard);
