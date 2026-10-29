import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Layers, Printer, Search, X } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi } from '../../api/endpoints';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import PageLoader from '../../components/ui/PageLoader';
import CardImage from '../../components/bingo/CardImage';

const FILTERS = [
  ['', 'Todos'],
  ['AVAILABLE', 'Disponibles'],
  ['RESERVED', 'Reservados'],
  ['SOLD', 'Vendidos'],
];

export default function AdminCardsPage() {
  const { eventId, event } = useAdmin();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [preview, setPreview] = useState(null);
  const previewBackdrop = useBackdropClose(() => setPreview(null));

  const load = useCallback(() => {
    if (!eventId) return;
    adminApi.cards(eventId, { status: status || undefined, q: q || undefined, page }).then(setData);
  }, [eventId, status, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-brand">Cartones</h1>
          <p className="text-lg text-fg-muted">
            {event?.name} {event?.seriesName ? `· serie «${event.seriesName}»` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button to="../series" variant="outline" icon={Layers}>
            Cambiar serie
          </Button>
          <Button to="../imprimir" variant="gold" icon={Printer}>
            Imprimir en lote
          </Button>
        </div>
      </header>

      {data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            ['AVAILABLE', 'Disponibles', 'text-emerald-600'],
            ['RESERVED', 'Reservados', 'text-amber-600'],
            ['SOLD', 'Vendidos', 'text-sol-red'],
          ].map(([k, label, color]) => (
            <div key={k} className="surface p-4 text-center">
              <div className={`text-3xl font-black ${color}`}>{data.summary[k]}</div>
              <div className="font-bold text-fg-muted">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              aria-pressed={status === value}
              className={`min-h-11 rounded-full px-4 font-extrabold ${status === value ? 'bg-sol-blue text-white dark:bg-sol-gold dark:text-sol-blue' : 'surface text-fg-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative sm:ml-auto sm:w-64">
          <span className="sr-only">Buscar número de serie</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input
            value={q}
            inputMode="numeric"
            onChange={(e) => {
              setQ(e.target.value.replace(/\D/g, '').slice(0, 8));
              setPage(1);
            }}
            placeholder="Buscar serie #"
            className="min-h-12 w-full rounded-xl border-2 border-line bg-card pl-10 pr-3 text-fg"
          />
        </label>
      </div>

      {!data ? (
        <PageLoader />
      ) : data.total === 0 ? (
        <p className="surface p-10 text-center text-lg text-fg-muted">
          Este evento todavía no tiene cartones.{' '}
          <Link to="../series" className="font-bold underline">
            Elige una serie
          </Link>
          .
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
          {data.cards.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setPreview(c)}
                className="surface flex w-full flex-col items-center gap-1 p-3 hover:ring-2 hover:ring-sol-gold"
                aria-label={`Ver cartón ${c.serial}`}
              >
                <span className="text-xl font-black tabular-nums text-fg">#{c.serial}</span>
                <StatusBadge status={c.status} />
                {c.owner && <span className="w-full truncate text-center text-sm text-fg-muted">{c.owner}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="font-bold text-fg">
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Siguiente <ChevronRight className="h-5 w-5" aria-hidden />
          </Button>
        </nav>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" {...previewBackdrop}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Cartón ${preview.serial}`}
            className="w-full max-w-md space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                onClick={() => setPreview(null)}
                aria-label="Cerrar"
                className="grid h-11 w-11 place-items-center rounded-full bg-white text-black"
              >
                <X />
              </button>
            </div>
            <CardImage card={preview} />
          </div>
        </div>
      )}
    </section>
  );
}
