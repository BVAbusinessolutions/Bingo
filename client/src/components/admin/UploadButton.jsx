import { useId, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Upload } from 'lucide-react';
import { errorMessage } from '../../lib/format';

const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';
const MAX = 5 * 1024 * 1024;

/**
 * Botón que elige una foto o PDF (máx. 5 MB) y lo sube con `onUpload(file)`. Muestra "Subiendo…", confirma
 * con un check y explica el error si el archivo no sirve. Para comprobantes de compras y facturas de gastos.
 */
export default function UploadButton({ label = 'Subir comprobante', onUpload, variant = 'outline', size = 'md', className = '' }) {
  const inputId = useId();
  const input = useRef(null);
  const [state, setState] = useState('idle'); // idle | busy | done
  const [error, setError] = useState('');

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    if (file.size > MAX) return setError('El archivo pesa más de 5 MB.');
    setState('busy');
    setError('');
    try {
      await onUpload(file);
      setState('done');
      setTimeout(() => setState('idle'), 2500);
    } catch (err) {
      setError(errorMessage(err));
      setState('idle');
    }
  };

  const tone =
    variant === 'gold'
      ? 'bg-sol-gold text-sol-blue hover:bg-sol-gold-dark'
      : 'border-2 border-sol-blue text-sol-blue hover:bg-sol-blue hover:text-white dark:border-sol-gold dark:text-sol-gold dark:hover:bg-sol-gold dark:hover:text-sol-blue';
  const height = size === 'sm' ? 'min-h-10 px-3 text-sm' : 'min-h-11 px-4';

  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={inputId}
        className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-extrabold transition duration-200 active:scale-95 ${height} ${tone} ${
          state === 'busy' ? 'pointer-events-none opacity-70' : ''
        }`}
      >
        {state === 'busy' ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : state === 'done' ? (
          <CheckCircle2 className="h-5 w-5" aria-hidden />
        ) : (
          <Upload className="h-5 w-5" aria-hidden />
        )}
        {state === 'busy' ? 'Subiendo…' : state === 'done' ? '¡Listo!' : label}
      </label>
      <input ref={input} id={inputId} type="file" accept={ACCEPT} className="sr-only" onChange={pick} disabled={state === 'busy'} />
      {error && (
        <span role="alert" className="text-sm font-semibold text-sol-red dark:text-red-300">
          {error}
        </span>
      )}
    </span>
  );
}
