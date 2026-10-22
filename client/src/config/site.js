// Datos públicos de la organización. Se configuran con VITE_* en client/.env (son públicos, no secretos).
// Los valores por defecto son de ejemplo: reemplazarlos por los reales antes de publicar.
const env = import.meta.env;

export const SITE = Object.freeze({
  name: 'Asociación Infantil Hogar Sol',
  shortName: 'Hogar Sol',
  contactEmail: env.VITE_CONTACT_EMAIL ?? 'contacto@hogarsol.org',
  contactPhone: env.VITE_CONTACT_PHONE ?? '+506 2222-0000',
  whatsapp: env.VITE_CONTACT_WHATSAPP ?? '50688880000', // solo dígitos, con código de país
  address: env.VITE_CONTACT_ADDRESS ?? 'San José, Costa Rica',
  schedule: env.VITE_CONTACT_SCHEDULE ?? 'Lunes a viernes, 8:00 a. m. a 5:00 p. m.',
  legalUpdatedAt: '21 de octubre de 2026',
});
