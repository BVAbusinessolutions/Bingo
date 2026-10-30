import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import EmailVerificationNotice from './EmailVerificationNotice';
import AdminReturnBar from './AdminReturnBar';
import PageLoader from '../ui/PageLoader';
import ErrorBoundary from './ErrorBoundary';
import { useHashScroll } from '../../hooks/useHashScroll';

export default function PublicLayout() {
  const { pathname } = useLocation();
  useHashScroll(); // enlaces con ancla: desplazamiento suave y centrado al destino
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <AdminReturnBar />
      <SiteHeader />
      <EmailVerificationNotice />
      <div id="contenido" tabIndex={-1} className="flex-1 outline-none">
        {/* Si una página falla, el encabezado y el pie siguen visibles y se puede navegar. */}
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageLoader page />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
      <SiteFooter />
    </div>
  );
}
