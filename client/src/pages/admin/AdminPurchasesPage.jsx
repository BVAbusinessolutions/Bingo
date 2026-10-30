import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Download, HandCoins, RefreshCw, Search } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi } from '../../api/endpoints';
import { ProofThumb } from '../../components/admin/AdminProof';
import ManualSaleDialog from '../../components/admin/ManualSaleDialog';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import StatusBadge from '../../components/ui/StatusBadge';
import PageLoader from '../../components/ui/PageLoader';
import { errorMessage, formatCRC, formatDate } from '../../lib/format';

const FILTERS = [
  ['PROOF_SUBMITTED', 'Por verificar'],
  ['APPROVED', 'Aprobadas'],
  ['PENDING', 'Sin pagar aún'],
  ['REJECTED', 'Rechazadas'],
  ['REFUNDED', 'Reembolsadas'],
  ['', 'Todas'],
];

const normalize = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Busca por nombre, cédula, teléfono, correo, n.º de comprobante o número de cartón. */
const matches = (r, q) =>
  !q ||
  normalize([r.buyer?.fullName, r.buyer?.nationalId, r.buyer?.phone, r.buyer?.email, r.reference, ...r.serials].join(' ')).includes(q);

export default function AdminPurchasesPage() {
  const { revision, eventId, event, reloadCounters } = useAdmin();
  const [selling, setSelling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('PROOF_SUBMITTED');
  const [items, setItems] = useState(null);
  const [query, setQuery] = useState('');

  const load = useCallback(() => adminApi.reservations(status).then(setItems), [status]);

  useEffect(() => {
    load();
  }, [load, revision]);

  /** Descarga el CSV con los filtros actuales (abre en Excel). */
  const exportCsv = async () => {
    setExporting(true);
    setError('');
    try {
      const blob = await adminApi.exportReservations({ status: status || undefined, eventId: eventId || undefined });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compras-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const q = normalize(query.trim());
  const visible = useMemo(() => (items ?? []).filter((r) => (!eventId || r.eventId === eventId) && matches(r, q)), [items, eventId, q]);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-brand">Compras</h1>
          <p className="text-lg text-fg-muted">{event?.name ?? 'Todas las compras'} · revisa los comprobantes y aprueba los pagos.</p>
        </div>
        {/* Acciones y filtros con la misma medida: píldoras de 44 px, mismo radio y espaciado; en celular
            las acciones ocupan columnas iguales y los filtros se acomodan en filas ordenadas. */}
        <div className="flex w-full gap-2 sm:w-auto">
          {event && ['SCHEDULED', 'LIVE'].includes(event.status) && (
            <Button variant="gold" icon={HandCoins} onClick={() => setSelling(true)} className="h-11 min-h-11! flex-1 rounded-full! px-4 text-sm sm:flex-none sm:text-base">
              Venta manual
            </Button>
          )}
          <Button variant="outline" icon={Download} loading={exporting} onClick={exportCsv} className="h-11 min-h-11! flex-1 rounded-full! px-4 text-sm sm:flex-none sm:text-base">
            Exportar a Excel
          </Button>
          <button
            type="button"
            onClick={load}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-line bg-card text-fg transition hover:border-sol-blue active:scale-95 dark:hover:border-sol-gold"
            aria-label="Actualizar lista"
          >
            <RefreshCw className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
          {FILTERS.map(([s, label]) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s);
                setItems(null);
              }}
              aria-pressed={status === s}
              className={`inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full border-2 px-4 text-sm font-extrabold transition active:scale-95 sm:text-base ${
                status === s
                  ? 'border-sol-blue bg-sol-blue text-white dark:border-sol-gold dark:bg-sol-gold dark:text-sol-blue'
                  : 'border-line bg-card text-fg-muted hover:border-sol-blue hover:text-fg dark:hover:border-sol-gold'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative lg:ml-auto lg:w-80">
          <span className="sr-only">Buscar compra</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre, cédula, comprobante o cartón"
            className="h-11 w-full rounded-full border-2 border-line bg-card pl-10 pr-4 text-fg outline-none focus:border-sol-blue dark:focus:border-sol-gold"
          />
        </label>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!items ? (
        <PageLoader />
      ) : visible.length === 0 ? (
        <p className="surface p-10 text-center text-lg text-fg-muted">No hay compras en este estado.</p>
      ) : (
        <ul className="grid gap-3">
          {visible.map((r) => (
            <li key={r.id}>
              <Link to={r.id} className="surface flex items-center gap-4 p-4 transition hover:ring-2 hover:ring-sol-gold">
                <ProofThumb reservationId={r.id} hasProof={r.hasProof} />
                <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-fg">{r.buyer?.fullName ?? 'Sin datos todavía'}</p>
                    <p className="truncate text-fg-muted">
                      {r.buyer ? `Céd. ${r.buyer.nationalId} · ${r.buyer.phone}` : formatDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-fg">{r.serials.map((s) => `#${s}`).join(', ')}</p>
                    <p className="truncate text-fg-muted">{r.reference ? `Comprobante ${r.reference}` : 'Sin comprobante'}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                    <span className="text-xl font-black tabular-nums text-fg">{formatCRC(r.total)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 shrink-0 text-fg-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {selling && (
        <ManualSaleDialog
          event={event}
          onClose={() => setSelling(false)}
          onDone={() => {
            setSelling(false);
            setStatus('APPROVED');
            load();
            reloadCounters();
          }}
        />
      )}
    </section>
  );
}
