import { Printer } from 'lucide-react';
import { SITE } from '../../config/site';

/** Enlace de correo de contacto dentro de los textos legales. */
export const ContactEmail = () => (
  <a className="font-semibold text-sol-blue underline dark:text-accent" href={`mailto:${SITE.contactEmail}`}>
    {SITE.contactEmail}
  </a>
);

/**
 * Un documento legal: título, índice y secciones numeradas, en formato de lectura cómoda.
 * `sections` ya resueltas (el Centro Legal las calcula con el evento vigente cuando hace falta).
 */
export default function LegalDocument({ title, intro, sections }) {
  return (
    <article className="mx-auto max-w-3xl animate-fade-in">
      <h2 className="font-display text-3xl font-bold text-brand sm:text-4xl">{title}</h2>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-fg-muted">
        <p>Última actualización: {SITE.legalUpdatedAt}</p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 font-semibold transition hover:bg-muted hover:text-fg print:hidden"
        >
          <Printer className="h-4 w-4" aria-hidden /> Imprimir o guardar en PDF
        </button>
      </div>
      {intro && <p className="mt-4 text-lg text-fg">{intro}</p>}

      <nav aria-label={`Contenido de ${title}`} className="surface mt-6 p-5 print:hidden">
        <h3 className="mb-2 font-semibold text-fg">Contenido</h3>
        <ol className="grid list-decimal gap-1 pl-6 marker:font-bold marker:text-brand sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.title}>
              <a
                href={`#seccion-${i + 1}`}
                className="inline-flex min-h-9 items-center font-medium text-sol-blue underline-offset-4 hover:underline dark:text-accent"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 space-y-8">
        {sections.map((s, i) => (
          <section key={s.title} id={`seccion-${i + 1}`} className="scroll-mt-28">
            <h3 className="font-display text-2xl font-semibold text-fg">
              {i + 1}. {s.title}
            </h3>
            <div className="mt-2 space-y-3 text-lg leading-relaxed text-fg-muted [&_h3]:pt-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-fg [&_li]:ml-6 [&_li]:list-disc [&_ol>li]:list-decimal [&_strong]:text-fg">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
