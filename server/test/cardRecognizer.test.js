import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { closeRecognizer, recognizeCard } from '../src/modules/series/cardRecognizer.js';

// Arma un cartón de 698x905 con las mismas cifras de las plantillas (tipografía de los cartones reales).
const pack = JSON.parse(readFileSync(new URL('../src/modules/series/digitTemplates.json', import.meta.url), 'utf8'));
const glyphOf = new Map(pack.glyphs.map((g) => [g.d, Buffer.from(g.b, 'base64')]));
const CX = [82, 214, 346, 478, 610];
const CY = [230, 362, 494, 626, 758];
const SCALE = 3;

async function digitPng(d) {
  const bits = glyphOf.get(d);
  const raw = Buffer.alloc(pack.w * pack.h);
  for (let i = 0; i < raw.length; i++) raw[i] = bits[i] ? 0 : 255;
  return sharp(raw, { raw: { width: pack.w, height: pack.h, channels: 1 } })
    .resize(pack.w * SCALE, pack.h * SCALE, { kernel: 'nearest' })
    .png()
    .toBuffer();
}

async function cardImage(grid) {
  const layers = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const n = grid[r][c];
      if (n === null) continue;
      const digits = String(n).split('').map(Number);
      const w = pack.w * SCALE;
      let x = CX[c] - (digits.length * w) / 2;
      for (const d of digits) {
        layers.push({ input: await digitPng(d), left: Math.round(x), top: CY[r] - (pack.h * SCALE) / 2 });
        x += w;
      }
    }
  }
  return sharp({ create: { width: 698, height: 905, channels: 3, background: '#fff' } })
    .composite(layers)
    .png()
    .toBuffer();
}

after(closeRecognizer);

describe('lector de cartones', () => {
  it('lee los 24 números de un cartón con la tipografía de Hogar Sol', async () => {
    const grid = [
      [11, 27, 42, 52, 63],
      [15, 23, 33, 58, 73],
      [8, 20, null, 57, 70],
      [6, 19, 40, 54, 64],
      [3, 17, 31, 55, 68],
    ];
    const res = await recognizeCard(await cardImage(grid));
    assert.deepEqual(res.grid, grid);
  });

  it('una imagen sin números no inventa nada (queda por revisar)', async () => {
    const blank = await sharp({ create: { width: 698, height: 905, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();
    const res = await recognizeCard(blank);
    assert.ok(res.grid.flat().every((n) => n === null));
  });

  it('una imagen diminuta no rompe la lectura', async () => {
    const tiny = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();
    const res = await recognizeCard(tiny);
    assert.ok(res.grid.flat().every((n) => n === null));
  });
});
