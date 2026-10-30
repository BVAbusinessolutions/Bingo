import { CalendarCheck, ClipboardCheck, IdCard, Scale, Trophy } from 'lucide-react';
import PrizesShowcase from '../../components/event/PrizesShowcase';
import Button from '../../components/ui/Button';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PATHS } from '../../routing/paths';

// Resumen de las reglas de entrega (el texto completo está en el Reglamento y en Contingencias).
const DELIVERY = [
  {
    icon: ClipboardCheck,
    title: 'Verificación del cartón',
    text: 'En línea, el sistema valida tu cartón al pulsar “¡Bingo!”. En el salón, el cartón se lee en voz alta frente al público y la cámara.',
  },
  {
    icon: IdCard,
    title: 'Identidad',
    text: 'Para recibir un premio se presenta la cédula física al día (o DIMEX vigente) de la persona titular de la cuenta que compró el cartón.',
  },
  {
    icon: CalendarCheck,
    title: 'Plazos',
    text: 'Los ganadores en línea reciben nuestro contacto dentro de 3 días hábiles. Hay 30 días naturales para retirar el premio (90 para la motocicleta).',
  },
  {
    icon: Scale,
    title: 'Empates',
    text: 'Si varios cartones completan el patrón con la misma bola, los premios divisibles se reparten y los indivisibles se desempatan con una bola por cartón.',
  },
];

export default function PrizesPage() {
  usePageMeta({
    title: 'Premios',
    description: 'Motocicleta como premio mayor y requisitos para retirar los premios del Bingo Benéfico Hogar Sol.',
  });

  return (
    <main>
      <header className="container-page py-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sol-red dark:text-accent">Bingo Benéfico Hogar Sol</p>
        <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">Premios</h1>
        <p className="mt-1 max-w-2xl text-lg text-fg-muted">
          Qué puedes ganar, cómo se verifica tu cartón y qué necesitas para retirar tu premio.
        </p>
      </header>

      <PrizesShowcase />

      <section aria-labelledby="delivery-title" className="container-page py-14">
        <h2 id="delivery-title" className="font-display text-2xl font-semibold text-fg sm:text-3xl">
          Cómo se entregan los premios
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {DELIVERY.map(({ icon: Icon, title, text }) => (
            <li key={title} className="surface lift reveal flex gap-4 p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-950 text-accent">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span>
                <h3 className="font-display text-lg font-semibold text-fg">{title}</h3>
                <p className="mt-1 text-fg-muted">{text}</p>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button to={PATHS.rules} variant="primary" size="lg">
            Leer el reglamento completo
          </Button>
          <Button to={PATHS.results} variant="outline" size="lg" icon={Trophy}>
            Ver ganadores
          </Button>
        </div>
      </section>
    </main>
  );
}
