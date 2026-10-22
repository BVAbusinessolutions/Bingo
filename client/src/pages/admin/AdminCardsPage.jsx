import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, Sparkles } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi } from '../../api/endpoints';
import StatusBadge from '../../components/ui/StatusBadge';
import BingoCard from '../../components/bingo/BingoCard';
import { errorMessage } from '../../lib/format';

const NONE = new Set();

export default function AdminCards() {
  const { eventId, reloadEvents } = useAdmin();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [count, setCount] = useState(100);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  const load = useCallback(() => {
    if (!eventId) return;
    adminApi.cards(eventId, { status: status || undefined, q: q || undefined, page }).then(setData);
  }, [eventId, status, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    setMsg('');
    try {
      const { created } = await adminApi.generateCards(eventId, Number(count));
      setMsg(`Se generaron ${created} cartones nuevos.`);
      load();
      reloadEvents();
    } catch (err) {
      setMsg(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      {data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            ['AVAILABLE', 'Disponibles', 'text-emerald-600'],
            ['RESERVED', 'Reservados', 'text-amber-600'],
            ['SOLD', 'Vendidos', 'text-sol-red'],
          ].map(([k, label, color]) => (
            <div key={k} className="rounded-2xl bg-card p-3 text-center shadow-sm">
              <div className={`text-2xl font-black sm:text-3xl ${color}`}>{data.summary[k]}</div>
              <div className="text-xs text-fg-muted sm:text-sm">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 surface p-4 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="text-sm font-medium text-fg">Generación masiva (sin duplicados)</span>
          <input type="number" min="1" max="5000" value={count} onChange={(e) => setCount(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5" />
        </label>
        <button disabled={busy || !eventId} onClick={generate} className="flex items-center justify-center gap-2 rounded-xl bg-sol-red px-5 py-2.5 font-bold text-white disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generar cartones
        </button>
      </div>
      {msg && <p className="text-sm text-fg-muted">{msg}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {[
          ['', 'Todos'],
          ['AVAILABLE', 'Disponibles'],
          ['RESERVED', 'Reservados'],
          ['SOLD', 'Vendidos'],
        ].map(([s, label]) => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${status === s ? 'bg-sol-blue text-white' : 'bg-card text-fg-muted shadow'}`}>
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 rounded-full bg-card px-3 shadow-sm">
          <Search className="h-4 w-4 text-fg-subtle" />
          <input value={q} onChange={(e) => { setQ(e.target.value.replace(/\D/g, '').slice(0, 4)); setPage(1); }} placeholder="Buscar N.º" inputMode="numeric" className="w-24 py-1.5 text-sm outline-none" />
        </div>
      </div>

      {!data ? (
        <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-sol-red" />
      ) : (
        <>
          <div className="overflow-hidden surface">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-fg-muted">
                <tr>
                  <th className="px-4 py-2">N.º</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="hidden px-4 py-2 sm:table-cell">Dueño</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {data.cards.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="px-4 py-2 font-bold tabular-nums text-brand">{c.serial}</td>
                    <td className="px-4 py-2"><StatusBadge status={c.status} /></td>
                    <td className="hidden px-4 py-2 text-fg-muted sm:table-cell">{c.owner ?? '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => setPreview(c)} className="text-sm font-semibold text-sol-red hover:underline">Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-center gap-3 text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-full bg-card p-2 shadow-sm disabled:opacity-40" aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></button>
            Página {page} de {pages} · {data.total} cartones
            <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-full bg-card p-2 shadow-sm disabled:opacity-40" aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <BingoCard card={preview} called={NONE} manualMarks={NONE} />
          </div>
        </div>
      )}
    </div>
  );
}
