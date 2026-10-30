import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  Download,
  Eye,
  FileWarning,
  Globe,
  Plus,
  ReceiptText,
  RefreshCw,
  Scale,
  Store,
  Trash2,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi } from '../../api/endpoints';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Field from '../../components/ui/Field';
import PageLoader from '../../components/ui/PageLoader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import DonutChart from '../../components/admin/DonutChart';
import IncomeChart from '../../components/admin/IncomeChart';
import CategoryBars from '../../components/admin/CategoryBars';
import UploadButton from '../../components/admin/UploadButton';
import { PATHS } from '../../routing/paths';
import { errorMessage, formatCRC, formatDate } from '../../lib/format';

const EXPENSE_CATEGORIES = {
  PREMIOS: 'Premios',
  LOCAL: 'Local / salón',
  PUBLICIDAD: 'Publicidad',
  LOGISTICA: 'Logística',
  IMPRESION: 'Impresión de cartones',
  OTROS: 'Otros',
};
const METHODS = { SINPE: 'SINPE Móvil', TRANSFER: 'Transferencia', CASH: 'Efectivo' };
const CHANNELS = { WEB: 'Virtual', MANUAL: 'Físico' };
const today = () => new Date(Date.now() - 6 * 3600_000).toISOString().slice(0, 10); // día de Costa Rica
const EMPTY_EXPENSE = { concept: '', category: 'PREMIOS', amount: '', spentOn: today(), method: 'TRANSFER', reference: '' };
const selectCls =
  'mt-1.5 min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-base text-fg outline-none focus:border-sol-blue focus:ring-4 focus:ring-sol-gold/40';

/** Abre un comprobante o factura (blob) en otra pestaña. */
async function openBlob(load) {
  const tab = window.open('', '_blank'); // se abre antes de esperar la descarga: así no lo bloquea el navegador
  try {
    const url = URL.createObjectURL(await load());
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    tab?.close();
  }
}

/** Virtual (en línea) o físico (salón): cartones, compras y dinero verificado de cada canal. */
function ChannelCard({ Icon, title, hint, data, total }) {
  const pct = total ? Math.round((data.amount / total) * 100) : 0;
  return (
    <div className="surface space-y-3 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sol-blue/10 text-sol-blue dark:bg-sol-gold/15 dark:text-sol-gold">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <p className="font-black text-fg">{title}</p>
          <p className="text-sm text-fg-muted">{hint}</p>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ['Cartones', data.cards],
          ['Compras', data.orders],
          ['Monto', formatCRC(data.amount)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-muted p-2">
            <dt className="text-xs font-semibold text-fg-muted">{k}</dt>
            <dd key={v} className="text-lg font-black tabular-nums text-fg motion-safe:animate-pop">
              {v}
            </dd>
          </div>
        ))}
      </dl>
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-sol-blue transition-[width] duration-500 dark:bg-sol-gold" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-fg-muted">{pct}% de lo recaudado</p>
    </div>
  );
}

