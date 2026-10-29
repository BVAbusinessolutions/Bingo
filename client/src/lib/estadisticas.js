// Analítica sin costo, modular: Google Analytics 4 o Cloudflare Web Analytics (VITE_ANALYTICS_PROVIDER).
// Solo se carga si la persona acepta las cookies de analítica. El servidor debe tener el mismo valor en
// ANALYTICS_PROVIDER para que la CSP permita sus dominios.
const env = import.meta.env;

const GA4_ID = /^G-[A-Z0-9]{4,20}$/.test(env.VITE_GA4_ID ?? '') ? env.VITE_GA4_ID : '';
const CF_TOKEN = /^[a-f0-9]{32}$/i.test(env.VITE_CF_BEACON_TOKEN ?? '') ? env.VITE_CF_BEACON_TOKEN : '';

const configured = { ga4: Boolean(GA4_ID), cloudflare: Boolean(CF_TOKEN) };

/** Proveedor activo ('ga4' | 'cloudflare') o '' si no hay ninguno bien configurado. */
export const ANALYTICS_PROVIDER = configured[env.VITE_ANALYTICS_PROVIDER] ? env.VITE_ANALYTICS_PROVIDER : '';

let loaded = false;

function addScript(src, attrs = {}) {
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
}

export function loadAnalytics() {
  if (loaded || !ANALYTICS_PROVIDER) return;
  loaded = true;
  if (ANALYTICS_PROVIDER === 'ga4') {
    window[`ga-disable-${GA4_ID}`] = false;
    window.dataLayer = window.dataLayer || [];
    // gtag exige recibir el objeto `arguments` tal cual.
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    // Las páginas vistas se envían a mano en cada cambio de ruta (es una SPA).
    window.gtag('config', GA4_ID, { send_page_view: false });
    addScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`);
  } else {
    // Cloudflare no usa cookies; `spa: true` registra solo los cambios de ruta.
    addScript('https://static.cloudflareinsights.com/beacon.min.js', { defer: '', 'data-cf-beacon': JSON.stringify({ token: CF_TOKEN, spa: true }) });
  }
}

/** Si la persona retira su consentimiento, GA4 deja de enviar datos de inmediato. */
export function disableAnalytics() {
  if (ANALYTICS_PROVIDER === 'ga4') window[`ga-disable-${GA4_ID}`] = true;
}

export function trackPageView(path) {
  if (!loaded || ANALYTICS_PROVIDER !== 'ga4' || window[`ga-disable-${GA4_ID}`]) return;
  window.gtag('event', 'page_view', { page_path: path, page_location: window.location.href, page_title: document.title });
}
