// Única fuente de verdad para las URLs de la app. Cambia una ruta aquí y no en cada <Link>.
export const PATHS = Object.freeze({
  home: '/',
  catalog: '/cartones',
  prizes: '/premios',
  results: '/resultados',
  terms: '/terminos',
  privacy: '/privacidad',
  rules: '/reglamento',
  contingencies: '/contingencias',
  intellectualProperty: '/propiedad-intelectual',
  age: '/edad-y-tutoria',
  taxes: '/impuestos',
  sinpe: '/pagos-sinpe',
  legal: '/legal',
  cookies: '/cookies',
  contact: '/contacto',
  login: '/login',
  register: '/registro',
  forgotPassword: '/recuperar',
  resetPassword: '/restablecer',
  verifyEmail: '/verificar-correo',
  unauthorized: '/unauthorized',

  checkout: '/reservas/:id',
  myPurchases: '/mis-compras',
  purchaseDetail: '/mis-compras/:id',
  profile: '/perfil',
  live: '/live',

  admin: '/admin',
  adminPurchases: 'compras',
  adminFinance: 'finanzas',
  adminPurchaseDetail: 'compras/:id',
  adminWinners: 'ganadores',
  adminDraw: 'sorteo',
  adminSeries: 'series',
  adminSeriesDetail: 'series/:id',
  adminUsers: 'usuarios',
  adminAudit: 'bitacora',
  adminSettings: 'configuracion',
  adminPrint: 'imprimir',
  adminEvents: 'eventos',
  adminCards: 'cartones',
});

/** Construye una ruta con parámetros: toPath(PATHS.purchaseDetail, { id }) -> /mis-compras/abc */
export const toPath = (pattern, params) => pattern.replace(/:(\w+)/g, (_, key) => encodeURIComponent(params[key]));

/** Anclas de la página de Contacto ("Cómo llegar", "Ir al mapa", "Preguntas frecuentes" y "Buzón de sugerencias"). */
export const CONTACT_ANCHORS = Object.freeze({ map: 'mapa-salon', faq: 'preguntas-frecuentes', suggestions: 'buzon-sugerencias' });
