import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { COLUMN_RANGES, generateCard, gridProblems, isWinningCard, letterFor, missingFor } from '../src/domain/bingo.js';

// Cartón de ejemplo: el de la imagen de la Asociación (serie 1001).
const CARD_1001 = [
  [11, 27, 42, 52, 63],
  [15, 23, 33, 58, 73],
  [8, 20, null, 57, 70],
  [6, 19, 40, 54, 64],
  [3, 17, 31, 55, 68],
];

describe('bingo de 75 balotas', () => {
  it('reconoce la letra de cada balota', () => {
    assert.deepEqual([1, 15, 16, 30, 31, 45, 46, 60, 61, 75].map(letterFor), ['B', 'B', 'I', 'I', 'N', 'N', 'G', 'G', 'O', 'O']);
  });

  it('el cartón de la imagen es válido', () => {
    assert.deepEqual(gridProblems(CARD_1001), []);
  });

  it('detecta números fuera de su columna, repetidos o centro ocupado', () => {
    const bad = CARD_1001.map((r) => [...r]);
    bad[0][0] = 20; // 20 no va en la B
    bad[1][1] = 27; // repetido con I1
    bad[2][2] = 40;
    const problems = gridProblems(bad);
    assert.ok(problems.some((p) => p.includes('B1')));
    assert.ok(problems.some((p) => p.includes('repetido')));
    assert.ok(problems.some((p) => p.includes('centro')));
  });

  it('línea: fila, columna o diagonal (el centro libre cuenta)', () => {
    assert.equal(isWinningCard(CARD_1001, [11, 27, 42, 52, 63], 'LINE'), true, 'primera fila');
    assert.equal(isWinningCard(CARD_1001, [42, 33, 40, 31], 'LINE'), true, 'columna N con centro libre');
    assert.equal(isWinningCard(CARD_1001, [11, 23, 54, 68], 'LINE'), true, 'diagonal');
    assert.equal(isWinningCard(CARD_1001, [11, 27, 42, 52], 'LINE'), false);
  });

  it('cuatro esquinas, X y cartón lleno', () => {
    assert.equal(isWinningCard(CARD_1001, [11, 63, 3, 68], 'FOUR_CORNERS'), true);
    assert.equal(isWinningCard(CARD_1001, [11, 23, 54, 68, 63, 58, 19, 3], 'X'), true);
    const all = CARD_1001.flat().filter(Boolean);
    assert.equal(isWinningCard(CARD_1001, all.slice(1), 'FULL'), false);
    assert.equal(missingFor(CARD_1001, all.slice(1), 'FULL'), 1);
    assert.equal(isWinningCard(CARD_1001, all, 'FULL'), true);
  });

  it('genera cartones siempre válidos', () => {
    for (let i = 0; i < 200; i++) {
      const g = generateCard();
      assert.deepEqual(gridProblems(g), []);
      g.forEach((row) => row.forEach((n, c) => n !== null && assert.ok(n >= COLUMN_RANGES[c][0] && n <= COLUMN_RANGES[c][1])));
    }
  });
});
