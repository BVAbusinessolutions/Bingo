import { describe, expect, it } from 'vitest';
import { safeRedirect } from '../routing/redirects';

describe('safeRedirect: evita redirecciones abiertas tras el login', () => {
  it('acepta rutas internas con su query', () => {
    expect(safeRedirect({ pathname: '/mis-compras', search: '?x=1' }, '/')).toBe('/mis-compras?x=1');
    expect(safeRedirect('/live', '/')).toBe('/live');
  });

  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '', null, undefined, { pathname: '//evil.com' }])(
    'rechaza %j',
    (target) => {
      expect(safeRedirect(target, '/inicio')).toBe('/inicio');
    }
  );
});
