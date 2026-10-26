// Bingo de 75 balotas: cartón 5x5 (columnas B-I-N-G-O) con centro libre en grid[2][2] = null.
// Mantener en sincronía con server/src/domain/bingo.js: el servidor es quien valida los bingos.
export const MAX_BALL = 75;
export const LETTERS = ['B', 'I', 'N', 'G', 'O'];
export const COLUMN_RANGES = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
];

export const letterFor = (n) => LETTERS[Math.min(4, Math.floor((n - 1) / 15))];
export const ballLabel = (n) => `${letterFor(n)}-${n}`;
export const isFreeCell = (r, c) => r === 2 && c === 2;

const idx = [0, 1, 2, 3, 4];
const ROWS = idx.map((r) => idx.map((c) => [r, c]));
const COLS = idx.map((c) => idx.map((r) => [r, c]));
const DIAG = [idx.map((i) => [i, i]), idx.map((i) => [i, 4 - i])];

export const PATTERNS = Object.freeze({
  LINE: { id: 'LINE', label: 'Línea', hint: 'Una fila, columna o diagonal completa', groups: [...ROWS, ...COLS, ...DIAG] },
  FOUR_CORNERS: {
    id: 'FOUR_CORNERS',
    label: 'Cuatro esquinas',
    hint: 'Las 4 esquinas del cartón',
    groups: [
      [
        [0, 0],
        [0, 4],
        [4, 0],
        [4, 4],
      ],
    ],
  },
  X: { id: 'X', label: 'Letra X', hint: 'Las dos diagonales', groups: [[...DIAG[0], ...DIAG[1]]] },
  FULL: { id: 'FULL', label: 'Cartón lleno', hint: 'Todos los números del cartón', groups: [ROWS.flat()] },
});

/** Cuántos números faltan para completar el patrón (0 = ¡BINGO!). */
export function missingFor(grid, marked, patternId) {
  const groups = (PATTERNS[patternId] ?? PATTERNS.FULL).groups;
  return Math.min(...groups.map((g) => g.filter(([r, c]) => !isFreeCell(r, c) && !marked.has(grid[r][c])).length));
}

export const hasWon = (grid, marked, patternId) => missingFor(grid, marked, patternId) === 0;

/** Celdas que forman el patrón (para resaltarlas en la ayuda visual). */
export const patternCells = (patternId) => new Set((PATTERNS[patternId] ?? PATTERNS.FULL).groups.flat().map(([r, c]) => `${r}-${c}`));
