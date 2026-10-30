import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToTarget } from '../lib/scrollToTarget';

const MAX_WAIT_MS = 3000; // la página de destino puede estar descargándose (carga diferida)

/**
 * Enlaces internos con ancla (p. ej. /contacto#mapa-salon): al llegar, centra el destino con desplazamiento
 * suave y lo resalta. Espera a que la página termine de montar antes de rendirse.
 */
export function useHashScroll() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (!id) return undefined;
    const started = performance.now();
    let frame = 0;
    const attempt = () => {
      if (scrollToTarget(id) || performance.now() - started > MAX_WAIT_MS) return;
      frame = requestAnimationFrame(attempt);
    };
    frame = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash, key]);
}
