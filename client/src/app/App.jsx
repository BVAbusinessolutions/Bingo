import { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import Providers from './providers';
import AppRouter from '../routing/AppRouter';
import AccessibilityMenu from '../components/accessibility/AccessibilityMenu';
import AvisoPrivacidad from '../components/layout/AvisoPrivacidad';
import ErrorBoundary from '../components/layout/ErrorBoundary';
import PageLoader from '../components/ui/PageLoader';

/**
 * Barrera de último nivel, dentro de los proveedores (la sesión no se pierde) y con Suspense propio:
 * /live está fuera del layout público y antes, al entrar directo o recargar, no tenía Suspense
 * y la pantalla quedaba en blanco.
 */
function SafeRoutes() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={<PageLoader fullScreen />}>
        <AppRouter />
      </Suspense>
    </ErrorBoundary>
  );
}

/** Piezas globales fuera de las rutas: si una falla, se oculta sola y nunca deja el sitio en blanco. */
function SafeGlobals() {
  const { pathname } = useLocation();
  return (
    <>
      <ErrorBoundary silent resetKey={pathname}>
        <AccessibilityMenu />
      </ErrorBoundary>
      <ErrorBoundary silent resetKey={pathname}>
        <AvisoPrivacidad />
      </ErrorBoundary>
    </>
  );
}

export default function App() {
  return (
    <Providers>
      <SafeRoutes />
      <SafeGlobals />
    </Providers>
  );
}
