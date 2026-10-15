const ALL = Array.from({ length: 90 }, (_, i) => i + 1);

export default function CalledNumbersBoard({ calledList }) {
  const called = new Set(calledList);
  const last = calledList.at(-1);
  const previous = calledList.slice(-5, -1).reverse();

  return (
    <section className="surface p-3 ring-2 ring-sol-gold">
      <div className="mb-3 flex items-center gap-3">
        <div
          aria-live="polite"
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 border-sol-gold bg-sol-red text-2xl font-black text-white shadow-lg"
        >
          {last ?? '–'}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-fg-muted">Última balota · {calledList.length}/90</p>
          <div className="mt-1 flex gap-1">
            {previous.map((n) => (
              <span key={n} className="grid h-8 w-8 place-items-center rounded-full bg-sol-blue text-sm font-bold text-white">
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {ALL.map((n) => (
          <span
            key={n}
            className={`grid aspect-square place-items-center rounded text-[10px] font-bold sm:text-xs ${
              called.has(n) ? 'bg-sol-red text-white' : 'bg-muted text-fg-subtle'
            }`}
          >
            {n}
          </span>
        ))}
      </div>
    </section>
  );
}
