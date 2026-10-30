// Archivos (comprobantes e imágenes de cartones) guardados en la base de datos (bytea).
// En Supabase quedan dentro de la misma base, con sus respaldos, y nunca en el disco del servidor.
import { createHash } from 'node:crypto';
import { one } from '../db/index.js';

export const ALLOWED_FILES = {
  'image/jpeg': { ext: '.jpg', magic: [0xff, 0xd8, 0xff] },
  'image/png': { ext: '.png', magic: [0x89, 0x50, 0x4e, 0x47] },
  'image/webp': { ext: '.webp', magic: [0x52, 0x49, 0x46, 0x46] },
  'application/pdf': { ext: '.pdf', magic: [0x25, 0x50, 0x44, 0x46] },
};

/** El mimetype lo declara el cliente: se verifica también la firma real del archivo. */
export const hasValidSignature = (mime, buffer) => {
  const type = ALLOWED_FILES[mime];
  return Boolean(type && buffer?.length >= type.magic.length && type.magic.every((b, i) => buffer[i] === b));
};

/** Guarda un archivo. `q` permite hacerlo dentro de una transacción. */
export async function saveFile(q, { kind, mime, data }) {
  const sha256 = createHash('sha256').update(data).digest('hex');
  const [row] = await q('insert into app.files (kind, mime, size, data, sha256) values ($1, $2, $3, $4, $5) returning id', [
    kind,
    mime,
    data.length,
    data,
    sha256,
  ]);
  return row.id;
}

export async function getFile(id) {
  if (!id) return null;
  const row = await one('select mime, data from app.files where id = $1', [id]);
  return row && { mime: row.mime, data: Buffer.from(row.data) };
}

/** Envía un archivo aislado: un PDF o imagen no puede ejecutar scripts en nuestro origen. */
export function sendFile(res, file, { cache = false } = {}) {
  if (!file) return res.status(404).json({ error: 'NOT_FOUND' });
  res.type(file.mime);
  res.set('Content-Disposition', 'inline');
  res.set('Content-Security-Policy', 'sandbox');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', cache ? 'public, max-age=86400, immutable' : 'private, no-store');
  // Imágenes públicas (avatares, cartones): se pueden mostrar aunque la web viva en otro dominio que la API.
  // Los comprobantes (privados) conservan same-origin.
  if (cache) res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  return res.send(file.data);
}
