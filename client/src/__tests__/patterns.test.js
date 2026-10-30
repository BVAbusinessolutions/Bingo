import { describe, expect, it } from 'vitest';
import { ballLabel, countedMarks, hasWon, letterFor, missingFor } from '../constants/patterns';

// Cartón de la imagen de la Asociación (serie 1001).
const CARD = [
  [11, 27, 42, 52, 63],
  [15, 23, 33, 58, 73],
  [8, 20, null, 57, 70],
  [6, 19, 40, 54, 64],
  [3, 17, 31, 55, 68],
];

describe('patrones de 75 bolas (deben coincidir con el servidor)', () => {
  it('letras y etiquetas de bola', () => {
    expect([1, 16, 31, 46, 75].map(letterFor)).toEqual(['B', 'I', 'N', 'G', 'O']);
    expect(ballLabel(42)).toBe('N-42');
  });

  it('línea horizontal, vertical (con centro libre) y diagonal', () => {
    expect(hasWon(CARD, new Set([11, 27, 42, 52, 63]), 'LINE')).toBe(true);
    expect(hasWon(CARD, new Set([42, 33, 40, 31]), 'LINE')).toBe(true);
    expect(hasWon(CARD, new Set([63, 58, 19, 3]), 'LINE')).toBe(true);
    expect(missingFor(CARD, new Set([11, 27]), 'LINE')).toBe(3);
  });

  it('cuatro esquinas, X y cartón lleno', () => {
    expect(hasWon(CARD, new Set([11, 63, 3, 68]), 'FOUR_CORNERS')).toBe(true);
    expect(hasWon(CARD, new Set([11, 23, 54, 68, 63, 58, 19, 3]), 'X')).toBe(true);
    const all = CARD.flat().filter(Boolean);
    expect(missingFor(CARD, new Set(all.slice(2)), 'FULL')).toBe(2);
    expect(hasWon(CARD, new Set(all), 'FULL')).toBe(true);
  });

  it('cartón lleno exige exactamente las 24 casillas (el centro libre no cuenta)', () => {
    const all = CARD.flat().filter(Boolean);
    expect(all).toHaveLength(24);
    expect(missingFor(CARD, new Set(), 'FULL')).toBe(24);
  });

  it('cuatro esquinas no se cumple con 3 esquinas ni con una línea', () => {
    expect(missingFor(CARD, new Set([11, 63, 3]), 'FOUR_CORNERS')).toBe(1);
    expect(hasWon(CARD, new Set([11, 27, 42, 52, 63]), 'FOUR_CORNERS')).toBe(false);
  });

  it('marcado manual: solo cuentan las marcas cantadas oficialmente', () => {
    const called = new Set([11, 27, 42, 52]);
    const manual = new Set([11, 27, 42, 52, 63]); // 63 marcado a mano, pero no ha salido
    const counted = countedMarks(false, called, manual);
    expect([...counted].sort((a, b) => a - b)).toEqual([11, 27, 42, 52]);
    expect(hasWon(CARD, counted, 'LINE')).toBe(false); // el botón ¡Bingo! sigue bloqueado
    expect(hasWon(CARD, countedMarks(false, new Set([...called, 63]), manual), 'LINE')).toBe(true);
    expect(countedMarks(true, called, new Set())).toBe(called); // automático: todo lo cantado
  });
});
