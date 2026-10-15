// Deben coincidir con los roles del backend (server/src/db.js). INVITADO = sin sesión.
export const ROLES = Object.freeze({ ADMIN: 'ADMIN', CLIENTE: 'CLIENTE', INVITADO: 'INVITADO' });

export const DEMO_ACCOUNTS = Object.freeze([
  { role: ROLES.ADMIN, label: 'Administrador', email: 'admin@hogarsol.org', password: 'Admin123!' },
  { role: ROLES.CLIENTE, label: 'Cliente', email: 'cliente@hogarsol.org', password: 'Cliente123!' },
]);
