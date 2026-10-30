import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Layers, Pencil, Play, Square, X } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi } from '../../api/endpoints';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { PATTERNS } from '../../constants/patterns';
import { errorMessage, formatCRC, formatDate } from '../../lib/format';

const selectCls = 'mt-1.5 min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-fg';

/** "2026-11-15T13:00" en hora local para <input type="datetime-local">. */
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const formFrom = (ev) => ({
  name: ev?.name ?? '',
  description: ev?.description ?? '',
  pattern: ev?.pattern ?? 'FULL',
  price: String(ev?.price ?? 2000),
  startsAt: toLocalInput(ev?.startsAt),
  venue: ev?.venue ?? '',
  venueArea: ev?.venueArea ?? '',
  provider: ev?.stream?.provider ?? 'youtube',
  videoId: ev?.stream?.videoId ?? ev?.stream?.url ?? '',
});

// Facebook, TikTok, LL-HLS y WebRTC (WHEP) se configuran con una URL; el resto con el id del video o el canal.
const URL_PROVIDERS = new Set(['facebook', 'tiktok', 'hls', 'whep']);
const STREAM_HINTS = {
  youtube: [
    'ID o URL del video',
    'ej. https://www.youtube.com/live/jfKfPfyJRdk',
    'Sirve el enlace completo o solo el ID (latencia de 3 a 10 s con "latencia ultrabaja").',
  ],
  facebook: [
    'URL del video de Facebook Live',
    'https://www.facebook.com/hogarsol/videos/…',
    'En Facebook: video en vivo → Compartir → Copiar enlace. Debe ser público.',
  ],
  twitch: ['Canal de Twitch', 'ej. hogarsol o https://www.twitch.tv/hogarsol', 'Latencia de 2 a 5 s.'],
  kick: ['Canal de Kick', 'ej. hogarsol o https://kick.com/hogarsol', 'Latencia de 2 a 5 s.'],
  tiktok: [
    'Cuenta de TikTok',
    'ej. @hogarsol',
    'TikTok no permite incrustar sus directos: el jugador verá un botón "Ver en TikTok" y jugará sus cartones aquí.',
  ],
  vimeo: ['ID del video', 'ej. 76979871', 'Latencia de 5 a 15 s.'],
  hls: ['URL .m3u8 (LL-HLS)', 'https://…/live/bingo.m3u8', 'Latencia de 2 a 4 s. El dominio debe estar en STREAM_ORIGINS del servidor.'],
  whep: ['URL WHEP (WebRTC)', 'https://…/whep/bingo', 'Latencia menor a 1 s. El dominio debe estar en STREAM_ORIGINS del servidor.'],
};
const streamValue = ({ provider, videoId }) => {
  const v = videoId.trim();
  if (!v) return null;
  return URL_PROVIDERS.has(provider) ? { provider, url: v } : { provider, videoId: v };
};

