import { memo, useId, useMemo } from 'react';
import { Star, Trophy } from 'lucide-react';
import BrandLogo from '../brand/BrandLogo';
import { LETTERS, PATTERNS, countedMarks, isFreeCell, missingFor } from '../../constants/patterns';

/**
 * Cartón de bingo de 75 bolas (5x5, centro libre), con el diseño del cartón impreso de la Asociación.
 *  - card:        { id, serial, grid: (number|null)[5][5] }
 *  - called:      Set<number> con los números cantados
 *  - manualMarks: Set<number> con las marcas del jugador (modo manual)
 *  - autoMark:    true = se marcan solos los números cantados
 *  - pattern:     'LINE' | 'FOUR_CORNERS' | 'X' | 'FULL'
 *  - onToggle(cardId, number)
 *  - showStatus:  false = vista previa (catálogo, impresión), sin progreso del patrón
 */
/**
 * La "ficha" que se coloca sobre la casilla, DETRÁS del número (que siempre queda legible encima).
 * `valid` = la bola ya fue cantada; si no, la ficha queda tenue.
 */
export function Marker({ type, valid }) {
  const uid = useId(); // ids únicos por grano: los gradientes SVG no pueden repetir id en la página
  const dim = valid ? '' : 'opacity-60';
  const base = `pointer-events-none absolute motion-safe:animate-stamp ${dim}`;
  if (type === 'star') {
    return (
      <Star
        className={`${base} inset-[2%] h-[96%] w-[96%] fill-sol-gold text-sol-gold-dark drop-shadow-md`}
        strokeWidth={1.5}
        aria-hidden
      />
    );
  }
  if (type === 'corn') {
    // Grano de maíz vectorial: corona ancha y redondeada, punta (pedicelo) clara, brillo y sombra.
    // Cae girando sobre la casilla (animate-kernel) y queda ladeado, como un grano real.
    return (
      <svg
        viewBox="0 0 40 52"
        className={`pointer-events-none absolute left-[18%] top-[4%] h-[92%] w-[64%] motion-safe:animate-kernel drop-shadow-[0_0.6cqw_0.6cqw_rgb(0_0_0/0.35)] ${dim}`}
        aria-hidden
      >
        <defs>
          <radialGradient id={`${uid}b`} cx="38%" cy="30%" r="75%">
            <stop offset="0" stopColor="#fff6b8" />
            <stop offset="0.35" stopColor="#ffd23f" />
            <stop offset="0.8" stopColor="#f0a202" />
            <stop offset="1" stopColor="#c97b00" />
          </radialGradient>
          <linearGradient id={`${uid}t`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6c445" stopOpacity="0" />
            <stop offset="1" stopColor="#fff1c9" />
          </linearGradient>
        </defs>
        <path
          d="M20 50C12 46 5 36 3.5 24 2 12 9 3 20 2c11 1 18 10 16.5 22C35 36 28 46 20 50z"
          fill={`url(#${uid}b)`}
          stroke="#b86e00"
          strokeWidth="1.2"
        />
        <path d="M20 50c-3.5-2.4-6-6-7-10 4 1.6 10 1.6 14 0-1 4-3.5 7.6-7 10z" fill={`url(#${uid}t)`} />
        <path d="M10 14c2-5 6-8 11-8.5" stroke="#fff" strokeOpacity="0.85" strokeWidth="3" strokeLinecap="round" fill="none" />
        <ellipse cx="13" cy="22" rx="2.2" ry="4" fill="#fff" fillOpacity="0.45" />
      </svg>
    );
  }
  if (type === 'gold') {
    return (
      <span
        className={`${base} inset-[3%] -rotate-12 rounded-full border-[1.1cqw] border-dashed border-sol-gold-dark bg-sol-gold shadow-[inset_0_0_0_0.6cqw_rgb(255_255_255/0.55),0_0.6cqw_1cqw_rgb(0_0_0/0.25)]`}
        aria-hidden
      />
    );
  }
  // Ficha clásica: disco sólido con brillo, como la ficha de plástico del salón.
  return (
    <span
      className={`${base} inset-[3%] rounded-full bg-mark shadow-[inset_0_-1cqw_0_rgb(0_0_0/0.28),inset_0_0.8cqw_0_rgb(255_255_255/0.35),0_0.6cqw_1cqw_rgb(0_0_0/0.3)] ring-[0.6cqw] ring-white`}
      aria-hidden
    />
  );
}

// Casilla marcada (además de la ficha): fondo teñido y borde interior del color de la ficha.
const MARKED_CELL = {
  chip: 'bg-red-100 shadow-[inset_0_0_0_0.7cqw_var(--mark)]',
  gold: 'bg-amber-100 shadow-[inset_0_0_0_0.7cqw_#d97706]',
  corn: 'bg-amber-100 shadow-[inset_0_0_0_0.7cqw_#d97706]',
  star: 'bg-amber-100 shadow-[inset_0_0_0_0.7cqw_#d97706]',
};

// Color del número sobre cada ficha (contraste): blanco sobre la ficha sólida, azul sobre el sello,
// negro con halo blanco sobre el maíz y la estrella.
const NUMBER_ON_MARKER = {
  chip: 'text-white',
  gold: 'text-[#0f4c9c]',
  corn: 'text-black [text-shadow:0_0_0.8cqw_#fff,0_0_0.8cqw_#fff,0_0_0.4cqw_#fff]',
  star: 'text-black [text-shadow:0_0_0.8cqw_#fff,0_0_0.8cqw_#fff,0_0_0.4cqw_#fff]',
};

function BingoCard({ card, called, manualMarks, autoMark = true, marker = 'chip', pattern = 'FULL', onToggle, showStatus = true }) {
  // Lo que se ve marcado: automático = lo cantado; manual = todo lo que la persona marcó.
  const shown = autoMark ? called : manualMarks;
  // Para el patrón solo cuentan las marcas cantadas oficialmente (nunca un "bingo" falso).
  const marked = useMemo(() => countedMarks(autoMark, called, manualMarks), [autoMark, called, manualMarks]);

  const missing = missingFor(card.grid, marked, pattern);
  // Casillas que pide el patrón (sin marcas): base de la barra de progreso.
  const required = useMemo(() => missingFor(card.grid, new Set(), pattern), [card.grid, pattern]);
  const progress = required ? Math.round(((required - missing) / required) * 100) : 0;
  const won = showStatus && missing === 0;

  return (
    <article
      aria-label={`Cartón número ${card.serial}`}
      className={`@container relative overflow-hidden rounded-2xl bg-white shadow-lg ring-4 transition print:shadow-none dark:shadow-black/40 ${
        won ? 'ring-sol-gold motion-safe:animate-ready' : 'ring-transparent'
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
            const notCalled = isMarked && !called.has(n); // marcada a mano, pero la bola aún no sale
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
                className={`relative grid aspect-square select-none place-items-center rounded-[1.6cqw] text-[10cqw] font-black tabular-nums leading-none text-black transition disabled:cursor-default ${
                  !autoMark && onToggle
                    ? 'cursor-pointer hover:bg-sol-gold-light focus-visible:outline-[0.8cqw] focus-visible:outline-sol-gold active:scale-90'
                    : ''
                } ${pendingManual ? 'outline-solid outline-[0.8cqw] -outline-offset-[0.4cqw] outline-sol-gold motion-safe:animate-hint' : ''} ${
                  isMarked ? (MARKED_CELL[marker] ?? MARKED_CELL.chip) : 'bg-white shadow-[inset_0_-0.6cqw_0_rgba(0,0,0,0.12)]'
                } ${notCalled ? 'outline-dashed outline-[0.7cqw] -outline-offset-[0.5cqw] outline-sol-red' : ''}`}
              >
                {isMarked && <Marker type={marker} valid={!notCalled} />}
                <span className={`relative ${isMarked && !notCalled ? (NUMBER_ON_MARKER[marker] ?? '') : ''}`}>{n}</span>
                {/* Marcada a mano pero la bola aún no sale: no cuenta para el ¡Bingo! */}
                {notCalled && (
                  <span
                    className="absolute right-[4%] top-[4%] grid h-[32%] w-[32%] place-items-center rounded-full bg-sol-red text-[4.2cqw] font-black text-white shadow"
                    aria-hidden
                  >
                    !
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Pie: estado del patrón (con barra de progreso) y número de serie */}
      <footer className="flex items-center justify-between gap-[3cqw] px-[3cqw] pb-[3cqw]">
        <span className="min-w-0 flex-1 text-[3.6cqw] font-bold leading-tight text-[#0f4c9c]">
          {showStatus
            ? won
              ? '¡Completo!'
              : missing === 1
                ? '¡Te falta 1!'
                : `${PATTERNS[pattern]?.label} · faltan ${missing}`
            : 'Asociación Infantil Hogar Sol'}
          {showStatus && (
            <span className="mt-[1.2cqw] block h-[1.6cqw] overflow-hidden rounded-full bg-[#0f4c9c]/15" aria-hidden>
              <span
                className={`block h-full rounded-full transition-[width] duration-500 ${won ? 'bg-sol-gold' : missing <= 2 ? 'bg-sol-red' : 'bg-[#0f4c9c]'}`}
                style={{ width: `${progress}%` }}
              />
            </span>
          )}
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
