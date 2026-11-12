import { PACKAGE_PRICE, PACKAGE_SIZE } from '../domain/pricing.js';
import { CRAWL_LINKS, DEFAULT_DESCRIPTION } from './pages.js';

const COSTA_RICA_TZ = 'America/Costa_Rica';
const ORG_NAME = 'Asociación Infantil Hogar Sol';

/** Escapa texto para HTML (contenido y atributos): el nombre y la descripción del evento los escribe el panel. */
export const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** "₡3 000": separador de miles con espacio, como en el resto del sitio. */
const colones = (amount) => `₡${String(Math.round(Number(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;

const eventDate = (date) =>
  new Intl.DateTimeFormat('es-CR', { timeZone: COSTA_RICA_TZ, dateStyle: 'full', timeStyle: 'short' }).format(new Date(date));

const eventPlace = (event) => [event.venue, event.venue_area].filter(Boolean).join(', ');

/**
 * Datos estructurados (schema.org) del sitio: la organización benéfica (NGO), el sitio web y, si hay uno
 * vigente, el evento con fecha, lugar y precio tal como los definió el panel.
 * El JSON nunca puede cerrar la etiqueta <script>: los "<" se escriben como <.
 */
export function structuredData(origin, event) {
  const orgId = `${origin}/#organizacion`;
  const graph = [
    {
      '@type': 'NGO',
      '@id': orgId,
      name: ORG_NAME,
      url: `${origin}/`,
      logo: `${origin}/apple-touch-icon.png`,
      image: `${origin}/og-image.png`,
      description: 'Organización sin fines de lucro que atiende a la niñez en Costa Rica. El bingo benéfico financia sus programas.',
      areaServed: { '@type': 'Country', name: 'Costa Rica' },
      address: { '@type': 'PostalAddress', addressRegion: 'San José', addressCountry: 'CR' },
    },
    {
      '@type': 'WebSite',
      '@id': `${origin}/#sitio`,
      name: 'Bingo Benéfico Hogar Sol',
      url: `${origin}/`,
      inLanguage: 'es-CR',
      publisher: { '@id': orgId },
    },
  ];
  if (event) {
    const place = eventPlace(event);
    graph.push({
      '@type': 'Event',
      name: event.name,
      description: event.description || 'Bingo benéfico a favor de la niñez atendida por la Asociación Infantil Hogar Sol.',
      startDate: new Date(event.starts_at).toISOString(),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: place ? 'https://schema.org/MixedEventAttendanceMode' : 'https://schema.org/OnlineEventAttendanceMode',
      image: [`${origin}/og-image.png`],
      location: [
        ...(place
          ? [{ '@type': 'Place', name: event.venue || place, address: { '@type': 'PostalAddress', streetAddress: place, addressCountry: 'CR' } }]
          : []),
        { '@type': 'VirtualLocation', url: `${origin}/live` },
      ],
      // Precio por paquete: eligibleQuantity dice cuántos cartones trae ("2 cartones por ₡3 000").
      offers: {
        '@type': 'Offer',
        url: `${origin}/cartones`,
        price: event.price,
        priceCurrency: 'CRC',
        eligibleQuantity: { '@type': 'QuantitativeValue', value: event.bundle_size ?? PACKAGE_SIZE, unitText: 'cartones' },
        availability: Number(event.available_cards) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      },
      organizer: { '@id': orgId },
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

/** Contenido inicial de la página (visible hasta que la app arranca; es lo que lee un buscador sin JavaScript). */
function initialContent(page, event) {
  const lines = [page.description];
  if (page.path === '/') {
    lines.push(
      `Paquete de ${PACKAGE_SIZE} cartones por ${colones(event?.price ?? PACKAGE_PRICE)}. Paga por SINPE Móvil o transferencia y juega en el salón o en línea.`
    );
    if (event) {
      const place = eventPlace(event);
      lines.push(`${event.name}: ${eventDate(event.starts_at)}${place ? `, en ${place}` : ''}.`);
    }
  }
  const nav = CRAWL_LINKS.map(([href, label]) => `<li><a href="${href}">${escapeHtml(label)}</a></li>`).join('');
  return (
    `<main class="container-page py-10">` +
    `<h1 class="font-display text-3xl font-bold text-fg">${escapeHtml(page.heading)}</h1>` +
    lines.map((l) => `<p class="mt-3 max-w-2xl text-lg text-fg-muted">${escapeHtml(l)}</p>`).join('') +
    `<nav aria-label="Secciones"><ul class="mt-6 flex flex-wrap gap-4 font-bold">${nav}</ul></nav>` +
    `</main>`
  );
}

/** Reemplaza el valor de content="" de una etiqueta <meta> (acepta saltos de línea entre atributos). */
const setMeta = (html, attr, key, value) =>
  html.replace(new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`), (_, open, close) => open + escapeHtml(value) + close);

/**
 * index.html con el título, la descripción, la URL canónica, Open Graph, robots, los datos estructurados y
 * el contenido inicial de la ruta pedida. Así cada página comparte su propia vista previa y Google no toma
 * todas las páginas como copia de la portada.
 */
export function renderIndexHtml(html, { origin, page, event }) {
  const url = `${origin}${page.path === '/' ? '/' : page.path}`;
  const description = page.description || DEFAULT_DESCRIPTION;
  // Siempre con función de reemplazo: un "$" en el nombre del evento no debe leerse como patrón de replace.
  let out = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(page.title)}</title>`);
  out = setMeta(out, 'name', 'description', description);
  out = setMeta(out, 'name', 'robots', page.indexable ? 'index, follow' : 'noindex, follow');
  out = setMeta(out, 'property', 'og:title', page.title);
  out = setMeta(out, 'property', 'og:description', description);
  out = setMeta(out, 'property', 'og:url', url);
  out = setMeta(out, 'name', 'twitter:title', page.title);
  out = setMeta(out, 'name', 'twitter:description', description);
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, (_, open, close) => open + escapeHtml(url) + close);
  out = out.replace(
    /<script type="application\/ld\+json">[^<]*<\/script>/,
    () => `<script type="application/ld+json">${structuredData(origin, event)}</script>`
  );
  if (page.indexable) out = out.replace('<div id="root"></div>', () => `<div id="root">${initialContent(page, event)}</div>`);
  return out;
}
