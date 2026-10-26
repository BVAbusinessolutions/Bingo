import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../constants/roles';
import PageLoader from '../components/ui/PageLoader';
import { PATHS } from './paths';
import { homeFor, safeRedirect } from './redirects';

export { homeFor, safeRedirect };

/*
 * Seguridad de navegación del frontend.
 * Todo esto es UX: oculta pantallas a quien no corresponde. La autorización real
 * SIEMPRE la valida el backend (server/src/middleware/auth.js) en cada petición.
 */

const { ADMIN, CLIENTE } = ROLES;

/** Grupos de roles por zona de la app. */
export const ACCESS = Object.freeze({
  client: [CLIENTE, ADMIN],
  admin: [ADMIN],
});

/**
 * Requiere sesión y, opcionalmente, uno de los roles indicados:
 *   <Route element={<PrivateRoute roles={ACCESS.admin} />}> ... </Route>
 */
export function PrivateRoute({ roles }) {
  const { status, role } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageLoader fullScreen />;

  if (status !== 'authenticated') {
    return <Navigate to={PATHS.login} replace state={{ from: location }} />;
  }

  if (roles?.length && !roles.includes(role)) {
    return <Navigate to={PATHS.unauthorized} replace />;
  }

  return <Outlet />;
}

/**
 * Solo para invitados (login, registro): si ya hay sesión, envía al destino pendiente
 * o a la pantalla indicada por `fallback(role)`. Usa la misma regla que las páginas
 * para que ambas lleguen siempre al mismo lugar.
 */
export function PublicOnlyRoute({ fallback = homeFor }) {
  const { status, role } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageLoader fullScreen />;

  if (status === 'authenticated') {
    return <Navigate to={safeRedirect(location.state?.from, fallback(role))} replace />;
  }

  return <Outlet />;
}
