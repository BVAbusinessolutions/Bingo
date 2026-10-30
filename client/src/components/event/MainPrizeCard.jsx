import { BadgeCheck, IdCard, Ticket } from 'lucide-react';
import Button from '../ui/Button';
import PrizeCarousel from './PrizeCarousel';
import { MAIN_PRIZE } from '../../config/prizes';
import { MOTORCYCLE_REQUIREMENT } from '../../config/site';
import { PATHS } from '../../routing/paths';

/**
 * Premio mayor (la motocicleta): escenario de fotos a la izquierda (7 de 12 columnas) e información a la
 * derecha. En celular se apilan: primero la moto, luego el texto. Incluye el requisito legal de retiro.
 */
export default function MainPrizeCard({ withCta = true, className = '' }) {
  if (!MAIN_PRIZE) return null;
  return (
    <article className={`grid items-center gap-8 lg:grid-cols-12 lg:gap-12 ${className}`}>
      <div className="lg:col-span-7">
        <PrizeCarousel images={MAIN_PRIZE.images} alt={MAIN_PRIZE.imageAlt} views={MAIN_PRIZE.views} />
      </div>

      <div className="space-y-5 lg:col-span-5">
        <p className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-accent ring-1 ring-accent/30">
          Premio mayor
        </p>
        <div>
          <h3 className="font-display text-4xl font-bold sm:text-5xl">{MAIN_PRIZE.title}</h3>
          <p className="mt-2 text-lg text-white/80">{MAIN_PRIZE.text}</p>
        </div>

        <div className="glass flex gap-3 rounded-2xl p-5">
          <IdCard className="mt-0.5 h-6 w-6 shrink-0 text-accent" aria-hidden />
          <p className="text-sm leading-relaxed text-white/90 sm:text-base">
            <span className="mb-1 flex items-center gap-1.5 font-semibold text-white">
              <BadgeCheck className="h-4 w-4 text-accent" aria-hidden /> Requisito de retiro
            </span>
            {MOTORCYCLE_REQUIREMENT}
          </p>
        </div>

        {withCta && (
          <Button to={PATHS.catalog} variant="gold" size="lg" icon={Ticket} className="w-full sm:w-auto">
            Comprar cartones
          </Button>
        )}
      </div>
    </article>
  );
}
