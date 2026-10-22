import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Loader2,
  Smartphone,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { reservationsApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useCountdown } from '../../hooks/useCountdown';
import Field from '../ui/Field';
import { paymentConfirmSchema, validate } from '../../lib/validation';
import { errorMessage, formatCRC } from '../../lib/format';

const MAX_FILE = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

function ReservationTimer({ expiresAt, onExpire }) {
  const t = useCountdown(expiresAt);
  useEffect(() => {
    if (t.done) onExpire();
  }, [t.done, onExpire]);
  const urgent = t.totalMs < 3 * 60_000;
  const label = `${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`;
  return (
    <div
      role="timer"
      aria-live={urgent ? 'assertive' : 'off'}
      aria-label={`Tiempo restante para pagar: ${t.minutes} minutos ${t.seconds} segundos`}
      className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 ${
        urgent ? 'animate-pulse bg-sol-red text-white' : 'bg-sol-gold text-sol-blue'
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-bold">
        <Clock className="h-5 w-5" aria-hidden /> Tus cartones están apartados
      </span>
      <span className="text-3xl font-black tabular-nums">{label}</span>
    </div>
  );
}

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, label === 'Titular' ? ' ' : ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // portapapeles no disponible (http sin localhost): el usuario puede copiar a mano
    }
  };
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="min-w-0">
        <p className="text-xs text-fg-muted">{label}</p>
        <p className="break-all font-bold text-fg">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copiar ${label}`}
        className="shrink-0 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold text-fg-muted hover:text-fg"
      >
        {copied ? '¡Copiado!' : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

function PaymentInstructions({ method, setMethod, reservation }) {
  const p = reservation.payment;
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Método de pago" className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
        {[
          ['SINPE', Smartphone, 'SINPE Móvil'],
          ['TRANSFER', Building2, 'Transferencia'],
        ].map(([m, Icon, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={method === m}
            onClick={() => setMethod(m)}
            className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition ${
              method === m ? 'surface text-brand' : 'text-fg-muted'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="rounded-xl border-2 border-sol-gold/60 bg-sol-gold/10 p-3">
        <p className="mb-1 text-sm text-fg">
          {method === 'SINPE' ? 'Envía exactamente' : 'Transfiere exactamente'}{' '}
          <b className="text-lg text-sol-red dark:text-sol-gold">{formatCRC(reservation.total)}</b>{' '}
          {method === 'SINPE' ? 'por SINPE Móvil a:' : 'a la cuenta IBAN:'}
        </p>
        <div className="divide-y divide-line">
          {method === 'SINPE' ? (
            <CopyRow label="Teléfono SINPE Móvil" value={p.sinpePhone} />
          ) : (
            <>
              <CopyRow label="Cuenta IBAN" value={p.iban} />
              <CopyRow label="Banco" value={p.bank} />
              <CopyRow label="Cédula jurídica" value={p.holderId} />
            </>
          )}
          <CopyRow label="Titular" value={p.holder} />
        </div>
        <p className="mt-2 text-xs text-fg-muted">
          En el detalle escribe: <b>Bingo {reservation.serials.map((s) => `#${s}`).join(' ')}</b>
        </p>
      </div>
    </div>
  );
}

function FileInput({ file, setFile, error }) {
  const inputId = useId();
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-medium text-fg">
        Comprobante (imagen o PDF, máx. 5 MB)
      </label>
      <label
        htmlFor={inputId}
        className={`mt-1 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3 transition hover:border-sol-gold ${
          error ? 'border-sol-red' : 'border-line'
        }`}
      >
        {preview ? (
          <img src={preview} alt="Vista previa del comprobante" className="h-14 w-14 rounded-lg object-cover" />
        ) : file ? (
          <FileText className="h-10 w-10 text-brand" aria-hidden />
        ) : (
          <Upload className="h-8 w-8 text-fg-subtle" aria-hidden />
        )}
        <span className="min-w-0 text-sm">
          <span className="block truncate font-semibold text-fg">{file ? file.name : 'Toca para adjuntar'}</span>
          <span className="text-xs text-fg-muted">{file ? `${(file.size / 1024).toFixed(0)} KB` : 'JPG, PNG, WEBP o PDF'}</span>
        </span>
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setFile(null);
            }}
            aria-label="Quitar archivo"
            className="ml-auto rounded-full p-1 text-fg-muted hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>
      <input id={inputId} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => setFile(e.target.files[0] ?? null)} />
      {error && <span className="text-xs text-sol-red">{error}</span>}
    </div>
  );
}

const RESULT = {
  PROOF_SUBMITTED: {
    Icon: CheckCircle2,
    color: 'text-emerald-500',
    title: '¡Comprobante recibido!',
    text: 'Tus cartones están "En verificación". Te avisaremos por correo cuando la Asociación apruebe el pago.',
  },
  APPROVED: { Icon: CheckCircle2, color: 'text-emerald-500', title: '¡Pago confirmado!', text: 'Tus cartones ya están asignados a tu cuenta.' },
  EXPIRED: { Icon: XCircle, color: 'text-fg-subtle', title: 'La reserva venció', text: 'Pasaron los 15 minutos y los cartones volvieron a estar disponibles.' },
  CANCELLED: { Icon: XCircle, color: 'text-fg-subtle', title: 'Reserva cancelada', text: 'Los cartones volvieron a estar disponibles.' },
  REJECTED: { Icon: XCircle, color: 'text-sol-red', title: 'Pago rechazado', text: 'No pudimos verificar el pago. Contáctanos si crees que es un error.' },
};

