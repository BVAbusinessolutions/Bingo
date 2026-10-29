import { useEffect, useState } from 'react';
import { ScanEye } from 'lucide-react';
import { A11Y_STATE_EVENT, toggleAccessibility } from './a11yEvents';

/**
 * Botón discreto de ajustes visuales y de lectura (ojo con marco). Va en la barra de navegación:
 * abre el panel y, si ya está abierto, lo cierra.
 */
export default function AccessibilityButton({ className = '' }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onState = (e) => setOpen(e.detail);
    window.addEventListener(A11Y_STATE_EVENT, onState);
    return () => window.removeEventListener(A11Y_STATE_EVENT, onState);
  }, []);

  return (
    <button
      type="button"
      // El panel cierra al hacer clic afuera (mousedown); se detiene aquí para que este clic no lo cierre y reabra.
      onMouseDown={(e) => e.stopPropagation()}
      onClick={toggleAccessibility}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="panel-accesibilidad"
      aria-label={open ? 'Cerrar ajustes visuales' : 'Ajustes visuales y de lectura'}
      title="Ajustes visuales"
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-white ring-1 transition hover:bg-white/20 hover:ring-accent/60 active:scale-95 ${
        open ? 'bg-accent/20 ring-accent' : 'bg-white/10 ring-white/15'
      } ${className}`}
    >
      <ScanEye className="h-6 w-6" aria-hidden />
    </button>
  );
}
