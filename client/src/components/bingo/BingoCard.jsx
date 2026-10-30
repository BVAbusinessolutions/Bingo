import { memo, useMemo } from 'react';
import { Star, Trophy } from 'lucide-react';
import BrandLogo from '../brand/BrandLogo';
import { LETTERS, PATTERNS, isFreeCell, missingFor } from '../../constants/patterns';

/**
 * Cartón de bingo de 75 balotas (5x5, centro libre), con el diseño del cartón impreso de la Asociación.
 *  - card:        { id, serial, grid: (number|null)[5][5] }
 *  - called:      Set<number> con los números cantados
 *  - manualMarks: Set<number> con las marcas del jugador (modo manual)
 *  - autoMark:    true = se marcan solos los números cantados
 *  - pattern:     'LINE' | 'FOUR_CORNERS' | 'X' | 'FULL'
 *  - onToggle(cardId, number)
 *  - showStatus:  false = vista previa (catálogo, impresión), sin progreso del patrón
 */
/** La "ficha" que se coloca sobre la casilla. `valid` = la balota ya fue cantada. */
function Marker({ type, valid }) {
  const base = `pointer-events-none absolute animate-stamp ${valid ? '' : 'opacity-45'}`;
  if (type === 'star') {
    return <Star className={`${base} inset-[12%] h-[76%] w-[76%] fill-sol-gold text-sol-gold-dark drop-shadow`} strokeWidth={1.5} aria-hidden />;
  }
  if (type === 'corn') {
    return (
      <span
        className={`${base} left-[30%] top-[20%] h-[60%] w-[40%] rotate-[18deg] rounded-[50%_50%_45%_45%] bg-[radial-gradient(circle_at_35%_30%,#fff7c2,#f5c518_45%,#d99a06)] shadow-[0_0.5cqw_1cqw_rgb(0_0_0/0.35)]`}
        aria-hidden
      />
    );
  }
  if (type === 'gold') {
    return (
      <span
        className={`${base} inset-[10%] -rotate-12 rounded-full border-[0.9cqw] border-dashed border-sol-gold-dark bg-sol-gold/35 shadow-[inset_0_0_0_0.5cqw_rgb(245_158_11/0.5)]`}
        aria-hidden
      />
    );
  }
  return <span className={`${base} inset-[8%] rounded-full bg-sol-red/55 ring-[0.6cqw] ring-sol-red mix-blend-multiply`} aria-hidden />;
}

function BingoCard({ card, called, manualMarks, autoMark = true, marker = 'chip', pattern = 'FULL', onToggle, showStatus = true }) {
  // Lo que se ve marcado: automático = lo cantado; manual = todo lo que la persona marcó.
  const shown = autoMark ? called : manualMarks;
  // Para el patrón solo cuentan las marcas cantadas oficialmente (nunca un "bingo" falso).
  const marked = useMemo(() => (autoMark ? called : new Set([...manualMarks].filter((n) => called.has(n)))), [autoMark, called, manualMarks]);

  const missing = missingFor(card.grid, marked, pattern);
  const won = showStatus && missing === 0;

  return (
    <article
      aria-label={`Cartón número ${card.serial}`}
      className={`@container relative overflow-hidden rounded-2xl bg-white shadow-lg ring-4 transition print:shadow-none dark:shadow-black/40 ${
        won ? 'ring-sol-gold motion-safe:animate-pulse' : 'ring-transparent'
      }`}
    >
      {/* Letras B I N G O */}
      <div className="grid grid-cols-5 px-[3cqw] pt-[3cqw]" aria-hidden>
        {LETTERS.map((l) => (
          <span key={l} className="text-center text-[9cqw] font-black leading-none text-black">
            {l}
          </span>
        ))}
      </div>

      {/* Cuadrícula azul con casillas blancas */}
      <div className="m-[3cqw] grid grid-cols-5 gap-[2.2cqw] rounded-[2cqw] bg-[#0f4c9c] p-[2.2cqw]" role="grid">
        {card.grid.flatMap((row, r) =>
          row.map((n, c) => {
            const key = `${r}-${c}`;
            if (isFreeCell(r, c)) {
              return (
                <div
                  key={key}
                  role="gridcell"
                  aria-label="Espacio libre"
                  className="grid aspect-square place-items-center rounded-[1.6cqw] bg-white"
                >
                  <BrandLogo decorative className="h-[13cqw] w-auto" />
                </div>
              );
            }
            const isMarked = shown.has(n);
            const notCalled = isMarked && !called.has(n); // marcada a mano, pero la balota aún no sale
            const pendingManual = !autoMark && called.has(n) && !isMarked;
            return (
              <button
                key={key}
                type="button"
                role="gridcell"
                disabled={autoMark || !onToggle}
                onClick={() => onToggle?.(card.id, n)}
                aria-pressed={isMarked}
                aria-label={`${LETTERS[c]} ${n}${isMarked ? (notCalled ? ', marcado, aún no cantado' : ', marcado') : ''}`}
                className={`relative grid aspect-square select-none place-items-center rounded-[1.6cqw] bg-white text-[10cqw] font-black tabular-nums leading-none text-black shadow-[inset_0_-0.6cqw_0_rgba(0,0,0,0.12)] transition disabled:cursor-default ${
                  !autoMark && onToggle ? 'cursor-pointer hover:bg-sol-gold-light active:scale-95' : ''
                } ${pendingManual ? 'ring-[0.8cqw] ring-sol-gold' : ''} ${notCalled ? 'outline-dashed outline-[0.5cqw] -outline-offset-[1cqw] outline-sol-red/70' : ''}`}
              >
                {n}
                {isMarked && <Marker type={marker} valid={!notCalled} />}
              </button>
            );
          })
        )}
      </div>

      {/* Pie: estado del patrón y número de serie */}
      <footer className="flex items-center justify-between gap-2 px-[3cqw] pb-[3cqw]">
        <span className="text-[3.6cqw] font-bold leading-tight text-[#0f4c9c]">
          {showStatus
            ? won
              ? '¡Completo!'
              : missing === 1
                ? '¡Te falta 1!'
                : `${PATTERNS[pattern]?.label} · faltan ${missing}`
            : 'Asociación Infantil Hogar Sol'}
        </span>
        <span className="rounded-full bg-[#0f4c9c] px-[3.5cqw] py-[0.8cqw] text-[6cqw] font-black tabular-nums leading-none text-white underline decoration-[0.4cqw] underline-offset-[0.8cqw]">
          {card.serial}
        </span>
      </footer>

      {won && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-sol-gold/25">
          <div className="flex -rotate-6 items-center gap-2 rounded-2xl border-4 border-white bg-sol-red px-5 py-2 text-[9cqw] font-black text-sol-gold shadow-2xl">
            <Trophy className="h-[9cqw] w-[9cqw]" /> ¡BINGO!
          </div>
        </div>
      )}
    </article>
  );
}

export default memo(BingoCard);
