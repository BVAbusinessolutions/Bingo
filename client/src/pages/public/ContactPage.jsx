import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { SITE } from '../../config/site';

const CHANNELS = [
  { icon: MessageCircle, label: 'WhatsApp', value: 'Escríbenos por WhatsApp', href: `https://wa.me/${SITE.whatsapp}`, external: true },
  { icon: Phone, label: 'Teléfono', value: SITE.contactPhone, href: `tel:${SITE.contactPhone.replace(/\s/g, '')}` },
  { icon: Mail, label: 'Correo', value: SITE.contactEmail, href: `mailto:${SITE.contactEmail}` },
];

const FAQ = [
  ['Pagué y mis cartones no aparecen', 'Verificamos los pagos lo antes posible. Cuando se apruebe, verás un aviso y tus cartones aparecerán en “Mis compras” y en “Jugar en vivo”.'],
  ['No me llegó el correo de confirmación', 'Revisa la carpeta de correo no deseado. También puedes pedir un enlace nuevo desde el aviso amarillo al iniciar sesión.'],
  ['¿Cómo sé si gané?', 'Tu cartón se ilumina cuando completas el patrón. Pulsa “¡Bingo!” y la Asociación confirmará tu premio.'],
];

export default function ContactPage() {
  return (
    <main className="container-page space-y-10 py-10">
      <PageHeader eyebrow="Estamos para ayudarte" title="Contacto" description="¿Tienes dudas sobre tu compra o el sorteo? Escríbenos o llámanos." />

      <div className="grid gap-4 sm:grid-cols-3">
        {CHANNELS.map(({ icon: Icon, label, value, href, external }) => (
          <a
            key={label}
            href={href}
            {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
            className="surface flex flex-col items-start gap-3 p-6 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-sol-gold"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-sol-blue text-white dark:bg-sol-gold dark:text-sol-blue">
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-sm font-extrabold uppercase tracking-wider text-fg-muted">{label}</span>
            <span className="break-all text-lg font-black text-fg">{value}</span>
          </a>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <p className="surface flex items-center gap-3 p-5 text-lg text-fg">
          <Clock className="h-6 w-6 shrink-0 text-brand" aria-hidden /> {SITE.schedule}
        </p>
        <p className="surface flex items-center gap-3 p-5 text-lg text-fg">
          <MapPin className="h-6 w-6 shrink-0 text-brand" aria-hidden /> {SITE.address}
        </p>
      </div>

      <section aria-labelledby="faq-title" className="space-y-3">
        <h2 id="faq-title" className="text-2xl font-black text-fg">
          Preguntas frecuentes
        </h2>
        {FAQ.map(([q, a]) => (
          <details key={q} className="surface group p-5 open:ring-2 open:ring-sol-gold">
            <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 text-lg font-extrabold text-fg">
              {q}
              <span aria-hidden className="text-2xl text-brand transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-lg text-fg-muted">{a}</p>
          </details>
        ))}
      </section>
    </main>
  );
}
