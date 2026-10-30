import { COLUMN_RANGES, LETTERS, ballLabel, letterFor } from '../../constants/patterns';
import { LETTER_COLORS } from '../../constants/ballColors';
const colorFor = (n) => LETTER_COLORS[LETTERS.indexOf(letterFor(n))];

/** Tablero de bolas de 75 agrupadas por letra, con la última bola grande y las anteriores. */
export default function CalledNumbersBoard({ calledList }) {
  const called = new Set(calledList);
  const last = calledList.at(-1);
  const previous = calledList.slice(-6, -1).reverse();

  return (
    <section aria-label="Bolas cantadas" className="surface p-4 ring-2 ring-sol-gold">
      <div className="mb-4 flex items-center gap-4">
        <div
          aria-live="assertive"
          aria-atomic="true"
          aria-label={last ? `Última bola: ${letterFor(last)} ${last}` : 'Aún no se ha cantado ninguna bola'}
          className={`grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-white text-white shadow-lg ring-4 ring-sol-gold ${last ? colorFor(last) : 'bg-slate-400'}`}
        >
          {last ? (
            <span className="text-center leading-none">
              <span className="block text-xl font-black">{letterFor(last)}</span>
              <span className="block text-4xl font-black tabular-nums">{last}</span>
            </span>
          ) : (
            <span className="text-3xl font-black">–</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-extrabold uppercase tracking-wide text-fg-muted">
            Última bola · <span className="text-fg">{calledList.length}</span>/75
          </p>
          {previous.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="sr-only">Anteriores:</span>
              {previous.map((n) => (
                <span
                  key={n}
                  className={`grid h-11 w-11 place-items-center rounded-full text-sm font-black leading-none text-white ${colorFor(n)}`}
                >
                  {ballLabel(n)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1" aria-hidden>
        {LETTERS.map((letter, i) => {
          const [min, max] = COLUMN_RANGES[i];
          return (
            <div key={letter} className="grid grid-cols-[2rem_repeat(15,minmax(0,1fr))] items-center gap-0.5 sm:gap-1">
              <span className={`grid aspect-square place-items-center rounded-md text-sm font-black text-white ${LETTER_COLORS[i]}`}>
                {letter}
              </span>
              {Array.from({ length: max - min + 1 }, (_, k) => min + k).map((n) => (
                <span
                  key={n}
                  className={`grid aspect-square place-items-center rounded text-[0.65rem] font-extrabold tabular-nums sm:text-xs ${
                    called.has(n) ? `${LETTER_COLORS[i]} text-white` : 'bg-muted text-fg-muted'
                  }`}
                >
                  {n}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
