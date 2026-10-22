import { Lock } from 'lucide-react';
import Button from '../../components/ui/Button';
import { PATHS } from '../../routing/paths';

export default function UnauthorizedPage() {
  return (
    <main className="container-page grid min-h-[60vh] place-items-center py-12 text-center">
      <div className="max-w-md space-y-4">
        <Lock className="mx-auto h-14 w-14 text-sol-red" aria-hidden />
        <h1 className="text-3xl font-black text-brand">Sin permiso</h1>
        <p className="text-lg text-fg-muted">No tienes permisos para ver esta página.</p>
        <Button to={PATHS.home} size="lg">
          Volver al inicio
        </Button>
      </div>
    </main>
  );
}
