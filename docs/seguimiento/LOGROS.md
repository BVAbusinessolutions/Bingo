# Logros

Lo más reciente arriba.

## 11/11/2026
- **Transmisión más robusta**: el reproductor HLS/WebRTC se reconecta solo si se corta (2, 4, 8 y 15 s), salta al
  punto en vivo al volver a la pestaña y pasa a una **transmisión de respaldo** tras 3 fallos seguidos. YouTube y
  Facebook se recargan en vivo si la pestaña estuvo oculta más de 30 s.
- **Cortes de video visibles en el panel**: cada reproductor avisa cuando se corta, y el Inicio del panel muestra
  cuántos jugadores tuvieron cortes en los últimos 15 minutos.
- **Sorteo más liviano**: la verificación automática de ganadores ya no relee todos los cartones en cada bola, y
  cientos de jugadores reconectándose a la vez comparten la misma consulta del estado.
- **Prueba de carga** `npm run load-test --prefix server`: 500 jugadores en local sin errores.
- **Sección de video visible**: Bingo Master muestra la vista previa del video (el mismo reproductor del jugador) y
  la portada muestra la transmisión en cuanto se guarda el enlace. La ronda sin bolas ahora dice «Sin iniciar».

## 04/11/2026
- **Listo para ~500 jugadores en la transmisión**: límites por IP más holgados (jugadores del salón en el mismo
  WiFi ya no se bloquean), el catálogo y el evento actual ya no escriben en la base en cada visita, y `sharp`
  actualizado a 0.35.5 (cerraba una vulnerabilidad grave; `npm audit` queda en 0).
- 🎉 **Primera compra real en producción**: salió todo bien de punta a punta.
- **Admin superior** activo: `bvabusinessolutions@gmail.com` (variable `SUPER_ADMIN_EMAIL` en Render). No se puede
  degradar ni desactivar y es el único que da o quita el rol de admin.
- **Todas las cuentas admin reciben los correos de avisos** (compras, pagos aprobados, ventas en el salón,
  ¡Bingo!, formulario de contacto) sin tener que agregarlas a ninguna lista.
- **Textos de la motocicleta corregidos**: la licencia de conducir ya no es requisito y la moto se retira en la
  agencia (Inicio, Contacto, Edad y Reglamento).
- **Correo de contacto** de la página: `promotor@hogarsol.org`.

## 03/11/2026
- Paquete fijo de 2 cartones por ₡3 000, ganadores del salón y correos de avisos.
- "En vivo" lo decide la administración y vuelve la cuenta regresiva.
- Rondas editables y selector de evento visible en el panel.

## 02/11/2026
- **Puesta en producción** en Render + Supabase.

## 26/10 – 30/10/2026
- Lector automático de cartones (OCR), panel admin completo, Finanzas con gráficos, centro legal, juego en vivo
  con marcado automático, celebración de ¡Bingo! y alertas sonoras.