function ExpenseForm({ eventId, onSaved, onCancel }) {
  const [form, setForm] = useState(EMPTY_EXPENSE);
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(String(form.amount).replace(/[^\d]/g, ''));
    if (form.concept.trim().length < 3) return setError('Escribe el concepto del gasto.');
    if (!amount) return setError('Escribe el monto en colones.');
    setBusy(true);
    setError('');
    try {
      await adminApi.createExpense(eventId, { ...form, amount }, receipt);
      setForm(EMPTY_EXPENSE);
      setReceipt(null);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Registrar gasto" icon={TrendingDown} onClose={onCancel}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Concepto"
            value={form.concept}
            onChange={set('concept')}
            maxLength={120}
            placeholder="Ej. Compra de la motocicleta"
          />
          <Field label="Monto (₡)" value={form.amount} onChange={set('amount')} inputMode="numeric" placeholder="Ej. 150000" />
          <label className="block">
            <span className="font-bold text-fg">Categoría</span>
            <select value={form.category} onChange={set('category')} className={selectCls}>
              {Object.entries(EXPENSE_CATEGORIES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <Field label="Fecha" type="date" value={form.spentOn} onChange={set('spentOn')} />
          <label className="block">
            <span className="font-bold text-fg">Método de pago</span>
            <select value={form.method} onChange={set('method')} className={selectCls}>
              {Object.entries(METHODS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <Field label="N.º de factura o referencia (opcional)" value={form.reference} onChange={set('reference')} maxLength={40} />
        </div>
        <label className="block">
          <span className="font-bold text-fg">Factura o recibo (foto o PDF, opcional)</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
            className="mt-1.5 block w-full rounded-xl border-2 border-dashed border-line bg-card p-3 text-fg file:mr-3 file:rounded-full file:border-0 file:bg-sol-blue file:px-4 file:py-2 file:font-bold file:text-white dark:file:bg-sol-gold dark:file:text-sol-blue"
          />
        </label>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={busy} icon={Plus}>
            Guardar gasto
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Finanzas del evento con datos reales: ingresos verificados por canal (virtual = en línea, físico = salón) y
 * método, gastos con su factura, balance y comprobantes pendientes de adjuntar. Se actualiza sola con cada
 * compra, aprobación o gasto (avisos en tiempo real).
 */
export default function AdminFinancePage() {
  const { event, eventId, revision, socket, reloadCounters } = useAdmin();
  const [data, setData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!eventId) return;
    Promise.all([adminApi.finance(eventId), adminApi.expenses(eventId)])
      .then(([f, x]) => {
        setData(f);
        setExpenses(x);
      })
      .catch((err) => setError(errorMessage(err)));
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load, revision]);
  useEffect(() => {
    if (!socket) return undefined;
    socket.on('finance:updated', load);
    return () => socket.off('finance:updated', load);
  }, [socket, load]);

  const exportBook = async () => {
    setExporting(true);
    try {
      const url = URL.createObjectURL(await adminApi.exportFinance(eventId));
      const a = document.createElement('a');
      a.href = url;
      a.download = `finanzas-${eventId}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const removeExpense = async () => {
    setBusy(true);
    try {
      await adminApi.deleteExpense(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return error ? <Alert tone="error">{error}</Alert> : <PageLoader />;

  const { channels, byMethod, cards } = data;

  return (
    <section className="space-y-6">
      {/* Encabezado: balance grande, ingresos contra gastos y acciones a mano */}
      <section className="stage relative overflow-hidden rounded-3xl p-5 ring-1 ring-white/10 sm:p-6" aria-labelledby="fin-title">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sol-gold/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 id="fin-title" className="flex items-center gap-2 font-display text-2xl font-bold text-white sm:text-3xl">
              <Wallet className="h-8 w-8 text-accent" aria-hidden /> Finanzas
            </h1>
            <p className="text-white/75">{event?.name} · solo dinero verificado por la administración</p>
          </div>
          <div className="grid w-full grid-cols-[1fr_1fr_auto] gap-2 sm:flex sm:w-auto">
            <Button variant="gold" icon={Plus} onClick={() => setAdding(true)} className="rounded-full! px-3! whitespace-nowrap sm:px-4!">
              Registrar gasto
            </Button>
            <Button
              variant="light"
              icon={Download}
              loading={exporting}
              onClick={exportBook}
              className="rounded-full! px-3! whitespace-nowrap sm:px-4!"
            >
              <span className="sm:hidden">Excel</span>
              <span className="hidden sm:inline">Libro Excel</span>
            </Button>
            <button
              type="button"
              onClick={load}
              aria-label="Actualizar"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 active:scale-90"
            >
              <RefreshCw className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          {[
            [
              'Ingresos verificados',
              formatCRC(data.income),
              `${channels.WEB.orders + channels.MANUAL.orders} compras`,
              Banknote,
              'text-emerald-300',
            ],
            ['Gastos', formatCRC(data.expenses), `${expenses.length} registrados`, TrendingDown, 'text-red-300'],
            [
              'Balance',
              formatCRC(data.balance),
              data.balance >= 0 ? 'ingresos menos gastos' : 'los gastos superan lo recaudado',
              Scale,
              data.balance >= 0 ? 'text-accent' : 'text-red-300',
            ],
          ].map(([label, value, hint, Icon, tone]) => (
            <div key={label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
              <p className="flex items-center gap-2 text-sm font-semibold text-white/80">
                <Icon className={`h-4 w-4 ${tone}`} aria-hidden /> {label}
              </p>
              <p
                key={value}
                className={`mt-1 text-3xl font-black tabular-nums motion-safe:animate-pop ${label === 'Balance' ? tone : 'text-white'}`}
              >
                {value}
              </p>
              <p className="text-xs text-white/65">{hint}</p>
            </div>
          ))}
        </div>

        {/* Ingresos contra gastos: cuánto de lo recaudado se va en gastos */}
        <div className="relative mt-4" aria-hidden>
          <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-emerald-400 transition-[width] duration-700"
              style={{ width: `${data.income ? Math.max(0, Math.min(100, (data.balance / data.income) * 100)) : 0}%` }}
            />
            <div
              className="h-full bg-red-400 transition-[width] duration-700"
              style={{ width: `${data.income ? Math.min(100, (data.expenses / data.income) * 100) : data.expenses ? 100 : 0}%` }}
            />
          </div>
        </div>
        <p className="relative mt-1.5 text-xs text-white/70">
          {data.income
            ? `Los gastos equivalen al ${Math.round((data.expenses / data.income) * 100)}% de lo recaudado.`
            : 'Aún no hay ingresos verificados.'}{' '}
          Por verificar: {formatCRC(data.pendingReview.amount)} en {data.pendingReview.orders} comprobante(s) ·{' '}
          {data.awaitingPayment.orders} compra(s) esperando pago.
        </p>
      </section>

      {error && <Alert tone="error">{error}</Alert>}
      {adding && (
        <ExpenseForm
          eventId={eventId}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}

      {/* Gráficos: ingresos por día y cobro por método */}
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <IncomeChart days={data.incomeByDay ?? []} />
        <DonutChart
          title="Cobrado por método"
          description="SINPE, transferencia y efectivo del salón"
          format={formatCRC}
          center={{ value: formatCRC(data.income), label: 'verificado' }}
          items={[
            { key: 'sinpe', label: METHODS.SINPE, value: byMethod.SINPE.amount, color: 'var(--series-1)' },
            { key: 'transfer', label: METHODS.TRANSFER, value: byMethod.TRANSFER.amount, color: 'var(--series-2)' },
            { key: 'cash', label: METHODS.CASH, value: byMethod.CASH.amount, color: 'var(--series-3)' },
          ]}
        />
      </div>

      {/* Conteo real de cartones vendidos: virtuales (en línea) y físicos (salón), y gastos por categoría */}
      <section aria-labelledby="channels-title" className="space-y-3">
        <h2 id="channels-title" className="text-sm font-extrabold uppercase tracking-widest text-fg-muted">
          Cartones vendidos y gastos
        </h2>
        <div className="grid items-start gap-3 lg:grid-cols-3">
          <ChannelCard Icon={Globe} title="Virtuales" hint="comprados en línea" data={channels.WEB} total={data.income} />
          <ChannelCard Icon={Store} title="Físicos" hint="vendidos en el salón" data={channels.MANUAL} total={data.income} />
          <CategoryBars
            title="Gastos por categoría"
            description={`${formatCRC(data.expenses)} en total`}
            items={Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => ({
              key,
              label,
              value: data.expensesByCategory?.[key]?.amount ?? 0,
              count: data.expensesByCategory?.[key]?.count ?? 0,
            }))}
          />
        </div>
        <p className="text-sm text-fg-muted">
          Inventario: {cards.sold} vendidos de {cards.total} · {cards.reserved} apartados · {cards.available} disponibles.
          {cards.soldUnverified > 0 &&
            ` ${cards.soldUnverified} vendidos sin compra verificada (p. ej. de demostración): no cuentan como dinero.`}
          {data.refunded.orders > 0 && ` Reembolsado: ${formatCRC(data.refunded.amount)} en ${data.refunded.orders} compra(s).`}
        </p>
      </section>

      {/* Comprobantes que faltan */}
      <section className="surface p-4" aria-labelledby="missing-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="missing-title" className="flex items-center gap-2 font-black text-fg">
            <FileWarning className="h-5 w-5 text-sol-gold-dark" aria-hidden /> Ventas verificadas sin comprobante
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm tabular-nums">{data.withoutProof}</span>
          </h2>
          <p className="text-sm text-fg-muted">
            Adjunta la foto del SINPE, la transferencia o el recibo del salón para tener todo en orden.
          </p>
        </div>
        {data.missingProofs.length === 0 ? (
          <p className="py-5 text-center text-fg-muted">Todas las ventas verificadas tienen su comprobante.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.missingProofs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-black ${r.channel === 'MANUAL' ? 'bg-navy-950 text-accent' : 'bg-sol-blue/10 text-sol-blue dark:text-brand'}`}
                >
                  {CHANNELS[r.channel]}
                </span>
                <Link to={`../${PATHS.adminPurchases}/${r.id}`} relative="path" className="min-w-0 flex-1 hover:underline">
                  <p className="truncate font-bold text-fg">{r.buyer ?? 'Sin nombre'}</p>
                  <p className="truncate text-sm text-fg-muted">
                    {r.serials.map((s) => `#${s}`).join(', ')} · {METHODS[r.method] ?? r.method} · {formatDate(r.decidedAt)}
                  </p>
                </Link>
                <span className="font-black tabular-nums text-fg">{formatCRC(r.total)}</span>
                <UploadButton
                  size="sm"
                  onUpload={async (file) => {
                    await adminApi.attachProof(r.id, file);
                    load();
                    reloadCounters?.();
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Gastos */}
      <section className="surface p-4" aria-labelledby="expenses-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="expenses-title" className="flex items-center gap-2 font-black text-fg">
            <ReceiptText className="h-5 w-5 text-brand" aria-hidden /> Gastos del evento
          </h2>
          {data.expensesWithoutReceipt > 0 && (
            <span className="rounded-full bg-sol-gold/25 px-3 py-1 text-sm font-bold text-fg">
              {data.expensesWithoutReceipt} sin factura
            </span>
          )}
        </div>
        {expenses.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-fg-muted">Todavía no hay gastos registrados.</p>
            <Button variant="outline" size="sm" icon={Plus} className="mt-3 rounded-full!" onClick={() => setAdding(true)}>
              Registrar el primero
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {expenses.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-3 py-3">
                {/* En celular el concepto ocupa la fila completa; monto y botones van debajo */}
                <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                  <p className="font-bold text-fg sm:truncate">{x.concept}</p>
                  <p className="truncate text-sm text-fg-muted">
                    {EXPENSE_CATEGORIES[x.category]} · {METHODS[x.method]} · {x.spentOn}
                    {x.reference && ` · ${x.reference}`}
                    {x.createdBy && ` · ${x.createdBy}`}
                  </p>
                </div>
                <span className="font-black tabular-nums text-sol-red dark:text-red-300">−{formatCRC(x.amount)}</span>
                <div className="ml-auto flex flex-wrap gap-2 sm:ml-0">
                  {x.hasReceipt ? (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Eye}
                      className="rounded-full!"
                      onClick={() => openBlob(() => adminApi.receiptBlob(x.id))}
                    >
                      Ver factura
                    </Button>
                  ) : (
                    <UploadButton
                      size="sm"
                      label="Subir factura"
                      onUpload={async (file) => {
                        await adminApi.attachReceipt(x.id, file);
                        load();
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleting(x)}
                    aria-label={`Borrar el gasto ${x.concept}`}
                    className="grid h-10 w-10 place-items-center rounded-full text-fg-muted transition hover:bg-sol-red/10 hover:text-sol-red active:scale-90"
                  >
                    <Trash2 className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {deleting && (
        <ConfirmDialog
          title="¿Borrar este gasto?"
          icon={Trash2}
          confirmLabel="Borrar gasto"
          confirmVariant="danger"
          loading={busy}
          onConfirm={removeExpense}
          onCancel={() => setDeleting(null)}
        >
          “{deleting.concept}” por {formatCRC(deleting.amount)} sale del balance. Queda registrado en la bitácora.
        </ConfirmDialog>
      )}
    </section>
  );
}
