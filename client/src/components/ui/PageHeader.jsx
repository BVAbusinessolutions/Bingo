/** Título de página consistente: eyebrow opcional, título, descripción y acciones a la derecha. */
export default function PageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <header className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-extrabold uppercase tracking-widest text-sol-red dark:text-sol-gold">{eyebrow}</p>}
        <h1 className="text-3xl font-black text-brand sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-lg text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 print:hidden">{actions}</div>}
    </header>
  );
}
