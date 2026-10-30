import { PATHS } from '../routing/paths';

/**
 * Navegación principal (misma en escritorio y móvil). Premios, Resultados y Reglamento se consultan desde la
 * portada (premio mayor, último ganador) y desde el pie de página (Centro Legal).
 */
export const MAIN_LINKS = Object.freeze([
  { to: PATHS.home, label: 'Inicio', end: true },
  { to: PATHS.catalog, label: 'Comprar cartones' },
  { to: PATHS.contact, label: 'Contacto' },
]);
