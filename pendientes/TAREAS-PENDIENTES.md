# Tareas pendientes · Bingo Benéfico Hogar Sol

Revisión del 21/10/2026 sobre el código actual (`client/` + `server/`).
Marca cada casilla al terminarla. Prioridad: 🔴 bloquea producción · 🟠 importante · 🟢 mejora.

## Veredicto de seguridad

La base está bien pensada para desarrollo. **El sistema todavía no es seguro para producción.**
Hay 4 bloqueantes de seguridad (sección 1). El más grave: hoy cualquiera podría entrar como
administrador con la contraseña de prueba `Admin123!`.

**Lo que ya está bien hecho** (mantenerlo así):

- [x] Contraseñas con bcrypt (costo 12) y hash ficticio contra enumeración por tiempo en login.
- [x] Access token solo en memoria, refresh token en cookie `HttpOnly` + `SameSite=Strict` + `path=/api/auth`.
- [x] Rotación de refresh token con detección de reutilización (revoca todas las sesiones).
- [x] Anti-CSRF con cabecera `X-Requested-With` en refresh/logout.
- [x] JWT con algoritmo fijo `HS256` y `issuer` verificado.
- [x] Autorización por rol en el servidor (`authorize('ADMIN')`) y verificación de dueño en reservas (evita IDOR).
- [x] El rol nunca se acepta del cliente al registrarse.
- [x] Validación con zod en servidor y en cliente, límite de body de 50 kb.
- [x] Rate limit en login, registro, reservas y API general.
- [x] Subida de comprobantes: tipo verificado por firma real del archivo, 5 MB máx., nombre aleatorio.
- [x] `helmet`, CORS restringido a un origen y errores 500 sin detalles internos.
- [x] Sockets autenticados; `/admin` solo para ADMIN y los jugadores solo escuchan.
- [x] Catálogo público sin datos de quién compró.

---

## 1. Seguridad · bloqueantes 🔴

- [ ] **Usuarios demo en producción.** `seed()` siempre crea `admin@hogarsol.org / Admin123!` y otros usuarios con contraseña conocida (`server/src/db.js:64`, `server/src/index.js:19`). Ejecutar el seed solo si `NODE_ENV !== 'production'` y crear el admin real con un script aparte.
- [x] ~~**Bug al aprobar un pago sin comprobante.**~~ Resuelto el 22/10/2026: solo se aprueban compras con comprobante (`PROOF_SUBMITTED`). El panel deja aprobar reservas `PENDING`, pero `approveReservation` usa `r.buyer.email` y `buyer` es `null` → los cartones quedan como VENDIDOS, el servidor responde 500 y no se envía correo (`server/src/modules/admin/admin.routes.js` ruta `/decision`, `reservations.service.js` `approveReservation`). Permitir aprobar solo `PROOF_SUBMITTED` y ocultar el botón en `AdminPaymentsPage`.
- [x] ~~**Aprobar reservas ya vencidas.**~~ Resuelto el 22/10/2026: `/decision` libera las vencidas antes de decidir. La ruta `/decision` no llama a `releaseExpiredReservations()` antes de decidir; durante hasta 30 s se puede aprobar una reserva vencida cuyos cartones ya deberían estar libres.
- [x] **El ganador solo se calcula en el navegador.** Resuelto el 22/10/2026: `POST /api/events/:id/claims` valida en el servidor dueño del cartón, sorteo en vivo y patrón con las balotas cantadas (`server/src/modules/claims/`).

## 2. Seguridad · importante 🟠

