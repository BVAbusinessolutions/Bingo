import { useEffect, useRef } from 'react';

const reducedMotion = () =>
  document.documentElement.dataset.motion === 'reduce' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Lo que abre un botón dentro de la página (un formulario, un panel) se lleva a la vista y recibe el foco:
 * así nunca queda fuera de la pantalla y parece que el botón no hizo nada.
 *   const ref = useReveal(open);  <section ref={ref}>…</section>
 */
export function useReveal(active) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    el.querySelector('input, select, textarea')?.focus({ preventScroll: true });
  }, [active]);
  return ref;
}
