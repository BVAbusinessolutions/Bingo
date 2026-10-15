import { randomInt } from 'node:crypto';

// Cartón de 90 balotas: 3 filas x 9 columnas, 5 números por fila (15 en total).
// Columna 0: 1-9, columna 1: 10-19, ..., columna 8: 80-90. Ordenados de arriba hacia abajo.
const COLS = 9;
const ROWS = 3;
const colRange = (c) => (c === 0 ? [1, 9] : c === 8 ? [80, 90] : [c * 10, c * 10 + 9]);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickLayout() {
  // Cada fila elige 5 columnas; se repite hasta que todas las columnas tengan al menos un número.
  for (;;) {
    const rows = Array.from({ length: ROWS }, () => new Set(shuffle([...Array(COLS).keys()]).slice(0, 5)));
    if ([...Array(COLS).keys()].every((c) => rows.some((r) => r.has(c)))) return rows;
  }
}

export function generateCard() {
  const layout = pickLayout();
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let c = 0; c < COLS; c++) {
    const rowsInCol = layout.map((r, i) => (r.has(c) ? i : -1)).filter((i) => i >= 0);
    const [min, max] = colRange(c);
    const pool = shuffle(Array.from({ length: max - min + 1 }, (_, i) => min + i));
    const nums = pool.slice(0, rowsInCol.length).sort((a, b) => a - b);
    rowsInCol.forEach((r, i) => (grid[r][c] = nums[i]));
  }
  return grid;
}

/** Firma única para evitar cartones duplicados en un mismo evento. */
export const cardSignature = (grid) => grid.flat().filter(Boolean).join('-');
