/**
 * Encabezado común de los paneles de Contacto: ícono en placa azul con filo dorado, rótulo pequeño y título.
 * Todos los paneles lo usan para que arranquen a la misma altura y con el mismo ritmo.
 */
export default function PanelTitle({ icon: Icon, eyebrow, title, id, description, centered = false }) {
  return (
    <div className={`flex gap-3 ${centered ? 'flex-col items-center text-center' : 'items-center'}`}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy-950 text-accent shadow-[0_8px_20px_rgb(2_6_23/0.25)] ring-1 ring-accent/30">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sol-red dark:text-accent">{eyebrow}</p>
        <h2 id={id} className="font-display text-xl font-bold leading-tight text-fg sm:text-2xl">
          {title}
        </h2>
        {description && <p className={`mt-1 text-fg-muted ${centered ? 'mx-auto max-w-2xl' : ''}`}>{description}</p>}
      </div>
    </div>
  );
}