function EventForm({ initial, submitLabel, onSubmit, onCancel, locked }) {
  const [form, setForm] = useState(() => formFrom(initial));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 3 || !form.startsAt) return setError('El nombre (3+ letras) y la fecha son obligatorios.');
    setBusy(true);
    setError('');
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        ...(!locked && { pattern: form.pattern, price: Number(form.price) }),
        startsAt: new Date(form.startsAt).toISOString(),
        venue: form.venue.trim(),
        venueArea: form.venueArea.trim(),
        stream: streamValue(form),
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field label="Nombre del bingo" value={form.name} onChange={set('name')} maxLength={80} />
      <Field
        label="Descripción o premio"
        value={form.description}
        onChange={set('description')}
        maxLength={300}
        hint="Ej.: ¡Gana 1 moto y muchos premios más!"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Precio por cartón (₡)" type="number" min="0" value={form.price} onChange={set('price')} disabled={locked} />
        <label className="block">
          <span className="font-bold text-fg">Modalidad de la primera ronda</span>
          <select value={form.pattern} onChange={set('pattern')} disabled={locked} className={selectCls}>
            {Object.values(PATTERNS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} — {p.hint}
              </option>
            ))}
          </select>
        </label>
      </div>
      {locked && (
        <p className="text-sm text-fg-muted">
          El precio y el patrón no se pueden cambiar aquí porque ya hay ventas. La modalidad de cada ronda se elige en Bingo Master.
        </p>
      )}
      <Field
        label="Fecha y hora del sorteo"
        type="datetime-local"
        value={form.startsAt}
        onChange={set('startsAt')}
        hint="Hora de Costa Rica. La cuenta regresiva de la portada usa esta fecha."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Lugar del evento"
          value={form.venue}
          onChange={set('venue')}
          maxLength={120}
          placeholder="ej. Salón de Eventos de Tinamaste"
        />
        <Field
          label="Zona o dirección"
          value={form.venueArea}
          onChange={set('venueArea')}
          maxLength={120}
          placeholder="ej. Higuito, San José"
          hint="Se muestran en la portada, el reglamento y el enlace “Cómo llegar”."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,16rem)_1fr]">
        <label className="block">
          <span className="font-bold text-fg">Transmisión</span>
          <select value={form.provider} onChange={set('provider')} className={selectCls}>
            <option value="youtube">YouTube Live</option>
            <option value="facebook">Facebook Live</option>
            <option value="hls">Enlace HLS / reproductor propio (.m3u8)</option>
            <option value="whep">WebRTC (ultra baja latencia)</option>
            <option value="twitch">Twitch</option>
            <option value="kick">Kick</option>
            <option value="tiktok">TikTok LIVE (enlace)</option>
            <option value="vimeo">Vimeo</option>
          </select>
        </label>
        <Field
          label={STREAM_HINTS[form.provider][0]}
          value={form.videoId}
          onChange={set('videoId')}
          placeholder={STREAM_HINTS[form.provider][1]}
          hint={STREAM_HINTS[form.provider][2]}
          inputMode={URL_PROVIDERS.has(form.provider) ? 'url' : undefined}
        />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

function SeriesPicker({ ev, series, onAssigned }) {
  const ready = series.filter((s) => s.status === 'READY' && s.needsReview === 0);
  const [seriesId, setSeriesId] = useState(ev.seriesId ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const assign = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { cards } = await adminApi.assignSeries(ev.id, seriesId);
      setMsg({ tone: 'success', text: `Listo: se juegan ${cards} cartones de la serie elegida.` });
      onAssigned();
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-2 rounded-2xl bg-muted p-3">
      <label className="block">
        <span className="flex items-center gap-2 font-bold text-fg">
          <Layers className="h-5 w-5 text-brand" aria-hidden /> Serie de cartones que se juega
        </span>
        <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} className={selectCls} disabled={ev.status !== 'SCHEDULED'}>
          <option value="">— Elige una serie —</option>
          {ready.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.cardCount} cartones {s.source === 'IMPORT' ? '(imágenes)' : '(generada)'}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={!seriesId || seriesId === ev.seriesId || busy || ev.status !== 'SCHEDULED'}
          onClick={() => setConfirming(true)}
        >
          Usar esta serie
        </Button>
        <Link to="../series" className="text-sm font-bold text-sol-blue underline dark:text-sol-gold">
          Administrar series
        </Link>
      </div>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {confirming && (
        <ConfirmDialog
          title="¿Cambiar la serie del evento?"
          confirmLabel="Sí, usar esta serie"
          loading={busy}
          onConfirm={assign}
          onCancel={() => setConfirming(false)}
        >
          Los cartones actuales del evento se reemplazan por los de la serie elegida. Solo es posible mientras no haya ventas.
        </ConfirmDialog>
      )}
    </div>
  );
}

const STATUS_ACTIONS = {
  SCHEDULED: [
    ['LIVE', 'Poner en vivo', Play, 'primary'],
    ['CANCELLED', 'Cancelar evento', X, 'danger'],
  ],
  LIVE: [
    ['FINISHED', 'Finalizar bingo', Square, 'primary'],
    ['CANCELLED', 'Cancelar evento', X, 'danger'],
  ],
};

