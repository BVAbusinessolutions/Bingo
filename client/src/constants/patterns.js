// Bingo de 75 bolas: cartón 5x5 (columnas B-I-N-G-O) con centro libre en grid[2][2] = null.
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

const LINES = [...ROWS, ...COLS, ...DIAG];
// Sin casillas repetidas (la T comparte N1, dos líneas pueden cruzarse): "faltan" cuenta cada una una vez.
const uniq = (group) => [...new Map(group.map(([r, c]) => [`${r}-${c}`, [r, c]])).values()];
const inner = idx.slice(1, 4);

// [id, nombre, explicación para el jugador, alternativas]. Mismo orden e ids que PATTERN_IDS del servidor.
const DEFINITIONS = [
  ['LINE', 'Línea', 'Una fila, columna o diagonal completa', LINES],
  [
    'TWO_LINES',
    'Dos líneas',
    'Dos filas, columnas o diagonales cualesquiera',
    LINES.flatMap((a, i) => LINES.slice(i + 1).map((b) => [...a, ...b])),
  ],
  [
    'FOUR_CORNERS',
    'Cuatro esquinas',
    'Las 4 esquinas del cartón',
    [
      [
        [0, 0],
        [0, 4],
        [4, 0],
        [4, 4],
      ],
    ],
  ],
  ['X', 'Letra X', 'Las dos diagonales', [[...DIAG[0], ...DIAG[1]]]],
  ['PLUS', 'Cruz', 'La fila y la columna del centro', [[...ROWS[2], ...COLS[2]]]],
  ['T', 'Letra T', 'La fila de arriba y la columna N', [[...ROWS[0], ...COLS[2]]]],
  ['L', 'Letra L', 'La columna B y la fila de abajo', [[...COLS[0], ...ROWS[4]]]],
  ['FRAME', 'Marco', 'Todo el borde del cartón', [[...ROWS[0], ...ROWS[4], ...COLS[0], ...COLS[4]]]],
  ['INNER_SQUARE', 'Cuadro central', 'Las 8 casillas alrededor del centro', [inner.flatMap((r) => inner.map((c) => [r, c]))]],
  ['FULL', 'Cartón lleno', 'Todos los números del cartón', [ROWS.flat()]],
];

export const PATTERNS = Object.freeze(
  Object.fromEntries(DEFINITIONS.map(([id, label, hint, groups]) => [id, Object.freeze({ id, label, hint, groups: groups.map(uniq) })]))
);
export const PATTERN_IDS = Object.freeze(DEFINITIONS.map(([id]) => id));

/** Cuántos números faltan para completar el patrón (0 = ¡BINGO!). */
export function missingFor(grid, marked, patternId) {
  const groups = (PATTERNS[patternId] ?? PATTERNS.FULL).groups;
  return Math.min(...groups.map((g) => g.filter(([r, c]) => !isFreeCell(r, c) && !marked.has(grid[r][c])).length));
}

export const hasWon = (grid, marked, patternId) => missingFor(grid, marked, patternId) === 0;

/**
 * Marcas que cuentan para el patrón. Automático: todo lo cantado. Manual: solo lo que la persona marcó
 * Y fue cantado oficialmente; marcar un número que no ha salido nunca habilita un "¡Bingo!".
 */
export const countedMarks = (autoMark, called, manualMarks) => (autoMark ? called : new Set([...manualMarks].filter((n) => called.has(n))));

/**
 * Celdas para dibujar la muestra del patrón. Con varias alternativas (Línea, Dos líneas) se muestra un ejemplo
 * (la primera), no la unión de todas, que pintaría el cartón entero.
 */
export const patternCells = (patternId) => new Set((PATTERNS[patternId] ?? PATTERNS.FULL).groups[0].map(([r, c]) => `${r}-${c}`));

/**
 * Qué alternativa del patrón quedó completa con las bolas cantadas (Línea o Dos líneas tienen varias):
 * la que se completó primero, para mostrar exactamente qué casillas ganan y con qué bola se cerró.
 */
export function winningGroup(grid, calledInOrder, pattern) {
  const order = new Map(calledInOrder.map((n, i) => [n, i]));
  let best = null;
  for (const group of PATTERNS[pattern]?.groups ?? []) {
    const cells = group.filter(([r, c]) => !isFreeCell(r, c));
    if (!cells.every(([r, c]) => order.has(grid[r][c]))) continue;
    const closedAt = Math.max(...cells.map(([r, c]) => order.get(grid[r][c])));
    if (!best || closedAt < best.closedAt) best = { group, cells, closedAt };
  }
  return best;
}
