import { useId } from 'react';

/** Input con etiqueta, ayuda y mensaje de error, pensado para pantallas táctiles y lectores de pantalla. */
export default function Field({ label, error, hint, className = '', id, ...props }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="block font-bold text-fg">
        {label}
      </label>
      <input
        id={inputId}
        {...props}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`mt-1.5 min-h-12 w-full rounded-xl border-2 bg-card px-4 py-3 text-base text-fg outline-none transition placeholder:text-fg-subtle focus:border-sol-blue focus:ring-4 focus:ring-sol-gold/40 dark:focus:border-sol-gold ${
          error ? 'border-sol-red' : 'border-line'
        }`}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1 text-sm text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm font-semibold text-sol-red dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
