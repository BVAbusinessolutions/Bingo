import { Suspense, useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { BellRing, CalendarDays, CreditCard, Grid3x3, LayoutDashboard, Mic, X } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import { useSocket } from '../../hooks/useSocket';
import { formatCRC } from '../../lib/format';
import PageLoader from '../ui/PageLoader';

export default function AdminLayout() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [pending, setPending] = useState(0);
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

  const reloadPending = useCallback(() => adminApi.reservations('PROOF_SUBMITTED').then((l) => setPending(l.length)), []);

  useEffect(() => {
    reloadEvents();
    reloadPending();
  }, [reloadEvents, reloadPending]);

  // Notificaciones en tiempo real: nuevo comprobante / reserva actualizada.
  useEffect(() => {
    if (!socket) return;
    const onProof = (r) => {
      setToast(r);
      setRevision((v) => v + 1);
      reloadPending();
      try {
        navigator.vibrate?.(150);
      } catch {
        // sin vibración disponible
      }
    };
    const onUpdated = () => {
      setRevision((v) => v + 1);
      reloadPending();
    };
    socket.on('reservation:proof', onProof);
    socket.on('reservation:updated', onUpdated);
    return () => {
      socket.off('reservation:proof', onProof);
      socket.off('reservation:updated', onUpdated);
    };
  }, [socket, reloadPending]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(t);
  }, [toast]);

  const tabs = [
    { to: '', end: true, label: 'Panel', Icon: LayoutDashboard },
    { to: 'pagos', label: 'Pagos', Icon: CreditCard, badge: pending },
    { to: 'sorteo', label: 'Bingo Master', Icon: Mic },
    { to: 'eventos', label: 'Eventos', Icon: CalendarDays },
    { to: 'cartones', label: 'Cartones', Icon: Grid3x3 },
  ];

  const event = events.find((e) => e.id === eventId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-black text-brand">Administración</h1>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-fg-muted">Evento:</span>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="rounded-lg border border-line bg-card px-3 py-2 text-fg"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav aria-label="Administración" className="surface mb-5 flex gap-1 overflow-x-auto p-1">
        {tabs.map(({ to, end, label, Icon, badge }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold ${
                isActive ? 'bg-sol-blue text-white dark:bg-sol-gold dark:text-sol-blue' : 'text-fg-muted hover:bg-muted'
              }`
            }
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
            {badge > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sol-red px-1 text-[11px] font-black text-white" aria-label={`${badge} pendientes`}>
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <Suspense fallback={<PageLoader />}>
        <Outlet context={{ events, event, eventId, setEventId, reloadEvents, revision, pending }} />
      </Suspense>

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-4 right-4 left-4 z-50 sm:left-auto sm:w-96">
          <div className="surface flex items-start gap-3 border-l-8 border-sol-gold p-4">
            <BellRing className="mt-0.5 h-6 w-6 shrink-0 animate-bounce text-sol-gold-dark" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-black text-fg">Nuevo comprobante de pago</p>
              <p className="truncate text-sm text-fg-muted">
                {toast.buyer?.fullName} · {toast.serials.map((s) => `#${s}`).join(', ')} · {formatCRC(toast.total)}
              </p>
              <Link to="pagos" onClick={() => setToast(null)} className="mt-1 inline-block text-sm font-bold text-sol-blue underline dark:text-sol-gold">
                Revisar ahora
              </Link>
            </div>
            <button onClick={() => setToast(null)} aria-label="Cerrar aviso" className="rounded-full p-1 text-fg-muted hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
