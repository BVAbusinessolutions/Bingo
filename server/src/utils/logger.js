// Logs estructurados en JSON (una línea por evento) para poder buscarlos en el hosting.
// Nunca registrar contraseñas, tokens, cabeceras de autorización ni cuerpos completos de peticiones.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = LEVELS[process.env.LOG_LEVEL ?? 'info'] ?? LEVELS.info;
const pretty = process.env.NODE_ENV !== 'production';

function write(level, event, data = {}) {
  if (LEVELS[level] < minLevel) return;
  const entry = { time: new Date().toISOString(), level, event, ...data };
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  if (pretty) out(`[${entry.time.slice(11, 19)}] ${level.toUpperCase()} ${event}`, Object.keys(data).length ? data : '');
  else out(JSON.stringify(entry));
}

export const logger = {
  debug: (event, data) => write('debug', event, data),
  info: (event, data) => write('info', event, data),
  warn: (event, data) => write('warn', event, data),
  error: (event, data) => write('error', event, data),
};

/** Middleware: una línea por petición con método, ruta (sin query), estado y duración. */
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    if (req.path === '/api/health') return;
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    write(level, 'http.request', {
      method: req.method,
      path: req.baseUrl + req.path,
      status: res.statusCode,
      ms: Math.round(ms),
      user: req.user?.id,
    });
  });
  next();
}
