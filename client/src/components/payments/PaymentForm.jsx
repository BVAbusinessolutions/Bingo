import { useCallback, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { reservationsApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import Field from '../ui/Field';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { DetailTextAlert, FileInput, MAX_FILE, PaymentInstructions, ReservationTimer } from './PaymentPieces';
import { paymentConfirmSchema, validate } from '../../lib/validation';
import { errorMessage, formatCRC } from '../../lib/format';
import { PAYMENT_DETAIL } from '../../config/site';

function StepSection({ number, title, children }) {
  return (
    <section className="surface space-y-4 p-5 sm:p-6">
      <h2 className="flex items-center gap-3 text-2xl font-black text-fg">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sol-blue text-lg text-white dark:bg-sol-gold dark:text-sol-blue">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function OrderSummary({ reservation, onExpire, busy, onCancel }) {
  return (
    <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start" aria-label="Resumen de la compra">
      <ReservationTimer expiresAt={reservation.expiresAt} onExpire={onExpire} />
      <div className="surface space-y-4 p-5">
        <h2 className="text-xl font-black text-fg">Resumen</h2>
        <div>
          <p className="font-bold text-fg-muted">{reservation.eventName}</p>
          <p className="mt-2 flex flex-wrap gap-1.5">
            {reservation.serials.map((s) => (
              <span key={s} className="rounded-lg bg-sol-red px-2.5 py-1 font-black text-white">
                #{s}
              </span>
            ))}
          </p>
        </div>
        <div className="flex items-end justify-between border-t border-line pt-3">
          <span className="text-lg font-bold text-fg-muted">{reservation.serials.length} cartón(es)</span>
          <span className="text-3xl font-black text-sol-red dark:text-sol-gold">{formatCRC(reservation.total)}</span>
        </div>
        <Button type="submit" form="payment-form" variant="gold" size="lg" icon={Send} loading={busy} className="w-full">
          Enviar compra
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="flex min-h-11 w-full items-center justify-center gap-2 font-bold text-fg-muted hover:text-sol-red hover:underline"
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Cancelar y liberar cartones
        </button>
      </div>
    </aside>
  );
}

/**
 * Paso 2 de la compra: instrucciones de pago, datos del comprador, número y foto del comprobante.
 *  - onChange(r): la reserva cambió (enviada, cancelada o vencida) → el paso 3 muestra el resultado
 */
export default function PaymentForm({ reservation, onChange }) {
  const { user } = useAuth();
  const [method, setMethod] = useState('SINPE');
  const [form, setForm] = useState({
    fullName: user?.name ?? '',
    nationalId: '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    reference: '',
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => onChange(await reservationsApi.get(reservation.id)), [onChange, reservation.id]);

  const submit = async (e) => {
    e.preventDefault();
    const { data, errors } = validate(paymentConfirmSchema, { ...form, method });
    if (!file) errors.file = 'Sube la foto o el PDF del comprobante';
    else if (file.size > MAX_FILE) errors.file = 'El archivo supera 5 MB';
    setErrors(errors);
    if (!data || Object.keys(errors).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setBusy(true);
    try {
      onChange(await reservationsApi.confirmPayment(reservation.id, { ...data, file }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrors({ server: errorMessage(err) });
      if (err.response?.data?.error === 'RESERVATION_NOT_PENDING') refresh();
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm('¿Cancelar la compra y liberar los cartones?')) return;
    onChange(await reservationsApi.cancel(reservation.id));
  };

  const bind = (name) => ({
    value: form[name],
    error: errors[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form id="payment-form" onSubmit={submit} noValidate className="space-y-5">
        <StepSection number="1" title="Realiza el pago">
          <PaymentInstructions method={method} setMethod={setMethod} reservation={reservation} />
        </StepSection>

        <StepSection number="2" title="Tus datos">
          <Field label="Nombre completo" autoComplete="name" {...bind('fullName')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cédula o identificación" hint="Ej.: 1-2345-6789" {...bind('nationalId')} />
            <Field label="Teléfono" type="tel" inputMode="tel" autoComplete="tel" hint="Ej.: 8888-8888" {...bind('phone')} />
          </div>
          <Field
            label="Correo electrónico"
            type="email"
            inputMode="email"
            autoComplete="email"
            hint="Aquí te avisaremos cuando se apruebe tu compra."
            {...bind('email')}
          />
        </StepSection>

        <StepSection number="3" title="Comprobante de pago">
          <Field
            label={method === 'SINPE' ? 'Número de comprobante del SINPE *' : 'Número de comprobante de la transferencia *'}
            inputMode="numeric"
            hint="Lo encuentras en el mensaje o la pantalla de confirmación de tu banco."
            {...bind('reference')}
          />
          <FileInput file={file} setFile={setFile} error={errors.file} />
          <DetailTextAlert text={reservation.payment.detail ?? PAYMENT_DETAIL} compact />
          {errors.server && <Alert tone="error">{errors.server}</Alert>}
        </StepSection>
      </form>

      <OrderSummary reservation={reservation} onExpire={refresh} busy={busy} onCancel={cancel} />
    </div>
  );
}
