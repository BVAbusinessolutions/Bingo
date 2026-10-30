export const formatCRC = (n) =>
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0);

export const formatDate = (iso) => new Intl.DateTimeFormat('es-CR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso));

const ERRORS = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  EMAIL_TAKEN: 'Ya existe una cuenta con ese correo.',
  TOO_MANY_RESERVATIONS: 'Demasiadas reservas seguidas. Espera unos minutos.',
  TOO_MANY_PENDING: 'Ya tienes 3 reservas pendientes de pago. Págalas o cancélalas primero.',
  CARDS_NOT_AVAILABLE: 'Alguno de los cartones que elegiste ya no está disponible.',
  NOT_ENOUGH_CARDS: 'No quedan suficientes cartones disponibles.',
  EVENT_NOT_ON_SALE: 'La venta de este evento está cerrada.',
  RESERVATION_NOT_PENDING: 'Esta reserva ya no admite pagos (puede haber vencido).',
  PROOF_REQUIRED: 'Adjunta la foto o el PDF del comprobante.',
  NOT_REFUNDABLE: 'Solo se pueden reembolsar compras aprobadas.',
  EVENT_ALREADY_STARTED: 'El sorteo ya empezó: esa acción ya no está permitida.',
  EVENT_HAS_SALES: 'El evento ya tiene ventas: no se puede cambiar el precio, el patrón ni la serie.',
  EVENT_NOT_PLAYABLE: 'El evento está finalizado o cancelado.',
  EVENT_CLOSED: 'El evento está cerrado y no se puede editar.',
  INVALID_STATUS_CHANGE: 'Ese cambio de estado no está permitido.',
  ALREADY_CALLED: 'Esa bola ya fue cantada.',
  CANNOT_CHANGE_SELF: 'No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.',
  SERIES_IN_USE: 'La serie está asignada a un evento y no se puede modificar ni borrar.',
  SERIES_NOT_READY: 'La serie todavía se está procesando o falló.',
  SERIES_NEEDS_REVIEW: 'La serie tiene cartones por revisar. Corrígelos antes de usarla.',
  SERIAL_TAKEN: 'Ya existe otro cartón con ese número de serie en la serie.',
  INVALID_GRID: 'Los números del cartón no son válidos.',
  INVALID_ZIP: 'El archivo no es un ZIP válido o contiene rutas no permitidas.',
  ZIP_WITHOUT_PNG: 'El ZIP no contiene imágenes PNG.',
  ZIP_TOO_MANY_FILES: 'El ZIP tiene demasiadas imágenes (máximo 5000).',
  ZIP_FILE_TOO_LARGE: 'Alguna imagen del ZIP supera los 4 MB.',
  ZIP_TOO_LARGE: 'El ZIP es demasiado grande.',
  ZIP_REQUIRED: 'Selecciona el archivo ZIP.',
  TOO_MANY_LOGIN_ATTEMPTS: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  NOT_DECIDABLE: 'Esta compra ya no se puede aprobar ni rechazar (puede haber vencido o ya fue revisada).',
  INVALID_FILE: 'El archivo debe ser JPG, PNG, WEBP o PDF.',
  FILE_TOO_LARGE: 'El archivo supera los 5 MB.',
  VALIDATION_ERROR: 'Revisa los datos ingresados.',
  EMAIL_NOT_VERIFIED: 'Confirma tu correo antes de comprar. Revisa tu bandeja de entrada.',
  INVALID_TOKEN: 'El enlace no es válido o ya venció. Solicita uno nuevo.',
  INVALID_PASSWORD: 'La contraseña actual no es correcta.',
  TOO_MANY_REQUESTS: 'Demasiados intentos. Espera unos minutos.',
  NOT_A_WINNER: 'Ese cartón todavía no completa el patrón con las bolas cantadas.',
  EVENT_NOT_LIVE: 'El sorteo no está en vivo en este momento.',
  ACCOUNT_SUSPENDED: (d) =>
    `Tu cuenta está suspendida${d.until ? ` hasta el ${formatDate(d.until)}` : ''}. Si crees que es un error, contáctanos.`,
  ACCOUNT_BANNED: 'Tu cuenta fue suspendida de forma permanente por incumplir el reglamento. Si crees que es un error, contáctanos.',
  ALREADY_CLAIMED: 'Ese cartón ya tiene un reclamo registrado.',
  CANNOT_SANCTION_ADMIN: 'Primero quítale el rol de administrador para poder sancionar la cuenta.',
  NOT_SANCTIONED: 'La cuenta no tiene ninguna sanción activa.',
};

/** Mensaje en español para un error de la API; algunos usan datos de la respuesta (p. ej. la fecha de una suspensión). */
export const errorMessage = (err, fallback = 'Ocurrió un error. Intenta de nuevo.') => {
  const body = err?.response?.data ?? {};
  const msg = ERRORS[body.error];
  return (typeof msg === 'function' ? msg(body) : msg) ?? fallback;
};
