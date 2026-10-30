import { useMemo } from 'react';
import { CheckCircle2, Hash, ListOrdered, Target, XCircle } from 'lucide-react';
import BingoCard from '../bingo/BingoCard';
import { PatternPreview } from '../bingo/PatternPreview';
import { LETTERS, MAX_BALL, PATTERNS, letterFor, winningGroup } from '../../constants/patterns';
import { LETTER_COLORS } from '../../constants/ballColors';

const EMPTY = new Set();
const colorFor = (n) => LETTER_COLORS[LETTERS.indexOf(letterFor(n))];
const ordinal = (n) => `${n}.ª`;

function Ball({ n, size = 'h-9 w-9 text-xs', ring = false, title }) {
  return (
    <span
      title={title}
      className={`grid shrink-0 place-items-center rounded-full font-black tabular-nums text-white shadow ${colorFor(n)} ${size} ${
        ring ? 'ring-4 ring-sol-gold ring-offset-2 ring-offset-card' : ''
      }`}
    >
      {n}
    </span>
  );
}

/**
 * Verificación visual de un ¡Bingo! para la administración: el cartón con las casillas ganadoras resaltadas,
 * cada número del patrón con el orden en que salió, la bola que cerró el bingo, todas las bolas cantadas en orden
 * y el tablero de 75. Todo con las bolas registradas AL MOMENTO del reclamo (no las que salieron después).
 */
export default function WinnerVerification({ claim, pattern }) {
  const calledInOrder = useMemo(() => claim.calledAtClaim ?? [], [claim.calledAtClaim]);
  const called = useMemo(() => new Set(calledInOrder), [calledInOrder]);
  const win = useMemo(() => winningGroup(claim.grid, calledInOrder, pattern), [claim.grid, calledInOrder, pattern]);
  const highlight = useMemo(() => new Set((win?.cells ?? []).map(([r, c]) => `${r}-${c}`)), [win]);
  const patternNumbers = (win?.cells ?? [])
    .map(([r, c]) => claim.grid[r][c])
    .map((n) => ({ n, at: calledInOrder.indexOf(n) + 1 }))
    .sort((a, b) => a.at - b.at);
  const closing = win ? calledInOrder[win.closedAt] : null;
  const winSet = new Set(patternNumbers.map((p) => p.n));
  const cardNumbers = new Set(claim.grid.flat().filter(Boolean));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="space-y-2">
        <BingoCard
          card={{ id: claim.id, serial: claim.serial, grid: claim.grid }}
          called={called}
          manualMarks={EMPTY}
          pattern={pattern}
          highlight={highlight}
        />
        <p className="text-center text-sm text-fg-muted">Marco dorado = casillas que completan {PATTERNS[pattern]?.label}.</p>
      </div>

      <div className="min-w-0 space-y-4">
        {/* Resultado de la verificación */}
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 ${win ? 'bg-emerald-500/10 ring-1 ring-emerald-500/40' : 'bg-sol-red/10 ring-1 ring-sol-red/40'}`}
        >
          {win ? (
            <CheckCircle2 className="h-7 w-7 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          ) : (
            <XCircle className="h-7 w-7 shrink-0 text-sol-red" aria-hidden />
          )}
          <div>
            <p className="text-lg font-black text-fg">{win ? 'Patrón completo con bolas cantadas' : 'El patrón no está completo'}</p>
            <p className="text-fg-muted">
              Ronda {claim.round ?? 1} · {calledInOrder.length} bolas cantadas al reclamar
              {closing != null && (
                <>
                  {' '}
                  · el bingo se cerró con la <b className="text-fg">{ordinal(win.closedAt + 1)} bola</b>
                </>
              )}
            </p>
          </div>
          <PatternPreview pattern={pattern} active className="ml-auto h-12 w-12" />
        </div>

        {/* Números del patrón, en el orden en que salieron */}
        {win && (
          <section aria-labelledby={`nums-${claim.id}`} className="space-y-2">
            <h3 id={`nums-${claim.id}`} className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-fg-muted">
              <Target className="h-4 w-4" aria-hidden /> Números del patrón ({patternNumbers.length})
            </h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {patternNumbers.map(({ n, at }) => (
                <li
                  key={n}
                  className={`flex items-center gap-2 rounded-xl p-2 ring-1 ${n === closing ? 'bg-sol-gold/20 ring-sol-gold' : 'bg-card ring-line'}`}
                >
                  <Ball n={n} ring={n === closing} />
                  <span className="min-w-0 text-sm leading-tight">
                    <b className="block text-fg">
                      {letterFor(n)}-{n}
                    </b>
                    <span className="text-fg-muted">{n === closing ? 'cerró el bingo' : `salió ${ordinal(at)}`}</span>
                  </span>
                  <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="cantado" />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Todas las bolas cantadas, en orden */}
        <section aria-labelledby={`seq-${claim.id}`} className="space-y-2">
          <h3 id={`seq-${claim.id}`} className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-fg-muted">
            <ListOrdered className="h-4 w-4" aria-hidden /> Bolas cantadas en orden
          </h3>
          <ol className="flex flex-wrap gap-1.5">
            {calledInOrder.map((n, i) => (
              <li key={n} className={`relative ${winSet.has(n) ? '' : cardNumbers.has(n) ? 'opacity-90' : 'opacity-45'}`}>
                <Ball n={n} size="h-8 w-8 text-[0.7rem]" ring={winSet.has(n)} title={`${ordinal(i + 1)} bola: ${letterFor(n)}-${n}`} />
              </li>
            ))}
          </ol>
          <p className="text-xs text-fg-muted">Con aro dorado: números del patrón. Tenues: bolas que no están en este cartón.</p>
        </section>

        {/* Tablero de 75 */}
        <section aria-labelledby={`board-${claim.id}`} className="space-y-2">
          <h3 id={`board-${claim.id}`} className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-fg-muted">
            <Hash className="h-4 w-4" aria-hidden /> Tablero al momento del reclamo
          </h3>
          <div className="space-y-1" aria-hidden>
            {LETTERS.map((letter, i) => (
              <div key={letter} className="grid grid-cols-[1.6rem_repeat(15,minmax(0,1fr))] gap-0.5">
                <span className={`grid aspect-square place-items-center rounded text-xs font-black text-white ${LETTER_COLORS[i]}`}>
                  {letter}
                </span>
                {Array.from({ length: MAX_BALL / 5 }, (_, k) => i * 15 + k + 1).map((n) => (
                  <span
                    key={n}
                    className={`grid aspect-square place-items-center rounded text-[0.6rem] font-extrabold tabular-nums sm:text-[0.7rem] ${
                      winSet.has(n)
                        ? 'bg-sol-gold text-sol-blue ring-1 ring-sol-gold-dark'
                        : called.has(n)
                          ? `${LETTER_COLORS[i]} text-white`
                          : 'bg-muted text-fg-subtle'
                    }`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
