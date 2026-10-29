import { Sparkles } from 'lucide-react';
import MainPrizeCard from './MainPrizeCard';
import { PRIZES } from '../../config/prizes';

/** Cinta animada con los premios e incentivos. La copia duplicada (para el bucle infinito) se oculta a lectores de pantalla. */
function PrizeTicker() {
  // Dos vueltas por copia para que la cinta llene pantallas anchas sin huecos.
  const items = [...PRIZES, ...PRIZES].map(({ id, icon: Icon, title }, i) => (
    <span key={`${id}-${i}`} className="mx-6 inline-flex items-center gap-2 whitespace-nowrap font-display text-lg font-semibold">
      <Icon className="h-6 w-6 text-accent" aria-hidden /> {title}
      <Sparkles className="ml-6 h-4 w-4 text-accent/60" aria-hidden />
    </span>
  ));
  return (
    <div className="group relative overflow-hidden border-y border-white/10 bg-white/[0.03] py-3 text-white">
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        <div className="flex">{items}</div>
        <div className="flex" aria-hidden>
          {items}
        </div>
      </div>
    </div>
  );
}

/**
 * Sección de premios sobre fondo azul marino: cinta animada, premio mayor en vidrio (MainPrizeCard)
 * e incentivos. `withCta` agrega "Comprar cartones" en la tarjeta del premio mayor.
 */
export default function PrizesShowcase({ withCta = true, title = 'Premios' }) {
  const others = PRIZES.filter((p) => !p.main);

  return (
    <section aria-labelledby="prizes-title" className="relative overflow-hidden bg-navy-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_80%_0%,rgb(29_99_184/0.35),transparent),radial-gradient(40rem_25rem_at_0%_100%,rgb(251_191_36/0.12),transparent)]" aria-hidden />
      <PrizeTicker />
      <div className="container-page relative grid items-center gap-6 py-14 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
        <h2 id="prizes-title" className="sr-only">
          {title}
        </h2>
        <MainPrizeCard withCta={withCta} className="reveal" />
        <ul className="grid gap-4">
          {others.map(({ id, icon: Icon, title: t, text }, i) => (
            <li key={id} className="glass reveal flex items-start gap-4 rounded-2xl p-5 transition hover:bg-white/10" style={{ '--delay': `${i * 80}ms` }}>
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
