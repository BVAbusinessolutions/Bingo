# Puesta en producción · Bingo Hogar Sol

Guía paso a paso para dejar el bingo en línea con **Supabase** (base de datos) y **Render** (servidor con HTTPS).
Tiempo estimado: 30 a 45 minutos.

## 1. Base de datos en Supabase

1. En el panel de Supabase abre tu proyecto → **Project Settings → Database**.
2. En **Connection string** elige **Session pooler** (funciona con IPv4, que es lo que usa Render).
3. Copia la cadena. Se ve así:
   `postgresql://postgres.abcdefghijkl:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
4. Reemplaza `[YOUR-PASSWORD]` por la contraseña de la base de datos (la que pusiste al crear el proyecto).
   Si la olvidaste: **Database → Reset database password**.
5. (Recomendado) En la misma página descarga el **SSL certificate** y guárdalo como `server/supabase-ca.crt`;
   luego pon `DATABASE_CA_CERT=supabase-ca.crt` para que el servidor verifique el certificado de Supabase.

No hace falta crear tablas a mano: al arrancar, el servidor aplica las migraciones de `server/src/db/migrations/`.

> **Seguridad.** Las tablas viven en el esquema privado `app` con *Row Level Security* activado y sin políticas:
> la API pública de Supabase (con la `anon key`) no puede leerlas. La app **no** usa las llaves `anon` ni
> `service_role`; solo la cadena de conexión, que es un secreto y nunca va en el frontend.

## 2. Probar con Supabase desde tu computadora (opcional, recomendado)

1. Pega la cadena en `server/.env` → `DATABASE_URL=...`
2. `npm run server` → debe decir `db.connected { driver: 'postgres' }` y aplicar `001_init.sql`.
3. En desarrollo se cargan los datos de demostración si la base está vacía. Para no cargarlos en Supabase
   pon `SEED_DEMO=false` **antes** del primer arranque.
4. Crea el administrador real: `npm run create-admin` (pide nombre, correo y contraseña; la contraseña no se muestra).

## 3. Servidor en Render

1. Sube el repositorio a GitHub (con una cuenta que tenga permiso sobre el repo).
2. En Render: **New → Blueprint** → elige el repositorio. Render lee `render.yaml`.
3. Completa las variables que pide:
   - `DATABASE_URL`: la cadena del paso 1.
   - `CLIENT_ORIGIN`: la URL pública, p. ej. `https://bingo-hogar-sol.onrender.com` o tu dominio.
   - `ADMIN_NOTIFY_EMAILS`: correo(s) que reciben el aviso de cada compra.
   - `SMTP_*` y `MAIL_FROM`: ver paso 4.
   - `VITE_CONTACT_*`: correo, teléfono, WhatsApp, dirección y horario públicos (se incrustan en la web al compilar;
     si se cambian hay que volver a desplegar).
   Los secretos JWT los genera Render automáticamente.
4. **Deploy**. Cuando termine, abre `https://TU-URL/api/health` → debe responder `{"status":"ok"}`.
5. Abre la consola del servicio (**Shell**) y ejecuta `npm run create-admin` para crear el administrador.

> El plan gratuito de Render "se duerme" tras 15 minutos sin uso y cortaría las conexiones en vivo del sorteo.
> Para el día del evento usa un plan de pago (Starter o superior).

## 4. Correo (SMTP)

Con Gmail:

