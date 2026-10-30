import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// La web compilada se simula con un index.html mínimo; env.js lee estas variables al importarse,
// por eso la app se importa después de definirlas.
const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-dist-'));
fs.writeFileSync(
  path.join(dist, 'index.html'),
  '<html><head><link rel="canonical" href="__SITE_ORIGIN__/" /><script>var a=1;</script><script type="application/ld+json">__EVENT_JSONLD__</script></head><body></body></html>'
);
Object.assign(process.env, {
  SERVE_CLIENT: 'true',
  CLIENT_DIST: dist,
  CLIENT_ORIGIN: 'https://bingo.example.org',
  ANALYTICS_PROVIDER: 'ga4',
});

let api;
let stopApp;
before(async () => {
  const helpers = await import('./helpers.js');
  await helpers.startApp();
  api = helpers.api;
  stopApp = helpers.stopApp;
});
after(async () => {
  await stopApp();
  fs.rmSync(dist, { recursive: true, force: true });
});

describe('web compilada en producción', () => {
  // Va primero: es la primera página que se pide y los datos estructurados se cachean un minuto.
  it('publica los datos estructurados del evento vigente sin poder cerrar la etiqueta script', async () => {
    const { query } = await import('./helpers.js');
    await query("update app.events set name = 'Bingo </script><b>x' where status in ('LIVE', 'SCHEDULED')");
    const res = await api().get('/premios');
    const ld = res.text.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1];
    assert.doesNotMatch(ld, /<\/script>/);
    const data = JSON.parse(ld);
    assert.equal(data['@type'], 'Event');
    assert.equal(data.name, 'Bingo </script><b>x');
    assert.equal(data.offers.priceCurrency, 'CRC');
  });

  it('completa la URL pública en las etiquetas de SEO', async () => {
    const res = await api().get('/resultados');
    assert.equal(res.status, 200);
    assert.match(res.text, /href="https:\/\/bingo\.example\.org\/"/);
    assert.doesNotMatch(res.text, /__SITE_ORIGIN__/);
  });

  it('la CSP permite la transmisión de STREAM_ORIGINS y la analítica elegida, sin unsafe-inline en scripts', async () => {
    const csp = (await api().get('/')).headers['content-security-policy'];
    assert.match(csp, /media-src 'self' blob: https:\/\/stream\.example\.com/);
    assert.match(csp, /connect-src [^;]*https:\/\/stream\.example\.com/);
    assert.match(csp, /script-src 'self' 'sha256-[^']+' https:\/\/www\.googletagmanager\.com/);
    assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /frame-src [^;]*https:\/\/www\.google\.com/); // mapa de Contacto
    assert.match(csp, /frame-src [^;]*https:\/\/www\.facebook\.com/); // Facebook Live
  });

  it('robots.txt excluye las zonas privadas y apunta al sitemap', async () => {
    const res = await api().get('/robots.txt');
    assert.match(res.headers['content-type'], /text\/plain/);
    assert.match(res.text, /Disallow: \/admin/);
    assert.match(res.text, /Disallow: \/api\//);
    assert.match(res.text, /Sitemap: https:\/\/bingo\.example\.org\/sitemap\.xml/);
  });

  it('sitemap.xml lista solo páginas públicas', async () => {
    const res = await api().get('/sitemap.xml');
    assert.match(res.headers['content-type'], /xml/);
    assert.match(res.text, /<loc>https:\/\/bingo\.example\.org\/reglamento<\/loc>/);
    assert.doesNotMatch(res.text, /admin|perfil|mis-compras/);
  });
});
