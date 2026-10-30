import { describe, expect, it } from 'vitest';
import { CARD_VIEWS, autoView, gridClassFor, resolveView } from '../constants/cardViews';

describe('vistas de "Mis cartones"', () => {
  it('Auto se ajusta a cuántos cartones hay: 1 grande, 2 a 4 mosaico, 5 o más mini', () => {
    expect([0, 1, 2, 4, 5, 20].map(autoView)).toEqual(['large', 'large', 'grid', 'grid', 'mini', 'mini']);
  });

  it('una vista elegida se respeta; "auto" o un valor desconocido usan la automática', () => {
    expect(resolveView('single', 7)).toBe('single');
    expect(resolveView('large', 9)).toBe('large');
    expect(resolveView('auto', 3)).toBe('grid');
    expect(resolveView('inventada', 6)).toBe('mini');
  });

  it('cada vista tiene columnas propias y Mini nunca queda en una sola columna', () => {
    for (const view of Object.keys(CARD_VIEWS).filter((v) => v !== 'auto')) expect(gridClassFor(view)).toMatch(/grid-cols-/);
    expect(gridClassFor('mini')).toMatch(/^grid-cols-2/);
    expect(gridClassFor('large')).toContain('max-w-xl');
  });
});
