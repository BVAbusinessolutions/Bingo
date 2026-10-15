export const formatCRC = (n) =>
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0);

export const formatDate = (iso) =>
  new Intl.DateTimeFormat('es-CR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso));

const ERRORS = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  EMAIL_TAKEN: 'Ya existe una cuenta con ese correo.',
  TOO_MANY_LOGIN_ATTEMPTS: 'Demasiados intentos. Espera unos minutos.',
  TOO_MANY_RESERVATIONS: 'Demasiadas reservas seguidas. Espera unos minutos.',
  TOO_MANY_PENDING: 'Ya tienes 3 reservas pendientes de pago. Págalas o cancélalas primero.',
  CARDS_NOT_AVAILABLE: 'Alguno de los cartones que elegiste ya no está disponible.',
  NOT_ENOUGH_CARDS: 'No quedan suficientes cartones disponibles.',
  EVENT_NOT_ON_SALE: 'La venta de este evento está cerrada.',
  RESERVATION_NOT_PENDING: 'Esta reserva ya no admite pagos (puede haber vencido).',
  PROOF_REQUIRED: 'Ingresa el número de comprobante o adjunta la imagen/PDF.',
  INVALID_FILE: 'El archivo debe ser JPG, PNG, WEBP o PDF.',
  FILE_TOO_LARGE: 'El archivo supera los 5 MB.',
  VALIDATION_ERROR: 'Revisa los datos ingresados.',
};

export const errorMessage = (err, fallback = 'Ocurrió un error. Intenta de nuevo.') =>
  ERRORS[err?.response?.data?.error] ?? fallback;
