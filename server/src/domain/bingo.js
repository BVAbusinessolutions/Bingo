// Bingo de 75 bolas: cartón 5x5 con columnas B-I-N-G-O y centro libre.
// La cuadrícula es grid[fila][columna]; el centro (2,2) es null.
// Mantener en sincronía con client/src/constants/patterns.js (el servidor es quien decide).
import { randomInt } from 'node:crypto';

export const SIZE = 5;
export const MAX_BALL = 75;
export const LETTERS = ['B', 'I', 'N', 'G', 'O'];
export const COLUMN_RANGES = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
];
const FREE = [2, 2];
const isFree = (r, c) => r === FREE[0] && c === FREE[1];

export const letterFor = (n) => LETTERS[Math.min(4, Math.floor((n - 1) / 15))];

const cells = (list) => list.map(([r, c]) => [r, c]);
const ROWS = [0, 1, 2, 3, 4].map((r) => cells([0, 1, 2, 3, 4].map((c) => [r, c])));
const COLS = [0, 1, 2, 3, 4].map((c) => cells([0, 1, 2, 3, 4].map((r) => [r, c])));
const DIAG = [cells([0, 1, 2, 3, 4].map((i) => [i, i])), cells([0, 1, 2, 3, 4].map((i) => [i, 4 - i]))];
const ALL = ROWS.flat();

/**
 * Cada patrón es una lista de alternativas; gana quien complete cualquiera de ellas.
 * LINE: cualquier fila, columna o diagonal. X: ambas diagonales. FULL: cartón lleno.
 */
export const PATTERNS = Object.freeze({
  LINE: [...ROWS, ...COLS, ...DIAG],
  FOUR_CORNERS: [
    cells([
      [0, 0],
      [0, 4],
      [4, 0],
      [4, 4],
    ]),
  ],
  X: [[...DIAG[0], ...DIAG[1]]],
  FULL: [ALL],
});

/** Nombre de cada modalidad para avisos y correos (el cliente usa los mismos en constants/patterns.js). */
export const PATTERN_LABELS = Object.freeze({ LINE: 'Línea', FOUR_CORNERS: 'Cuatro esquinas', X: 'Letra X', FULL: 'Cartón lleno' });

/** Cuántos números faltan para completar el patrón con las bolas cantadas (0 = bingo válido). */
export function missingFor(grid, called, pattern) {
  const alternatives = PATTERNS[pattern] ?? PATTERNS.FULL;
  const calledSet = called instanceof Set ? called : new Set(called);
  return Math.min(...alternatives.map((group) => group.filter(([r, c]) => !isFree(r, c) && !calledSet.has(grid[r][c])).length));
}

export const isWinningCard = (grid, calledList, pattern) => missingFor(grid, calledList, pattern) === 0;

/**
 * Valida una cuadrícula 5x5: centro libre, 24 números únicos, cada uno en el rango de su columna.
 * Devuelve la lista de problemas (vacía si es válida). Se usa al importar cartones desde imágenes.
 */
export function gridProblems(grid) {
  const problems = [];
  if (!Array.isArray(grid) || grid.length !== SIZE || grid.some((row) => !Array.isArray(row) || row.length !== SIZE)) {
    return ['La cuadrícula debe ser de 5x5'];
  }
  const seen = new Set();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const n = grid[r][c];
      if (isFree(r, c)) {
        if (n !== null) problems.push('El centro debe estar libre');
        continue;
      }
      const [min, max] = COLUMN_RANGES[c];
      if (!Number.isInteger(n)) problems.push(`Falta el número en ${LETTERS[c]}${r + 1}`);
      else if (n < min || n > max) problems.push(`${LETTERS[c]}${r + 1}: ${n} no está entre ${min} y ${max}`);
      else if (seen.has(n)) problems.push(`El número ${n} está repetido`);
      else seen.add(n);
    }
  }
  return problems;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Genera un cartón aleatorio válido (para series de prueba o eventos sin imágenes). */
export function generateCard() {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  COLUMN_RANGES.forEach(([min, max], c) => {
    const pool = shuffle(Array.from({ length: max - min + 1 }, (_, i) => min + i)).slice(0, SIZE);
    pool.forEach((n, r) => {
      if (!isFree(r, c)) grid[r][c] = n;
    });
  });
  return grid;
}

/** Firma única para evitar cartones duplicados dentro de una serie. */
export const cardSignature = (grid) =>
  grid
    .flat()
    .map((n) => n ?? 0)
    .join('-');
