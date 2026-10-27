// Lectura de un cartón desde su imagen PNG: devuelve { serial, grid } con los números que se pudieron leer con certeza.
// Lo no leído queda en null y el cartón se marca "por revisar" para que el admin lo corrija en el panel.
// Plantilla de los cartones: cuadrícula 5x5 sobre una imagen de 698x905, con el centro libre (logo).
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

const BASE_W = 698;
const BASE_H = 905;
const CENTERS_X = [82, 214, 346, 478, 610];
const CENTERS_Y = [230, 362, 494, 626, 758];
const CELL_PX = 84;
const COLUMN_RANGES = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
];
const SCALES = [1, 2, 3];
const PAGE_MODES = ['7', '8', '6', '13'];

let workerPromise = null;
/** Un solo worker de OCR por proceso; se crea la primera vez que hace falta. */
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

const inRange = (text, col) => {
  if (!/^\d{1,2}$/.test(text)) return false;
  const n = Number(text);
  return n >= COLUMN_RANGES[col][0] && n <= COLUMN_RANGES[col][1];
};

/** Lee una casilla probando varias escalas y modos de página. Solo acepta lecturas válidas para su columna. */
async function readCell(worker, png, meta, row, col) {
  const sx = meta.width / BASE_W;
  const sy = meta.height / BASE_H;
  const size = Math.round(CELL_PX * sx);
  const left = Math.max(0, Math.round(CENTERS_X[col] * sx - size / 2));
  const top = Math.max(0, Math.round(CENTERS_Y[row] * sy - size / 2));

  const reads = [];
  for (const scale of SCALES) {
    const crop = await sharp(png)
      .extract({ left, top, width: Math.min(size, meta.width - left), height: Math.min(size, meta.height - top) })
      .resize(size * scale, size * scale)
      .grayscale()
      .normalize()
      .png()
      .toBuffer();
    for (const mode of PAGE_MODES) {
      await worker.setParameters({ tessedit_pageseg_mode: mode });
      const { data } = await worker.recognize(crop);
      const text = data.text.replace(/\D/g, '');
      if (inRange(text, col)) reads.push(text);
    }
  }
  if (reads.length === 0) return null;
  // El OCR casi siempre pierde un dígito y casi nunca inventa uno: gana la lectura más larga.
  const longest = Math.max(...reads.map((t) => t.length));
  const candidates = [...new Set(reads.filter((t) => t.length === longest))];
  return candidates.length === 1 ? Number(candidates[0]) : null;
}

/** Libera el worker de OCR: sin esto el proceso no termina al apagar el servidor o al cerrar las pruebas. */
export async function closeRecognizer() {
  if (!workerPromise) return;
  const worker = await workerPromise.catch(() => null);
  workerPromise = null;
  await worker?.terminate();
}

/**
 * @param {Buffer} png imagen del cartón
 * @returns {Promise<{ serial: null, grid: (number|null)[][] }>} el serial lo toma el nombre del archivo
 */
export async function recognizeCard(png) {
  const worker = await getWorker();
  const meta = await sharp(png).metadata();
  const grid = [];
  for (let row = 0; row < 5; row++) {
    const cells = [];
    for (let col = 0; col < 5; col++) {
      cells.push(row === 2 && col === 2 ? null : await readCell(worker, png, meta, row, col));
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
