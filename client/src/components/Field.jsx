/** Input con etiqueta y mensaje de error, pensado para pantallas táctiles. */
export default function Field({ label, error, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-fg">{label}</span>
      <input
        {...props}
        aria-invalid={Boolean(error)}
        className={`mt-1 w-full rounded-xl border bg-card px-3 py-3 outline-none focus:ring-2 focus:ring-sol-gold ${
          error ? 'border-sol-red' : 'border-line'
        }`}
      />
      {error && <span className="text-xs text-sol-red">{error}</span>}
    </label>
  );
}
