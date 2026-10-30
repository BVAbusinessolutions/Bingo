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
import GlassSelect from '../ui/GlassSelect';
import ErrorBoundary from './ErrorBoundary';
import BingoAlert from '../admin/BingoAlert';
import AdminTopBar from './AdminTopBar';
import { playAdminAlert } from '../../lib/sound';
import { useHashScroll } from '../../hooks/useHashScroll';

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
  const [bingoClaims, setBingoClaims] = useState([]); // reclamos de ¡Bingo! aún no vistos (ventana emergente)
  const [revision, setRevision] = useState(0); // sube con cada aviso en tiempo real -> las vistas recargan
  const { socket } = useSocket('/admin');
  useHashScroll(); // cada sección del panel empieza arriba

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
    // ¡Bingo!: ventana emergente con sonido (no un simple aviso) para que nadie lo pase por alto.
    const onClaim = (c) => {
      setBingoClaims((list) => (list.some((x) => x.id === c.id) ? list : [...list, c]));
      playAdminAlert();
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
  const closeBingo = useCallback(() => setBingoClaims([]), []);

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

  // Shell propio y aislado del sitio público: cabecera de gestión, barra lateral y contenido; sin pie de página.
  return (
    <div className="min-h-screen">
      <a href="#contenido-admin" className="skip-link">
        Saltar al contenido
      </a>
      <AdminTopBar />
      <div className="container-page grid min-h-[calc(100dvh-4rem)] content-start gap-5 py-6 lg:grid-cols-[15rem_minmax(0,1fr)] print:block print:min-h-0 print:py-0">
        {/* min-w-0: la barra de pestañas con scroll horizontal no debe ensanchar la columna (desbordaba en celular). */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-22 lg:self-start print:hidden">
          <div className="surface space-y-2 p-4">
            <p className="text-sm font-extrabold uppercase tracking-widest text-sol-red dark:text-sol-gold">Administración</p>
            <GlassSelect
              label="Evento"
              value={eventId}
              onChange={setEventId}
              options={events.map((e) => ({ value: e.id, label: e.name }))}
            />
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

        <div id="contenido-admin" tabIndex={-1} className="min-w-0 outline-none">
          <ErrorBoundary resetKey={pathname}>
            <Suspense fallback={<PageLoader />}>
              <Outlet context={{ events, event, eventId, setEventId, reloadEvents, reloadCounters, revision, pending }} />
            </Suspense>
          </ErrorBoundary>
        </div>

        {toast && <AdminToast toast={toast} onClose={closeToast} />}
        {bingoClaims.length > 0 && <BingoAlert claims={bingoClaims} onClose={closeBingo} />}
      </div>
    </div>
  );
}
