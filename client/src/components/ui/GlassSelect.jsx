import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Selector en vidrio (reemplaza <select>, cuya lista desplegable la dibuja el sistema y no se puede estilizar).
 * Patrón ARIA "listbox" de un solo valor: flechas, Inicio/Fin, Enter/Espacio eligen, Escape cierra.
 *  - options: [{ value, label }]
 */
export default function GlassSelect({ label, value, options, onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const buttonRef = useRef(null);
  const labelId = useId();
  const listId = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return undefined;
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    listRef.current?.focus();
    const onDown = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, options, value]);

  const choose = (i) => {
    onChange(options[i].value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKey = (e) => {
    const last = options.length - 1;
    const moves = { ArrowDown: Math.min(last, active + 1), ArrowUp: Math.max(0, active - 1), Home: 0, End: last };
    if (e.key in moves) {
      e.preventDefault();
      setActive(moves[e.key]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
      if (e.key === 'Escape') buttonRef.current?.focus();
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <span id={labelId} className="text-sm font-bold text-fg-muted">
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${listId}-value`}
        onClick={() => setOpen((v) => !v)}
        className="glass-panel mt-1 flex h-11 w-full items-center justify-between gap-2 rounded-full px-4 text-left font-bold text-fg transition hover:border-sol-gold/60 active:scale-[0.98]"
      >
        <span id={`${listId}-value`} className="truncate">
          {current?.label ?? 'Elegir…'}
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-brand transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onKey}
          className="glass-panel absolute inset-x-0 z-30 mt-2 max-h-72 animate-modal-in overflow-y-auto rounded-2xl p-1.5 shadow-[0_0_0_1px_rgb(251_191_36/0.3),0_20px_45px_rgb(2_6_23/0.35)] outline-none"
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-xl px-3 font-semibold ${
                  i === active ? 'bg-sol-blue/10 text-fg dark:bg-sol-gold/15' : 'text-fg'
                } ${selected ? 'text-brand' : ''}`}
              >
                <span className="truncate">{o.label}</span>
                {selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
