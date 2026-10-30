import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { useBackdropClose } from '../../hooks/useBackdropClose';

/**
 * Ventana para formularios (registrar un gasto, una venta…). Se abre encima de todo, centrada en
 * computadora y como hoja desde abajo en celular, así lo que abre un botón siempre se ve al instante
 * (antes un formulario aparecía arriba de la página y parecía que el botón no hacía nada).
 * Escape o tocar el fondo la cierran; el foco va al primer campo.
 */
export default function Modal({ title, icon: Icon, onClose, children, size = 'max-w-2xl' }) {
  const titleId = useId();
  const panel = useRef(null);
  const backdrop = useBackdropClose(onClose);

  // onClose en una ref: si la página de fondo se actualiza (avisos en vivo), el foco no salta al primer campo.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    panel.current?.querySelector('input, select, textarea')?.focus();
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden'; // la página de fondo no se desplaza
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-navy-950/55 backdrop-blur-sm sm:items-center sm:p-4"
      {...backdrop}
    >
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={`glass-panel relative max-h-[92dvh] w-full ${size} animate-modal-in overflow-y-auto rounded-t-3xl p-5 shadow-[0_0_0_1px_rgb(251_191_36/0.3),0_30px_70px_rgb(2_6_23/0.45)] sm:rounded-3xl sm:p-6`}
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="flex items-center gap-2 text-xl font-black text-fg">
            {Icon && <Icon className="h-6 w-6 text-brand" aria-hidden />}
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-fg-muted transition hover:bg-muted hover:text-fg active:scale-90"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
