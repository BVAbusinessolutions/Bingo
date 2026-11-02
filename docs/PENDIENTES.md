# Pendientes y estado del proyecto

Última revisión: 02/11/2026 (rama `main`).

**Estado:** el sitio está en producción en https://bingo-hogar-sol.onrender.com (Render, plan de pago) con el
evento «Gran Bingo Hogar Sol» (15/11/2026, 1:00 p. m., ₡2 000 por cartón) y la serie *HOGAR SOL 1001-1500*
(500 cartones, todos leídos) a la venta.

## Pendientes antes del evento

- [ ] **Enlace de YouTube Live** (el día del evento): *Administración → Eventos → Editar → Transmisión → YouTube
      Live*, pegar la URL o el ID del directo y guardar. Quienes estén en la vista en vivo lo ven al instante sin
      recargar. Hasta entonces la vista en vivo no muestra video.
- [ ] **Revisión legal** de reglamento, términos y privacidad (ver `docs/LEGAL-REVISION.md`).
- [ ] **Confirmar con la Asociación** dos respuestas de Preguntas frecuentes: si los cartones se pueden
      transferir a otra persona y si se puede jugar fuera de San José.
- [ ] **Coordenadas exactas del Salón Tinamaste** en `VITE_EVENT_VENUE_COORDS` en Render (formato `lat,lng`;
      el mapa usa hoy la búsqueda por nombre). Requiere volver a desplegar.
- [ ] **No cantar bolas en Bingo Master antes del evento.** La primera bola pone el evento EN VIVO, cierra la
      venta y no se puede volver a «Programado» (habría que cancelar el evento y crear otro).
- [ ] Primera venta real: confirmar que llega el correo de **compra aprobada** con el enlace a los cartones
      (los correos de verificación, comprobante recibido, aviso al admin y pago rechazado ya se probaron).

## Recomendado (no bloquea)

- [ ] Probar en teléfonos reales: marcado manual con el grano de maíz, sonido, filtros de daltonismo,
      letra Lexend, carrusel de la moto (deslizar) y recorte de la foto de perfil.
- [ ] Sacar del historial de git los PNG pesados de la moto (exige reescribir la historia y forzar el push).
- [ ] Si la web y la API se publican en dominios distintos: `VITE_API_URL` en el cliente y `CLIENT_ORIGIN`
      en el servidor (las imágenes públicas ya permiten cargarse desde otro dominio).
- [ ] Segundo factor (2FA) para administradores (hoy: bloqueo por cuenta e IP).
- [ ] Prueba con personas reales (adultos mayores y niños) y con lector de pantalla (NVDA / VoiceOver).
- [ ] Mover la base local de desarrollo fuera de OneDrive (`PGLITE_DIR`) si se siente lenta.
- [ ] El contador de visitas es anónimo y básico (una por sesión del navegador). Para analítica completa,
      activar `ANALYTICS_PROVIDER` (respeta el aviso de cookies).

## Completado

Además de lo de abajo, sigue vigente todo lo completado en la lista anterior (base de datos con RLS y
migraciones automáticas, reservas atómicas, series de cartones, bitácora, bloqueo por intentos, CSP estricta,
exportación a Excel protegida, etc.); se puede consultar en el historial de `pendientes/TAREAS-PENDIENTES.md`.

### Puesta en producción (02/11/2026)

- [x] Despliegue en Render (plan de pago) con Supabase como base de datos y administrador real.
- [x] Correo real (SMTP de Gmail): avisos a `bingohogarsol@gmail.com`. Probado con una compra de prueba: llegan a
      la bandeja de entrada la verificación de cuenta, «Recibimos tu comprobante», «Nueva compra por verificar»
      y «Pago no verificado».
- [x] Datos de cobro (SINPE Móvil 6027-1658 y transferencia) y contacto real: +506 6027-1658,
      WhatsApp 6027-1658 y `bingohogarsol@gmail.com`.
- [x] Lector de cartones por plantillas de dígitos (`cardRecognizer.js` + `digitTemplates.json`): la serie
      1001-1500 se leyó completa (500/500, 0 por revisar) en ~2 min. Si una cifra no coincide con claridad la
      casilla queda «por revisar»; nunca acepta un número dudoso.
- [x] Panel de administración sin eventos: muestra «Todavía no hay ningún bingo creado» en lugar de quedarse
      cargando.
- [x] Evento creado y serie asignada; venta abierta.

### Juego

- [x] Patrones Línea (horizontal, vertical, diagonal), Cuatro esquinas, X y Cartón lleno, validados en el
      servidor y en el cliente con las mismas reglas (pruebas en ambos lados).
- [x] Botón **¡Bingo!** bloqueado hasta completar el patrón con bolas cantadas; se enciende con pulso y sonido.
- [x] Marcado manual por defecto (aviso antes de activar el automático) y fichas: ficha, oro, maíz, estrella.
- [x] Finanzas (Administración → Finanzas): ingresos verificados separados en cartones virtuales (en línea) y
      físicos (salón), por método (SINPE, transferencia, efectivo), gastos con factura, balance, comprobantes
      adjuntados por la administración y libro en Excel. Los vendidos de demostración no cuentan como dinero.
- [x] Rondas y modalidades: en Bingo Master se elige la modalidad de cada ronda (Línea, Dos líneas, Cuatro esquinas,
      Letra X, Cruz, Letra T, Letra L, Marco, Cuadro central, Cartón lleno) y se abren rondas nuevas; cada cartón
      puede ganar una vez por ronda.
- [x] Panel con datos reales en vivo: personas en el sitio ahora (latido anónimo por pestaña, en memoria: con
      varias instancias del servidor habría que llevarlo a la base o a Redis), jugando en vivo, visitas de hoy y
      de los últimos 14 días.
- [x] Vistas de "Mis cartones" (Auto, Grande, Una a la vez, Mosaico, Mini): Auto se ajusta a cuántos cartones hay
      (1 grande, 2 a 4 mosaico, 5 o más mini); accesos por n.º de cartón con lo que le falta a cada uno.
- [x] Terminología "bola" en toda la plataforma.
- [x] Cartones de prueba: `npm run demo:cartones` (`--vivo`, `--venta`, `--reiniciar`).

### Cuentas y seguridad

- [x] Verificación de correo: al registrarse se envía un enlace; la cuenta puede entrar pero **no puede comprar**
      hasta confirmar el correo (lo exige el servidor).
- [x] Sanciones (suspensión temporal y baneo) con motivo. La persona ve el aviso con el motivo al iniciar
      sesión o, si tenía la sesión abierta, en cuanto la plataforma renueva su sesión.
- [x] Foto de perfil con recorte, zoom y teclado; se guarda en la base y aparece en la barra.

### Administración

- [x] Recaudación = solo compras aprobadas por un admin con método de cobro (cartones aprobados × precio).
- [x] Tráfico y conversión: visitas, usuarios activos y verificados, conversión de compras, comprobantes pendientes.
- [x] Compras con filtros y acciones en píldoras de 44 px que se acomodan en celular.

### Interfaz

- [x] Modo Día/Noche en vidrio, barra institucional azul con controles de 44 px.
- [x] Carrusel de la motocicleta (3 fotos WebP) con flechas, puntos y deslizamiento.
- [x] Accesibilidad: tamaño de letra, alto contraste, menos movimiento, filtros de daltonismo y letra para dislexia.
- [x] Preguntas frecuentes, buzón de sugerencias y mapa del salón en Contacto.
