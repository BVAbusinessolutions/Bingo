import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { reservationsApi } from '../../api/endpoints';
import StatusBadge from '../../components/StatusBadge';
import { formatCRC, formatDate } from '../../lib/format';

export default function MyPurchasesPage() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    reservationsApi.mine().then(setItems).catch(() => setItems([]));
  }, []);

  if (!items) return <Loader2 className="mx-auto mt-20 h-8 w-8 animate-spin text-fg-subtle" />;

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-black text-brand">Mis compras</h1>
      {items.length === 0 && (
        <p className="surface p-6 text-center text-fg-muted">
          Aún no tienes compras. <Link to="/cartones" className="font-semibold text-sol-red hover:underline dark:text-sol-gold">Compra tus cartones</Link>
        </p>
      )}
      {items.map((r) => (
        <Link key={r.id} to={`/reservas/${r.id}`} className="block surface p-4 transition hover:ring-2 hover:ring-sol-gold">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-fg">{r.eventName}</p>
              <p className="text-xs text-fg-muted">{formatDate(r.createdAt)}</p>
            </div>
            <StatusBadge status={r.status} />
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div>
              <p className="text-sm text-fg-muted">Cartones: {r.serials.map((s) => `#${s}`).join(', ')}</p>
              {r.status === 'PENDING' && <p className="mt-1 text-sm font-bold text-sol-blue dark:text-sol-gold">Continuar pago →</p>}
            </div>
            <p className="font-black text-sol-red dark:text-sol-gold">{formatCRC(r.total)}</p>
          </div>
        </Link>
      ))}
    </main>
  );
}
