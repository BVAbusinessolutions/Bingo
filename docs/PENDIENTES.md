# Pendientes y estado del proyecto

Última revisión: 29/10/2026 (rama `Angel`).

## Para salir a producción (bloquean el lanzamiento)

- [ ] **Correo real (SMTP).** Sin `SMTP_HOST` en `server/.env` los correos (verificación de cuenta, recuperar
      contraseña, avisos de compra) solo se imprimen en la consola del servidor y nadie los recibe.
      Ver `server/.env.example` (Gmail con contraseña de aplicación o un proveedor transaccional).
- [ ] **Datos de cobro reales** (titular, SINPE Móvil, IBAN) en *Administración → Datos de cobro*.
- [ ] **Coordenadas exactas del Salón Tinamaste** en `VITE_EVENT_VENUE_COORDS` (el mapa usa un valor aproximado).
- [ ] **Transmisión:** id de video o URL del stream en el evento; si es LL-HLS/WHEP, su origen en `STREAM_ORIGINS`.
- [ ] **Revisión legal** de reglamento, términos y privacidad (ver `docs/LEGAL-REVISION.md`).
- [ ] **Confirmar con la Asociación** dos respuestas de Preguntas frecuentes: si los cartones se pueden
      transferir a otra persona y si se puede jugar fuera de San José.
- [ ] Crear el administrador real (`npm run create-admin`) y no usar las cuentas de demostración.

## Recomendado (no bloquea)

- [ ] Probar en teléfonos reales: marcado manual con el grano de maíz, sonido, filtros de daltonismo,
      letra Lexend, carrusel de la moto (deslizar) y recorte de la foto de perfil.
- [ ] Sacar del historial de git los PNG pesados de la moto (exige reescribir la historia y forzar el push).
- [ ] Si la web y la API se publican en dominios distintos: `VITE_API_URL` en el cliente y `CLIENT_ORIGIN`
      en el servidor (las imágenes públicas ya permiten cargarse desde otro dominio).
- [ ] El contador de visitas es anónimo y básico (una por sesión del navegador). Para analítica completa,
      activar `ANALYTICS_PROVIDER` (respeta el aviso de cookies).

## Completado

### Juego
- [x] Patrones Línea (horizontal, vertical, diagonal), Cuatro esquinas, X y Cartón lleno, validados en el
      servidor y en el cliente con las mismas reglas (pruebas en ambos lados).
- [x] Botón **¡Bingo!** bloqueado hasta completar el patrón con bolas cantadas; se enciende con pulso y sonido.
- [x] Marcado manual por defecto (aviso antes de activar el automático) y fichas: ficha, oro, maíz, estrella.
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
