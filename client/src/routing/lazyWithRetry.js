import { lazy } from 'react';

const RELOAD_KEY = 'hs-chunk-reload';

/**
 * lazy() resistente: si el archivo de una página no descarga (se publicó una versión nueva y el nombre
 * cambió, la red falló o una extensión lo bloqueó), reintenta una vez y, si sigue fallando, recarga la
 * página UNA sola vez para traer la versión vigente. Antes, esto dejaba la pantalla en blanco.
 */
export function lazyWithRetry(importer) {
  return lazy(async () => {
    try {
      const mod = await importer();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (firstError) {
      try {
        await new Promise((r) => setTimeout(r, 600));
        return await importer();
      } catch {
        let alreadyReloaded = false;
        try {
          alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === '1';
          if (!alreadyReloaded) sessionStorage.setItem(RELOAD_KEY, '1');
        } catch {
          alreadyReloaded = true; // sin almacenamiento no se puede evitar un bucle: no recargar
        }
        if (!alreadyReloaded) window.location.reload();
        throw firstError; // lo muestra el ErrorBoundary si la recarga no ocurre o no alcanza
      }
    }
  });
}
