import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileWarning,
  Globe,
  HandCoins,
  Hourglass,
  ListChecks,
  RefreshCw,
  RotateCcw,
  Search,
  Store,
  XCircle,
} from 'lucide-react';
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
  ['PROOF_SUBMITTED', 'Por verificar', Hourglass],
  ['APPROVED', 'Aprobadas', CheckCircle2],
  ['PENDING', 'Sin pagar aún', Clock],
  ['REJECTED', 'Rechazadas', XCircle],
  ['REFUNDED', 'Reembolsadas', RotateCcw],
  ['', 'Todas', ListChecks],
];
// Virtual = compra en línea; físico = venta registrada en el salón (venta manual).
const CHANNELS = [
  ['', 'Todos los canales', ListChecks],
  ['WEB', 'Virtuales', Globe],
  ['MANUAL', 'Físicas (salón)', Store],
];
const PILL =
  'inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border-2 px-4 text-sm font-extrabold transition active:scale-95';
const pillTone = (on) =>
  on
    ? 'border-sol-blue bg-sol-blue text-white shadow-md dark:border-sol-gold dark:bg-sol-gold dark:text-sol-blue'
    : 'border-line bg-card text-fg-muted hover:border-sol-blue hover:text-fg dark:hover:border-sol-gold';

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
  const [channel, setChannel] = useState('');

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
  const visible = useMemo(
    () => (items ?? []).filter((r) => (!eventId || r.eventId === eventId) && (!channel || r.channel === channel) && matches(r, q)),
    [items, eventId, channel, q]
  );
  const visibleTotal = visible.reduce((sum, r) => sum + r.total, 0);
  const visibleCards = visible.reduce((sum, r) => sum + r.serials.length, 0);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-brand">Compras</h1>
          <p className="text-lg text-fg-muted">{event?.name ?? 'Todas las compras'} · revisa los comprobantes y aprueba los pagos.</p>
        </div>
        {/* Acciones y filtros con la misma medida: píldoras de 44 px, mismo radio y espaciado; en celular
            las acciones ocupan columnas iguales y los filtros se acomodan en filas ordenadas. */}
        <div className="grid w-full grid-cols-[1fr_1fr_auto] gap-2 sm:flex sm:w-auto [&>*]:whitespace-nowrap">
          {event && ['SCHEDULED', 'LIVE'].includes(event.status) && (
            <Button
              variant="gold"
              icon={HandCoins}
              onClick={() => setSelling(true)}
              className="h-11 min-h-11! rounded-full! px-3! text-sm sm:px-4! sm:text-base"
            >
              Venta en salón
            </Button>
          )}
          <Button
            variant="outline"
            icon={Download}
            loading={exporting}
            onClick={exportCsv}
            className="h-11 min-h-11! rounded-full! px-3! text-sm sm:px-4! sm:text-base"
          >
            <span className="sm:hidden">Excel</span>
            <span className="hidden sm:inline">Exportar a Excel</span>
          </Button>
          <button
            type="button"
            onClick={load}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-line bg-card px-3 font-bold text-fg transition hover:border-sol-blue active:scale-95 dark:hover:border-sol-gold"
            aria-label="Actualizar lista"
          >
            <RefreshCw className="h-5 w-5" aria-hidden />
            <span className="hidden lg:inline">Actualizar</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div
          className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
          role="group"
          aria-label="Filtrar por estado"
        >
          {FILTERS.map(([s, label, Icon]) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s);
                setItems(null);
              }}
              aria-pressed={status === s}
              className={`${PILL} ${pillTone(status === s)}`}
            >
              <Icon className="h-4 w-4" aria-hidden />
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

      {/* Canal y resumen de lo que se está viendo (conteo real de cartones y dinero) */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="-mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
          role="group"
          aria-label="Filtrar por canal"
        >
          {CHANNELS.map(([c, label, Icon]) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              aria-pressed={channel === c}
              className={`${PILL} ${pillTone(channel === c)}`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>
        {items && (
          <p className="text-sm text-fg-muted" aria-live="polite">
            <b className="text-fg">{visible.length}</b> compras · <b className="text-fg">{visibleCards}</b> cartones ·{' '}
            <b className="tabular-nums text-fg">{formatCRC(visibleTotal)}</b>
          </p>
        )}
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
                    <p className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-lg font-black text-fg">{r.buyer?.fullName ?? 'Sin datos todavía'}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black ${
                          r.channel === 'MANUAL' ? 'bg-navy-950 text-accent' : 'bg-sol-blue/10 text-sol-blue dark:text-brand'
                        }`}
                      >
                        {r.channel === 'MANUAL' ? 'Físico' : 'Virtual'}
                      </span>
                    </p>
                    <p className="truncate text-fg-muted">
                      {r.buyer ? `Céd. ${r.buyer.nationalId} · ${r.buyer.phone}` : formatDate(r.createdAt)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-fg">{r.serials.map((s) => `#${s}`).join(', ')}</p>
                    <p className="flex items-center gap-1.5 truncate text-fg-muted">
                      {r.status === 'APPROVED' && !r.hasProof && (
                        <FileWarning className="h-4 w-4 shrink-0 text-sol-gold-dark" aria-label="Falta el comprobante" />
                      )}
                      {r.reference ? `Comprobante ${r.reference}` : r.hasProof ? 'Con comprobante adjunto' : 'Sin comprobante'}
                    </p>
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
