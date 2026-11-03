import { formatCRC } from './format';

// Paquete fijo (igual que server/src/domain/pricing.js): los cartones se venden SOLO de 2 en 2, a ₡3 000 el paquete.
// El evento trae `bundleSize` y `price` del servidor; los valores fijos solo cubren datos que aún no cargaron.
export const PACKAGE_SIZE = 2;
export const PACKAGE_PRICE = 3000;

export const bundleSizeOf = (event) => Math.max(1, Number(event?.bundleSize ?? PACKAGE_SIZE));
const priceOf = (event) => event?.price ?? PACKAGE_PRICE;

/** "2 cartones por ₡3 000": el único precio que se anuncia en el sitio. */
export const priceLabel = (event) => {
  const b = bundleSizeOf(event);
  return b > 1 ? `${b} cartones por ${formatCRC(priceOf(event))}` : `${formatCRC(priceOf(event))} por cartón`;
};

export const isWholeBundle = (count, event) => count > 0 && count % bundleSizeOf(event) === 0;

/** Total de `count` cartones; con un paquete incompleto cobra el paquete entero (el sitio no deja comprarlo). */
export const totalFor = (count, event) => Math.ceil(count / bundleSizeOf(event)) * priceOf(event);
