import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Clock,
  Coins,
  Download,
  ExternalLink,
  Eye,
  Hourglass,
  Mic,
  MonitorPlay,
  ShoppingCart,
  Ticket,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Wifi,
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';
import DonutChart from '../../components/admin/DonutChart';
import VisitsChart from '../../components/admin/VisitsChart';
import { PatternPreview } from '../../components/bingo/PatternPreview';
import { PATTERNS } from '../../constants/patterns';
import { ACTIONS } from '../../constants/auditActions';
import { PATHS } from '../../routing/paths';
import { errorMessage, formatCRC, formatDate } from '../../lib/format';

const LIVE_POLL_MS = 30_000; // respaldo si el socket se corta: las cifras nunca quedan congeladas

function Stat({ Icon, label, value, sub, accent, pulseKey }) {
  return (
    <div className="surface flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${accent}`}>
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
        {/* key: la cifra "late" cuando cambia en vivo */}
        <p key={pulseKey} className="truncate text-2xl font-black tabular-nums text-fg motion-safe:animate-pop">
          {value}
        </p>
        {sub && <p className="text-xs text-fg-muted">{sub}</p>}
      </div>
    </div>
  );
}

/** Cifra en vivo grande (presencia y visitas de hoy), con punto verde que late. */
function LiveTile({ Icon, label, value, hint }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
        <Icon className="h-4 w-4" aria-hidden /> {label}
      </div>
      <p key={value} className="mt-1 text-4xl font-black tabular-nums text-white motion-safe:animate-pop">
        {value}
      </p>
      <p className="text-xs text-white/65">{hint}</p>
    </div>
  );
}

function QuickAction({ to, onClick, Icon, label, badge, busy }) {
  const cls =
    'group relative flex min-h-20 flex-col items-start justify-between gap-2 rounded-2xl bg-card p-3.5 text-left font-extrabold text-fg ring-1 ring-line transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-sol-blue dark:hover:ring-sol-gold disabled:opacity-60';
  const content = (
    <>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-sol-blue/10 text-sol-blue transition group-hover:scale-110 dark:bg-sol-gold/15 dark:text-sol-gold">
        <Icon className={`h-5 w-5 ${busy ? 'motion-safe:animate-bounce' : ''}`} aria-hidden />
      </span>
      <span className="text-sm leading-tight">{label}</span>
      {badge > 0 && (
        <span className="absolute right-2.5 top-2.5 grid h-6 min-w-6 place-items-center rounded-full bg-sol-red px-1.5 text-xs font-black text-white">
          {badge}
        </span>
      )}
    </>
  );
  return to ? (
    <Link to={to} className={cls}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} disabled={busy} className={cls}>
      {content}
    </button>
  );
}

