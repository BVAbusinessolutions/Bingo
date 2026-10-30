const HIGHLIGHT_MS = 1800;

const prefersReducedMotion = () =>
  document.documentElement.dataset.motion === 'reduce' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Lleva la pantalla al elemento `id`, centrado (no al borde superior ni al pie de página), le pasa el foco
 * del teclado y lo resalta un momento. Devuelve false si el elemento aún no existe.
 */
export function scrollToTarget(id) {
  const el = id && document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  el.classList.remove('target-highlight');
  void el.offsetWidth; // reinicia la animación si se pulsa dos veces seguidas
  el.classList.add('target-highlight');
  setTimeout(() => el.classList.remove('target-highlight'), HIGHLIGHT_MS);
  return true;
}
