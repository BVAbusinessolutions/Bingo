import { Link } from 'react-router-dom';
import { Heart, Mail, MapPin, Phone, Scale } from 'lucide-react';
import { AGE_NOTE, SITE } from '../../config/site';
import { LEGAL_DOCS } from '../../config/legal';
import { openCookieSettings } from '../../lib/preferenciasPrivacidad';
import { PATHS } from '../../routing/paths';
import { BrandBadge } from '../brand/BrandLogo';

// Pie compacto: enlaces en text-sm con área táctil de 32 px (antes 40 px por renglón inflaban la altura).
const linkCls = 'inline-flex min-h-8 items-center text-sm text-white/70 transition-colors hover:text-accent focus-visible:text-accent';
const titleCls = 'mb-1.5 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-accent';

const SITE_LINKS = [
  { to: PATHS.home, label: 'Inicio' },
  { to: PATHS.catalog, label: 'Comprar cartones' },
  { to: PATHS.results, label: 'Resultados' },
  { to: PATHS.prizes, label: 'Premios' },
  { to: PATHS.rules, label: 'Reglamento' },
  { to: PATHS.contact, label: 'Contacto' },
];

export default function SiteFooter() {
  return (
    // Noche: vidrio al 75 %. Día: casi opaco, porque el azul translúcido sobre la página clara se ve gris lavado.
    <footer className="relative mt-auto border-t border-white/10 bg-navy-950/95 text-white backdrop-blur-md dark:bg-[rgb(15_23_42/0.75)] print:hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-accent/60 to-transparent" aria-hidden />
      <div className="container-page grid gap-6 py-7 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_1.6fr_1.2fr]">
        <div className="space-y-2">
          <p className="flex items-center gap-2.5 font-display text-base font-bold">
            <BrandBadge className="h-10 w-10" /> {SITE.name}
          </p>
          <p className="max-w-xs text-sm text-white/65">Cada cartón apoya hogar, alimentación y educación para niños en situación de vulnerabilidad.</p>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-accent">
            <Heart className="h-4 w-4" aria-hidden /> Gracias por jugar con propósito.
          </p>
        </div>

        <nav aria-label="Enlaces del sitio">
          <h2 className={titleCls}>El bingo</h2>
          <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-1">
            {SITE_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className={linkCls}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Centro legal">
          <h2 className={titleCls}>Centro legal</h2>
          {/* Dos columnas siempre: con 10 documentos, una sola columna duplicaba la altura del pie. */}
          <ul className="grid grid-cols-2 gap-x-4">
            {LEGAL_DOCS.map((d) => (
              <li key={d.to}>
                <Link to={d.to} className={linkCls}>
                  {d.short}
                </Link>
              </li>
            ))}
            <li>
              <button type="button" onClick={openCookieSettings} className={linkCls}>
                Configurar cookies
              </button>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className={titleCls}>Contacto</h2>
          <ul className="grid">
            <li>
              <a href={`mailto:${SITE.contactEmail}`} className={`${linkCls} gap-2 break-all`}>
                <Mail className="h-4 w-4 shrink-0" aria-hidden /> {SITE.contactEmail}
              </a>
            </li>
            <li>
              <a href={`tel:${SITE.contactPhone.replace(/\s/g, '')}`} className={`${linkCls} gap-2`}>
                <Phone className="h-4 w-4 shrink-0" aria-hidden /> {SITE.contactPhone}
              </a>
            </li>
            <li>
              <Link to={PATHS.contact} className={`${linkCls} gap-2`}>
                <MapPin className="h-4 w-4 shrink-0" aria-hidden /> {SITE.eventVenue}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Una sola línea discreta: copyright + nota de edad, sin bloques vacíos a los lados. */}
      <div className="border-t border-white/10">
        <p className="container-page flex flex-wrap items-center gap-x-2 gap-y-1 py-3 text-xs text-white/55">
          <span className="whitespace-nowrap">
            © {new Date().getFullYear()} {SITE.name}
            {SITE.legalId && ` · Cédula jurídica ${SITE.legalId}`}
          </span>
          <span aria-hidden className="hidden text-white/25 sm:inline">
            |
          </span>
          <Scale className="h-3.5 w-3.5 shrink-0 text-accent/70" aria-hidden />
          <span className="min-w-0 flex-1">{AGE_NOTE}</span>
        </p>
      </div>
    </footer>
  );
}
