// Lectura de un cartón desde su imagen PNG: devuelve { serial, grid } o null en lo que no se pudo leer.
// Lo no leído queda "por revisar" y el admin lo corrige en el panel antes de usar la serie.
// Versión inicial: sin lectura automática. Se reemplaza por el lector ajustado a las imágenes reales.

/** @returns {Promise<{ serial: string|null, grid: (number|null)[][]|null }>} */
export async function recognizeCard() {
  return { serial: null, grid: null };
}
