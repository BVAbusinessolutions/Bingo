// Única fuente de verdad para las URLs de la app. Cambia una ruta aquí y no en cada <Link>.
export const PATHS = Object.freeze({
  home: '/',
  catalog: '/cartones',
  results: '/resultados',
  terms: '/terminos',
  privacy: '/privacidad',
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
  adminPurchaseDetail: 'compras/:id',
  adminWinners: 'ganadores',
  adminDraw: 'sorteo',
  adminEvents: 'eventos',
  adminCards: 'cartones',
});

/** Construye una ruta con parámetros: toPath(PATHS.purchaseDetail, { id }) -> /mis-compras/abc */
export const toPath = (pattern, params) => pattern.replace(/:(\w+)/g, (_, key) => encodeURIComponent(params[key]));
