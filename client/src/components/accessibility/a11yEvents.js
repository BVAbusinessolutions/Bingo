// Abre o cierra el panel de accesibilidad desde cualquier botón (barra de navegación, página en vivo).
export const A11Y_TOGGLE_EVENT = 'hs:a11y-toggle';
// El panel avisa si quedó abierto o cerrado (los botones lo reflejan en aria-expanded).
export const A11Y_STATE_EVENT = 'hs:a11y-state';

export const toggleAccessibility = () => window.dispatchEvent(new Event(A11Y_TOGGLE_EVENT));
export const announceAccessibilityState = (open) => window.dispatchEvent(new CustomEvent(A11Y_STATE_EVENT, { detail: open }));
