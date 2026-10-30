/** Estilos de marcador que la persona puede elegir en la vista en vivo (ver Marker en BingoCard). */
export const MARKERS = Object.freeze({
  chip: 'Ficha clásica',
  gold: 'Sello dorado',
  corn: 'Grano de maíz',
  star: 'Estrella',
});

const MARKER_KEY = 'hs-marker';

export function readMarker() {
  try {
    const v = localStorage.getItem(MARKER_KEY);
    return v in MARKERS ? v : 'chip';
  } catch {
    return 'chip';
  }
}

export function saveMarker(marker) {
  try {
    localStorage.setItem(MARKER_KEY, marker);
  } catch {
    // sin almacenamiento: el estilo dura solo esta visita
  }
}
