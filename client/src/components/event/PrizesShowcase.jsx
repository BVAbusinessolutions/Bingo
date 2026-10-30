import MainPrizeCard from './MainPrizeCard';
import { PRIZES } from '../../config/prizes';

/**
 * Sección de premios: el premio mayor (fotos + información) arriba y los incentivos debajo, en tres columnas
 * iguales. `withCta` agrega "Comprar cartones" junto al premio mayor.
 */
export default function PrizesShowcase({ withCta = true, title = 'Premios' }) {
  const others = PRIZES.filter((p) => !p.main);

  return (
    <section aria-labelledby="prizes-title" className="stage relative overflow-hidden">
      <div className="container-page relative space-y-10 py-14 sm:py-16">
        <h2 id="prizes-title" className="sr-only">
          {title}
        </h2>
        <MainPrizeCard withCta={withCta} className="reveal" />
        <ul className="grid gap-4 sm:grid-cols-3">
          {others.map(({ id, icon: Icon, title: t, text }, i) => (
            <li key={id} className="glass reveal flex h-full items-start gap-4 rounded-2xl p-5 transition hover:bg-white/10" style={{ '--delay': `${i * 80}ms` }}>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span>
                <h3 className="font-display text-lg font-semibold">{t}</h3>
                <p className="mt-0.5 text-white/75">{text}</p>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
