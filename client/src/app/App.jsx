import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import ProtectedRoute from '../features/auth/ProtectedRoute';
import { ROLES } from '../features/auth/roles';
import LoginPage from '../features/auth/LoginPage';
import RegisterPage from '../features/auth/RegisterPage';
import HomePage from '../features/home/HomePage';
import CatalogPage from '../features/cards/CatalogPage';
import CheckoutPage from '../features/payments/CheckoutPage';
import MyPurchasesPage from '../features/reservations/MyPurchasesPage';
import LivePage from '../features/player/PlayerDashboard';
import AdminLayout from '../features/admin/AdminLayout';
import AdminDashboard from '../features/admin/AdminDashboard';
import AdminEvents from '../features/admin/AdminEvents';
import AdminCards from '../features/admin/AdminCards';
import AdminPayments from '../features/admin/AdminPayments';
import AdminDrawConsole from '../features/admin/AdminDrawConsole';

const WithHeader = () => (
  <>
    <SiteHeader />
    <Outlet />
  </>
);

const Unauthorized = () => (
  <div className="grid min-h-[60vh] place-items-center p-6 text-center">
    <p className="text-lg font-semibold text-fg">No tienes permisos para ver esta página.</p>
  </div>
);

const { ADMIN, CLIENTE } = ROLES;

export default function App() {
  return (
    <Routes>
      <Route element={<WithHeader />}>
        {/* Rutas públicas (INVITADO) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/cartones" element={<CatalogPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* CLIENTE (y ADMIN) */}
        <Route element={<ProtectedRoute roles={[CLIENTE, ADMIN]} />}>
          <Route path="/reservas/:id" element={<CheckoutPage />} />
          <Route path="/mis-compras" element={<MyPurchasesPage />} />
        </Route>

        {/* ADMIN */}
        <Route element={<ProtectedRoute roles={[ADMIN]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="pagos" element={<AdminPayments />} />
            <Route path="sorteo" element={<AdminDrawConsole />} />
            <Route path="eventos" element={<AdminEvents />} />
            <Route path="cartones" element={<AdminCards />} />
          </Route>
        </Route>
      </Route>

      {/* Transmisión a pantalla completa (tiene su propio encabezado) */}
      <Route element={<ProtectedRoute roles={[CLIENTE, ADMIN]} />}>
        <Route path="/live" element={<LivePage />} />
      </Route>

      {/* Rutas antiguas */}
      <Route path="/jugar" element={<Navigate to="/live" replace />} />
      <Route path="/reservar" element={<Navigate to="/cartones" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