- [ ] Validar al iniciar que `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` tengan ≥ 32 caracteres, sean distintos y no sean `cambia-esto` (`server/src/config/env.js`).
- [ ] Actualizar `multer` a 2.x: la rama 1.x tiene avisos de DoS publicados. Correr `npm audit` en `client/` y `server/` y revisar resultados. (`nodemailer` ya se instaló en la versión corregida 10.2.1; `npm audit` del servidor: 0 vulnerabilidades al 22/10/2026.)
- [x] Comprobantes servidos con `Content-Security-Policy: sandbox` (`sendProofFile` en `reservations.service.js`).
- [x] `/admin/reservations/:id/proof` ya responde 404 (no 500) si la reserva solo tiene número de referencia.
- [ ] No permitir cantar balotas en eventos `FINISHED` o `CANCELLED`; hoy `draw/call` además los cambia a `LIVE`.
- [ ] Restringir `PATCH /admin/events/:id`: no cambiar `price` ni `pattern` con cartones ya vendidos; definir transiciones de estado válidas.
- [ ] Desconectar sockets cuando vence el access token o el usuario cierra sesión (hoy siguen conectados).
- [ ] Bitácora de auditoría: quién aprobó o rechazó cada pago, quién cantó o deshizo cada balota y cuándo.
- [ ] Segundo factor (2FA) o al menos bloqueo por cuenta (no solo por IP) para administradores.
- [ ] Borrar o archivar comprobantes de reservas rechazadas o vencidas según una política de retención.
- [ ] Ajustar `trust proxy` según el hosting real (hoy fijo en `1`).
- [ ] Cabeceras de seguridad para el frontend en producción (CSP que permita solo los iframes de YouTube/Twitch/Vimeo, HSTS).
- [ ] 🟢 El registro revela si un correo existe (`EMAIL_TAKEN`). Aceptable, pero documentarlo o unificar el mensaje.
- [ ] Los tokens de recuperación y verificación de correo viven en memoria (se guarda solo su hash). Moverlos a la BD junto con el resto (punto 3).

## 3. Infraestructura y backend 🔴

