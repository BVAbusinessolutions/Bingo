import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import EmailVerificationBanner from './EmailVerificationBanner';
import PageLoader from '../ui/PageLoader';

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <SiteHeader />
      <EmailVerificationBanner />
      <div id="contenido" tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </div>
      <SiteFooter />
    </div>
  );
}
