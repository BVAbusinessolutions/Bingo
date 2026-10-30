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
  // Lugar predeterminado del evento presencial (mapa de Contacto y pie de página).
  eventVenue: env.VITE_EVENT_VENUE ?? 'Salón de Eventos Tinamaste, Higuito, Desamparados',
  eventVenueMapQuery: env.VITE_EVENT_VENUE_MAP ?? 'Salón de Eventos Tinamaste, Higuito, Desamparados, San José, Costa Rica',
  // Coordenadas exactas "lat,lng" (VITE_EVENT_VENUE_COORDS). Si están, el mapa las usa en lugar de buscar por nombre.
  eventVenueCoords: /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(env.VITE_EVENT_VENUE_COORDS ?? '') ? env.VITE_EVENT_VENUE_COORDS.replace(/\s/g, '') : '',
  legalUpdatedAt: '29 de octubre de 2026',
  // Cédula jurídica (VITE_ORG_LEGAL_ID). Si no está configurada no se menciona en ninguna parte.
  legalId: env.VITE_ORG_LEGAL_ID || '',
  url: (env.VITE_SITE_URL ?? '').replace(/\/+$/, ''),
});

// La fecha, la hora y el lugar del evento NO van aquí: se editan en Administración > Eventos.
export const COSTA_RICA_TZ = 'America/Costa_Rica';

/** ", cédula jurídica 3-002-…" solo si está configurada; si no, texto vacío. */
export const legalIdText = (prefix = ', cédula jurídica ') => (SITE.legalId ? `${prefix}${SITE.legalId}` : '');

/** Premios que exigen mayoría de edad o un tutor legal (texto aprobado por la Asociación). */
export const ADULT_PRIZES_NOTE =
  'Para reclamar ciertos premios, como la motocicleta, se debe ser mayor de edad o contar con un tutor legal que represente a la persona ganadora.';

/** Nota de edad del pie de página y del Centro Legal. */
export const AGE_NOTE = `Las cuentas las registran personas mayores de 18 años; las personas menores de edad pueden jugar con cartones de la cuenta de su madre, padre o tutor legal. ${ADULT_PRIZES_NOTE}`;

/** Requisito para retirar la motocicleta (texto aprobado por la Asociación). */
export const MOTORCYCLE_REQUIREMENT =
  'Para el retiro de la motocicleta se requiere presentar cédula física al día y licencia de conducir vigente de la persona ganadora mayor de edad o de su representante legal, según la legislación de Costa Rica.';

/** Plazo único para coordinar el retiro y presentar requisitos de todos los premios (texto aprobado). */
export const PRIZE_DEADLINE_NOTE =
  'Los ganadores en línea reciben nuestro contacto dentro de 3 días hábiles. Se cuenta con un plazo de 3 días hábiles para coordinar el retiro y la presentación de requisitos de todos los premios, incluida la motocicleta.';

/** Palabra obligatoria en el detalle del SINPE Móvil o la transferencia (la misma que valida el panel). */
export const PAYMENT_DETAIL = 'Bingo';
