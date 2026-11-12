import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { microCache } from '../src/utils/microCache.js';

const deferred = () => {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};

describe('microCache (lecturas públicas)', () => {
  it('las peticiones simultáneas comparten una sola consulta y la ventana reutiliza el resultado', async () => {
    const cache = microCache(10_000);
    let calls = 0;
    const load = async () => ++calls;
    const [a, b, c] = await Promise.all([cache.get('k', load), cache.get('k', load), cache.get('k', load)]);
    assert.deepEqual([a, b, c], [1, 1, 1]);
    assert.equal(await cache.get('k', load), 1);
    assert.equal(calls, 1);
  });

  it('vence al pasar el TTL e invalidate() obliga a consultar de nuevo', async () => {
    const cache = microCache(20);
    let calls = 0;
    const load = async () => ++calls;
    await cache.get('k', load);
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(await cache.get('k', load), 2);
    cache.invalidate();
    assert.equal(await cache.get('k', load), 3);
  });

  it('una consulta que empezó antes de invalidar no deja guardado su resultado viejo ni borra la nueva', async () => {
    const cache = microCache(10_000);
    const slow = deferred();
    const fast = deferred();
    const old = cache.get('k', () => slow.promise);
    cache.invalidate(); // p. ej. alguien reservó mientras se consultaba
    const fresh = cache.get('k', () => fast.promise);
    slow.resolve('viejo');
    assert.equal(await old, 'viejo');
    fast.resolve('nuevo');
    assert.equal(await fresh, 'nuevo');
    assert.equal(await cache.get('k', async () => 'otra consulta'), 'nuevo');
  });

  it('un error no queda en caché', async () => {
    const cache = microCache(10_000);
    await assert.rejects(cache.get('k', async () => Promise.reject(new Error('db caída'))));
    assert.equal(await cache.get('k', async () => 'ok'), 'ok');
  });
});
