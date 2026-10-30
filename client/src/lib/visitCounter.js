import { metricsApi } from '../api/endpoints';

const KEY = 'hs-visit-counted';

/** Suma una visita anónima por sesión del navegador (recargar o navegar no la repite). Nunca rompe la app. */
export function countVisitOnce() {
  try {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, '1');
  } catch {
    return; // sin almacenamiento no se puede evitar el doble conteo: mejor no contar
  }
  metricsApi.visit().catch(() => {});
}
