import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import { useBackdropClose } from '../../hooks/useBackdropClose';
import Field from '../ui/Field';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { errorMessage, formatCRC } from '../../lib/format';

const EMPTY = { serials: '', fullName: '', nationalId: '', phone: '', email: '', method: 'CASH', reference: '' };

/** "1001, 1002 1005-1007" -> ['1001','1002','1005','1006','1007'] (máx. 50). */
export function parseSerials(text) {
  const out = new Set();
  for (const part of text.split(/[\s,;]+/).filter(Boolean)) {
    const range = part.match(/^(\d{1,8})-(\d{1,8})$/);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])].sort((x, y) => x - y);
      for (let n = a; n <= b && out.size <= 50; n++) out.add(String(n));
    } else if (/^\d{1,8}$/.test(part)) out.add(part);
  }
  return [...out];
}

/** Registrar una venta en efectivo o en persona: queda aprobada al instante y los cartones se marcan vendidos. */
export default function ManualSaleDialog({ event, onClose, onDone }) {
  const backdrop = useBackdropClose(onClose);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const serials = parseSerials(form.serials);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (serials.length === 0) return setError('Escribe al menos un número de cartón.');
    setBusy(true);
    setError('');
    try {
      await adminApi.manualSale({ ...form, serials, eventId: event.id });
      onDone();
    } catch (err) {
      setError(errorMessage(err, 'Revisa los datos del comprador.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" {...backdrop}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Registrar venta manual"
        onSubmit={submit}
        noValidate
        onClick={(e) => e.stopPropagation()}
        className="surface w-full max-w-2xl space-y-4 p-6"
      >
        <header className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-fg">Venta manual · {event.name}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-11 w-11 place-items-center rounded-full hover:bg-muted"
          >
            <X />
          </button>
        </header>
        <Field
          label="Números de cartón"
          value={form.serials}
          onChange={set('serials')}
          hint="Separados por coma o espacio. Rangos: 1001-1005"
        />
        {serials.length > 0 && (
          <p className="font-bold text-fg">
            {serials.length} cartón(es) · Total {formatCRC(serials.length * event.price)}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" value={form.fullName} onChange={set('fullName')} />
          <Field label="Cédula" value={form.nationalId} onChange={set('nationalId')} />
          <Field label="Teléfono" type="tel" value={form.phone} onChange={set('phone')} />
          <Field
            label="Correo (opcional)"
            type="email"
            value={form.email}
            onChange={set('email')}
            hint="Si tiene cuenta con este correo, verá los cartones al entrar."
          />
          <label className="block">
            <span className="font-bold text-fg">Forma de pago</span>
            <select
              value={form.method}
              onChange={set('method')}
              className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-fg"
            >
              <option value="CASH">Efectivo</option>
              <option value="SINPE">SINPE Móvil</option>
              <option value="TRANSFER">Transferencia bancaria u otro</option>
            </select>
          </label>
          <Field label="N.º de comprobante (opcional)" value={form.reference} onChange={set('reference')} />
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="success" loading={busy}>
            Registrar venta
          </Button>
        </div>
      </form>
    </div>
  );
}