- [ ] **Base de datos real** (PostgreSQL recomendado). Hoy todo vive en memoria: un reinicio borra usuarios, pagos, cartones vendidos y sesiones.
- [ ] Reservas atómicas en BD: `UPDATE ... WHERE status = 'AVAILABLE'` dentro de una transacción.
- [ ] Liberación de reservas vencidas como tarea programada sobre la BD.
- [x] Envío de correo real por SMTP con `nodemailer` (plantilla HTML con botón). Sin `SMTP_HOST` sigue mostrándose en consola.
- [ ] 🔴 **Configurar el SMTP** en `server/.env` (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`). Con Gmail usar una *contraseña de aplicación*. Hasta entonces los correos solo salen en la consola del servidor.
- [ ] Cambiar `ADMIN_NOTIFY_EMAILS` (hoy `bryanbs2595@gmail.com`, de pruebas) por el correo real de la Asociación.
- [ ] Almacenamiento de comprobantes fuera del servidor (bucket privado) con respaldo.
- [ ] Despliegue con HTTPS, `NODE_ENV=production` (activa la cookie `secure`) y servir `client/dist`.
- [ ] Respaldos automáticos de la base de datos.
- [ ] Healthcheck y logs estructurados.

## 4. Interfaz de usuario (cliente) 👤 ✅ completada el 22/10/2026

**Ya existía:** inicio con cuenta regresiva · catálogo y selección de cartones · pago SINPE/transferencia con temporizador · mis compras · transmisión en vivo con tablero de balotas y marcado automático.

- [x] Botón **"¡Bingo!"** bajo cada cartón ganador, validado en el servidor, con estado del reclamo (en verificación, confirmado, no confirmado).
- [x] Recuperar contraseña: `/recuperar` → enlace por correo (30 min, un solo uso) → `/restablecer`. No revela si el correo existe.
- [x] Verificación de correo al registrarse (`/verificar-correo`), aviso con "Reenviar enlace" y compra bloqueada hasta confirmar.
- [x] Avisos en tiempo real (canal `/user`) cuando se aprueba o rechaza un pago o se confirma un premio.
- [x] Perfil (`/perfil`): nombre, teléfono, cambio de contraseña, cerrar sesión en todos los dispositivos, tamaño de letra y modo día/noche.
- [x] Detalle de compra (`/mis-compras/:id`): progreso, datos del pago, comprobante enviado y cartones.
- [x] Pie de página con Términos (`/terminos`), Privacidad (`/privacidad`) y Contacto (`/contacto`). Aceptación de términos obligatoria al registrarse.
- [x] Imprimir o guardar en PDF los cartones (detalle de compra y "Jugar en vivo").
- [x] Página 404 propia.
- [x] Resultados y ganadores (`/resultados`), con nombre abreviado ("María G.") por privacidad.
- [x] Accesibilidad: control de tamaño de letra A / A+ / A++, letra base de 17 px (Nunito), botones de 48 px o más, "Saltar al contenido", etiquetas y errores ligados a cada campo, última balota anunciada a lectores de pantalla, respeto de "reducir movimiento".
- [ ] 🟢 Prueba con personas reales (adultos mayores y niños) y con lector de pantalla (NVDA / VoiceOver).
- [x] Compra por pasos estilo cine: **1 Elige tus cartones → 2 Tus datos y pago → 3 Confirmación** (`/cartones` → `/reservas/:id`). El modal de pago se reemplazó por una página completa.
- [x] Paso 2 con aviso grande y obligatorio: el detalle del SINPE / transferencia debe decir **BINGO** (botón para copiarlo).
- [x] Número de comprobante **y** foto del comprobante obligatorios (antes bastaba uno de los dos).
- [ ] 🟢 Rediseñar la cuadrícula del catálogo (selector de cartones) con el mismo estilo nuevo.

## 5. Interfaz de administración 🛠️

**Ya existía:** dashboard con estadísticas · consola de sorteo (cantar/deshacer) · crear eventos · generar y buscar cartones.

- [x] Barra lateral de administración con contadores de pendientes (Panel, Compras, Ganadores, Bingo Master, Eventos, Cartones).
- [x] **Correo al admin en cada compra** (`ADMIN_NOTIFY_EMAILS`) con los datos del comprador, cartones, monto, n.º de comprobante y enlace directo al detalle. También avisa por correo cada bingo reclamado.
- [x] **Compras** (`/admin/compras`): filtros por estado, búsqueda por nombre, cédula, comprobante o cartón, y miniatura del comprobante.
- [x] **Detalle de compra** (`/admin/compras/:id`): foto del comprobante ampliable, n.º de comprobante (copiable), método, monto, datos del formulario, cuenta que compró y cartones.
- [x] Aprobación con **lista de verificación** (monto, n.º de comprobante, detalle "BINGO", dinero recibido) y diálogo de confirmación. Al aprobar, el cliente recibe un correo con el enlace a sus cartones.
- [x] **Ganadores** (`/admin/ganadores`): cartón marcado con las balotas cantadas al reclamar, datos de contacto y botones confirmar o rechazar.
- [ ] 🟠 Editar y cancelar eventos desde la interfaz, con las restricciones del punto 2.
- [ ] 🟠 Gestión de usuarios: buscar, desactivar y crear otros administradores (sin usar el seed).
- [ ] 🟠 Bitácora de auditoría visible (quién hizo qué y cuándo).
- [ ] 🟠 Venta manual o en efectivo (asignar cartones a un comprador sin pasar por el flujo web).
- [ ] 🟠 Configurar datos de cobro (SINPE, IBAN) desde el panel en vez de `.env`.
- [ ] 🟢 Exportar ventas y pagos a CSV o Excel para contabilidad.
- [ ] 🟢 Reembolsos: marcar una compra como reembolsada y liberar o anular cartones.
- [ ] 🟢 Imprimir cartones en lote (PDF) para venta física.
- [ ] 🟢 Configurar la transmisión (proveedor e ID del video) desde la edición del evento.

## 6. Legal (Costa Rica) 🔴

- [ ] Revisar con asesoría legal los **borradores** ya publicados en `/privacidad` y `/terminos` (Ley 8968, PRODHAB) antes de salir a producción.
- [ ] Reemplazar los datos de contacto de ejemplo (`VITE_CONTACT_*` en `client/.env`).
- [ ] Confirmar con asesoría legal los permisos que se requieren para realizar bingos benéficos.
- [ ] Definir cuánto tiempo se guardan los comprobantes y datos personales.

## 7. Calidad del código 🟢

- [ ] ESLint + Prettier en `client/` y `server/`, con `npm run lint`.
- [ ] Pruebas con Vitest: patrones de bingo (`constants/patterns.js`), generador de cartones, flujo de reserva → pago → aprobación, `safeRedirect`.
- [ ] Usar `PATHS` (`client/src/routing/paths.js`) en `SiteHeader` y `AdminLayout` en vez de rutas escritas a mano.
- [ ] Partir `PaymentModal.jsx` (359 líneas) en subcomponentes + un hook.
