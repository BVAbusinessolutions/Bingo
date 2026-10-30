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
        {/* Número propio de ancho fijo (no el marcador de lista, que en dos columnas se montaba sobre la
            columna izquierda): 1 a 10 quedan alineados con la misma sangría. El ancho va en em para que "10."
            siga cabiendo con letra A++ o Lexend (con un ancho en rem se salía y desfasaba el título). */}
        <ol className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.title} className="flex min-h-10 items-baseline gap-2">
              <span className="w-[2.2em] shrink-0 text-right font-bold tabular-nums text-brand" aria-hidden>
                {i + 1}.
              </span>
              <a href={`#seccion-${i + 1}`} className="font-medium text-sol-blue underline-offset-4 hover:underline dark:text-accent">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-8 space-y-8">
        {sections.map((s, i) => (
          <section key={s.title} id={`seccion-${i + 1}`} className="scroll-mt-28">
            <h3 className="flex gap-2 font-display text-2xl font-semibold text-fg">
              <span className="shrink-0 tabular-nums text-brand">{i + 1}.</span> {s.title}
            </h3>
            {/* Listas con sangría propia (pl) y marcador por dentro del margen: los números nunca se montan
                sobre el renglón anterior, y cada punto queda separado (mt). */}
            <div className="mt-2 space-y-3 text-lg leading-relaxed text-fg [&_h3]:pt-2 [&_h3]:text-xl [&_h3]:font-semibold [&_li]:mt-2 [&_li]:pl-1 [&_li]:marker:font-bold [&_li]:marker:text-brand [&_ol]:list-decimal [&_ol]:pl-8 [&_strong]:text-fg [&_ul]:list-disc [&_ul]:pl-7">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
