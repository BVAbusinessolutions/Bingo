import { useEffect } from 'react';

/**
 * Coordinación de menús flotantes: solo uno abierto a la vez (panel de ajustes visuales, menú móvil,
 * menú de usuario). Al abrir uno, se avisa a los demás para que se cierren y no se encimen.
 *
 * Escala de capas (z-index) del sitio, de abajo hacia arriba:
 *   30 barras fijas de página (pestañas legales, barra de compra) · 40 barra de navegación y botón ¡BINGO!
 *   45 menús flotantes (ajustes visuales) · 50 diálogos · 55 avisos (toasts) · 70 aviso de cookies
 */
const OVERLAY_EVENT = 'hs:overlay-open';

export const announceOverlay = (id) => window.dispatchEvent(new CustomEvent(OVERLAY_EVENT, { detail: id }));

/** Mientras `open`, cierra este menú si se abre cualquier otro. */
export function useExclusiveOverlay(id, open, close) {
  useEffect(() => {
    if (!open) return undefined;
    announceOverlay(id);
    const onOther = (e) => e.detail !== id && close();
    window.addEventListener(OVERLAY_EVENT, onOther);
    return () => window.removeEventListener(OVERLAY_EVENT, onOther);
  }, [id, open, close]);
}
