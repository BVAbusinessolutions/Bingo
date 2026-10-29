import { Suspense, useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BellRing,
  CalendarDays,
  Grid3x3,
  Landmark,
  Layers,
  LayoutDashboard,
  Mic,
  ScrollText,
  ShoppingCart,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { PATHS } from '../../routing/paths';
import { adminApi } from '../../api/endpoints';
import { useSocket } from '../../hooks/useSocket';
import { formatCRC } from '../../lib/format';
import PageLoader from '../ui/PageLoader';
import ErrorBoundary from './ErrorBoundary';

const vibrate = () => {
  try {
    navigator.vibrate?.(150);
  } catch {
    // sin vibración disponible
  }
};

function AdminToast({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 10_000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  return (
    <div role="status" aria-live="polite" className="fixed inset-x-3 bottom-3 z-55 sm:inset-x-auto sm:right-4 sm:w-[26rem]">
      <div className="surface flex items-start gap-3 border-l-8 border-sol-gold p-4">
        <BellRing className="mt-0.5 h-7 w-7 shrink-0 text-amber-500 motion-safe:animate-bounce" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-black text-fg">{toast.title}</p>
          <p className="truncate text-fg-muted">{toast.text}</p>
          <Link to={toast.to} onClick={onClose} className="mt-1 inline-block font-extrabold text-sol-blue underline dark:text-sol-gold">
            Revisar ahora
          </Link>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar aviso"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [pending, setPending] = useState(0);
  const [pendingClaims, setPendingClaims] = useState(0);
  const [toast, setToast] = useState(null);
  const [revision, setRevision] = useState(0); // sube con cada aviso en tiempo real -> las vistas recargan
  const { socket } = useSocket('/admin');

  const reloadEvents = useCallback(
    () =>
      adminApi.events().then((list) => {
        setEvents(list);
        setEventId(
          (id) => id || (list.find((e) => e.status === 'LIVE') ?? list.find((e) => e.status === 'SCHEDULED') ?? list[0])?.id || ''
        );
      }),
    []
  );

  const reloadCounters = useCallback(() => {
    adminApi.reservations('PROOF_SUBMITTED').then((l) => setPending(l.length));
    adminApi.claims().then((l) => setPendingClaims(l.filter((c) => c.status === 'PENDING').length));
  }, []);

  useEffect(() => {
    reloadEvents();
    reloadCounters();
  }, [reloadEvents, reloadCounters]);

  // Avisos en tiempo real: compra nueva, reserva actualizada, bingo reclamado.
  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      setRevision((v) => v + 1);
      reloadCounters();
    };
    const onProof = (r) => {
      setToast({
        title: '🛒 Nueva compra por verificar',
        text: `${r.buyer?.fullName} · ${r.serials.length} cartón(es) · ${formatCRC(r.total)}`,
        to: `compras/${r.id}`,
      });
      vibrate();
      refresh();
    };
    const onClaim = (c) => {
      setToast({ title: '🏆 ¡Bingo reclamado!', text: `${c.player?.name ?? 'Un jugador'} · cartón #${c.serial}`, to: 'ganadores' });
      vibrate();
      refresh();
    };
    socket.on('reservation:proof', onProof);
    socket.on('reservation:updated', refresh);
    socket.on('claim:new', onClaim);
    socket.on('claim:updated', refresh);
    return () => {
      socket.off('reservation:proof', onProof);
      socket.off('reservation:updated', refresh);
      socket.off('claim:new', onClaim);
      socket.off('claim:updated', refresh);
    };
  }, [socket, reloadCounters]);

  const closeToast = useCallback(() => setToast(null), []);

  const tabs = [
    { to: '', end: true, label: 'Panel', Icon: LayoutDashboard },
    { to: PATHS.adminPurchases, label: 'Compras', Icon: ShoppingCart, badge: pending },
    { to: PATHS.adminWinners, label: 'Ganadores', Icon: Trophy, badge: pendingClaims },
    { to: PATHS.adminDraw, label: 'Bingo Master', Icon: Mic },
    { to: PATHS.adminEvents, label: 'Eventos', Icon: CalendarDays },
    { to: PATHS.adminSeries, label: 'Series', Icon: Layers },
    { to: PATHS.adminCards, label: 'Cartones', Icon: Grid3x3 },
    { to: PATHS.adminUsers, label: 'Usuarios', Icon: Users },
    { to: PATHS.adminAudit, label: 'Bitácora', Icon: ScrollText },
    { to: PATHS.adminSettings, label: 'Datos de cobro', Icon: Landmark },
  ];

  const event = events.find((e) => e.id === eventId);

  return (
    <div className="container-page grid min-h-[calc(100dvh-4.5rem)] content-start gap-5 py-6 lg:grid-cols-[15rem_minmax(0,1fr)] print:block print:min-h-0 print:py-0">
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start print:hidden">
        <div className="surface space-y-2 p-4">
          <p className="text-sm font-extrabold uppercase tracking-widest text-sol-red dark:text-sol-gold">Administración</p>
          <label className="block">
            <span className="text-sm font-bold text-fg-muted">Evento</span>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border-2 border-line bg-card px-3 font-bold text-fg"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <nav aria-label="Administración" className="surface flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
          {tabs.map(({ to, end, label, Icon, badge }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-12 shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 font-extrabold transition ${
                  isActive ? 'bg-sol-blue text-white dark:bg-sol-gold dark:text-sol-blue' : 'text-fg-muted hover:bg-muted hover:text-fg'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span
                  className="grid h-6 min-w-6 place-items-center rounded-full bg-sol-red px-1.5 text-sm font-black text-white"
                  aria-label={`${badge} pendientes`}
                >
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<PageLoader />}>
            <Outlet context={{ events, event, eventId, setEventId, reloadEvents, reloadCounters, revision, pending }} />
          </Suspense>
        </ErrorBoundary>
      </div>

      {toast && <AdminToast toast={toast} onClose={closeToast} />}
    </div>
  );
}
