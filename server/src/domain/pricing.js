// Precio por paquete: los cartones se venden SOLO de 2 en 2, a ₡3 000 el paquete. No hay cartones sueltos.
// Es una regla del negocio, no un ajuste del panel: todo evento nuevo nace así y la migración 013 la aplicó a los abiertos.

export const PACKAGE_SIZE = 2;
export const PACKAGE_PRICE = 3000;

export const bundleSizeOf = (event) => Math.max(1, Number(event?.bundle_size ?? event?.bundleSize ?? PACKAGE_SIZE));

/** ¿Se puede comprar esta cantidad? Solo paquetes completos. */
export const isWholeBundle = (count, event) => count > 0 && count % bundleSizeOf(event) === 0;

/** Total a pagar por `count` cartones (solo paquetes completos; si no, devuelve null). */
export const totalFor = (count, event) => (isWholeBundle(count, event) ? (count / bundleSizeOf(event)) * event.price : null);
