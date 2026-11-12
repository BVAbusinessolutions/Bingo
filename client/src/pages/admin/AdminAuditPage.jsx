import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import Button from '../../components/ui/Button';
import PageLoader from '../../components/ui/PageLoader';
import { formatCRC, formatDate } from '../../lib/format';
import { ACTIONS } from '../../constants/auditActions';

const FILTERS = [
  ['', 'Todo'],
  ['reservation', 'Compras'],
  ['expense', 'Gastos'],
  ['draw', 'Sorteo'],
  ['claim', 'Premios'],
  ['winner', 'Ganadores del salón'],
  ['auth', 'Seguridad'],
  ['user', 'Usuarios'],
  ['series', 'Series'],
  ['event', 'Eventos'],
];

const detailText = (e) => {
  const d = e.details ?? {};
  if (d.number) return `Bola ${d.number}`;
  if (d.total !== undefined) return formatCRC(d.total);
  if (d.serials) return `Cartones ${d.serials.join(', ')}`;
  if (d.name) return d.name;
  if (d.fileName) return `${d.fileName} (${d.images} imágenes)`;
  if (d.cards) return `${d.cards} cartones`;
  if (d.rows !== undefined) return `${d.rows} filas`;
  if (d.fields) return `Campos: ${d.fields.join(', ')}`;
  return '';
};

export default function AdminAuditPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  useEffect(() => {
    adminApi.audit({ action: action || undefined, page }).then(setData);
  }, [action, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <section className="space-y-5">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-black text-brand">
          <ScrollText className="h-8 w-8" aria-hidden /> Bitácora
        </h1>
        <p className="text-lg text-fg-muted">Registro permanente de quién hizo qué y cuándo. No se puede editar ni borrar.</p>
      </header>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              setAction(value);
              setPage(1);
            }}
            aria-pressed={action === value}
            className={`min-h-11 rounded-full px-4 font-extrabold ${action === value ? 'bg-sol-blue text-white dark:bg-sol-gold dark:text-sol-blue' : 'surface text-fg-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {!data ? (
        <PageLoader />
      ) : (
        <div className="surface overflow-hidden">
          {/* Celular: una tarjeta por registro. La tabla solo mostraba la fecha y el resto quedaba fuera de la pantalla. */}
          <ul className="divide-y divide-line md:hidden">
            {data.entries.map((e) => (
              <li key={e.id} className="space-y-1 px-4 py-3">
                <p className="font-bold text-fg">{ACTIONS[e.action] ?? e.action}</p>
                <p className="text-fg">{e.actor?.name ?? 'Sistema'}</p>
                {detailText(e) && <p className="break-words text-fg-muted">{detailText(e)}</p>}
                <p className="text-sm text-fg-subtle">{formatDate(e.createdAt)}</p>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-left md:table">
            <thead className="bg-muted text-sm uppercase tracking-wide text-fg-muted">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Quién</th>
                <th className="px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{formatDate(e.createdAt)}</td>
                  <td className="px-4 py-3 font-bold text-fg">{ACTIONS[e.action] ?? e.action}</td>
                  <td className="px-4 py-3 text-fg">{e.actor?.name ?? 'Sistema'}</td>
                  <td className="px-4 py-3 text-fg-muted">{detailText(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.entries.length === 0 && <p className="p-8 text-center text-fg-muted">Sin registros.</p>}
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="font-bold text-fg">
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </nav>
      )}
    </section>
  );
}
