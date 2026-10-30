import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Coins, Eye, Hourglass, Ticket, TrendingUp, Users } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';
import DonutChart from '../../components/admin/DonutChart';
import { formatCRC, formatDate } from '../../lib/format';

function Stat({ Icon, label, value, sub, accent }) {
  return (
    <div className="surface flex items-center gap-3 p-4">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${accent}`}>
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</p>
        <p className="truncate text-2xl font-black tabular-nums text-fg">{value}</p>
        {sub && <p className="text-xs text-fg-muted">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { event, eventId, revision } = useAdmin();
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    if (!eventId) return;
    adminApi.stats(eventId).then(setStats);
    adminApi.reservations('PROOF_SUBMITTED').then((l) => setQueue(l.filter((r) => r.eventId === eventId).slice(0, 5)));
  }, [eventId, revision]);

  if (!stats) return <div className="surface h-40 animate-pulse" />;

  const soldPct = stats.total ? Math.round((stats.sold / stats.total) * 100) : 0;
  const byMethod = stats.byMethod ?? { SINPE: { orders: 0, amount: 0 }, TRANSFER: { orders: 0, amount: 0 } };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          Icon={Ticket}
          label="Cartones vendidos"
          value={`${stats.sold} / ${stats.total}`}
          sub={`${soldPct}% del inventario`}
          accent="bg-sol-blue/10 text-sol-blue dark:bg-sol-blue-light/25 dark:text-brand"
        />
        <Stat
          Icon={Coins}
          label="Recaudación verificada"
          value={formatCRC(stats.revenue)}
          sub={`${stats.approvedCards} cartones aprobados × ${formatCRC(event?.price)}`}
          accent="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        />
        <Stat
          Icon={Hourglass}
          label="Por verificar"
          value={stats.pendingReview}
          sub="comprobantes recibidos"
          accent="bg-sol-gold/25 text-sol-gold-dark"
        />
        <Stat
          Icon={Clock}
          label="Esperando pago"
          value={stats.awaitingPayment}
          sub={`${stats.reserved} cartones apartados`}
          accent="bg-orange-500/15 text-orange-600 dark:text-orange-400"
        />
      </div>

      {/* Tráfico y conversión (las compras de demostración no cuentan) */}
      <section aria-labelledby="traffic-title" className="space-y-3">
        <h2 id="traffic-title" className="text-sm font-extrabold uppercase tracking-widest text-fg-muted">
          Tráfico y conversión
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            Icon={Eye}
            label="Visitas"
            value={stats.visitsTotal}
            sub={`${stats.visitsWeek} en los últimos 7 días`}
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
          <Stat
            Icon={Hourglass}
            label="Comprobantes pendientes"
            value={stats.pendingReview}
            sub="esperan verificación"
            accent="bg-sol-gold/25 text-sol-gold-dark"
          />
        </div>
      </section>

      {/* Analítica: inventario, cobro por método y conversión (solo compras verificadas por una persona) */}
      <section aria-labelledby="charts-title" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="charts-title" className="text-sm font-extrabold uppercase tracking-widest text-fg-muted">
            Analítica del evento
          </h2>
          <p className="text-sm text-fg-muted">Bolas cantadas: {stats.called}/75</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <DonutChart
            title="Inventario de cartones"
            description={`${stats.total} cartones en el evento`}
            center={{ value: `${soldPct}%`, label: 'vendido' }}
            items={[
              { key: 'sold', label: 'Vendidos', value: stats.sold, color: 'var(--series-1)' },
              { key: 'reserved', label: 'Apartados', value: stats.reserved, color: 'var(--series-2)' },
              { key: 'available', label: 'Disponibles', value: stats.available, color: 'var(--series-3)' },
            ]}
          />
          <DonutChart
            title="Ventas por método de pago"
            description={`${byMethod.SINPE.orders + byMethod.TRANSFER.orders} compras aprobadas`}
            format={formatCRC}
            center={{ value: formatCRC(stats.revenue), label: 'recaudado' }}
            items={[
              { key: 'sinpe', label: 'SINPE Móvil', value: byMethod.SINPE.amount, color: 'var(--series-1)' },
              { key: 'transfer', label: 'Transferencia', value: byMethod.TRANSFER.amount, color: 'var(--series-2)' },
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

      {/* Cola de verificación */}
      <section className="surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-fg">Pagos por verificar</h2>
          <Link to="compras" className="flex items-center gap-1 text-sm font-semibold text-sol-blue hover:underline dark:text-sol-gold">
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {queue.length === 0 ? (
          <p className="py-4 text-center text-sm text-fg-muted">No hay comprobantes pendientes. 🎉</p>
        ) : (
          <ul className="divide-y divide-line">
            {queue.map((r) => (
              <li key={r.id}>
                <Link
                  to={`compras/${r.id}`}
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
    </div>
  );
}
