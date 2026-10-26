import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FileArchive, Loader2, Sparkles, Trash2, TriangleAlert, Upload, XCircle } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { adminApi } from '../../api/endpoints';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Field from '../../components/ui/Field';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { errorMessage, formatDate } from '../../lib/format';

const MAX_ZIP_MB = 300;

function UploadPanel({ onUploaded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');

  const upload = async () => {
    if (!file) return;
    if (file.size > MAX_ZIP_MB * 1024 * 1024) return setError(`El ZIP supera los ${MAX_ZIP_MB} MB.`);
    setError('');
    setProgress(0);
    try {
      await adminApi.importSeries(
        file,
        name.trim() || file.name.replace(/\.zip$/i, ''),
        (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100))
      );
      setFile(null);
      setName('');
      onUploaded();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setProgress(null);
    }
  };

  return (
    <section className="surface space-y-4 border-t-8 border-sol-gold p-5">
      <h2 className="flex items-center gap-2 text-xl font-black text-fg">
        <Upload className="h-6 w-6 text-brand" aria-hidden /> Subir cartones nuevos (ZIP)
      </h2>
      <p className="text-fg-muted">
        Un ZIP con una imagen PNG por cartón. El sistema lee los números y la serie de cada imagen; lo que no pueda leer con certeza lo
        marca para que lo revises.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="block font-bold text-fg">Archivo ZIP</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-1.5 flex min-h-12 w-full items-center gap-3 rounded-xl border-2 border-dashed border-line px-4 text-left hover:border-sol-blue dark:hover:border-sol-gold"
          >
            <FileArchive className="h-6 w-6 shrink-0 text-brand" aria-hidden />
            <span className="truncate font-bold text-fg">
              {file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : 'Elegir archivo…'}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            className="sr-only"
            onChange={(e) => setFile(e.target.files[0] ?? null)}
          />
        </div>
        <Field
          label="Nombre de la serie"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej.: Cartones noviembre 2026"
          maxLength={120}
        />
      </div>
      {progress !== null && (
        <div className="space-y-1" role="status">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-sol-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-fg-muted">{progress < 100 ? `Subiendo… ${progress} %` : 'Leyendo el ZIP…'}</p>
        </div>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <Button icon={Upload} disabled={!file} loading={progress !== null} onClick={upload}>
        Subir y procesar
      </Button>
    </section>
  );
}

function GeneratePanel({ onCreated }) {
  const [form, setForm] = useState({ name: 'Serie de prueba', count: '100', startSerial: '1' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const create = async () => {
    setBusy(true);
    setError('');
    try {
      await adminApi.generateSeries({ name: form.name.trim(), count: Number(form.count), startSerial: Number(form.startSerial) });
      onCreated();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="surface p-5">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-lg font-black text-fg">
        <Sparkles className="h-5 w-5 text-brand" aria-hidden /> Generar una serie al azar (pruebas o eventos sin imágenes)
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Nombre" value={form.name} onChange={set('name')} maxLength={120} />
        <Field label="Cantidad" type="number" min="1" max="5000" value={form.count} onChange={set('count')} />
        <Field label="Primer número de serie" type="number" min="1" value={form.startSerial} onChange={set('startSerial')} />
      </div>
      {error && (
        <Alert tone="error" className="mt-3">
          {error}
        </Alert>
      )}
      <Button className="mt-4" variant="outline" loading={busy} onClick={create}>
        Generar serie
      </Button>
    </details>
  );
}

const STATUS = {
  PROCESSING: [Loader2, 'Procesando…', 'text-amber-600 animate-spin'],
  READY: [CheckCircle2, 'Lista', 'text-emerald-600'],
  FAILED: [XCircle, 'Falló', 'text-sol-red'],
};

function SeriesFile({ s, isNewest, event, onChanged }) {
  const [confirm, setConfirm] = useState(null); // 'play' | 'delete'
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [Icon, label, iconCls] = STATUS[s.status];
  const playable = s.status === 'READY' && s.needsReview === 0;
  const playingHere = event?.seriesId === s.id;

  const act = async () => {
    setBusy(true);
    setMsg(null);
    try {
      if (confirm === 'play') {
        const { cards } = await adminApi.assignSeries(event.id, s.id);
        setMsg({ tone: 'success', text: `Ahora se juegan ${cards} cartones de esta serie en ${event.name}.` });
      } else await adminApi.deleteSeries(s.id);
      onChanged();
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <article className={`surface space-y-3 p-5 ${playingHere ? 'ring-4 ring-emerald-500' : ''}`}>
      <header className="flex flex-wrap items-start gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-sol-blue text-white dark:bg-sol-gold dark:text-sol-blue">
          <FileArchive className="h-7 w-7" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black text-fg">{s.name}</h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-sm font-black ${isNewest ? 'bg-sol-gold text-sol-blue' : 'bg-muted text-fg-muted'}`}
            >
              {isNewest ? 'Nueva' : 'Anterior'}
            </span>
            {playingHere && (
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-sm font-black text-white">Se juega en el evento actual</span>
            )}
          </div>
          <p className="text-fg-muted">
            {s.source === 'IMPORT' ? `ZIP: ${s.fileName}` : 'Generada al azar'} · {formatDate(s.createdAt)}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 font-bold text-fg">
          <Icon className={`h-5 w-5 ${iconCls}`} aria-hidden /> {label}
        </span>
      </header>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted p-2">
          <dt className="text-sm font-bold text-fg-muted">Cartones</dt>
          <dd className="text-xl font-black text-fg">{s.cardCount}</dd>
        </div>
        <div className="rounded-xl bg-muted p-2">
          <dt className="text-sm font-bold text-fg-muted">Con imagen</dt>
          <dd className="text-xl font-black text-fg">{s.withImages}</dd>
        </div>
        <div className={`rounded-xl p-2 ${s.needsReview ? 'bg-amber-500/15' : 'bg-muted'}`}>
          <dt className="text-sm font-bold text-fg-muted">Por revisar</dt>
          <dd className="text-xl font-black text-fg">{s.needsReview}</dd>
        </div>
      </dl>
      {s.notes && <p className="text-fg-muted">{s.notes}</p>}
      {s.events.length > 0 && <p className="text-fg-muted">Usada en: {s.events.map((e) => e.name).join(', ')}</p>}
      {s.needsReview > 0 && s.status === 'READY' && (
        <Alert tone="warning">
          Hay {s.needsReview} cartón(es) que el sistema no pudo leer con certeza. Revísalos antes de jugar esta serie.
        </Alert>
      )}
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}

      <div className="flex flex-wrap gap-2">
        <Button to={s.id} variant="outline" size="sm" disabled={s.status === 'PROCESSING'}>
          {s.needsReview ? 'Revisar cartones' : 'Ver cartones'}
        </Button>
        {event && event.status === 'SCHEDULED' && !playingHere && (
          <Button size="sm" variant="success" disabled={!playable} onClick={() => setConfirm('play')}>
            Jugar esta serie en «{event.name}»
          </Button>
        )}
        {s.events.length === 0 && s.status !== 'PROCESSING' && (
          <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirm('delete')}>
            Borrar
          </Button>
        )}
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm === 'play' ? '¿Jugar esta serie?' : '¿Borrar esta serie?'}
          confirmLabel={confirm === 'play' ? 'Sí, jugar esta serie' : 'Sí, borrar'}
          confirmVariant={confirm === 'play' ? 'success' : 'danger'}
          loading={busy}
          onConfirm={act}
          onCancel={() => setConfirm(null)}
        >
          {confirm === 'play'
            ? `Los ${s.cardCount} cartones de «${s.name}» serán los que se vendan y jueguen en ${event.name}. Solo se puede mientras el evento no tenga ventas.`
            : 'Se borran la serie y sus imágenes. Esta acción no se puede deshacer.'}
        </ConfirmDialog>
      )}
    </article>
  );
}

export default function AdminSeriesPage() {
  const { event, reloadEvents } = useAdmin();
  const [series, setSeries] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adminApi
      .series()
      .then(setSeries)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Mientras una serie se procesa, se refresca cada 3 s.
  const processing = series?.some((s) => s.status === 'PROCESSING');
  useEffect(() => {
    if (!processing) return undefined;
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [processing, load]);

  const changed = () => {
    load();
    reloadEvents();
  };

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-3xl font-black text-brand">Series de cartones</h1>
        <p className="text-lg text-fg-muted">
          Cada carga es un archivo aparte: la más reciente aparece como <b>Nueva</b> y las demás como <b>Anterior</b>. Elige cuál se juega
          en el evento
          {event ? ` «${event.name}»` : ''}.
        </p>
      </header>

      <UploadPanel onUploaded={load} />
      <GeneratePanel onCreated={load} />

      {error && <Alert tone="error">{error}</Alert>}
      {!series ? (
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-fg-subtle" aria-label="Cargando" />
      ) : series.length === 0 ? (
        <p className="surface p-10 text-center text-lg text-fg-muted">Todavía no hay series. Sube tu primer ZIP de cartones.</p>
      ) : (
        <div className="grid gap-4">
          {series.map((s, i) => (
            <SeriesFile key={s.id} s={s} isNewest={i === 0} event={event} onChanged={changed} />
          ))}
        </div>
      )}
      <p className="flex items-center gap-2 text-fg-muted">
        <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden /> Una serie en uso por un evento no se puede borrar ni modificar.{' '}
        <Link to="../eventos" className="font-bold underline">
          Ir a eventos
        </Link>
      </p>
    </section>
  );
}
