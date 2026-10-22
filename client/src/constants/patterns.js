// Cartón de 90 balotas: matriz de 3x9, `null` = celda vacía, 5 números por fila.
export const PATTERNS = Object.freeze({
  LINE: { id: 'LINE', label: 'Línea', rows: 1 },
  DOUBLE_LINE: { id: 'DOUBLE_LINE', label: 'Doble línea', rows: 2 },
  FULL: { id: 'FULL', label: 'Cartón lleno', rows: 3 },
});

const missingPerRow = (grid, marked) =>
  grid.map((row) => row.filter((n) => n !== null && !marked.has(n)).length).sort((a, b) => a - b);

/** Cuántos números faltan para completar el patrón (0 = ¡BINGO!). */
export function missingFor(grid, marked, patternId) {
  const need = PATTERNS[patternId]?.rows ?? grid.length;
  return missingPerRow(grid, marked)
    .slice(0, need)
    .reduce((a, b) => a + b, 0);
}

export const hasWon = (grid, marked, patternId) => missingFor(grid, marked, patternId) === 0;
