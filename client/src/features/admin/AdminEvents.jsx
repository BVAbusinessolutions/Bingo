import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useAdmin } from './AdminLayout';
import { adminApi } from '../../api/endpoints';
import Field from '../../components/Field';
import StatusBadge from '../../components/StatusBadge';
import { PATTERNS } from '../bingo/patterns';
import { errorMessage, formatCRC, formatDate } from '../../lib/format';

const EMPTY = { name: '', description: '', pattern: 'FULL', price: '2000', startsAt: '', provider: 'youtube', videoId: '' };

const NEXT_STATUS = {
  SCHEDULED: [['LIVE', 'Iniciar transmisión'], ['CANCELLED', 'Cancelar']],
  LIVE: [['FINISHED', 'Finalizar bingo']],
};

export default function AdminEvents() {
  const { events, reloadEvents, setEventId } = useAdmin();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.startsAt) return setError('Nombre y fecha son obligatorios.');
    setBusy(true);
    try {
      const created = await adminApi.createEvent({
        name: form.name,
        description: form.description,
        pattern: form.pattern,
        price: Number(form.price),
        startsAt: new Date(form.startsAt).toISOString(),
        stream: form.videoId ? { provider: form.provider, videoId: form.videoId.trim() } : null,
      });
      setForm(EMPTY);
      await reloadEvents();
      setEventId(created.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const update = async (id, body) => {
    await adminApi.updateEvent(id, body);
    reloadEvents();
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className="space-y-3">
        {events.map((ev) => (
          <article key={ev.id} className="space-y-2 surface p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-fg">{ev.name}</p>
                <p className="text-xs text-fg-muted">{formatDate(ev.startsAt)}</p>
              </div>
              <StatusBadge status={ev.status} />
            </div>
            <p className="text-sm text-fg-muted">
              {formatCRC(ev.price)} · {ev.total - ev.available}/{ev.total} cartones ocupados
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select value={ev.pattern} onChange={(e) => update(ev.id, { pattern: e.target.value })} className="rounded-lg border border-line px-2 py-1.5 text-sm" aria-label="Patrón ganador">
                {Object.values(PATTERNS).map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              {(NEXT_STATUS[ev.status] ?? []).map(([s, label]) => (
                <button
                  key={s}
                  onClick={() => (s !== 'CANCELLED' || window.confirm('¿Cancelar este evento?')) && update(ev.id, { status: s })}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${s === 'CANCELLED' ? 'bg-muted text-fg-muted' : 'bg-sol-red text-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <form onSubmit={create} className="h-fit space-y-3 surface p-4">
        <h2 className="font-bold text-fg">Programar nuevo bingo</h2>
        <Field label="Nombre" value={form.name} onChange={set('name')} maxLength={80} />
        <Field label="Descripción" value={form.description} onChange={set('description')} maxLength={300} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio (₡)" type="number" min="0" value={form.price} onChange={set('price')} />
          <label className="block">
            <span className="text-sm font-medium text-fg">Patrón</span>
            <select value={form.pattern} onChange={set('pattern')} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3">
              {Object.values(PATTERNS).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
        </div>
        <Field label="Fecha y hora" type="datetime-local" value={form.startsAt} onChange={set('startsAt')} />
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <label className="block">
            <span className="text-sm font-medium text-fg">Stream</span>
            <select value={form.provider} onChange={set('provider')} className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-3">
              <option value="youtube">YouTube</option>
              <option value="twitch">Twitch</option>
              <option value="vimeo">Vimeo</option>
            </select>
          </label>
          <Field label="ID del video / canal" value={form.videoId} onChange={set('videoId')} placeholder="ej. jfKfPfyJRdk" />
        </div>
        {error && <p className="text-sm text-sol-red">{error}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sol-red py-3 font-bold text-white disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear evento
        </button>
        <p className="text-xs text-fg-muted">Después genera sus cartones en la pestaña "Cartones".</p>
      </form>
    </div>
  );
}
