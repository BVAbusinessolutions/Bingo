import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';

/**
 * Fila de accesos a cada cartón (n.º de serie + cuánto le falta). En la vista "Una a la vez" elige qué cartón
 * se muestra y suma flechas anterior/siguiente; en las demás lleva la pantalla hasta ese cartón.
 * Los cartones a los que les faltan 1 o 2 números se destacan para no perderlos de vista.
 */
export default function CardSwitcher({ cards, missingById, activeId, onSelect, paged }) {
  const index = cards.findIndex((c) => c.id === activeId);
  const go = (step) => onSelect(cards[(index + step + cards.length) % cards.length].id);

  return (
    <nav aria-label="Ir a un cartón" className="flex items-center gap-2">
      {paged && (
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Cartón anterior"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card text-fg ring-1 ring-line transition hover:ring-sol-blue active:scale-90"
        >
          <ChevronLeft className="h-6 w-6" aria-hidden />
        </button>
      )}
      <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto px-0.5 py-1.5 [scrollbar-width:thin]">
        {cards.map((card) => {
          const missing = missingById[card.id];
          const active = paged && card.id === activeId;
          const close = missing > 0 && missing <= 2;
          return (
            <li key={card.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(card.id)}
                aria-current={active ? 'true' : undefined}
                aria-label={`Cartón ${card.serial}: ${missing === 0 ? 'completo' : `faltan ${missing}`}`}
                className={`flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-black tabular-nums ring-2 transition duration-200 active:scale-95 ${
                  active
                    ? 'bg-sol-blue text-white ring-sol-blue dark:bg-sol-gold dark:text-sol-blue dark:ring-sol-gold'
                    : missing === 0
                      ? 'bg-sol-gold text-sol-blue ring-sol-gold motion-safe:animate-ready'
                      : 'bg-card text-fg ring-line hover:ring-sol-blue/60'
                }`}
              >
                #{card.serial}
                <span
                  className={`grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs ${
                    missing === 0 || close ? 'bg-sol-red text-white' : active ? 'bg-white/20' : 'bg-muted text-fg-muted'
                  }`}
                  aria-hidden
                >
                  {missing === 0 ? <Trophy className="h-3.5 w-3.5" /> : missing}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {paged && (
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Cartón siguiente"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card text-fg ring-1 ring-line transition hover:ring-sol-blue active:scale-90"
        >
          <ChevronRight className="h-6 w-6" aria-hidden />
        </button>
      )}
    </nav>
  );
}
