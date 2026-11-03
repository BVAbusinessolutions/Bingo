import { useCallback, useEffect, useState } from 'react';
import { Gift, Phone, Plus, Store, Trash2 } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import Field from '../ui/Field';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { PatternPreview } from '../bingo/PatternPreview';
import { PATTERNS, PATTERN_IDS } from '../../constants/patterns';
import { errorMessage, formatDate, seriesText } from '../../lib/format';

const selectCls =
  'mt-1.5 min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-base text-fg outline-none focus:border-sol-blue focus:ring-4 focus:ring-sol-gold/40';
const OTHER_SERIES = '__otra__';

function WinnerForm({ event, series, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    prize: '',
    pattern: event?.pattern ?? 'FULL',
    seriesId: event?.seriesId ?? '',
    seriesLabel: '',
    serial: '',
    phone: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 3) return setError('Escribe el nombre de la persona ganadora.');
    if (form.prize.trim().length < 2) return setError('Escribe el premio que se ganó.');
    setBusy(true);
    setError('');
    try {
      const other = form.seriesId === OTHER_SERIES;
      await adminApi.addManualWinner(event.id, {
        ...form,
        seriesId: other ? '' : form.seriesId,
        seriesLabel: other ? form.seriesLabel : '',
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err, 'Revisa los datos del ganador.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Agregar ganador del salón" icon={Store} onClose={onClose}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <p className="text-fg-muted">
          Para los bingos ganados con cartón físico. Aparece en Resultados con el nombre abreviado y el premio.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" value={form.name} onChange={set('name')} maxLength={120} autoComplete="off" />
          <Field label="Premio" value={form.prize} onChange={set('prize')} maxLength={120} placeholder="Ej. Motocicleta, ₡50 000" />
          <label className="block">
            <span className="font-bold text-fg">Cómo ganó (modalidad)</span>
            <select value={form.pattern} onChange={set('pattern')} className={selectCls}>
              {PATTERN_IDS.map((id) => (
                <option key={id} value={id}>
                  {PATTERNS[id].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-bold text-fg">Serie de cartones</span>
            <select value={form.seriesId} onChange={set('seriesId')} className={selectCls}>
              <option value="">Sin indicar</option>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value={OTHER_SERIES}>Otra (escribirla)…</option>
            </select>
          </label>
          {form.seriesId === OTHER_SERIES && (
            <Field
              label="Nombre de la serie"
              value={form.seriesLabel}
              onChange={set('seriesLabel')}
              maxLength={80}
              placeholder="Ej. Serie impresa B"
            />
          )}
          <Field label="N.º de cartón (opcional)" value={form.serial} onChange={set('serial')} inputMode="numeric" maxLength={8} />
          <Field label="Teléfono (opcional, no se publica)" type="tel" value={form.phone} onChange={set('phone')} maxLength={20} />
        </div>
        <Field
          label="Notas (opcional)"
          value={form.notes}
          onChange={set('notes')}
          maxLength={300}
          placeholder="Ej. Entregado en el salón al terminar la 3.ª serie"
        />
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={busy} icon={Plus}>
            Guardar ganador
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/**
 * Ganadores del salón (bingo jugado con cartones físicos): la administración los anota con nombre, premio,
 * modalidad, serie de cartones y número. Salen en Resultados junto a los ganadores en línea.
 */
export default function SalonWinners({ event, revision }) {
  const [winners, setWinners] = useState(null);
  const [series, setSeries] = useState([]);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!event?.id) return;
    adminApi
      .manualWinners(event.id)
      .then(setWinners)
      .catch((err) => setError(errorMessage(err)));
  }, [event?.id]);

  useEffect(() => {
    load();
  }, [load, revision]);
  useEffect(() => {
    adminApi
      .series()
      .then(setSeries)
      .catch(() => {});
  }, []);

  const remove = async () => {
    setBusy(true);
    try {
      await adminApi.deleteManualWinner(deleting.id);
      setDeleting(null);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="surface space-y-4 p-4 sm:p-5" aria-labelledby="salon-winners-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="salon-winners-title" className="flex items-center gap-2 text-xl font-black text-fg">
            <Store className="h-6 w-6 text-brand" aria-hidden /> Ganadores del salón
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm tabular-nums">{winners?.length ?? 0}</span>
          </h2>
          <p className="text-fg-muted">Bingos ganados con cartón físico: nombre, premio, cómo ganó y serie del cartón.</p>
        </div>
        <Button variant="gold" icon={Plus} onClick={() => setAdding(true)} disabled={!event} className="rounded-full!">
          Agregar ganador
        </Button>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {winners && winners.length === 0 && <p className="py-4 text-center text-fg-muted">Todavía no hay ganadores del salón anotados.</p>}
      {winners && winners.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {winners.map((w) => (
            <li key={w.id} className="flex gap-3 rounded-2xl bg-card p-3 ring-1 ring-line">
              {w.pattern ? (
                <PatternPreview pattern={w.pattern} active className="h-12 w-12" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-sol-gold/20 text-sol-gold-dark">
                  <Gift className="h-6 w-6" aria-hidden />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-black text-fg">{w.name}</p>
                <p className="flex items-center gap-1.5 font-bold text-sol-red dark:text-sol-gold">
                  <Gift className="h-4 w-4 shrink-0" aria-hidden /> {w.prize}
                </p>
                <p className="text-sm text-fg-muted">
                  {[w.pattern && PATTERNS[w.pattern]?.label, w.series && seriesText(w.series), w.serial && `Cartón #${w.serial}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {w.phone && (
                  <a
                    href={`tel:${w.phone.replace(/[\s-]/g, '')}`}
                    className="inline-flex items-center gap-1 text-sm text-fg-muted underline"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden /> {w.phone}
                  </a>
                )}
                {w.notes && <p className="text-sm italic text-fg-muted">{w.notes}</p>}
                <p className="text-xs text-fg-subtle">
                  {formatDate(w.createdAt)}
                  {w.createdBy && ` · ${w.createdBy}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleting(w)}
                aria-label={`Borrar el ganador ${w.name}`}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-fg-muted transition hover:bg-sol-red/10 hover:text-sol-red active:scale-90"
              >
                <Trash2 className="h-5 w-5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <WinnerForm
          event={event}
          series={series}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="¿Borrar este ganador?"
          icon={Trash2}
          confirmLabel="Borrar ganador"
          confirmVariant="danger"
          loading={busy}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        >
          {deleting.name} ({deleting.prize}) deja de aparecer en Resultados. Queda registrado en la bitácora.
        </ConfirmDialog>
      )}
    </section>
  );
}
