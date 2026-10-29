# Seguridad · Bingo Benéfico Hogar Sol

Qué protege la plataforma, cómo se configura en producción y qué falta hacer fuera del código.

## 1. HTTPS y cabeceras

| Medida | Dónde | Estado |
|---|---|---|
| TLS en todas las conexiones | Render (certificado automático) | Activo |
| Redirección http → https | Render la hace en su borde. `FORCE_HTTPS=true` la repite en el servidor (308), excepto `/api/health` | Opcional |
| HSTS 1 año + subdominios | `server/src/app.js` (helmet), solo en producción | Activo |
| CSP estricta (sin `unsafe-inline` en scripts; los scripts en línea van por hash) | `clientCsp()` en `server/src/app.js` | Activo |
| `frame-ancestors 'none'` (anti-clickjacking) | CSP | Activo |
| `Permissions-Policy` (sin cámara, micrófono, ubicación, pagos, USB) | `server/src/app.js` | Nuevo |
| `Referrer-Policy: strict-origin-when-cross-origin` | helmet | Activo |
| TLS hacia la base de datos (Supabase) con verificación del certificado | `DATABASE_SSL`, `DATABASE_CA_CERT` | Activo |

La CSP se amplía sola con lo que se configure:

- `STREAM_ORIGINS=https://cdn.ejemplo.com`: habilita la transmisión LL-HLS / WebRTC en `connect-src` y `media-src`.
  El panel solo acepta URLs de transmisión de esos orígenes.
- `ANALYTICS_PROVIDER=ga4|cloudflare`: habilita los dominios de esa analítica. En el cliente hay que poner el
  mismo valor en `VITE_ANALYTICS_PROVIDER`.

## 2. Cifrado de datos

- **En tránsito:** HTTPS/TLS entre el navegador y el servidor, y TLS entre el servidor y Supabase.
- **En reposo:** Supabase cifra el disco (AES-256). Las tablas viven en el esquema privado `app`, con RLS
  activado y sin políticas, así que la API pública de Supabase no las expone.
- **Contraseñas:** bcrypt con costo 12; nunca se guardan ni se registran en texto plano.
- **Sesiones:** el access token (JWT HS256, 15 min) se guarda en memoria. El refresh token va en una cookie
  `HttpOnly` + `Secure` + `SameSite=Strict`, con rotación y detección de reutilización.
- **Pagos:** la plataforma no procesa tarjetas ni guarda credenciales bancarias. SINPE y las transferencias se
  hacen desde la app del banco; aquí solo se guarda el comprobante, que se sirve con `CSP: sandbox`.

## 3. Rate limiting y DDoS

Límites por IP, en `server/src/middleware/security.js`:

| Ruta | Límite |
|---|---|
| Toda la API | 300 / min |
| Login (solo intentos fallidos) | 5 / 15 min, más bloqueo de la cuenta tras 5 fallos |
| Registro | 10 / hora |
| Reservas | 10 / 10 min |
| Reclamos de bingo | 10 / min |
| Correos y contraseñas | 10 / 15 min |
| Importar ZIP | 5 / hora |

Los límites por aplicación **no detienen un DDoS volumétrico**. Para el día del evento se recomienda:

1. **Cloudflare (plan gratuito) delante de Render.** Poner el dominio en Cloudflare con el proxy activo
   (nube naranja), SSL "Full (strict)" y "Always use HTTPS". Si la página recibe un ataque, activar el modo
   **Under Attack**.
2. Agregar una regla de rate limiting en Cloudflare para `/api/auth/*` como primera barrera.
3. Configurar `TRUST_PROXY` según la cantidad de proxies (Cloudflare + Render = `2`), para que los límites por
   IP vean la IP real.
4. Contratar un plan de Render de pago para el evento: el gratis se duerme.

## 4. Fraude y cuentas

- **Sanciones:** desde Administración → Usuarios se puede **suspender** una cuenta por 1 a 365 días (vence
  sola) o **banearla** de forma permanente. El motivo es obligatorio.
  - La sanción cierra las sesiones y los sockets al instante y libera los cartones apartados sin pagar.
  - Queda en la bitácora (`user.suspended`, `user.banned`, `user.sanction_lifted`).
  - Los administradores no se pueden sancionar sin quitarles antes el rol.
- **Validación cruzada:**
  - Mismo número de comprobante o misma foto en otra compra (huella SHA-256).
  - Misma cédula o DIMEX usada desde varias cuentas, o perteneciente a una cuenta baneada. Se normaliza, así
    que `1-0234-0567` = `102340567`.
  - En cualquiera de estos casos, la compra exige una casilla extra de verificación antes de aprobarla.
  - El buscador de usuarios encuentra cuentas por cédula.
- **Cartones:** número de serie único por evento (restricción en la base). Las reservas son atómicas, así que
  dos personas no pueden comprar el mismo cartón. Los cartones repetidos dentro de una serie se descartan al
  importarla.
- **Ganadores:** el servidor valida cada reclamo contra las balotas cantadas. Además, después de cada balota
  revisa **todos** los cartones vendidos, en línea y en el salón, y le muestra al admin en Bingo Master cuáles
  ya tienen bingo, los haya reclamado alguien o no.

## 5. Pendiente fuera del código

- [ ] Cloudflare delante de Render (punto 3).
- [ ] Segundo factor (2FA) para administradores.
- [ ] Inscribir la base de datos ante la PRODHAB si la asesoría legal lo considera necesario (Ley 8968).
- [ ] Rotar `JWT_*` y la contraseña de la base si alguien sale del equipo.
