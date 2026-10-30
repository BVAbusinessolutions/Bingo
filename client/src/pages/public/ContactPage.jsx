import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, Clock, HelpCircle, Lightbulb, Mail, MapPin, MessageCircle, Phone, Send, ShieldAlert, Smartphone } from 'lucide-react';
import { contactApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { usePageMeta } from '../../hooks/usePageMeta';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { CopyButton } from '../../components/payments/PaymentPieces';
import { MOTORCYCLE_REQUIREMENT, PAYMENT_DETAIL, SITE } from '../../config/site';
import { errorMessage } from '../../lib/format';

const CHANNELS = [
  { icon: MessageCircle, label: 'WhatsApp', value: 'Escríbenos por WhatsApp', href: `https://wa.me/${SITE.whatsapp}`, external: true },
  { icon: Phone, label: 'Teléfono de soporte', value: SITE.contactPhone, href: `tel:${SITE.contactPhone.replace(/\s/g, '')}` },
  { icon: Mail, label: 'Correo', value: SITE.contactEmail, href: `mailto:${SITE.contactEmail}` },
];

const TOPICS = [
  ['COMPRA', 'Compra o pago de cartones'],
  ['PREMIO', 'Premios y ganadores'],
  ['CUENTA', 'Mi cuenta'],
  ['DATOS', 'Mis datos personales (Ley 8968)'],
  ['OTRO', 'Otro tema'],
];

const FAQ = [
  [
    'Pagué y mis cartones no aparecen',
    'Verificamos los pagos lo antes posible. Cuando se apruebe, verás un aviso y tus cartones aparecerán en “Mis compras” y en “Jugar en vivo”.',
  ],
  [
    'No me llegó el correo de confirmación',
    'Revisa la carpeta de correo no deseado. También puedes pedir un enlace nuevo desde el aviso amarillo al iniciar sesión.',
  ],
  ['¿Cómo sé si gané?', 'Tu cartón se ilumina cuando completas el patrón. Pulsa “¡Bingo!” y la Asociación confirmará tu premio.'],
  [
    '¿Puedo participar si vivo fuera de San José?',
    'Sí. Además de jugar en el salón del evento, puedes jugar en línea desde cualquier lugar con internet: compras tus cartones aquí, sigues la transmisión y marcas tus números en “Jugar en vivo”, con las mismas bolas y reglas.',
  ],
  ['¿Cómo se entrega el premio mayor de la motocicleta?', `Cuando la Asociación confirma el bingo, te contacta para coordinar la entrega. ${MOTORCYCLE_REQUIREMENT}`],
  [
    '¿Qué requisitos debe cumplir mi comprobante de pago SINPE Móvil?',
    `Debe ser por el monto exacto de tu compra, al número y titular que muestra la plataforma, y con la palabra “${PAYMENT_DETAIL}” en el detalle. Al enviarlo, escribe el número de comprobante y adjunta la foto o captura. Cada comprobante sirve para una sola compra.`,
  ],
  [
    '¿Puedo regalar o transferir cartones a un familiar?',
    'Los cartones quedan a nombre de la cuenta que los compró, y esa persona titular es quien responde por ellos y quien reclama el premio; la plataforma no permite traspasarlos a otra cuenta. Un familiar sí puede jugar con ellos acompañado de la persona titular (por ejemplo, menores de edad con su madre, padre o tutor).',
  ],
];

const SUGGESTION_KINDS = ['Sugerencia', 'Felicitación', 'Algo no funciona'];

/** Buzón de sugerencias: llega a la Asociación por el mismo canal del formulario de contacto (tema SUGERENCIA). */
function SuggestionBox() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', kind: SUGGESTION_KINDS[0], message: '', website: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 3 || !form.email.includes('@') || form.message.trim().length < 10) {
      return setError('Escribe tu nombre, un correo válido y un comentario de al menos 10 caracteres.');
    }
    setStatus('sending');
    setError('');
    try {
      await contactApi.send({ name: form.name, email: form.email, phone: '', topic: 'SUGERENCIA', message: `[${form.kind}] ${form.message}`, website: form.website });
      setStatus('sent');
      setForm((f) => ({ ...f, message: '' }));
    } catch (err) {
      setError(errorMessage(err, 'No pudimos enviar tu comentario. Intenta de nuevo en unos minutos.'));
      setStatus('idle');
    }
  };

  return (
    <section aria-labelledby="buzon-title" className="surface relative overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-sol-gold/20 blur-3xl" aria-hidden />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-2">
          <h2 id="buzon-title" className="flex items-center gap-2 font-display text-2xl font-semibold text-fg">
            <Lightbulb className="h-7 w-7 text-sol-gold-dark dark:text-accent" aria-hidden /> Buzón de sugerencias
          </h2>
          <p className="text-fg-muted">¿Cómo podemos mejorar el bingo? Tu opinión llega directo a la Asociación y nos ayuda a hacerlo mejor para todos.</p>
        </div>
        {status === 'sent' ? (
          <div role="status" className="flex animate-pop flex-col items-start gap-3">
            <p className="flex items-center gap-2 text-lg font-semibold text-fg">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-hidden /> ¡Gracias! Recibimos tu comentario.
            </p>
            <Button variant="outline" size="sm" onClick={() => setStatus('idle')}>
              Enviar otro comentario
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
            <div role="radiogroup" aria-label="Tipo de comentario" className="flex flex-wrap gap-2 sm:col-span-2">
              {SUGGESTION_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={form.kind === k}
                  onClick={() => setForm((f) => ({ ...f, kind: k }))}
                  className={`inline-flex h-11 items-center rounded-full px-4 text-sm font-bold ring-1 transition active:scale-95 ${
                    form.kind === k ? 'bg-sol-blue text-white ring-sol-blue dark:bg-sol-gold dark:text-sol-blue dark:ring-sol-gold' : 'text-fg ring-line hover:ring-sol-blue'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <Field label="Nombre" value={form.name} onChange={set('name')} autoComplete="name" required />
            <Field label="Correo" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
            <label className="block sm:col-span-2">
              <span className="font-semibold text-fg">Tu comentario</span>
              <textarea
                value={form.message}
                onChange={set('message')}
                rows={3}
                maxLength={1400}
                required
                className="mt-1.5 w-full rounded-xl border-2 border-line bg-card p-3 text-fg"
                placeholder="Cuéntanos tu idea, lo que te gustó o lo que no funcionó."
              />
            </label>
            <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            {error && (
              <Alert tone="error" className="sm:col-span-2">
                {error}
              </Alert>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" variant="gold" icon={Send} loading={status === 'sending'}>
                Enviar comentario
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

const EMPTY = { name: '', email: '', phone: '', topic: 'COMPRA', message: '', website: '' };

function ContactForm() {
  const { user } = useAuth();
  const [form, setForm] = useState(() => ({ ...EMPTY, name: user?.name ?? '', email: user?.email ?? '' }));
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 3 || !form.email.includes('@') || form.message.trim().length < 10) {
      return setError('Escribe tu nombre, un correo válido y un mensaje de al menos 10 caracteres.');
    }
    setStatus('sending');
    setError('');
    try {
      await contactApi.send({ ...form, phone: form.phone.trim() });
      setStatus('sent');
      setForm((f) => ({ ...EMPTY, name: f.name, email: f.email }));
    } catch (err) {
      setError(errorMessage(err, 'No pudimos enviar el mensaje. Intenta de nuevo o escríbenos por WhatsApp.'));
      setStatus('idle');
    }
  };

  if (status === 'sent') {
    return (
      <div role="status" className="surface flex animate-modal-in flex-col items-center gap-3 p-8 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" aria-hidden />
        <h2 className="font-display text-2xl font-semibold text-fg">¡Mensaje enviado!</h2>
        <p className="text-fg-muted">Te responderemos al correo {form.email} lo antes posible, en horario de atención.</p>
        <Button variant="outline" onClick={() => setStatus('idle')}>
          Enviar otro mensaje
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="surface grid gap-4 p-6 sm:grid-cols-2 sm:p-8" aria-labelledby="form-title">
      <h2 id="form-title" className="font-display text-2xl font-semibold text-fg sm:col-span-2">
        Escríbenos
      </h2>
      <Field label="Nombre completo" value={form.name} onChange={set('name')} autoComplete="name" required />
      <Field label="Correo" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
      <Field label="Teléfono (opcional)" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
      <label className="block">
        <span className="font-semibold text-fg">Tema</span>
        <select value={form.topic} onChange={set('topic')} className="mt-1.5 min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-fg">
          {TOPICS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-2">
        <span className="font-semibold text-fg">Mensaje</span>
        <textarea
          value={form.message}
          onChange={set('message')}
          rows={5}
          maxLength={1500}
          required
          className="mt-1.5 w-full rounded-xl border-2 border-line bg-card p-3 text-fg"
          placeholder="Cuéntanos en qué te ayudamos. Si es sobre una compra, incluye el número de comprobante."
        />
      </label>
      {/* Campo trampa contra bots: oculto para las personas y para lectores de pantalla. */}
      <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {error && (
        <Alert tone="error" className="sm:col-span-2">
          {error}
        </Alert>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" variant="gold" size="lg" icon={Send} loading={status === 'sending'}>
          Enviar mensaje
        </Button>
      </div>
    </form>
  );
}

/** Datos oficiales de SINPE Móvil para que la persona confirme que paga a la Asociación (los mismos del checkout). */
function SinpeInfo() {
  const [payment, setPayment] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    contactApi
      .payment()
      .then(setPayment)
      .catch(() => setFailed(true));
  }, []);

  return (
    <section aria-labelledby="sinpe-title" className="relative overflow-hidden stage rounded-3xl p-6 ring-1 ring-white/10 sm:p-8">
      {/* Rojo de la Asociación: franja superior, ícono y sello "Oficial" (presencia de marca y confianza). */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-sol-red via-sol-red to-sol-gold" aria-hidden />
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-sol-red/20 blur-3xl" aria-hidden />
      <h2 id="sinpe-title" className="relative flex flex-wrap items-center gap-2 font-display text-2xl font-semibold">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-sol-red text-[#fff] shadow-[0_6px_18px_rgb(211_47_47/0.4)]">
          <Smartphone className="h-6 w-6" aria-hidden />
        </span>
        Consulta SINPE Móvil
        <span className="rounded-full bg-sol-red px-2.5 py-0.5 font-sans text-xs font-bold uppercase tracking-wider text-[#fff]">Oficial</span>
      </h2>
      <p className="relative mt-1 text-white/75">Estos son los únicos datos oficiales de cobro de la Asociación.</p>
      {!payment && !failed && <div className="relative mt-5 h-28 animate-pulse rounded-2xl bg-white/10" role="status" aria-label="Cargando datos de cobro" />}
      {failed && <p className="relative mt-5 text-white/80">No pudimos cargar los datos de cobro. Los verás al comprar tus cartones.</p>}
      {payment && (
        <dl className="glass relative mt-5 grid gap-3 rounded-2xl p-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-white/60">Número SINPE Móvil</dt>
            <dd className="mt-1 flex items-center gap-2 font-display text-2xl font-bold text-accent">
              {payment.sinpePhone} <CopyButton value={payment.sinpePhone.replace(/\D/g, '')} label="Copiar número SINPE" />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-white/60">A nombre de</dt>
            <dd className="mt-1 font-semibold">{payment.holder}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-white/60">Detalle del pago</dt>
            <dd className="mt-1 font-semibold">
              Escribe <span className="rounded bg-sol-red px-1.5 font-bold text-[#fff]">{payment.detail}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-white/60">Banco</dt>
            <dd className="mt-1 font-semibold">{payment.bank}</dd>
          </div>
        </dl>
      )}
      <p className="relative mt-4 flex items-start gap-2 text-sm text-white/75">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-sol-red" aria-hidden />
        Paga siempre desde “Comprar cartones” y adjunta tu comprobante. La Asociación nunca te pedirá claves, códigos ni pagos por otros
        medios.
      </p>
    </section>
  );
}

export default function ContactPage() {
  usePageMeta({
    title: 'Contacto',
    description: 'Escribe a la Asociación Infantil Hogar Sol: formulario, WhatsApp, teléfono, correo y datos oficiales de SINPE Móvil.',
  });
  // Coordenadas exactas si están configuradas; si no, búsqueda por el nombre del salón.
  const mapQuery = encodeURIComponent(SITE.eventVenueCoords || SITE.eventVenueMapQuery);

  return (
    <main className="container-page space-y-10 py-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sol-red dark:text-accent">Estamos para ayudarte</p>
        <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">Contacto</h1>
        <p className="mt-1 max-w-2xl text-lg text-fg-muted">¿Tienes dudas sobre tu compra, un premio o tus datos? Escríbenos o llámanos.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {CHANNELS.map(({ icon: Icon, label, value, href, external }) => (
          <a
            key={label}
            href={href}
            {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
            className="surface lift flex flex-col items-start gap-3 p-6 hover:ring-2 hover:ring-accent/60"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-navy-950 text-accent ring-1 ring-accent/30">
              <Icon className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-fg-muted">{label}</span>
            <span className="break-all text-lg font-semibold text-fg">{value}</span>
          </a>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ContactForm />
        <div className="space-y-4">
          <div className="surface overflow-hidden rounded-2xl">
            <iframe
              title={`Mapa: ${SITE.eventVenue}`}
              src={`https://www.google.com/maps?q=${mapQuery}&z=16&output=embed`}
              className="h-72 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="space-y-2 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-fg-muted">Lugar del evento</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 font-semibold text-fg hover:text-brand"
              >
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden /> {SITE.eventVenueMapQuery}
              </a>
              <p className="flex items-start gap-3 text-fg">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden /> {SITE.schedule}
              </p>
            </div>
          </div>
        </div>
      </div>

      <SinpeInfo />

      <section aria-labelledby="faq-title" className="space-y-3">
        <h2 id="faq-title" className="font-display text-2xl font-semibold text-fg">
          Preguntas frecuentes
        </h2>
        {/* Acordeón nativo (<details>): accesible con teclado y lector de pantalla sin JavaScript. */}
        <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
          {FAQ.map(([q, a]) => (
            <details key={q} className="surface group overflow-hidden transition-shadow open:shadow-[0_0_0_2px_rgb(251_191_36/0.5),var(--card-glow)]">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-lg font-semibold text-fg [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 shrink-0 text-brand" aria-hidden /> {q}
                </span>
                <ChevronDown aria-hidden className="h-5 w-5 shrink-0 text-brand transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="animate-fade-in px-5 pb-5 pl-13 text-base leading-relaxed text-fg-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <SuggestionBox />
    </main>
  );
}
