/**
 * Metadatos de cada página del sitio para el HTML que entrega el servidor (lo que leen Google, WhatsApp y
 * Facebook antes de ejecutar JavaScript). Los textos coinciden con los de usePageMeta en cada página del cliente.
 */

const SITE_NAME = 'Bingo Hogar Sol';
export const DEFAULT_TITLE = 'Bingo Benéfico · Asociación Infantil Hogar Sol';
export const DEFAULT_DESCRIPTION =
  'Bingo benéfico de la Asociación Infantil Hogar Sol en Costa Rica. Compra tus cartones en línea y juega en vivo, desde tu casa o en el salón del evento.';

const LEGAL = {
  '/terminos': ['Términos, aviso legal e información corporativa', 'Reglas de uso de la plataforma del Bingo Benéfico y datos de la organización responsable.'],
  '/privacidad': [
    'Política de privacidad y protección de datos personales',
    'En la Asociación Infantil Hogar Sol cuidamos tus datos personales conforme a la Ley N.° 8968 de Costa Rica. Aquí te explicamos qué datos usamos, para qué y cuáles son tus derechos.',
  ],
  '/reglamento': ['Reglamento del juego, pagos y premios', 'Cómo se juega, cómo se paga y qué se necesita para recibir un premio, incluida la motocicleta.'],
  '/contingencias': [
    'Contingencias, devoluciones y antifraude',
    'Qué pasa ante empates entre el salón y la plataforma, fallas técnicas, premios no reclamados, cancelaciones, devoluciones e intentos de fraude.',
  ],
  '/propiedad-intelectual': [
    'Propiedad intelectual, imagen y marketing',
    'Quién es dueño de la marca, los diseños y el software, y cómo usamos las imágenes del evento y de los ganadores.',
  ],
  '/edad-y-tutoria': [
    'Restricción de edad y tutoría legal',
    'Quién puede abrir una cuenta, cómo participan las personas menores de edad y qué premios exigen mayoría de edad o un tutor legal.',
  ],
  '/impuestos': [
    'Retención de impuestos sobre premios',
    'Cuándo se retiene un impuesto sobre un premio, cómo se calcula y qué comprobantes recibe la persona ganadora.',
  ],
  '/pagos-sinpe': [
    'Procedimiento de pago por SINPE Móvil y transferencia',
    'Paso a paso para pagar tus cartones, qué escribir en el detalle y cómo verificamos cada pago.',
  ],
  '/cookies': ['Política de cookies', 'Qué cookies y datos guardamos en tu navegador, para qué sirven y cómo cambiar tu decisión.'],
};

/** Páginas públicas que se indexan (y van en sitemap.xml). `title` vacío = título general del sitio. */
const INDEXABLE = {
  '/': { title: '', description: DEFAULT_DESCRIPTION, heading: 'Bingo Benéfico de la Asociación Infantil Hogar Sol' },
  '/cartones': {
    title: 'Comprar cartones',
    description: 'Elige tus cartones del Bingo Benéfico Hogar Sol y paga por SINPE Móvil o transferencia. Juega en el salón o en línea.',
  },
  '/premios': { title: 'Premios', description: 'Motocicleta como premio mayor y requisitos para retirar los premios del Bingo Benéfico Hogar Sol.' },
  '/resultados': {
    title: 'Resultados y ganadores',
    description: 'Ganadores confirmados y bolas cantadas de cada Bingo Benéfico de la Asociación Infantil Hogar Sol.',
    changefreq: 'daily',
  },
  '/contacto': {
    title: 'Contacto',
    description: 'Escribe a la Asociación Infantil Hogar Sol: formulario, WhatsApp, teléfono, correo y datos oficiales de SINPE Móvil.',
  },
  '/legal': {
    title: 'Centro Legal y Transparencia',
    description: 'Privacidad, reglamento, devoluciones, imagen, edad y tutoría legal, impuestos y pagos SINPE del Bingo Benéfico Hogar Sol.',
  },
  ...Object.fromEntries(Object.entries(LEGAL).map(([path, [title, description]]) => [path, { title, description }])),
};

/** Páginas reales que no deben aparecer en Google (cuentas, compras, panel y sorteo con sesión). */
const PRIVATE_EXACT = {
  '/login': 'Iniciar sesión',
  '/registro': 'Crear cuenta',
  '/recuperar': 'Recuperar contraseña',
  '/restablecer': 'Nueva contraseña',
  '/verificar-correo': 'Verificar correo',
  '/unauthorized': 'Acceso restringido',
  '/mis-compras': 'Mis compras',
  '/perfil': 'Mi perfil',
  '/live': 'Sorteo en vivo',
  '/admin': 'Administración',
  '/jugar': 'Sorteo en vivo',
  '/reservar': 'Comprar cartones',
};
const PRIVATE_PREFIXES = [
  ['/mis-compras/', 'Mis compras'],
  ['/reservas/', 'Pago de la reserva'],
  ['/admin/', 'Administración'],
];

/** Rutas del sitemap, en el orden en que se listan. */
export const SITEMAP_PAGES = Object.entries(INDEXABLE).map(([path, page]) => ({ path, changefreq: page.changefreq ?? 'weekly' }));

/** Enlaces de navegación que se entregan en el HTML inicial (ayudan a los buscadores a descubrir el sitio). */
export const CRAWL_LINKS = [
  ['/', 'Inicio'],
  ['/cartones', 'Comprar cartones'],
  ['/premios', 'Premios'],
  ['/resultados', 'Resultados'],
  ['/reglamento', 'Reglamento'],
  ['/contacto', 'Contacto'],
];

const fullTitle = (title) => (title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE);

/** Quita la barra final (salvo en "/") para que /contacto y /contacto/ sean la misma página. */
export const normalizePath = (pathname) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : '/');

/**
 * Metadatos de una ruta:
 *   - indexable: título, descripción y contenido inicial; status 200.
 *   - privada: título propio y noindex; status 200 (la app decide si hace falta iniciar sesión).
 *   - desconocida: noindex y status 404, para que Google no la tome como página válida ("soft 404").
 */
export function pageMetaFor(pathname) {
  const path = normalizePath(pathname);
  const page = INDEXABLE[path];
  if (page) {
    return {
      path,
      status: 200,
      indexable: true,
      title: fullTitle(page.title),
      description: page.description,
      heading: page.heading ?? page.title,
    };
  }
  const privateTitle = PRIVATE_EXACT[path] ?? PRIVATE_PREFIXES.find(([prefix]) => path.startsWith(prefix))?.[1];
  if (privateTitle) {
    return { path, status: 200, indexable: false, title: fullTitle(privateTitle), description: DEFAULT_DESCRIPTION };
  }
  return { path, status: 404, indexable: false, title: fullTitle('Página no encontrada'), description: DEFAULT_DESCRIPTION };
}