/**
 * Modal de pago SINPE Móvil / Transferencia.
 *  - reservation: respuesta de POST /reservations
 *  - onClose():   cierra (la reserva sigue activa; se puede retomar en "Mis compras")
 *  - onChange(r): la reserva cambió (enviada, cancelada, vencida)
 */
export default function PaymentModal({ reservation, onClose, onChange }) {
  const { user } = useAuth();
  const titleId = useId();
  const dialogRef = useRef(null);
  const [method, setMethod] = useState('SINPE');
  const [form, setForm] = useState({
    fullName: user?.name ?? '',
    nationalId: '',
    phone: '',
    email: user?.email ?? '',
    reference: '',
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Accesibilidad: foco inicial, Escape para cerrar, bloquear scroll del fondo.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const prevFocus = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [onClose]);

  const refresh = async () => onChange(await reservationsApi.get(reservation.id));

  const submit = async (e) => {
    e.preventDefault();
    const { data, errors } = validate(paymentConfirmSchema, { ...form, method });
    if (!form.reference.trim() && !file) errors.reference = 'Ingresa la referencia o adjunta el comprobante';
    if (file && file.size > MAX_FILE) errors.file = 'El archivo supera 5 MB';
    setErrors(errors);
    if (!data || Object.keys(errors).length) return;
    setBusy(true);
    try {
      onChange(await reservationsApi.confirmPayment(reservation.id, { ...data, file }));
    } catch (err) {
      setErrors({ server: errorMessage(err) });
      if (err.response?.data?.error === 'RESERVATION_NOT_PENDING') refresh();
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!window.confirm('¿Cancelar la reserva y liberar los cartones?')) return;
    onChange(await reservationsApi.cancel(reservation.id));
  };

  const bind = (name) => ({
    value: form[name],
    error: errors[name],
    onChange: (e) => setForm((f) => ({ ...f, [name]: e.target.value })),
  });

  const result = RESULT[reservation.status];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="surface flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-b-none outline-none sm:rounded-b-2xl"
      >
        {/* Encabezado festivo rojo / dorado */}
        <header className="flex items-center justify-between bg-linear-to-r from-sol-red-dark via-sol-red to-sol-red-dark px-4 py-3 text-white">
          <div>
            <h2 id={titleId} className="text-lg font-black">Pagar reserva</h2>
            <p className="text-xs text-white/85">
              {reservation.serials.length} cartón(es): {reservation.serials.map((s) => `#${s}`).join(', ')}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 hover:bg-white/15">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="h-1.5 bg-linear-to-r from-sol-gold via-sol-gold-light to-sol-gold" />

        <div className="space-y-4 overflow-y-auto p-4">
          {result ? (
            <div className="space-y-3 py-6 text-center">
              <result.Icon className={`mx-auto h-16 w-16 ${result.color}`} aria-hidden />
              <h3 className="text-xl font-black text-fg">{result.title}</h3>
              <p className="text-fg-muted">{result.text}</p>
              <div className="flex flex-col justify-center gap-2 pt-2 sm:flex-row">
                <Link to="/mis-compras" className="rounded-full bg-sol-blue px-5 py-2.5 font-bold text-white dark:bg-sol-gold dark:text-sol-blue">
                  Ver mis compras
                </Link>
                <button onClick={onClose} className="rounded-full border-2 border-line px-5 py-2.5 font-semibold text-fg">
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              <ReservationTimer expiresAt={reservation.expiresAt} onExpire={refresh} />

              <PaymentInstructions method={method} setMethod={setMethod} reservation={reservation} />

              <fieldset className="space-y-3">
                <legend className="mb-1 font-bold text-fg">Datos del comprador</legend>
                <Field label="Nombre completo" autoComplete="name" {...bind('fullName')} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Cédula / ID" {...bind('nationalId')} />
                  <Field label="Teléfono" type="tel" autoComplete="tel" {...bind('phone')} />
                </div>
                <Field label="Correo electrónico" type="email" autoComplete="email" {...bind('email')} />
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="mb-1 font-bold text-fg">Comprobante de pago</legend>
                <Field
                  label={method === 'SINPE' ? 'N.º de comprobante / referencia SINPE' : 'N.º de referencia de la transferencia'}
                  inputMode="numeric"
                  {...bind('reference')}
                />
                <FileInput file={file} setFile={setFile} error={errors.file} />
                <p className="text-xs text-fg-muted">Ingresa la referencia, adjunta el comprobante, o ambos.</p>
              </fieldset>

              {errors.server && (
                <p role="alert" className="flex items-center gap-2 rounded-lg bg-sol-red/10 p-2 text-sm text-sol-red">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {errors.server}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                <div>
                  <p className="text-xs text-fg-muted">Total</p>
                  <p className="text-2xl font-black text-sol-red dark:text-sol-gold">{formatCRC(reservation.total)}</p>
                </div>
                <button
                  disabled={busy}
                  className="flex items-center gap-2 rounded-xl bg-sol-gold px-5 py-3 font-black text-sol-blue shadow hover:bg-sol-gold-dark disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar comprobante
                </button>
              </div>
              <button type="button" onClick={cancel} className="w-full text-center text-sm text-fg-muted hover:underline">
                Cancelar reserva y liberar cartones
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
