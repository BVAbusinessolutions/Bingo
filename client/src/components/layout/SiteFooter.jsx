import { Link } from 'react-router-dom';
import { Heart, Mail, MapPin, Phone, Sun } from 'lucide-react';
import { SITE } from '../../config/site';
import { PATHS } from '../../routing/paths';

const linkCls = 'inline-flex min-h-10 items-center text-white/85 hover:text-sol-gold hover:underline';

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t-4 border-sol-gold bg-sol-blue text-white dark:bg-[#0a1628] print:hidden">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-2">
          <p className="flex items-center gap-2 text-xl font-black">
            <Sun className="h-7 w-7 text-sol-gold" aria-hidden /> {SITE.name}
          </p>
          <p className="max-w-md text-white/80">
            Cada cartón que compras apoya hogar, alimentación y educación para niños en situación de vulnerabilidad.
          </p>
          <p className="flex items-center gap-2 font-bold text-sol-gold">
            <Heart className="h-5 w-5" aria-hidden /> Gracias por jugar con propósito.
          </p>
        </div>

        <nav aria-label="Enlaces del sitio">
          <h2 className="mb-2 font-black uppercase tracking-wider text-sol-gold">El bingo</h2>
          <ul className="grid">
            <li><Link to={PATHS.catalog} className={linkCls}>Comprar cartones</Link></li>
            <li><Link to={PATHS.results} className={linkCls}>Resultados y ganadores</Link></li>
            <li><Link to={PATHS.terms} className={linkCls}>Términos y condiciones</Link></li>
            <li><Link to={PATHS.privacy} className={linkCls}>Política de privacidad</Link></li>
            <li><Link to={PATHS.contact} className={linkCls}>Contacto</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="mb-2 font-black uppercase tracking-wider text-sol-gold">Contacto</h2>
          <ul className="grid gap-1 text-white/85">
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
            <li className="flex min-h-10 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden /> {SITE.address}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/15">
        <p className="container-page py-4 text-center text-sm text-white/70">
          © {new Date().getFullYear()} {SITE.name}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
