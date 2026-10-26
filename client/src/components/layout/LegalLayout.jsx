import { SITE } from '../../config/site';

/** Formato de lectura cómoda para textos largos (términos, privacidad): índice + secciones numeradas. */
export default function LegalLayout({ title, intro, sections }) {
  return (
    <main className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-extrabold uppercase tracking-widest text-sol-red dark:text-sol-gold">{SITE.name}</p>
        <h1 className="text-3xl font-black text-brand sm:text-4xl">{title}</h1>
        <p className="mt-1 text-fg-muted">Última actualización: {SITE.legalUpdatedAt}</p>
        {intro && <p className="mt-4 text-lg text-fg">{intro}</p>}

        <nav aria-label="Contenido" className="surface mt-6 p-5">
          <h2 className="mb-2 font-black text-fg">Contenido</h2>
          <ol className="grid list-decimal gap-1 pl-6 marker:font-bold marker:text-brand sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.title}>
                <a
                  href={`#seccion-${i + 1}`}
                  className="inline-flex min-h-9 items-center font-semibold text-sol-blue underline-offset-4 hover:underline dark:text-sol-gold"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-8 space-y-8">
          {sections.map((s, i) => (
            <section key={s.title} id={`seccion-${i + 1}`} className="scroll-mt-24">
              <h2 className="text-2xl font-black text-fg">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-2 space-y-3 text-lg leading-relaxed text-fg-muted [&_li]:ml-6 [&_li]:list-disc [&_strong]:text-fg">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
