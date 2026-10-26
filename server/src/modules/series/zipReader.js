// Lectura segura de un ZIP subido por el admin: solo imágenes PNG, con límites contra "bombas zip".
// Nunca se escribe nada a disco ni se usan las rutas internas del ZIP (evita path traversal).
import path from 'node:path';
import yauzl from 'yauzl';
import { HttpError } from '../../utils/httpError.js';

export const ZIP_LIMITS = Object.freeze({
  maxEntries: 5000, // cartones por ZIP
  maxFileBytes: 4 * 1024 * 1024, // por imagen
  maxTotalBytes: 800 * 1024 * 1024, // descomprimido en total
  maxRatio: 200, // compresión sospechosa
});

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const openZip = (buffer) =>
  new Promise((resolve, reject) =>
    yauzl.fromBuffer(buffer, { lazyEntries: true, validateEntrySizes: true, strictFileNames: false }, (err, zip) =>
      err ? reject(new HttpError(400, 'INVALID_ZIP')) : resolve(zip)
    )
  );

function readEntry(zip, entry) {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (err, stream) => {
      if (err) return reject(new HttpError(400, 'INVALID_ZIP'));
      const chunks = [];
      let size = 0;
      stream.on('data', (chunk) => {
        size += chunk.length;
        if (size > ZIP_LIMITS.maxFileBytes) {
          stream.destroy();
          reject(new HttpError(400, 'ZIP_FILE_TOO_LARGE'));
        } else chunks.push(chunk);
      });
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', () => reject(new HttpError(400, 'INVALID_ZIP')));
    });
  });
}

/**
 * Devuelve [{ name, data }] con cada PNG del ZIP (name = nombre de archivo sin carpetas).
 * Ignora carpetas, archivos ocultos/del sistema (__MACOSX, .DS_Store) y lo que no sea PNG.
 */
export async function readPngsFromZip(buffer) {
  const zip = await openZip(buffer);
  if (zip.entryCount > ZIP_LIMITS.maxEntries * 2) {
    zip.close();
    throw new HttpError(400, 'ZIP_TOO_MANY_FILES');
  }
  const files = [];
  let total = 0;
  try {
    await new Promise((resolve, reject) => {
      zip.on('error', () => reject(new HttpError(400, 'INVALID_ZIP')));
      zip.on('end', resolve);
      zip.on('entry', async (entry) => {
        try {
          const name = path.posix.basename(entry.fileName.replace(/\\/g, '/'));
          const isPng = /\.png$/i.test(name) && !name.startsWith('.') && !entry.fileName.includes('__MACOSX');
          if (entry.fileName.endsWith('/') || !isPng) return zip.readEntry();
          if (files.length >= ZIP_LIMITS.maxEntries) throw new HttpError(400, 'ZIP_TOO_MANY_FILES');
          if (entry.uncompressedSize > ZIP_LIMITS.maxFileBytes) throw new HttpError(400, 'ZIP_FILE_TOO_LARGE');
          if (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > ZIP_LIMITS.maxRatio) {
            throw new HttpError(400, 'INVALID_ZIP');
          }
          total += entry.uncompressedSize;
          if (total > ZIP_LIMITS.maxTotalBytes) throw new HttpError(400, 'ZIP_TOO_LARGE');
          const data = await readEntry(zip, entry);
          if (PNG_MAGIC.every((b, i) => data[i] === b)) files.push({ name, data });
          zip.readEntry();
        } catch (err) {
          reject(err);
        }
      });
      zip.readEntry();
    });
  } finally {
    zip.close();
  }
  if (files.length === 0) throw new HttpError(400, 'ZIP_WITHOUT_PNG');
  return files;
}
