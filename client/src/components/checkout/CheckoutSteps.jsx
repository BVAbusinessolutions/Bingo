import { Check } from 'lucide-react';

const STEPS = ['Elige tus cartones', 'Tus datos y pago', 'Confirmación'];

/** Indicador de pasos de la compra (1 Cartones → 2 Datos y pago → 3 Confirmación). `current` empieza en 1. */
export default function CheckoutSteps({ current }) {
  return (
    <nav aria-label="Pasos de la compra" className="surface p-3 sm:p-4">
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const done = step < current;
          const active = step === current;
          return (
            <li
              key={label}
              aria-current={active ? 'step' : undefined}
              className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-3 sm:text-left"
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-black ${
                  done ? 'bg-emerald-600 text-white' : active ? 'bg-sol-red text-white ring-4 ring-sol-gold' : 'bg-muted text-fg-muted'
                }`}
              >
                {done ? <Check className="h-5 w-5" aria-label="Completado" /> : step}
              </span>
              <span className={`text-sm font-extrabold leading-tight sm:text-base ${active ? 'text-fg' : 'text-fg-muted'}`}>
                <span className="sr-only">Paso {step}: </span>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
