import { useState } from 'react';
import { BadgeCheck, IdCard, Ticket } from 'lucide-react';
import Button from '../ui/Button';
import { MAIN_PRIZE } from '../../config/prizes';
import { MOTORCYCLE_REQUIREMENT } from '../../config/site';
import { PATHS } from '../../routing/paths';

/**
 * Fotografía HD del premio en un marco de vidrio con filo luminoso. Si el archivo no existe o no carga,
 * el marco desaparece y la tarjeta queda solo con el texto (nunca un ícono de relleno ni una imagen rota).
 */
function PrizePhoto({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <figure className="relative overflow-hidden rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/20 shadow-[0_0_0_1px_rgb(251_191_36/0.18),0_18px_40px_rgb(2_6_23/0.45)] backdrop-blur-[16px]">
      <img
        src={src}
        alt={alt}
        width="1600"
        height="1000"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="aspect-[16/10] w-full rounded-xl object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      {/* Brillo diagonal sutil sobre la foto */}
      <span
        className="pointer-events-none absolute inset-1.5 rounded-xl bg-linear-to-tr from-transparent via-white/0 to-white/15"
        aria-hidden
      />
    </figure>
  );
}

/**
 * Premio mayor (la motocicleta) en vidrio translúcido con brillo dorado. Va sobre fondo azul marino.
 * Incluye el requisito legal de retiro, tal como lo aprobó la Asociación.
 */
export default function MainPrizeCard({ withCta = true, className = '' }) {
  if (!MAIN_PRIZE) return null;
  return (
    <article
      className={`glass group relative overflow-hidden rounded-3xl p-5 text-white shadow-neon transition-transform duration-500 hover:-translate-y-1 sm:p-7 ${className}`}
    >
      {/* Halos de luz: dorado arriba a la derecha, azul abajo a la izquierda */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/25 blur-3xl transition-opacity duration-500 group-hover:opacity-80" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-sol-blue-light/30 blur-3xl" aria-hidden />

      <div className="relative space-y-5">
        <PrizePhoto src={MAIN_PRIZE.image} alt={MAIN_PRIZE.imageAlt} />

        <div>
          <p className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-accent ring-1 ring-accent/30">
            Premio mayor
          </p>
          <h3 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{MAIN_PRIZE.title}</h3>
          <p className="mt-1 text-white/80">{MAIN_PRIZE.text}</p>
        </div>

        <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
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
