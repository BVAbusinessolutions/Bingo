import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE } from '../config/site';

const DEFAULT_TITLE = 'Bingo Benéfico · Asociación Infantil Hogar Sol';
const DEFAULT_DESCRIPTION =
  'Bingo benéfico de la Asociación Infantil Hogar Sol en Costa Rica. Compra tus cartones en línea y juega en vivo, desde tu casa o en el salón del evento.';

/** Crea o actualiza una etiqueta <meta>/<link> del <head> (las de index.html se reutilizan). */
function setHeadTag(selector, create, attr, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

const meta = (key, value, attr = 'name') =>
  setHeadTag(
    `meta[${attr}="${key}"]`,
    () => {
      const m = document.createElement('meta');
      m.setAttribute(attr, key);
      return m;
    },
    'content',
    value
  );

/**
 * Título, descripción, URL canónica y Open Graph por página (SPA): los buscadores que ejecutan JavaScript
 * y el historial del navegador ven el título correcto de cada sección. `noindex` para páginas que no deben indexarse.
 */
export function usePageMeta({ title, description = DEFAULT_DESCRIPTION, noindex = false } = {}) {
  const { pathname } = useLocation();

  useEffect(() => {
    const fullTitle = title ? `${title} · Bingo Hogar Sol` : DEFAULT_TITLE;
    document.title = fullTitle;
    meta('description', description);
    meta('robots', noindex ? 'noindex, follow' : 'index, follow');
    meta('og:title', fullTitle, 'property');
    meta('og:description', description, 'property');
    meta('twitter:title', fullTitle);
    meta('twitter:description', description);
    if (SITE.url) {
      const url = `${SITE.url}${pathname}`;
      meta('og:url', url, 'property');
      setHeadTag(
        'link[rel="canonical"]',
        () => {
          const l = document.createElement('link');
          l.rel = 'canonical';
          return l;
        },
        'href',
        url
      );
    }
  }, [title, description, noindex, pathname]);
}
