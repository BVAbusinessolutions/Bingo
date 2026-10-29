import { useEffect, useId, useState } from 'react';
import { AlertTriangle, Building2, Clock, Copy, FileText, Smartphone, Upload, X } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';
import { formatCRC } from '../../lib/format';
import { PAYMENT_DETAIL } from '../../config/site';

export const MAX_FILE = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

export function ReservationTimer({ expiresAt, onExpire }) {
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
      className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${urgent ? 'bg-sol-red text-white motion-safe:animate-pulse' : 'bg-sol-gold text-sol-blue'}`}
    >
      <span className="flex items-center gap-2 font-extrabold">
        <Clock className="h-6 w-6" aria-hidden /> Tiempo para pagar
      </span>
      <span className="text-3xl font-black tabular-nums">{label}</span>
    </div>
  );
}

export function CopyButton({ value, label, className = '' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // portapapeles no disponible (http sin localhost): se puede copiar a mano
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copiar ${label}`}
      className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-muted px-3 text-sm font-bold text-fg hover:bg-line ${className}`}
    >
      {copied ? (
        '¡Copiado!'
      ) : (
        <>
          <Copy className="h-4 w-4" aria-hidden /> Copiar
        </>
      )}
    </button>
  );
}

function CopyRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-bold text-fg-muted">{label}</p>
        <p className="break-all text-lg font-black text-fg">{value}</p>
      </div>
      <CopyButton value={value.replace(/\s/g, label === 'Titular' ? ' ' : '')} label={label} />
    </div>
  );
}

/** Aviso grande y obligatorio: el detalle del SINPE / transferencia debe decir "Bingo" (o "Bingo - cédula"). */
export function DetailTextAlert({ text, compact = false }) {
  if (compact) {
    return (
      <p className="flex items-center gap-2 rounded-xl border-2 border-sol-red bg-sol-red/10 p-3 font-extrabold text-fg">
        <AlertTriangle className="h-6 w-6 shrink-0 text-sol-red" aria-hidden />
        Recuerda: el detalle de tu pago debe decir <span className="rounded-md bg-sol-gold px-2 text-sol-blue">{text}</span>
      </p>
    );
  }
  return (
    <div role="alert" className="rounded-3xl border-4 border-sol-red bg-sol-gold p-5 text-center text-sol-blue shadow-lg sm:p-6">
      <p className="flex items-center justify-center gap-2 text-lg font-black uppercase tracking-wide sm:text-xl">
        <AlertTriangle className="h-7 w-7 shrink-0 text-sol-red" aria-hidden /> ¡Muy importante!
      </p>
      <p className="mt-2 text-lg font-bold sm:text-xl">En el detalle o descripción de tu SINPE Móvil o transferencia escribe:</p>
      <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <span className="rounded-2xl border-4 border-dashed border-sol-red bg-white px-8 py-2 text-5xl font-black tracking-[0.2em] text-sol-red sm:text-6xl">
          {text}
        </span>
        <CopyButton value={text} label={`la palabra ${text}`} className="bg-sol-blue text-white hover:bg-sol-blue-light" />
      </div>
      <p className="mt-3 font-semibold">
        También puedes agregar tu cédula: <span className="whitespace-nowrap rounded-md bg-white px-2 font-black text-sol-red">{text} - 1-2345-6789</span>
      </p>
      <p className="mt-1 font-semibold">Sin esta palabra no podremos identificar tu pago.</p>
    </div>
  );
}

export function PaymentInstructions({ method, setMethod, reservation }) {
  const p = reservation.payment;
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Método de pago" className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1.5">
        {[
          ['SINPE', Smartphone, 'SINPE Móvil'],
          ['TRANSFER', Building2, 'Transferencia u otro'],
        ].map(([m, Icon, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={method === m}
            onClick={() => setMethod(m)}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl font-extrabold transition ${
              method === m ? 'bg-sol-blue text-white shadow dark:bg-sol-gold dark:text-sol-blue' : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden /> {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="rounded-2xl border-2 border-line p-4">
        <p className="text-lg text-fg">
          {method === 'SINPE' ? 'Envía exactamente' : 'Transfiere exactamente'}{' '}
          <b className="text-2xl text-sol-red dark:text-sol-gold">{formatCRC(reservation.total)}</b>{' '}
          {method === 'SINPE' ? 'por SINPE Móvil a:' : 'a esta cuenta:'}
        </p>
        <div className="mt-1 divide-y divide-line">
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
      </div>

      <DetailTextAlert text={p.detail ?? PAYMENT_DETAIL} />
    </div>
  );
}

export function FileInput({ file, setFile, error }) {
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
      <label htmlFor={inputId} className="block font-bold text-fg">
        Foto o PDF del comprobante <span className="text-sol-red">*</span>
      </label>
      <label
        htmlFor={inputId}
        className={`mt-1.5 flex min-h-24 cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition hover:border-sol-blue dark:hover:border-sol-gold ${
          error ? 'border-sol-red' : 'border-line'
        }`}
      >
        {preview ? (
          <img src={preview} alt="Vista previa del comprobante" className="h-20 w-20 rounded-xl object-cover" />
        ) : file ? (
          <FileText className="h-12 w-12 text-brand" aria-hidden />
        ) : (
          <Upload className="h-10 w-10 text-fg-subtle" aria-hidden />
        )}
        <span className="min-w-0">
          <span className="block truncate text-lg font-extrabold text-fg">{file ? file.name : 'Toca aquí para subir el comprobante'}</span>
          <span className="text-fg-muted">{file ? `${(file.size / 1024).toFixed(0)} KB` : 'Captura de pantalla o PDF · máx. 5 MB'}</span>
        </span>
        {file && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setFile(null);
            }}
            aria-label="Quitar archivo"
            className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full text-fg-muted hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </label>
      <input id={inputId} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => setFile(e.target.files[0] ?? null)} />
      {error && <p className="mt-1 text-sm font-semibold text-sol-red dark:text-red-300">{error}</p>}
    </div>
  );
}
