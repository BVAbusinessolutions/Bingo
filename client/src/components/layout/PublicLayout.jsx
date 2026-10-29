import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import EmailVerificationNotice from './EmailVerificationNotice';
import PageLoader from '../ui/PageLoader';
import ErrorBoundary from './ErrorBoundary';
import { PATHS } from '../../routing/paths';

export default function PublicLayout() {
  const { pathname } = useLocation();
  // El panel de administración es una aplicación de pantalla completa: sin pie de página.
  const isAdmin = pathname === PATHS.admin || pathname.startsWith(`${PATHS.admin}/`);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <SiteHeader />
      <EmailVerificationNotice />
      <div id="contenido" tabIndex={-1} className="flex-1 outline-none">
        {/* Si una página falla, el encabezado (y el pie, fuera del panel) siguen visibles y se puede navegar. */}
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageLoader page />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
      {!isAdmin && <SiteFooter />}
    </div>
  );
}