1. Activa la verificación en 2 pasos en la cuenta de Google.
2. Crea una **contraseña de aplicación** en https://myaccount.google.com/apppasswords
3. Variables: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`,
   `SMTP_USER=tu-correo@gmail.com`, `SMTP_PASS=la-contraseña-de-aplicación`, `MAIL_FROM=Bingo Hogar Sol <tu-correo@gmail.com>`.

Gmail permite ~500 correos al día. Si se venden más cartones, usa un servicio transaccional (Resend, Brevo, SendGrid)
con su SMTP: solo cambian las variables.

## 5. Antes del evento

- [ ] `/api/health` responde `ok`.
- [ ] Iniciaste sesión con el admin real y **no** existen las cuentas demo (`admin@hogarsol.org`, etc.).
- [ ] **Datos de cobro** (Administración → Datos de cobro) correctos: SINPE, IBAN, titular.
- [ ] Subiste el ZIP de cartones (Administración → Series), revisaste los marcados "por revisar" y elegiste la serie del evento.
- [ ] Hiciste una compra de prueba completa y recibiste los correos (admin y cliente).
- [ ] Probaste el sorteo: cantar bolas, ver los cartones marcarse y reclamar un bingo.
- [ ] Respaldo: `npm run backup` y guarda el archivo fuera de Render (el disco del servidor se borra en cada despliegue). Confirma en Supabase (**Database → Backups**) si tu plan incluye respaldos automáticos; en el plan gratis normalmente no.
- [ ] El proyecto de Supabase está activo: el plan gratis se pausa tras una semana sin actividad.
- [ ] Revisa el tamaño de la base (**Settings → Database** o el panel de uso). Los comprobantes y las imágenes de cartones se guardan dentro de ella; el plan gratis tiene 500 MB.

### Transmisión de video

- [ ] **Cuántos espectadores aguanta el video.** El bingo solo incrusta el reproductor: el video lo sirve la plataforma.
  500 jugadores a ~2,5 Mbps son ~1,25 Gbps de salida.
  - **YouTube Live** (recomendado): gratis, aguanta cualquier cantidad. Usa "latencia ultrabaja" (3 a 5 s).
  - **WebRTC/WHEP o LL-HLS propio**: solo con un servicio administrado (Cloudflare Stream, Dolby/Millicast). Un MediaMTX
    u OvenMediaEngine en un VPS normal no da abasto para 500 personas.
- [ ] **Respaldo**: en Bingo Master → Configurar transmisión, agrega una segunda emisión (p. ej. YouTube si la principal
  es WebRTC). Si la principal HLS/WebRTC falla 3 veces seguidas, el reproductor cambia solo; los jugadores también tienen
  el botón «Ver transmisión alternativa». OBS puede emitir a dos destinos a la vez (plugin *Multiple RTMP outputs*).
- [ ] Prueba el enlace en la vista previa de Bingo Master antes de abrir el sorteo.
- [ ] Durante el sorteo mira el panel: si aparece «Video: N jugadores tuvieron cortes», revisa el encoder o la conexión
  de la transmisión. Los detalles quedan en los logs de Render como `stream.player_issue`.

### Prueba de carga (una vez, antes del evento)

Abre 500 conexiones de jugador contra el servidor publicado y mide cuánto tarda cada una en recibir el sorteo.
Solo escucha: no canta bolas ni cambia datos. Usa una cuenta de jugador de prueba.

```bash
LOAD_URL=https://tu-dominio LOAD_EMAIL=prueba@... LOAD_PASSWORD=... npm run load-test --prefix server
```

Mientras corre, canta una bola de prueba en Bingo Master: el resumen dice cuántos jugadores la recibieron.
Aprueba si todos se unen, el p95 queda por debajo de 2 s y no hay desconexiones. Con `LOAD_RAMP_MS=0` simula a todos
reconectándose a la vez (lo que pasa tras un reinicio). En local: 500/500 unidos, p95 de 5 ms en rampa y 224 ms en ráfaga.

### Monitoreo de caídas

- [ ] Crea un monitor gratis en [UptimeRobot](https://uptimerobot.com) (o Better Stack): tipo **HTTP(s)**, URL
  `https://tu-dominio/api/health`, cada 1 minuto, alerta por correo y por la app del celular. `/api/health` responde 503
  si la base de datos no contesta, así que también avisa si se cae Supabase.
- [ ] El día del evento deja `autoDeploy` apagado (ya está así en `render.yaml`) y no despliegues durante el sorteo:
  cada despliegue reinicia el servidor y desconecta a todos por unos segundos (se reconectan solos y reciben el estado).

### Un solo servidor

El sorteo en vivo (Socket.io) y la presencia viven en la memoria de **una** instancia. Para ~500 jugadores sobra, pero
no subas las instancias de Render a 2 o más: los jugadores de una no recibirían las bolas cantadas en la otra. Escalar
horizontalmente exige el adaptador de Redis de Socket.io (`@socket.io/redis-adapter`) y mover la presencia a Redis.
Si hace falta más capacidad, sube el plan de la instancia.

## 6. Mantenimiento

| Tarea | Cómo |
|---|---|
| Respaldo manual | `npm run backup` → `server/backups/*.json.gz` (contiene datos personales: guárdalo cifrado) |
| Nuevo administrador | Panel → Usuarios → Crear cuenta (rol Administrador). Solo lo puede hacer el admin superior |
| Admin superior | Variable `SUPER_ADMIN_EMAIL` en Render: no se puede degradar, desactivar ni sancionar, y es el único que da o quita el rol de admin |
| Cuenta bloqueada | Panel → Usuarios → Desbloquear |
| Revisar quién hizo qué | Panel → Bitácora |
| Logs del servidor | Render → Logs (formato JSON, una línea por evento) |
