const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
};

export const env = {
  port: Number(process.env.PORT ?? 4000),
  isProd: process.env.NODE_ENV === 'production',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  accessSecret: required('JWT_ACCESS_SECRET'),
  refreshSecret: required('JWT_REFRESH_SECRET'),
  accessTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7),
  reservationTtlMin: Number(process.env.RESERVATION_TTL_MIN ?? 15),
  // Correos a los que llega el aviso de cada compra nueva (separados por coma)
  adminNotifyEmails: (process.env.ADMIN_NOTIFY_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean),
  // SMTP: sin SMTP_HOST los correos solo se muestran en consola
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true', // true para el puerto 465
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM || 'Bingo Hogar Sol <no-responder@hogarsol.org>',
  },
  // Datos de cobro que se muestran al cliente
  payment: {
    holder: process.env.PAYMENT_HOLDER ?? 'Asociación Infantil Hogar Sol',
    sinpePhone: process.env.PAYMENT_SINPE_PHONE ?? '8888-0000',
    iban: process.env.PAYMENT_IBAN ?? 'CR00 0000 0000 0000 0000 00',
    bank: process.env.PAYMENT_BANK ?? 'Banco Nacional de Costa Rica',
    holderId: process.env.PAYMENT_HOLDER_ID ?? '3-002-000000',
  },
};
