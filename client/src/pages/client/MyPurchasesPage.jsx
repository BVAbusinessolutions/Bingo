import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Ticket } from 'lucide-react';
import { reservationsApi } from '../../api/endpoints';
import { useNotifications } from '../../context/NotificationsContext';
import PageHeader from '../../components/ui/PageHeader';
import PageLoader from '../../components/ui/PageLoader';
import StatusBadge from '../../components/ui/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import { formatCRC, formatDate } from '../../lib/format';
import { PATHS, toPath } from '../../routing/paths';

export default function MyPurchasesPage() {
  const { revision } = useNotifications();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    reservationsApi
      .mine()
      .then(setItems)
      .catch(() => setError(true));
  }, [revision]);

  return (
    <main className="container-page py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          eyebrow="Tu historial"
          title="Mis compras"
          description="Toca una compra para ver sus cartones, imprimirlos o revisar el pago."
          actions={<Button to={PATHS.catalog} variant="gold" icon={Ticket}>Comprar más</Button>}
        />

        {error && <Alert tone="error">No pudimos cargar tus compras. Recarga la página.</Alert>}
        {!items && !error && <PageLoader />}
        {items?.length === 0 && (
          <Alert title="Aún no tienes compras" action={<Button to={PATHS.catalog} variant="gold">Elegir cartones</Button>}>
            Cuando compres cartones aparecerán aquí.
          </Alert>
        )}

        <ul className="grid gap-3">
          {items?.map((r) => (
            <li key={r.id}>
              <Link
                to={toPath(PATHS.purchaseDetail, { id: r.id })}
                className="surface flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-sol-gold sm:p-5"
              >
                <span className="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sol-red text-xl font-black text-white sm:grid" aria-hidden>
                  {r.serials.length}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-black text-fg">{r.eventName}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-fg-muted">{formatDate(r.createdAt)}</p>
                  <p className="truncate text-fg-muted">
                    {r.serials.length} cartón(es): {r.serials.map((s) => `#${s}`).join(', ')}
                  </p>
                  {r.status === 'PENDING' && <p className="mt-1 font-extrabold text-sol-red dark:text-sol-gold">Falta completar el pago</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-xl font-black text-sol-red dark:text-sol-gold">{formatCRC(r.total)}</p>
                  <ChevronRight className="h-6 w-6 text-fg-subtle" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
