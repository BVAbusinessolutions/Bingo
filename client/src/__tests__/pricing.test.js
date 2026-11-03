import { describe, expect, it } from 'vitest';
import { isWholeBundle, priceLabel, totalFor } from '../lib/pricing';

describe('paquete fijo: 2 cartones por ₡3 000', () => {
  const pair = { price: 3000, bundleSize: 2 };

  it('anuncia "2 cartones por ₡3 000", también si el evento aún no trae el paquete', () => {
    expect(priceLabel(pair).replace(/\s/g, ' ')).toBe('2 cartones por ₡3 000');
    expect(priceLabel({}).replace(/\s/g, ' ')).toBe('2 cartones por ₡3 000');
  });

  it('no hay cartones sueltos: solo paquetes completos, cobrados por paquete', () => {
    expect([0, 1, 2, 3, 4].map((n) => isWholeBundle(n, pair))).toEqual([false, false, true, false, true]);
    expect(isWholeBundle(1, {})).toBe(false);
    expect(totalFor(2, pair)).toBe(3000);
    expect(totalFor(6, pair)).toBe(9000);
  });
});
