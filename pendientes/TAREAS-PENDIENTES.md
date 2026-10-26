# Tareas pendientes · Bingo Benéfico Hogar Sol

Actualizado el 26/10/2026. Prioridad: 🔴 bloquea producción · 🟠 importante · 🟢 mejora.

## Estado general

El código está completo y probado: **53 pruebas del servidor** (contra Postgres real en memoria) y
**16 del cliente** pasan, `npm run lint` sin errores, `npm audit` con **0 vulnerabilidades** en ambos
proyectos y la web probada en modo producción con CSP estricta.

Lo que falta depende de **datos o cuentas que solo tú tienes** (sección 1) o de las **imágenes reales
de los cartones** (sección 2).

---

## 1. Lo que tienes que hacer tú 🔴

- [ ] **Supabase:** pegar la cadena del *Session pooler* en `DATABASE_URL` (ver `docs/DESPLIEGUE.md`). Recomendado: `SEED_DEMO=false` antes del primer arranque contra Supabase.
- [ ] **Administrador real:** `npm run create-admin` (en producción no existen las cuentas demo).
- [ ] **Correo:** completar `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (Gmail con *contraseña de aplicación*). Sin esto los correos solo salen en la consola.
- [ ] **Datos de cobro reales** desde el panel (Administración → Datos de cobro): titular, cédula jurídica, IBAN. Tu `server/.env` local todavía tiene `PAYMENT_SINPE_PHONE=8888-0000`; el panel lo reemplaza.
- [ ] **Despliegue en Render** con `render.yaml` (plan de pago para el día del evento: el gratis se duerme).
- [ ] **GitHub:** dar permiso de escritura a la cuenta `BryanGz25` en `BVAbusinessolutions/Bingo` (o subir con la cuenta dueña).
- [ ] **Asesoría legal:** revisar los borradores de `/terminos` y `/privacidad` (Ley 8968, PRODHAB) y los permisos para bingos benéficos.
- [ ] **Contacto real** en `client/.env` (`VITE_CONTACT_*`).
- [ ] Cambiar `ADMIN_NOTIFY_EMAILS` (hoy `bryanbs2595@gmail.com`, de pruebas) por el correo definitivo cuando corresponda.

## 2. Lector automático de cartones (esperando muestras) 🔴

- [x] Importar ZIP de PNG como **serie** nueva, con límites de seguridad (tamaño, cantidad, "bombas zip", rutas `../` rechazadas).
- [x] Series como archivos separados (**Nueva / Anterior**) y elegir cuál se juega en cada evento.
- [x] Pantalla de revisión: imagen original + cuadrícula 5×5 editable con validación de rangos B-I-N-G-O.
- [x] Una serie con cartones "por revisar" no se puede jugar.
- [ ] 🔴 **Lectura automática de números y serie desde cada PNG** (`server/src/modules/series/cardRecognizer.js`). Hoy cada imagen queda "por revisar" y se toma la serie del nombre del archivo. Para terminarla hace falta copiar el ZIP (o varias imágenes) en `Bingo/importar/`.

## 3. Completado ✅

**Base de datos y servidor**
- [x] PostgreSQL/Supabase con migraciones automáticas, esquema privado `app`, RLS en todas las tablas y restricciones de negocio en la base (CHECK, FK, índices únicos parciales).
- [x] Reservas atómicas (`UPDATE … WHERE status = 'AVAILABLE'` en transacción); probado con dos compradores simultáneos.
- [x] Liberación de reservas vencidas, purga de tokens y retención de comprobantes (90 días) como tareas periódicas.
- [x] Comprobantes e imágenes guardados en la base (fuera del disco del servidor, incluidos en los respaldos de Supabase).
- [x] `npm run backup`, `/api/health` real (consulta la BD), logs JSON estructurados, apagado ordenado.
- [x] El servidor entrega la web compilada con CSP estricta, HSTS y `frame-ancestors 'none'`.
- [x] Express 5, multer 2.5, zod 4, nodemailer 10, React Router 7, Vite 7 (sin vulnerabilidades conocidas).

**Juego de 75 balotas**
- [x] Cartón 5×5 con el diseño del cartón impreso (BINGO, fondo azul, centro con el logo, serie abajo).
- [x] Patrones: línea (fila, columna o diagonal), cuatro esquinas, letra X y cartón lleno; validados en el servidor.
- [x] Tablero de balotas y consola Bingo Master agrupados por letra.

**Seguridad**
- [x] Datos demo solo en desarrollo; `npm run create-admin` para el admin real.
- [x] Ya no se puede aprobar una compra sin comprobante ni una reserva vencida.
- [x] Secretos JWT validados al arrancar (largo, distintos, no de ejemplo); `iss` y `aud` verificados.
- [x] Bloqueo por cuenta tras 5 intentos fallidos (además del límite por IP); desbloqueo desde el panel.
- [x] Rol y estado del usuario se leen de la BD en cada petición: desactivar o quitar el rol aplica al instante.
- [x] Los sockets se desconectan al vencer el token, al cerrar todas las sesiones, al cambiar la contraseña o al desactivar la cuenta.
- [x] Bitácora de auditoría (compras, sorteo, premios, usuarios, series, configuración y eventos de seguridad).
- [x] `trust proxy` configurable; no se cantan balotas en eventos finalizados o cancelados; restricciones al editar eventos con ventas.
- [x] CSV protegido contra inyección de fórmulas de Excel.
- [x] Corregido: `safeRedirect` añadía texto basura cuando el destino llegaba como cadena (lo encontraron las pruebas).

**Administración**
- [x] Barra lateral: Panel, Compras, Ganadores, Bingo Master, Eventos, Series, Cartones, Usuarios, Bitácora, Datos de cobro.
- [x] Eventos: crear, editar (incluida la transmisión), poner en vivo, finalizar, cancelar (avisa a los compradores) y elegir serie.
- [x] Compras: venta manual (efectivo o SINPE en persona), reembolsos y exportación a Excel.
- [x] Usuarios: buscar, crear administradores, desactivar, desbloquear y cambiar rol.
- [x] Impresión en lote por rango de series; cartones con su imagen original.
- [x] Datos de cobro editables desde el panel.

**Calidad**
- [x] ESLint + Prettier + EditorConfig en servidor y cliente; pruebas con `node:test`/Supertest y Vitest.
- [x] Catálogo rediseñado (casillas grandes, series de 4 o más dígitos, búsqueda de hasta 8 dígitos).

## 4. Mejoras futuras 🟢

- [ ] Segundo factor (2FA) para administradores (hoy: bloqueo por cuenta e IP).
- [ ] Prueba con personas reales (adultos mayores y niños) y con lector de pantalla (NVDA / VoiceOver).
- [ ] Mover la base local de desarrollo fuera de OneDrive (`PGLITE_DIR`) si se siente lenta.
