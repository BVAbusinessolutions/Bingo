import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Coins, Hourglass, Ticket } from 'lucide-react';
import { useAdmin } from './AdminLayout';
import { adminApi } from '../../api/endpoints';
import StatusBadge from '../../components/StatusBadge';
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

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat Icon={Ticket} label="Cartones vendidos" value={`${stats.sold} / ${stats.total}`} sub={`${soldPct}% del inventario`} accent="bg-sol-blue/10 text-sol-blue dark:bg-sol-blue-light/25 dark:text-brand" />
        <Stat Icon={Coins} label="Recaudación" value={formatCRC(stats.revenue)} sub={`${formatCRC(event?.price)} por cartón`} accent="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" />
        <Stat Icon={Hourglass} label="Por verificar" value={stats.pendingReview} sub="comprobantes recibidos" accent="bg-sol-gold/25 text-sol-gold-dark" />
        <Stat Icon={Clock} label="Esperando pago" value={stats.awaitingPayment} sub={`${stats.reserved} cartones apartados`} accent="bg-orange-500/15 text-orange-600 dark:text-orange-400" />
      </div>

      {/* Inventario */}
      <section className="surface space-y-2 p-4" aria-label="Inventario de cartones">
        <div className="flex justify-between text-sm">
          <span className="font-bold text-fg">Inventario</span>
          <span className="text-fg-muted">{stats.available} disponibles</span>
        </div>
        <div className="flex h-4 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${stats.sold} vendidos, ${stats.reserved} reservados, ${stats.available} disponibles`}>
          <div className="bg-sol-red" style={{ width: `${(stats.sold / stats.total) * 100}%` }} />
          <div className="bg-orange-400" style={{ width: `${(stats.reserved / stats.total) * 100}%` }} />
          <div className="bg-emerald-500" style={{ width: `${(stats.available / stats.total) * 100}%` }} />
        </div>
        <ul className="flex flex-wrap gap-x-4 text-xs text-fg-muted">
          <li>🟥 Vendidos {stats.sold}</li>
          <li>🟧 Reservados {stats.reserved}</li>
          <li>🟩 Disponibles {stats.available}</li>
          <li className="ml-auto">Balotas cantadas: {stats.called}/90</li>
        </ul>
      </section>

      {/* Cola de verificación */}
      <section className="surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-fg">Pagos por verificar</h2>
          <Link to="pagos" className="flex items-center gap-1 text-sm font-semibold text-sol-blue hover:underline dark:text-sol-gold">
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {queue.length === 0 ? (
          <p className="py-4 text-center text-sm text-fg-muted">No hay comprobantes pendientes. 🎉</p>
        ) : (
          <ul className="divide-y divide-line">
            {queue.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
