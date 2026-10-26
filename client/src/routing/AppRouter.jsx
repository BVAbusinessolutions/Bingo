import { lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout';
import { ACCESS, PrivateRoute, PublicOnlyRoute } from './private-routes';
import { PATHS } from './paths';

// Cada página se descarga solo cuando se visita (el panel admin no pesa al jugador).
const HomePage = lazy(() => import('../pages/public/HomePage'));
const CatalogPage = lazy(() => import('../pages/public/CatalogPage'));
const ResultsPage = lazy(() => import('../pages/public/ResultsPage'));
const TermsPage = lazy(() => import('../pages/public/TermsPage'));
const PrivacyPage = lazy(() => import('../pages/public/PrivacyPage'));
const ContactPage = lazy(() => import('../pages/public/ContactPage'));
const LoginPage = lazy(() => import('../pages/public/LoginPage'));
const RegisterPage = lazy(() => import('../pages/public/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../pages/public/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/public/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('../pages/public/VerifyEmailPage'));
const UnauthorizedPage = lazy(() => import('../pages/errors/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('../pages/errors/NotFoundPage'));

const CheckoutPage = lazy(() => import('../pages/client/CheckoutPage'));
const MyPurchasesPage = lazy(() => import('../pages/client/MyPurchasesPage'));
const PurchaseDetailPage = lazy(() => import('../pages/client/PurchaseDetailPage'));
const ProfilePage = lazy(() => import('../pages/client/ProfilePage'));
const LivePage = lazy(() => import('../pages/client/LivePage'));

const AdminLayout = lazy(() => import('../components/layout/AdminLayout'));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));
const AdminPurchasesPage = lazy(() => import('../pages/admin/AdminPurchasesPage'));
const AdminPurchaseDetailPage = lazy(() => import('../pages/admin/AdminPurchaseDetailPage'));
const AdminWinnersPage = lazy(() => import('../pages/admin/AdminWinnersPage'));
const AdminDrawPage = lazy(() => import('../pages/admin/AdminDrawPage'));
const AdminEventsPage = lazy(() => import('../pages/admin/AdminEventsPage'));
const AdminCardsPage = lazy(() => import('../pages/admin/AdminCardsPage'));
const AdminSeriesPage = lazy(() => import('../pages/admin/AdminSeriesPage'));
const AdminSeriesDetailPage = lazy(() => import('../pages/admin/AdminSeriesDetailPage'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminAuditPage = lazy(() => import('../pages/admin/AdminAuditPage'));
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage'));
const AdminPrintPage = lazy(() => import('../pages/admin/AdminPrintPage'));

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        {/* Públicas (INVITADO) */}
        <Route path={PATHS.home} element={<HomePage />} />
        <Route path={PATHS.catalog} element={<CatalogPage />} />
        <Route path={PATHS.results} element={<ResultsPage />} />
        <Route path={PATHS.terms} element={<TermsPage />} />
        <Route path={PATHS.privacy} element={<PrivacyPage />} />
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
