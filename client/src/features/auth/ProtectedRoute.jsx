import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';

/**
 * Protege rutas por sesión y rol:
 *   <Route element={<ProtectedRoute roles={['ADMIN']} />}> ... </Route>
 * Esto es solo UX: la autorización real SIEMPRE se valida en el backend.
 */
export default function ProtectedRoute({ roles }) {
  const { status, role } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-sol-red" aria-label="Cargando" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles?.length && !roles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
