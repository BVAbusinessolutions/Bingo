// Lectura de un cartón desde su imagen PNG: devuelve { serial, grid } con los números que se pudieron leer con certeza.
// Lo no leído queda en null y el cartón se marca "por revisar" para que el admin lo corrija en el panel.
// Plantilla de los cartones: cuadrícula 5x5 sobre una imagen de 698x905, con el centro libre (logo).
//
// Cómo se lee cada casilla:
//  1. Se separan las cifras (manchas de tinta) dentro de la ficha blanca; la marca de agua gris queda fuera.
//  2. Cada cifra se compara con plantillas de 0-9 tomadas de los cartones reales (digitTemplates.json).
//     Es exacto y rápido con la tipografía de los cartones de Hogar Sol.
//  3. Si alguna cifra no se parece claramente a una plantilla (otro diseño), se intenta OCR, pero solo se acepta
//     si todas las lecturas coinciden y tienen tantas cifras como manchas hay en la casilla.
//  Ante cualquier duda la casilla queda en null: es preferible revisar a mano que aceptar un número equivocado.
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

const BASE_W = 698;
const BASE_H = 905;
const CENTERS_X = [82, 214, 346, 478, 610];
const CENTERS_Y = [230, 362, 494, 626, 758];
const CELL_PX = 100; // ventana dentro de la ficha blanca (la ficha mide ~108 px)
const INK = 110; // gris por debajo de esto = tinta
const COLUMN_RANGES = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
];
// Umbrales medidos con 500 cartones reales: la misma cifra difiere hasta 0.056 y cifras distintas desde 0.078.
const MAX_DISTANCE = 0.08;
const MIN_GAP = 0.02;
const OCR_MODES = ['7', '8', '13'];

const pack = JSON.parse(readFileSync(new URL('./digitTemplates.json', import.meta.url), 'utf8'));
const GW = pack.w;
const GH = pack.h;
const TEMPLATES = pack.glyphs.map((g) => ({ digit: g.d, aspect: g.a, bits: Uint8Array.from(Buffer.from(g.b, 'base64')) }));

let workerPromise = null;
/** Un solo worker de OCR por proceso; solo se crea si alguna casilla no se pudo leer con las plantillas. */
const getWorker = () => {
  if (!workerPromise) {
    workerPromise = createWorker('eng').then(async (worker) => {
      await worker.setParameters({ tessedit_char_whitelist: '0123456789' });
      return worker;
    });
    workerPromise.catch(() => {
      workerPromise = null;
    });
  }
  return workerPromise;
};

/** Libera el worker de OCR: sin esto el proceso no termina al apagar el servidor o al cerrar las pruebas. */
export async function closeRecognizer() {
  if (!workerPromise) return;
  const worker = await workerPromise.catch(() => null);
  workerPromise = null;
  await worker?.terminate();
}

/** Ventana de la casilla escalada al tamaño real de la imagen, o null si la imagen es demasiado pequeña. */
function cellWindow(meta, row, col) {
  const sx = meta.width / BASE_W;
  const sy = meta.height / BASE_H;
  const w = Math.round(CELL_PX * sx);
  const h = Math.round(CELL_PX * sy);
  const left = Math.max(0, Math.round(CENTERS_X[col] * sx - w / 2));
  const top = Math.max(0, Math.round(CENTERS_Y[row] * sy - h / 2));
  const width = Math.min(w, meta.width - left);
  const height = Math.min(h, meta.height - top);
  return width >= 10 && height >= 10 ? { left, top, width, height } : null;
}

