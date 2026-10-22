import { Home, Ticket } from 'lucide-react';
import Button from '../../components/ui/Button';
import { PATHS } from '../../routing/paths';

export default function NotFoundPage() {
  return (
    <main className="container-page grid min-h-[70vh] place-items-center py-12 text-center">
      <div className="max-w-lg space-y-5">
        <div className="mx-auto grid h-28 w-28 place-items-center rounded-full border-8 border-sol-gold bg-sol-red text-4xl font-black text-white shadow-xl" aria-hidden>
          404
        </div>
        <h1 className="text-3xl font-black text-brand sm:text-4xl">Esta balota no salió</h1>
        <p className="text-lg text-fg-muted">La página que buscas no existe o cambió de lugar.</p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button to={PATHS.home} icon={Home} size="lg">
            Ir al inicio
          </Button>
          <Button to={PATHS.catalog} variant="gold" icon={Ticket} size="lg">
            Comprar cartones
          </Button>
        </div>
      </div>
    </main>
  );
}
