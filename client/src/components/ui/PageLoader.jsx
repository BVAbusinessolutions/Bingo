import { Loader2 } from 'lucide-react';

/**
 * Carga de página: esqueleto con la forma típica (título + tarjetas) para que el contenido no "salte" al llegar.
 * `fullScreen` (arranque de la app) mantiene el indicador giratorio centrado; `page` agrega el contenedor
 * y márgenes de página (cuando no lo pone la página misma, p. ej. mientras se descarga una ruta).
 */
export default function PageLoader({ fullScreen = false, page = false }) {
  if (fullScreen) {
    return (
      <div role="status" className="grid min-h-screen place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-sol-red" aria-hidden />
        <span className="sr-only">Cargando</span>
      </div>
    );
  }
  return (
    <div role="status" className={`min-h-[60vh] animate-fade-in space-y-5 ${page ? 'container-page py-10' : 'py-2'}`}>
      <span className="sr-only">Cargando</span>
      <div className="skeleton h-4 w-32" aria-hidden />
      <div className="skeleton h-10 w-2/3 max-w-lg" aria-hidden />
      <div className="skeleton h-5 w-1/2 max-w-md" aria-hidden />
      <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="surface space-y-3 p-5">
            <div className="skeleton h-28" />
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-5 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
