import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Ticket, Trophy } from 'lucide-react';
import Button from '../../components/ui/Button';
import { BrandBadge } from '../../components/brand/BrandLogo';
import { PATHS } from '../../routing/paths';
import { usePageMeta } from '../../hooks/usePageMeta';

// Las tres balotas del "404", con los colores de las columnas del cartón.
const BALLS = [
  ['4', 'bg-sol-blue', '0ms'],
  ['0', 'bg-sol-red', '250ms'],
  ['4', 'bg-emerald-600', '500ms'],
];

export default function NotFoundPage() {
  const navigate = useNavigate();
  const canGoBack = typeof window !== 'undefined' && window.history.state?.idx > 0;

  usePageMeta({ title: 'Página no encontrada', noindex: true });

  return (
    <main className="container-page grid min-h-[75vh] place-items-center py-12 text-center">
      <div className="max-w-xl animate-fade-up space-y-6">
        <BrandBadge className="mx-auto h-24 w-24" decorative={false} />
        <div className="flex justify-center gap-3 sm:gap-4" aria-hidden>
          {BALLS.map(([digit, color, delay], i) => (
            <span
              key={i}
              style={{ '--delay': delay }}
              className={`grid h-20 w-20 animate-float place-items-center rounded-full border-[6px] border-white text-4xl font-black text-white shadow-xl ring-4 ring-sol-gold sm:h-24 sm:w-24 sm:text-5xl ${color}`}
            >
              {digit}
            </span>
          ))}
        </div>
        <p className="sr-only">Error 404.</p>
        <h1 className="text-3xl font-black text-brand sm:text-4xl">¡Esta balota no salió!</h1>
        <p className="text-lg text-fg-muted">
          La página que buscas no existe o cambió de lugar. Pero el bingo sigue: vuelve al inicio y elige tus cartones de la suerte.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button to={PATHS.home} icon={Home} size="lg">
            Volver al inicio
          </Button>
          <Button to={PATHS.catalog} variant="gold" icon={Ticket} size="lg">
            Comprar cartones
          </Button>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-fg-muted">
          {canGoBack && (
            <button type="button" onClick={() => navigate(-1)} className="inline-flex min-h-11 items-center gap-1.5 font-bold hover:text-fg hover:underline">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Volver a la página anterior
            </button>
          )}
          <Button to={PATHS.results} variant="ghost" icon={Trophy} size="sm">
            Ver resultados
          </Button>
        </div>
      </div>
    </main>
  );
}