export default function AdminDashboard() {
  const { event, eventId, revision, socket, connected, pending, pendingClaims } = useAdmin();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [live, setLive] = useState(null); // { online, playersLive, visitsToday, at }
  const [queue, setQueue] = useState([]);
  const [activity, setActivity] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    if (!eventId) return;
    adminApi.stats(eventId).then((s) => {
      setStats(s);
      setLive({ online: s.online, playersLive: s.playersLive, visitsToday: s.visitsToday, at: s.at });
    });
    adminApi.reservations('PROOF_SUBMITTED').then((l) => setQueue(l.filter((r) => r.eventId === eventId).slice(0, 5)));
    adminApi
      .audit({ page: 1 })
      .then((d) => setActivity(d.entries.slice(0, 7)))
      .catch(() => {});
  }, [eventId, revision]);

  // Presencia y visitas de hoy en tiempo real (Socket.io) + consulta de respaldo cada 30 s.
  // La barra de hoy del gráfico sigue a la cifra en vivo, sin recargar todas las estadísticas.
  const applyLive = useCallback((m) => {
    setLive(m);
    setStats((s) =>
      s?.visitsByDay?.length
        ? {
            ...s,
            visitsTotal: s.visitsTotal + Math.max(0, m.visitsToday - s.visitsByDay.at(-1).visits),
            visitsByDay: s.visitsByDay.map((d, i, all) => (i === all.length - 1 ? { ...d, visits: Math.max(d.visits, m.visitsToday) } : d)),
          }
        : s
    );
  }, []);
  const refreshLive = useCallback(() => {
    adminApi
      .liveMetrics()
      .then(applyLive)
      .catch(() => {});
  }, [applyLive]);
  useEffect(() => {
    const id = setInterval(refreshLive, LIVE_POLL_MS);
    if (!socket) return () => clearInterval(id);
    socket.on('metrics:update', applyLive);
    return () => {
      clearInterval(id);
      socket.off('metrics:update', applyLive);
    };
  }, [socket, refreshLive, applyLive]);

  const exportCsv = async () => {
    setExporting(true);
    setExportError('');
    try {
      const blob = await adminApi.exportReservations({ eventId: eventId || undefined });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compras-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  if (!stats) return <div className="surface h-40 animate-pulse" />;

  const soldPct = stats.total ? Math.round((stats.sold / stats.total) * 100) : 0;
  const none = { orders: 0, amount: 0 };
  const byMethod = { SINPE: none, TRANSFER: none, CASH: none, ...stats.byMethod };
  const pattern = event?.pattern ?? 'FULL';
  const updated = live?.at
    ? new Date(live.at).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className="space-y-6">
      {/* Encabezado en vivo: evento, ronda y presencia real */}
      <section className="stage relative overflow-hidden rounded-3xl p-5 ring-1 ring-white/10 sm:p-6" aria-labelledby="dash-title">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sol-gold/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/70">Hola, {user?.name?.split(' ')[0] ?? 'equipo'}</p>
            <h1 id="dash-title" className="truncate font-display text-2xl font-bold text-white sm:text-3xl">
              {event?.name ?? 'Panel'}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/80">
              {event && <StatusBadge status={event.status} />}
              <span className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3">
                <PatternPreview pattern={pattern} active className="h-7 w-7" />
                Ronda {event?.round ?? 1} · {PATTERNS[pattern]?.label}
              </span>
              {event?.startsAt && <span>{formatDate(event.startsAt)}</span>}
            </div>
          </div>
          <p className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white" role="status">
            <span
              className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-400 motion-safe:animate-pulse' : 'bg-slate-400'}`}
              aria-hidden
            />
            {connected ? 'Datos en vivo' : 'Reconectando…'}
            {updated && <span className="font-medium text-white/65">· {updated}</span>}
          </p>
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          <LiveTile Icon={Wifi} label="En el sitio ahora" value={live?.online ?? 0} hint="pestañas abiertas en este momento" />
          <LiveTile
            Icon={MonitorPlay}
            label="Jugando en vivo"
            value={live?.playersLive ?? 0}
            hint="conectados a la transmisión y sus cartones"
          />
          <LiveTile Icon={Eye} label="Visitas de hoy" value={live?.visitsToday ?? 0} hint="sesiones nuevas desde la medianoche" />
        </div>
      </section>

      {/* Accesos rápidos */}
      <section aria-labelledby="quick-title" className="space-y-3">
        <h2 id="quick-title" className="text-sm font-extrabold uppercase tracking-widest text-fg-muted">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <QuickAction to={PATHS.adminDraw} Icon={Mic} label="Cantar bolas" />
          <QuickAction to={PATHS.adminPurchases} Icon={ShoppingCart} label="Verificar pagos" badge={pending} />
          <QuickAction to={PATHS.adminWinners} Icon={Trophy} label="Confirmar ganadores" badge={pendingClaims} />
          <QuickAction to={PATHS.adminFinance} Icon={Wallet} label="Finanzas y comprobantes" />
          <QuickAction
            onClick={exportCsv}
            busy={exporting}
            Icon={Download}
            label={exporting ? 'Exportando…' : 'Exportar compras (Excel)'}
          />
          <QuickAction to={PATHS.home} Icon={ExternalLink} label="Ver sitio público" />
        </div>
        {exportError && <p className="text-sm font-semibold text-sol-red">{exportError}</p>}
      </section>

      {/* Ventas */}
      <section aria-labelledby="sales-title" className="space-y-3">
        <h2 id="sales-title" className="text-sm font-extrabold uppercase tracking-widest text-fg-muted">
          Ventas
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            Icon={Ticket}
            label="Cartones vendidos"
            value={`${stats.sold} / ${stats.total}`}
            sub={`${stats.soldWeb ?? 0} virtuales · ${stats.soldSalon ?? 0} físicos · ${soldPct}% del inventario`}
            pulseKey={stats.sold}
            accent="bg-sol-blue/10 text-sol-blue dark:bg-sol-blue-light/25 dark:text-brand"
          />
          <Stat
            Icon={Coins}
            label="Recaudación verificada"
            value={formatCRC(stats.revenue)}
            sub={`${stats.approvedCards} cartones aprobados × ${formatCRC(event?.price)}`}
            pulseKey={stats.revenue}
            accent="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          />
          <Stat
            Icon={Hourglass}
            label="Por verificar"
            value={stats.pendingReview}
            sub="comprobantes recibidos"
            pulseKey={stats.pendingReview}
            accent="bg-sol-gold/25 text-sol-gold-dark"
          />
          <Stat
            Icon={Clock}
            label="Esperando pago"
            value={stats.awaitingPayment}
            sub={`${stats.reserved} cartones apartados`}
            pulseKey={stats.awaitingPayment}
            accent="bg-orange-500/15 text-orange-600 dark:text-orange-400"
          />
        </div>
      </section>

      {/* Tráfico real */}
      <section aria-labelledby="traffic-title" className="space-y-3">
        <h2 id="traffic-title" className="text-sm font-extrabold uppercase tracking-widest text-fg-muted">
          Tráfico y conversión
        </h2>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <VisitsChart days={stats.visitsByDay ?? []} />
          <div className="grid content-start gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <Stat
              Icon={Eye}
              label="Visitas totales"
              value={stats.visitsTotal}
              sub={`${stats.visitsWeek} en los últimos 7 días`}
              pulseKey={stats.visitsTotal}
              accent="bg-sky-500/15 text-sky-600 dark:text-sky-400"
            />
            <Stat
              Icon={Users}
              label="Usuarios activos"
              value={stats.activeUsers}
              sub={`${stats.verifiedUsers} con correo verificado`}
              accent="bg-violet-500/15 text-violet-600 dark:text-violet-400"
            />
            <Stat
              Icon={TrendingUp}
              label="Conversión de compras"
              value={`${stats.conversionPct}%`}
              sub={`${stats.approvedOrders} pagadas de ${stats.startedOrders} iniciadas`}
              accent="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </div>
      </section>

      {/* Analítica */}
      <section aria-labelledby="charts-title" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="charts-title" className="text-sm font-extrabold uppercase tracking-widest text-fg-muted">
            Analítica del evento
          </h2>
          <p className="text-sm text-fg-muted">
            Ronda {stats.round ?? 1} · bolas cantadas: {stats.called}/75
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <DonutChart
            title="Inventario de cartones"
            description={`${stats.total} cartones · conteo real de virtuales y físicos`}
            center={{ value: `${soldPct}%`, label: 'vendido' }}
            items={[
              { key: 'web', label: 'Vendidos virtuales', value: stats.soldWeb ?? 0, color: 'var(--series-1)' },
              { key: 'salon', label: 'Vendidos físicos', value: stats.soldSalon ?? 0, color: 'var(--series-4)' },
              { key: 'reserved', label: 'Apartados', value: stats.reserved, color: 'var(--series-2)' },
              { key: 'available', label: 'Disponibles', value: stats.available, color: 'var(--series-3)' },
              // Vendidos sin una compra verificada (demostración): solo aparecen si existen.
              ...(stats.soldUnverified
                ? [{ key: 'demo', label: 'Sin compra verificada', value: stats.soldUnverified, color: 'var(--viz-track)' }]
                : []),
            ]}
          />
          <DonutChart
            title="Ventas por método de pago"
            description={`${byMethod.SINPE.orders + byMethod.TRANSFER.orders + byMethod.CASH.orders} compras verificadas`}
            format={formatCRC}
            center={{ value: formatCRC(stats.revenue), label: 'recaudado' }}
            items={[
              { key: 'sinpe', label: 'SINPE Móvil', value: byMethod.SINPE.amount, color: 'var(--series-1)' },
              { key: 'transfer', label: 'Transferencia', value: byMethod.TRANSFER.amount, color: 'var(--series-2)' },
              { key: 'cash', label: 'Efectivo (salón)', value: byMethod.CASH.amount, color: 'var(--series-3)' },
            ]}
          />
          <DonutChart
            title="Conversión de compras"
            description={`${stats.startedOrders} compras iniciadas`}
            center={{ value: `${stats.conversionPct}%`, label: 'aprobadas' }}
            items={[
              { key: 'approved', label: 'Aprobadas', value: stats.approvedOrders, color: 'var(--series-1)' },
              {
                key: 'other',
                label: 'No concretadas o en curso',
                value: Math.max(stats.startedOrders - stats.approvedOrders, 0),
                color: 'var(--series-2)',
              },
            ]}
          />
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-2">
        {/* Cola de verificación */}
        <section className="surface p-4" aria-labelledby="queue-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="queue-title" className="font-bold text-fg">
              Pagos por verificar
            </h2>
            <Link
              to={PATHS.adminPurchases}
              className="flex items-center gap-1 text-sm font-semibold text-sol-blue hover:underline dark:text-sol-gold"
            >
              Ver todos <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {queue.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">No hay comprobantes pendientes.</p>
          ) : (
            <ul className="divide-y divide-line">
              {queue.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`${PATHS.adminPurchases}/${r.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-muted"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-fg">{r.buyer?.fullName}</p>
                      <p className="truncate text-xs text-fg-muted">
                        {r.serials.map((s) => `#${s}`).join(', ')} · {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-black tabular-nums text-fg">{formatCRC(r.total)}</span>
                      <StatusBadge status={r.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Actividad reciente (bitácora real, se actualiza con cada aviso en vivo) */}
        <section className="surface p-4" aria-labelledby="activity-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="activity-title" className="flex items-center gap-2 font-bold text-fg">
              <Activity className="h-5 w-5 text-brand" aria-hidden /> Actividad reciente
            </h2>
            <Link
              to={PATHS.adminAudit}
              className="flex items-center gap-1 text-sm font-semibold text-sol-blue hover:underline dark:text-sol-gold"
            >
              Bitácora <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-fg-muted">Sin actividad registrada todavía.</p>
          ) : (
            <ol className="relative space-y-3 border-l-2 border-line pl-4">
              {activity.map((a) => (
                <li key={a.id} className="relative">
                  <span
                    className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-sol-blue ring-4 ring-card dark:bg-sol-gold"
                    aria-hidden
                  />
                  <p className="text-sm font-bold text-fg">{ACTIONS[a.action] ?? a.action}</p>
                  <p className="text-xs text-fg-muted">
                    {a.actor?.name ?? 'Sistema'} · {formatDate(a.createdAt)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