/** Cifras de la casilla (de izquierda a derecha), normalizadas a GW x GH, más la casilla binarizada para el OCR. */
async function cellGlyphs(png, win) {
  const { data, info } = await sharp(png)
    .extract(win)
    .flatten({ background: '#fff' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const ink = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) ink[i] = data[i] < INK ? 1 : 0;

  // Componentes conexas (8 vecinos).
  const label = new Int32Array(W * H);
  const blobs = [];
  for (let i = 0; i < W * H; i++) {
    if (!ink[i] || label[i]) continue;
    const id = blobs.length + 1;
    const stack = [i];
    label[i] = id;
    const b = { id, x0: W, y0: H, x1: 0, y1: 0, area: 0 };
    while (stack.length) {
      const p = stack.pop();
      const x = p % W;
      const y = (p - x) / W;
      b.area++;
      b.x0 = Math.min(b.x0, x);
      b.x1 = Math.max(b.x1, x);
      b.y0 = Math.min(b.y0, y);
      b.y1 = Math.max(b.y1, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (ink[q] && !label[q]) {
            label[q] = id;
            stack.push(q);
          }
        }
      }
    }
    blobs.push(b);
  }
  // Una cifra es alta (más del 35 % de la ventana) y no toca el borde (el borde azul de la ficha sí lo toca).
  const digits = blobs
    .filter((b) => b.y1 - b.y0 + 1 >= H * 0.35 && b.area >= 60 && b.x0 > 0 && b.y0 > 0 && b.x1 < W - 1 && b.y1 < H - 1)
    .sort((a, b) => a.x0 - b.x0);

  const glyphs = digits.map((b) => {
    const bw = b.x1 - b.x0 + 1;
    const bh = b.y1 - b.y0 + 1;
    // Escala por altura y centra en una caja GW x GH (conserva lo angosto del "1").
    const scale = GH / bh;
    const ox = (GW - bw * scale) / 2;
    const bits = new Uint8Array(GW * GH);
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const px = Math.floor((gx - ox) / scale) + b.x0;
        const py = Math.floor(gy / scale) + b.y0;
        if (px >= b.x0 && px <= b.x1) bits[gy * GW + gx] = label[py * W + px] === b.id ? 1 : 0;
      }
    }
    return { bits, aspect: bw / bh };
  });

  // Para el OCR: solo la tinta de las cifras, en negro sobre blanco, con margen.
  let bin = null;
  if (digits.length) {
    const keep = new Set(digits.map((b) => b.id));
    const x0 = Math.min(...digits.map((b) => b.x0));
    const x1 = Math.max(...digits.map((b) => b.x1));
    const y0 = Math.min(...digits.map((b) => b.y0));
    const y1 = Math.max(...digits.map((b) => b.y1));
    const out = Buffer.alloc((x1 - x0 + 1) * (y1 - y0 + 1), 255);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) if (keep.has(label[y * W + x])) out[(y - y0) * (x1 - x0 + 1) + (x - x0)] = 0;
    bin = await sharp(out, { raw: { width: x1 - x0 + 1, height: y1 - y0 + 1, channels: 1 } })
      .extend({ top: 24, bottom: 24, left: 24, right: 24, background: '#fff' })
      .resize({ height: 120 })
      .png()
      .toBuffer();
  }
  return { glyphs, bin };
}

/** Diferencia entre dos cifras: fracción de píxeles distintos más diferencia de proporción. */
function distance(a, b) {
  let diff = 0;
  for (let i = 0; i < a.bits.length; i++) diff += a.bits[i] !== b.bits[i];
  return diff / a.bits.length + Math.abs(a.aspect - b.aspect) * 0.5;
}

/** La cifra de la plantilla más parecida, o null si no hay una coincidencia clara. */
function classify(glyph) {
  const best = new Map();
  for (const t of TEMPLATES) {
    const d = distance(glyph, t);
    if (!best.has(t.digit) || d < best.get(t.digit)) best.set(t.digit, d);
  }
  const [first, second] = [...best].sort((a, b) => a[1] - b[1]);
  if (first[1] > MAX_DISTANCE || (second && second[1] - first[1] < MIN_GAP)) return null;
  return first[0];
}

const inRange = (n, col) => Number.isInteger(n) && n >= COLUMN_RANGES[col][0] && n <= COLUMN_RANGES[col][1];

/** OCR de respaldo: todas las lecturas válidas deben coincidir, ser al menos dos y tener `digitCount` cifras. */
async function readWithOcr(bin, digitCount, col) {
  const worker = await getWorker();
  const votes = new Map();
  for (const mode of OCR_MODES) {
    await worker.setParameters({ tessedit_pageseg_mode: mode });
    const { data } = await worker.recognize(bin);
    const text = data.text.replace(/\D/g, '');
    if (text.length === digitCount && inRange(Number(text), col)) votes.set(text, (votes.get(text) ?? 0) + 1);
  }
  if (votes.size !== 1) return null;
  const [[text, count]] = [...votes];
  return count >= 2 ? Number(text) : null;
}

async function readCell(png, meta, row, col) {
  const win = cellWindow(meta, row, col);
  if (!win) return null;
  const { glyphs, bin } = await cellGlyphs(png, win);
  if (glyphs.length < 1 || glyphs.length > 2) return null;
  const digits = glyphs.map(classify);
  if (digits.every((d) => d !== null)) {
    const n = Number(digits.join(''));
    return inRange(n, col) ? n : null;
  }
  return readWithOcr(bin, glyphs.length, col);
}

/**
 * @param {Buffer} png imagen del cartón
 * @returns {Promise<{ serial: null, grid: (number|null)[][] }>} el serial lo toma el nombre del archivo
 */
export async function recognizeCard(png) {
  const meta = await sharp(png).metadata();
  const grid = [];
  for (let row = 0; row < 5; row++) {
    const cells = [];
    for (let col = 0; col < 5; col++) {
      cells.push(row === 2 && col === 2 ? null : await readCell(png, meta, row, col));
    }
    grid.push(cells);
  }
  // Un mismo número no puede estar dos veces en el cartón: si pasa, ninguno de los dos se acepta.
  const counts = new Map();
  grid.flat().forEach((n) => n !== null && counts.set(n, (counts.get(n) ?? 0) + 1));
  for (const row of grid) {
    for (let col = 0; col < 5; col++) {
      if (row[col] !== null && counts.get(row[col]) > 1) row[col] = null;
    }
  }
  return { serial: null, grid };
}
