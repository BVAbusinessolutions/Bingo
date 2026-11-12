import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// La web compilada se simula con el index.html real del cliente (así una etiqueta que el servidor ya no
// encuentra rompe la prueba). env.js lee estas variables al importarse: la app se importa después.
const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-dist-'));
fs.copyFileSync(new URL('../../client/index.html', import.meta.url), path.join(dist, 'index.html'));
const ldOf = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
const metaOf = (html, key) => html.match(new RegExp(`(?:name|property)="${key}"\\s+content="([^"]*)"`))?.[1];
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
  it('publica los datos estructurados del evento vigente sin poder cerrar la etiqueta script', async () => {
    const { query } = await import('./helpers.js');
    await query("update app.events set name = 'Bingo </script><b>x' where status in ('LIVE', 'SCHEDULED')");
    const res = await api().get('/premios');
    const ld = res.text.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1];
    assert.doesNotMatch(ld, /<\/script>/);
    const graph = JSON.parse(ld)['@graph'];
    const event = graph.find((n) => n['@type'] === 'Event');
    assert.equal(event.name, 'Bingo </script><b>x');
    assert.equal(event.offers.priceCurrency, 'CRC');
    assert.equal(event.organizer['@id'], 'https://bingo.example.org/#organizacion');
    const ngo = graph.find((n) => n['@type'] === 'NGO');
    assert.equal(ngo.name, 'Asociación Infantil Hogar Sol');
    assert.ok(graph.some((n) => n['@type'] === 'WebSite'));
    // La portada lleva el nombre del evento escapado en su contenido inicial: nunca HTML del panel.
    const home = await api().get('/');
    assert.match(home.text, /Bingo &lt;\/script&gt;&lt;b&gt;x/);
    assert.doesNotMatch(home.text, /<b>x/);
  });

  it('cada página sale con su propio título, descripción, canonical y vista previa', async () => {
    const res = await api().get('/contacto/');
    assert.equal(res.status, 200);
    assert.match(res.text, /<title>Contacto · Bingo Hogar Sol<\/title>/);
    assert.match(res.text, /<link rel="canonical" href="https:\/\/bingo\.example\.org\/contacto"/);
    assert.equal(metaOf(res.text, 'og:url'), 'https://bingo.example.org/contacto');
    assert.equal(metaOf(res.text, 'og:title'), 'Contacto · Bingo Hogar Sol');
    assert.match(metaOf(res.text, 'description'), /WhatsApp/);
    assert.equal(metaOf(res.text, 'robots'), 'index, follow');
    assert.match(res.text, /<div id="root"><main[^>]*><h1[^>]*>Contacto<\/h1>/);
    assert.match(res.text, /<a href="\/cartones">Comprar cartones<\/a>/);
    assert.ok(ldOf(res.text)['@graph']);
  });

  it('las páginas de cuenta no se indexan y las rutas inexistentes responden 404', async () => {
    const login = await api().get('/login');
    assert.equal(login.status, 200);
    assert.equal(metaOf(login.text, 'robots'), 'noindex, follow');
    assert.match(login.text, /<div id="root"><\/div>/); // sin contenido inicial
    const compra = await api().get('/mis-compras/abc');
    assert.equal(compra.status, 200);
    assert.equal(metaOf(compra.text, 'robots'), 'noindex, follow');
    const missing = await api().get('/no-existe-esta-pagina');
    assert.equal(missing.status, 404);
    assert.equal(metaOf(missing.text, 'robots'), 'noindex, follow');
    assert.match(missing.text, /<div id="root"><\/div>/); // la app igual arranca y muestra "no encontrada"
  });

  it('un $ en el nombre del evento no se interpreta como patrón al armar el HTML', async () => {
    const { query } = await import('./helpers.js');
    await query("update app.events set name = $1 where status in ('LIVE', 'SCHEDULED')", ["Bingo $& $1 $'"]);
    const res = await api().get('/');
    assert.equal(ldOf(res.text)['@graph'].find((n) => n['@type'] === 'Event').name, "Bingo $& $1 $'");
    assert.match(res.text, /Bingo \$&amp; \$1 \$&#39;/);
  });

  it('completa la URL pública en las etiquetas de SEO', async () => {
    const res = await api().get('/resultados');
    assert.equal(res.status, 200);
    assert.match(res.text, /href="https:\/\/bingo\.example\.org\/resultados"/);
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
    assert.match(csp, /frame-src [^;]*https:\/\/player\.kick\.com/); // Kick
  });

  it('el hash CSP de los scripts en línea coincide con el del navegador aunque index.html tenga CRLF', async () => {
    const { inlineScriptHashes } = await import('../src/app.js');
    const { createHash } = await import('node:crypto');
    const body = '\n  var a = 1;\n  var b = 2;\n';
    const browserHash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
    assert.deepEqual(inlineScriptHashes(`<script>${body}</script>`), [browserHash]);
    assert.deepEqual(inlineScriptHashes(`<script>${body.replace(/\n/g, '\r\n')}</script>`), [browserHash]);
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
    assert.match(res.text, /<loc>https:\/\/bingo\.example\.org\/contacto<\/loc>/);
    assert.doesNotMatch(res.text, /admin|perfil|mis-compras|login|registro/);
  });
});
