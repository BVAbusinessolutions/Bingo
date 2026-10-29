import { Link, NavLink, useLocation } from 'react-router-dom';
import { Eye, FileText, Gavel, ListChecks, Mail, Scale, ShieldCheck } from 'lucide-react';
import LegalDocument, { ContactEmail } from '../../components/layout/LegalLayout';
import { LEGAL_DOCS } from '../../config/legal';
import { AGE_NOTE, SITE } from '../../config/site';
import { useCurrentEvent } from '../../hooks/useCurrentEvent';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PATHS } from '../../routing/paths';
// Todos los documentos van en el mismo archivo: cambiar de pestaña es instantáneo y no descarga nada más.
import terminos from '../../content/legal/terminos';
import privacidad from '../../content/legal/privacidad';
import reglamento from '../../content/legal/reglamento';
import contingencias from '../../content/legal/contingencias';
import propiedadIntelectual from '../../content/legal/propiedadIntelectual';
import navegador from '../../content/legal/navegador';
import edad from '../../content/legal/edad';
import impuestos from '../../content/legal/impuestos';
import pagosSinpe from '../../content/legal/pagosSinpe';

const DOCS = {
  terms: terminos,
  privacy: privacidad,
  rules: reglamento,
  contingencies: contingencias,
  intellectualProperty: propiedadIntelectual,
  age: edad,
  taxes: impuestos,
  sinpe: pagosSinpe,
  cookies: navegador,
};

// Cómo se garantiza la transparencia del sorteo (resumen del Centro Legal).
const TRANSPARENCY = [
  { icon: ListChecks, title: 'Verificación automática', text: 'El sistema revisa cada cartón vendido, en línea y en el salón, contra las balotas cantadas.' },
  { icon: Eye, title: 'Resultados públicos', text: 'Los ganadores confirmados se publican en Resultados con su número de cartón.' },
  { icon: ShieldCheck, title: 'Bitácora inalterable', text: 'Cada balota, pago y premio queda registrado con fecha, hora y responsable.' },
  { icon: Gavel, title: 'Normativa costarricense', text: 'Ley 8968 de datos personales, Ley 7472 del consumidor y Código Penal (Ley 9048).' },
];

function LegalTabs() {
  return (
    <nav aria-label="Documentos legales" className="sticky top-[4.5rem] z-30 -mx-4 border-b border-line bg-page/90 px-4 backdrop-blur-md print:hidden">
      <ul className="flex snap-x gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
        <li className="snap-start">
          <NavLink
            to={PATHS.legal}
            end
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition ${isActive ? 'bg-navy-950 text-white dark:bg-accent dark:text-navy-950' : 'text-fg-muted hover:bg-muted hover:text-fg'}`
            }
          >
            <Scale className="h-4 w-4" aria-hidden /> Resumen
          </NavLink>
        </li>
        {LEGAL_DOCS.map((d) => (
          <li key={d.id} className="snap-start">
            <NavLink
              to={d.to}
              className={({ isActive }) =>
                `flex min-h-11 items-center whitespace-nowrap rounded-xl px-3 text-sm font-semibold transition ${isActive ? 'bg-navy-950 text-white dark:bg-accent dark:text-navy-950' : 'text-fg-muted hover:bg-muted hover:text-fg'}`
              }
            >
              {d.short}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Overview() {
  return (
    <div className="animate-fade-in space-y-10">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TRANSPARENCY.map(({ icon: Icon, title, text }) => (
          <li key={title} className="surface lift p-5">
            <Icon className="mb-3 h-8 w-8 text-brand" aria-hidden />
            <h2 className="font-display text-lg font-semibold text-fg">{title}</h2>
            <p className="mt-1 text-fg-muted">{text}</p>
          </li>
        ))}
      </ul>

      <section aria-labelledby="docs-title">
        <h2 id="docs-title" className="font-display text-2xl font-semibold text-fg">
          Documentos
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LEGAL_DOCS.map((d) => (
            <li key={d.id}>
              <Link to={d.to} className="surface lift flex h-full items-start gap-3 p-5 transition hover:ring-2 hover:ring-accent/60">
                <FileText className="mt-0.5 h-6 w-6 shrink-0 text-brand" aria-hidden />
                <span>
                  <span className="block font-semibold text-fg">{d.label}</span>
                  <span className="mt-1 block text-sm text-fg-muted">{DOCS[d.id].intro}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="org-title" className="surface grid gap-4 p-6 md:grid-cols-2">
        <div>
          <h2 id="org-title" className="font-display text-xl font-semibold text-fg">
            Organización responsable
          </h2>
          <p className="mt-2 text-fg-muted">
            <strong className="text-fg">{SITE.name}</strong>
            {SITE.legalId && <>, cédula jurídica {SITE.legalId}</>}. Domicilio: {SITE.address}.
          </p>
          <p className="mt-2 flex items-center gap-2 text-fg-muted">
            <Mail className="h-4 w-4 shrink-0" aria-hidden /> <ContactEmail />
          </p>
        </div>
        <div className="rounded-2xl bg-muted p-4">
          <h2 className="flex items-center gap-2 font-semibold text-fg">
            <Scale className="h-5 w-5 text-brand" aria-hidden /> Edad y tutoría legal
          </h2>
          <p className="mt-1 text-fg-muted">{AGE_NOTE}</p>
        </div>
      </section>
    </div>
  );
}

/**
 * Centro Legal y Transparencia: un resumen y cada política en su pestaña (con URL propia,
 * p. ej. /reglamento, para compartirla o enlazarla desde el pie de página).
 */
export default function LegalCenterPage() {
  const { pathname } = useLocation();
  const { event } = useCurrentEvent();
  const active = LEGAL_DOCS.find((d) => d.to === pathname);
  const doc = active && DOCS[active.id];
  const sections = doc && (typeof doc.sections === 'function' ? doc.sections({ event }) : doc.sections);

  usePageMeta({
    title: doc ? doc.title : 'Centro Legal y Transparencia',
    description: doc ? doc.intro : 'Privacidad, reglamento, devoluciones, imagen, edad y tutoría legal, impuestos y pagos SINPE del Bingo Benéfico Hogar Sol.',
  });

  return (
    <main className="container-page pb-16 pt-10">
      <header className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sol-red dark:text-accent">{SITE.name}</p>
        <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">Centro Legal y Transparencia</h1>
        <p className="mt-1 max-w-2xl text-lg text-fg-muted">Todas las reglas del Bingo Benéfico en un solo lugar, conforme a la normativa de Costa Rica.</p>
      </header>
      <LegalTabs />
      <div className="pt-8">{doc ? <LegalDocument key={active.id} title={doc.title} intro={doc.intro} sections={sections} /> : <Overview />}</div>
    </main>
  );
}