function EventCard({ ev, series, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = ev.total - ev.available > 0;
  const closed = ['FINISHED', 'CANCELLED'].includes(ev.status);

  const changeStatus = async () => {
    setBusy(true);
    try {
      await adminApi.updateEvent(ev.id, { status: confirm });
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <article className="surface space-y-4 p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-black text-fg">{ev.name}</h2>
          <p className="text-fg-muted">
            {formatDate(ev.startsAt)}
            {(ev.venue || ev.venueArea) && ` · ${[ev.venue, ev.venueArea].filter(Boolean).join(', ')}`}
          </p>
        </div>
        <StatusBadge status={ev.status} />
      </header>
      <p className="text-fg-muted">
        {formatCRC(ev.price)} por cartón · {PATTERNS[ev.pattern]?.label} · {ev.total - ev.available}/{ev.total} cartones ocupados
        {ev.seriesName && ` · Serie: ${ev.seriesName}`}
      </p>

      {editing ? (
        <EventForm
          initial={ev}
          locked={locked}
          submitLabel="Guardar cambios"
          onCancel={() => setEditing(false)}
          onSubmit={async (body) => {
            await adminApi.updateEvent(ev.id, body);
            setEditing(false);
            onChanged();
          }}
        />
      ) : (
        !closed && (
          <>
            <SeriesPicker ev={ev} series={series} onAssigned={onChanged} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                Editar
              </Button>
              {(STATUS_ACTIONS[ev.status] ?? []).map(([status, label, Icon, variant]) => (
                <Button key={status} size="sm" variant={variant} icon={Icon} onClick={() => setConfirm(status)}>
                  {label}
                </Button>
              ))}
            </div>
          </>
        )
      )}
      {error && <Alert tone="error">{error}</Alert>}
      {confirm && (
        <ConfirmDialog
          title={{ LIVE: '¿Poner el evento en vivo?', FINISHED: '¿Finalizar el bingo?', CANCELLED: '¿Cancelar el evento?' }[confirm]}
          confirmLabel="Sí, continuar"
          confirmVariant={confirm === 'CANCELLED' ? 'danger' : 'primary'}
          loading={busy}
          onConfirm={changeStatus}
          onCancel={() => setConfirm(null)}
        >
          {confirm === 'CANCELLED'
            ? 'Se cierran las compras sin aprobar y se avisa por correo a quienes enviaron comprobante. Las compras aprobadas se reembolsan desde Compras.'
            : confirm === 'FINISHED'
              ? 'Ya no se podrán cantar bolas ni reclamar premios.'
              : 'Se cierra la venta de cartones y los jugadores podrán reclamar bingo.'}
        </ConfirmDialog>
      )}
    </article>
  );
}

export default function AdminEventsPage() {
  const { events, reloadEvents, setEventId } = useAdmin();
  const [series, setSeries] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    adminApi.series().then(setSeries);
  }, [events]);

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-brand">Eventos</h1>
          <p className="text-lg text-fg-muted">Programa los bingos, edítalos y elige qué serie de cartones se juega.</p>
        </div>
        {!creating && (
          <Button variant="gold" icon={CalendarPlus} onClick={() => setCreating(true)}>
            Nuevo bingo
          </Button>
        )}
      </header>

      {creating && (
        <section className="surface border-t-8 border-sol-gold p-5">
          <h2 className="mb-4 text-xl font-black text-fg">Programar nuevo bingo</h2>
          <EventForm
            submitLabel="Crear evento"
            onCancel={() => setCreating(false)}
            onSubmit={async (body) => {
              const created = await adminApi.createEvent(body);
              setCreating(false);
              await reloadEvents();
              setEventId(created.id);
            }}
          />
        </section>
      )}

      <div className="grid gap-4">
        {events.map((ev) => (
          <EventCard key={ev.id} ev={ev} series={series} onChanged={reloadEvents} />
        ))}
      </div>
    </section>
  );
}
