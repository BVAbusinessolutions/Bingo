import { ROLES } from '../constants/roles';
import { PATHS } from './paths';

/** Pantalla de inicio de cada rol después de autenticarse. */
export const homeFor = (role) => (role === ROLES.ADMIN ? PATHS.admin : PATHS.live);

/**
 * Evita redirecciones abiertas: solo acepta rutas internas ("/algo"),
 * nunca "//dominio.com", "/\dominio.com" ni URLs absolutas.
 */
export const safeRedirect = (from, fallback) => {
  const target = typeof from === 'string' ? from : from?.pathname;
  if (typeof target !== 'string' || !target.startsWith('/') || /^\/[/\\]/.test(target)) return fallback;
  const search = typeof from === 'object' && typeof from.search === 'string' ? from.search : '';
  return `${target}${search}`;
};
