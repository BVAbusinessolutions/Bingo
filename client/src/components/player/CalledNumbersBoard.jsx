const ALL = Array.from({ length: 90 }, (_, i) => i + 1);

export default function CalledNumbersBoard({ calledList }) {
  const called = new Set(calledList);
  const last = calledList.at(-1);
  const previous = calledList.slice(-5, -1).reverse();

  return (
    <section aria-label="Balotas cantadas" className="surface p-4 ring-2 ring-sol-gold">
      <div className="mb-4 flex items-center gap-4">
        <div
          aria-live="assertive"
          aria-atomic="true"
          aria-label={last ? `Última balota: ${last}` : 'Aún no se ha cantado ninguna balota'}
          className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-4 border-sol-gold bg-sol-red text-4xl font-black text-white shadow-lg"
        >
          {last ?? '–'}
        </div>
        <div className="min-w-0">
          <p className="font-extrabold uppercase tracking-wide text-fg-muted">
            Última balota · <span className="text-fg">{calledList.length}</span>/90
          </p>
          {previous.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="sr-only">Anteriores:</span>
              {previous.map((n) => (
                <span key={n} className="grid h-10 w-10 place-items-center rounded-full bg-sol-blue text-lg font-black text-white dark:bg-sol-blue-light">
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-10 gap-1" aria-hidden>
        {ALL.map((n) => (
          <span
            key={n}
            className={`grid aspect-square place-items-center rounded-md text-xs font-extrabold tabular-nums sm:text-sm ${
              called.has(n) ? 'bg-sol-red text-white' : 'bg-muted text-fg-muted'
            }`}
          >
            {n}
          </span>
        ))}
      </div>
    </section>
  );
}
