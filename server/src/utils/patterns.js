// Misma regla que client/src/constants/patterns.js, pero aquí es la que decide: el cliente solo muestra.
const ROWS_BY_PATTERN = { LINE: 1, DOUBLE_LINE: 2, FULL: 3 };

/** Cuántos números faltan para completar el patrón con las balotas cantadas (0 = bingo válido). */
export function missingFor(grid, called, pattern) {
  const need = ROWS_BY_PATTERN[pattern] ?? grid.length;
  return grid
    .map((row) => row.filter((n) => n !== null && !called.has(n)).length)
    .sort((a, b) => a - b)
    .slice(0, need)
    .reduce((a, b) => a + b, 0);
}

export const isWinningCard = (grid, calledList, pattern) => missingFor(grid, new Set(calledList), pattern) === 0;
