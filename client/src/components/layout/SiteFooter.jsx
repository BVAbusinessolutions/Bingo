import { Link } from 'react-router-dom';
import { Heart, Mail, MapPin, Phone, Scale } from 'lucide-react';
import { AGE_NOTE, SITE } from '../../config/site';
import { LEGAL_DOCS } from '../../config/legal';
import { openCookieSettings } from '../../lib/preferenciasPrivacidad';
import { PATHS } from '../../routing/paths';
import { BrandBadge } from '../brand/BrandLogo';

const linkCls = 'inline-flex min-h-10 items-center text-white/75 transition-colors hover:text-accent';
const titleCls = 'mb-3 text-xs font-bold uppercase tracking-[0.2em] text-accent';

const SITE_LINKS = [
  { to: PATHS.home, label: 'Inicio' },
  { to: PATHS.catalog, label: 'Comprar cartones' },
  { to: PATHS.results, label: 'Resultados y ganadores' },
  { to: PATHS.prizes, label: 'Premios' },
  { to: PATHS.rules, label: 'Reglamento' },
  { to: PATHS.contact, label: 'Contacto' },
];

export default function SiteFooter() {
  return (
    <footer className="relative mt-auto bg-navy-950 text-white print:hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-accent/70 to-transparent" aria-hidden />
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="space-y-4">
          <p className="flex items-center gap-3 font-display text-xl font-bold">
            <BrandBadge className="h-16 w-16" /> {SITE.name}
          </p>
          <p className="max-w-sm text-white/70">
            Cada cartón que compras apoya hogar, alimentación y educación para niños en situación de vulnerabilidad.
          </p>
          <p className="flex items-center gap-2 font-semibold text-accent">
            <Heart className="h-5 w-5" aria-hidden /> Gracias por jugar con propósito.
          </p>
        </div>

        <nav aria-label="Enlaces del sitio">
          <h2 className={titleCls}>El bingo</h2>
          <ul className="grid">
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
          <ul className="grid">
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
          <ul className="grid gap-1">
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
            <li className="flex min-h-10 items-center gap-2 text-white/75">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden /> {SITE.address}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-5 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}
            {SITE.legalId && ` · Cédula jurídica ${SITE.legalId}`}
          </p>
          <p className="flex max-w-2xl items-start gap-2 md:text-right">
            <Scale className="mt-0.5 h-4 w-4 shrink-0 text-accent/80" aria-hidden /> {AGE_NOTE}
          </p>
        </div>
      </div>
    </footer>
  );
}
