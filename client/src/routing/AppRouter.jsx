import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout';
import { ACCESS, PrivateRoute, PublicOnlyRoute } from './private-routes';
import { PATHS } from './paths';
import { lazyWithRetry } from './lazyWithRetry';

// Cada página se descarga solo cuando se visita (el panel admin no pesa al jugador).
// lazyWithRetry reintenta si el archivo no descarga (p. ej. tras publicar una versión nueva).
const HomePage = lazyWithRetry(() => import('../pages/public/HomePage'));
const CatalogPage = lazyWithRetry(() => import('../pages/public/CatalogPage'));
const ResultsPage = lazyWithRetry(() => import('../pages/public/ResultsPage'));
const LegalCenterPage = lazyWithRetry(() => import('../pages/public/LegalCenterPage'));
const PrizesPage = lazyWithRetry(() => import('../pages/public/PrizesPage'));
const ContactPage = lazyWithRetry(() => import('../pages/public/ContactPage'));
const LoginPage = lazyWithRetry(() => import('../pages/public/LoginPage'));
const RegisterPage = lazyWithRetry(() => import('../pages/public/RegisterPage'));
const ForgotPasswordPage = lazyWithRetry(() => import('../pages/public/ForgotPasswordPage'));
const ResetPasswordPage = lazyWithRetry(() => import('../pages/public/ResetPasswordPage'));
const VerifyEmailPage = lazyWithRetry(() => import('../pages/public/VerifyEmailPage'));
const UnauthorizedPage = lazyWithRetry(() => import('../pages/errors/UnauthorizedPage'));
const NotFoundPage = lazyWithRetry(() => import('../pages/errors/NotFoundPage'));

const CheckoutPage = lazyWithRetry(() => import('../pages/client/CheckoutPage'));
const MyPurchasesPage = lazyWithRetry(() => import('../pages/client/MyPurchasesPage'));
const PurchaseDetailPage = lazyWithRetry(() => import('../pages/client/PurchaseDetailPage'));
const ProfilePage = lazyWithRetry(() => import('../pages/client/ProfilePage'));
const LivePage = lazyWithRetry(() => import('../pages/client/LivePage'));

const AdminLayout = lazyWithRetry(() => import('../components/layout/AdminLayout'));
const AdminDashboardPage = lazyWithRetry(() => import('../pages/admin/AdminDashboardPage'));
const AdminPurchasesPage = lazyWithRetry(() => import('../pages/admin/AdminPurchasesPage'));
const AdminPurchaseDetailPage = lazyWithRetry(() => import('../pages/admin/AdminPurchaseDetailPage'));
const AdminWinnersPage = lazyWithRetry(() => import('../pages/admin/AdminWinnersPage'));
const AdminDrawPage = lazyWithRetry(() => import('../pages/admin/AdminDrawPage'));
const AdminEventsPage = lazyWithRetry(() => import('../pages/admin/AdminEventsPage'));
const AdminCardsPage = lazyWithRetry(() => import('../pages/admin/AdminCardsPage'));
const AdminSeriesPage = lazyWithRetry(() => import('../pages/admin/AdminSeriesPage'));
const AdminSeriesDetailPage = lazyWithRetry(() => import('../pages/admin/AdminSeriesDetailPage'));
const AdminUsersPage = lazyWithRetry(() => import('../pages/admin/AdminUsersPage'));
const AdminAuditPage = lazyWithRetry(() => import('../pages/admin/AdminAuditPage'));
const AdminSettingsPage = lazyWithRetry(() => import('../pages/admin/AdminSettingsPage'));
const AdminPrintPage = lazyWithRetry(() => import('../pages/admin/AdminPrintPage'));

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        {/* Públicas (INVITADO) */}
        <Route path={PATHS.home} element={<HomePage />} />
        <Route path={PATHS.catalog} element={<CatalogPage />} />
        <Route path={PATHS.results} element={<ResultsPage />} />
        <Route path={PATHS.prizes} element={<PrizesPage />} />
        {/* Centro Legal: una sola página con una pestaña (y URL) por documento */}
        {[PATHS.legal, PATHS.terms, PATHS.privacy, PATHS.rules, PATHS.contingencies, PATHS.intellectualProperty, PATHS.age, PATHS.taxes, PATHS.sinpe, PATHS.cookies].map((path) => (
          <Route key={path} path={path} element={<LegalCenterPage />} />
        ))}
        <Route path={PATHS.contact} element={<ContactPage />} />
        <Route path={PATHS.resetPassword} element={<ResetPasswordPage />} />
        <Route path={PATHS.verifyEmail} element={<VerifyEmailPage />} />
        <Route path={PATHS.unauthorized} element={<UnauthorizedPage />} />

        {/* Solo sin sesión */}
        <Route element={<PublicOnlyRoute />}>
          <Route path={PATHS.login} element={<LoginPage />} />
          <Route path={PATHS.forgotPassword} element={<ForgotPasswordPage />} />
        </Route>
        <Route element={<PublicOnlyRoute fallback={() => PATHS.catalog} />}>
          <Route path={PATHS.register} element={<RegisterPage />} />
        </Route>

        {/* CLIENTE (y ADMIN) */}
        <Route element={<PrivateRoute roles={ACCESS.client} />}>
          <Route path={PATHS.checkout} element={<CheckoutPage />} />
          <Route path={PATHS.myPurchases} element={<MyPurchasesPage />} />
          <Route path={PATHS.purchaseDetail} element={<PurchaseDetailPage />} />
          <Route path={PATHS.profile} element={<ProfilePage />} />
        </Route>

        {/* ADMIN */}
        <Route element={<PrivateRoute roles={ACCESS.admin} />}>
          <Route path={PATHS.admin} element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path={PATHS.adminPurchases} element={<AdminPurchasesPage />} />
            <Route path={PATHS.adminPurchaseDetail} element={<AdminPurchaseDetailPage />} />
            <Route path={PATHS.adminWinners} element={<AdminWinnersPage />} />
            <Route path="pagos" element={<Navigate to="/admin/compras" replace />} />
            <Route path={PATHS.adminDraw} element={<AdminDrawPage />} />
            <Route path={PATHS.adminEvents} element={<AdminEventsPage />} />
            <Route path={PATHS.adminCards} element={<AdminCardsPage />} />
            <Route path={PATHS.adminSeries} element={<AdminSeriesPage />} />
            <Route path={PATHS.adminSeriesDetail} element={<AdminSeriesDetailPage />} />
            <Route path={PATHS.adminUsers} element={<AdminUsersPage />} />
            <Route path={PATHS.adminAudit} element={<AdminAuditPage />} />
            <Route path={PATHS.adminSettings} element={<AdminSettingsPage />} />
            <Route path={PATHS.adminPrint} element={<AdminPrintPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Transmisión a pantalla completa (tiene su propio encabezado) */}
      <Route element={<PrivateRoute roles={ACCESS.client} />}>
        <Route path={PATHS.live} element={<LivePage />} />
      </Route>

      {/* Rutas antiguas */}
      <Route path="/jugar" element={<Navigate to={PATHS.live} replace />} />
      <Route path="/reservar" element={<Navigate to={PATHS.catalog} replace />} />
    </Routes>
  );
}
