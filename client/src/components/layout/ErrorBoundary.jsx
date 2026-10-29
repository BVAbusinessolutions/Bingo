import { Component } from 'react';
import { Home, RefreshCw } from 'lucide-react';

const isChunkError = (err) => /dynamically imported module|Failed to fetch|Importing a module script failed|ChunkLoadError/i.test(err?.message ?? '');

/**
 * Atrapa errores de una pantalla para que no quede en blanco. Va DENTRO de los proveedores:
 * la sesión, el tema y los avisos se conservan; solo se reemplaza la pantalla que falló.
 * `resetKey` (la ruta actual) lo reinicia al navegar a otra página. Con `silent`, un componente auxiliar
 * (panel de ajustes, aviso de cookies) que falla simplemente no se muestra y el resto del sitio sigue.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ui] pantalla con error', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.silent) return null;
    const chunk = isChunkError(error);
    return (
      <main role="alert" className="container-page grid min-h-[60vh] place-items-center py-12 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-black text-brand sm:text-3xl">
            {chunk ? 'Hay una versión nueva del sitio' : 'Esta pantalla tuvo un problema'}
          </h1>
          <p className="text-lg text-fg-muted">
            {chunk
              ? 'Recarga para descargarla. Tu sesión y tus compras están a salvo.'
              : 'No perdiste tu sesión ni tus compras. Intenta de nuevo; si sigue pasando, avísanos.'}
          </p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => (chunk ? window.location.reload() : this.setState({ error: null }))}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 font-extrabold text-navy-950 transition hover:bg-accent-strong"
            >
              <RefreshCw className="h-5 w-5" aria-hidden /> {chunk ? 'Recargar' : 'Intentar de nuevo'}
            </button>
            <a
              href="/"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-line px-5 font-extrabold text-fg transition hover:border-brand"
            >
              <Home className="h-5 w-5" aria-hidden /> Ir al inicio
            </a>
          </div>
        </div>
      </main>
    );
  }
}
