/**
 * Vistas de "Mis cartones" en el juego en vivo. Auto elige según cuántos cartones tiene la persona:
 *   1 cartón -> grande · 2 a 4 -> mosaico · 5 o más -> mini.
 * Las columnas dependen del ancho del panel (container queries), no de la pantalla: así funcionan igual
 * en celular, en tablet y en la columna derecha del escritorio.
 */
export const CARD_VIEWS = Object.freeze({
  auto: 'Auto',
  large: 'Grande',
  single: 'Una a la vez',
  grid: 'Mosaico',
  mini: 'Mini',
});

export const autoView = (count) => (count <= 1 ? 'large' : count <= 4 ? 'grid' : 'mini');

/** Vista efectiva: la elegida, o la automática si se eligió "auto" (o un valor desconocido). */
export const resolveView = (view, count) => (view in CARD_VIEWS && view !== 'auto' ? view : autoView(count));

const GRID_CLASSES = {
  large: 'mx-auto w-full max-w-xl grid-cols-1',
  single: 'mx-auto w-full max-w-xl grid-cols-1',
  grid: 'grid-cols-1 @lg:grid-cols-2',
  mini: 'grid-cols-2 @2xl:grid-cols-3 @5xl:grid-cols-4',
};
export const gridClassFor = (view) => GRID_CLASSES[view] ?? GRID_CLASSES.grid;

const VIEW_KEY = 'hs-card-view';

export function readCardView() {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v in CARD_VIEWS ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveCardView(view) {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch {
    // sin almacenamiento: la vista dura solo esta visita
  }
}
