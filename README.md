# Bingo Benéfico · Asociación Infantil Hogar Sol

Plataforma para vender cartones de bingo en línea y jugar el sorteo en vivo. Bingo de **75 bolas**
(cartón 5×5 B-I-N-G-O con centro libre), pago por SINPE Móvil o transferencia con verificación manual
del comprobante, transmisión en vivo y validación de ganadores en el servidor.

- **client/** — React 18 + Vite 7 + Tailwind v4
- **server/** — Node 24 + Express 5 + Socket.io + PostgreSQL (Supabase en producción)

## Puesta en marcha (desarrollo)

```bash
npm run setup     # solo la primera vez: instala todo y crea server/.env con secretos aleatorios
npm run server    # terminal 1: API en http://localhost:4000
npm run dev       # terminal 2: web en http://localhost:5173
```

Sin `DATABASE_URL`, el servidor usa una base Postgres **embebida** (PGlite) guardada en `server/.data/`
y carga datos de demostración. Para trabajar contra Supabase, pega la cadena de conexión en `server/.env`
(ver [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)).

Cuentas de demostración (solo desarrollo, **nunca** se crean en producción):

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@hogarsol.org` | `Admin123!` |
| Cliente | `cliente@hogarsol.org` | `Cliente123!` |

> Lo que falta para salir a producción está en [docs/PENDIENTES.md](docs/PENDIENTES.md).

## Scripts (desde la raíz)

| Comando | Qué hace |
|---|---|
| `npm run setup` | Instala dependencias y crea `server/.env` |
| `npm run server` / `npm run dev` | API y web en modo desarrollo |
| `npm test` | 97 pruebas del servidor (Postgres en memoria) + 36 del cliente |
| `npm run lint` | ESLint en servidor y cliente |
| `npm run build` | Compila la web en `client/dist` |
| `npm start` | Servidor de producción (sirve también la web compilada) |
| `npm run create-admin` | Crea o promueve un administrador (pide los datos por consola) |
| `npm run backup` | Respaldo de toda la base en `server/backups/*.json.gz` |
| `npm run demo:cartones` | Solo desarrollo: 3 cartones de prueba para `cliente@hogarsol.org` (`-- --vivo`, `-- --venta`, `-- --reiniciar`) |

## Cómo funciona

**Compra (estilo cine):** 1) elegir cartones → 2) datos + número y foto del comprobante (con aviso de que
el detalle del pago debe decir **BINGO**) → 3) confirmación. Los cartones quedan apartados 15 minutos.
El admin recibe un correo con el enlace a la compra, verifica con una lista de chequeo y aprueba; el cliente
recibe un correo con el enlace a sus cartones.

**Sorteo:** el admin canta bolas en *Bingo Master*; los cartones de los jugadores se marcan al instante.
El botón **¡Bingo!** envía un reclamo que el **servidor** valida contra las bolas cantadas; el admin
confirma el premio en *Ganadores* y aparece en *Resultados*.

**Series de cartones:** cada carga es una serie (un ZIP de imágenes PNG, o una serie generada al azar).
En *Administración → Series* se ven como archivos separados (Nueva / Anterior) y se elige cuál se juega en
cada evento. Los cartones que el lector no pudo leer quedan "por revisar" y se corrigen junto a su imagen.

## Accesibilidad, SEO y legal

- **Menú de accesibilidad** flotante (abajo a la izquierda en todas las páginas): tamaño de letra, modo día/noche,
  alto contraste, reducir animaciones y lectura en voz alta.
- **Portada** con cuenta regresiva al evento del domingo 15 de noviembre de 2026, 1:00 p. m. (Salón de Eventos
  de Tinamaste, Higuito), configurable en `client/src/config/site.js`; premios en `client/src/config/prizes.js`.
- **Legal (Costa Rica):** términos y aviso legal, privacidad (Ley 8968), reglamento (KYC, +18, motocicleta,
  impuestos), contingencias y antifraude, propiedad intelectual y cookies. Ver `docs/LEGAL-REVISION.md`.
- **SEO:** Open Graph, datos estructurados del evento, `robots.txt` y `sitemap.xml` generados con `CLIENT_ORIGIN`.
- **Cookies y analítica:** aviso de consentimiento; GA4 o Cloudflare Web Analytics solo con consentimiento.

## Estructura

```text
Bingo/
├── render.yaml                    # despliegue en Render (web + API en un servicio)
├── docs/DESPLIEGUE.md             # guía Supabase + Render + correo
├── docs/SEGURIDAD.md              # HTTPS, cifrado, rate limit/DDoS, antifraude
├── docs/LEGAL-REVISION.md         # decisiones legales a confirmar antes del evento
├── pendientes/TAREAS-PENDIENTES.md
├── client/src/
│   ├── app/                       # App + providers (tema, router, sesión, avisos)
│   ├── routing/                   # AppRouter, private-routes (seguridad), paths, redirects
│   ├── pages/                     # public/ · client/ · admin/ · errors/
│   ├── components/                # ui/ · layout/ · bingo/ · cards/ · payments/ · checkout/ · admin/ · player/
│   ├── context/ · hooks/ · api/ · lib/ · constants/ · config/ · styles/
│   └── __tests__/                 # Vitest
└── server/
    ├── src/
    │   ├── app.js                 # Express: seguridad, rutas, web compilada con CSP
    │   ├── index.js               # arranque: BD, migraciones, sockets, tareas periódicas
    │   ├── db/                    # conexión (Supabase/PGlite), migrations/*.sql, seed de demo
    │   ├── domain/bingo.js        # reglas del bingo de 75 bolas
    │   ├── modules/               # auth · events · reservations · draw · claims · series · admin
    │   ├── services/              # auditoría, archivos, configuración, tokens de un solo uso
    │   ├── middleware/            # autenticación, límites, validación
    │   └── utils/                 # correo, logs JSON, CSV seguro
    ├── scripts/                   # create-admin, backup
    └── test/                      # pruebas de integración (node:test + supertest)
```

## Seguridad (resumen)

- Contraseñas con bcrypt; access token en memoria; refresh token en cookie `HttpOnly` + `SameSite=Strict`
  con rotación y detección de reutilización; bloqueo por cuenta e IP; secretos JWT validados al arrancar.
- Autorización en el servidor por rol y por dueño **dentro de la consulta** (IDOR probado en los tests).
- Reservas atómicas en la base de datos; un reclamo activo por cartón garantizado por índice único.
- Tablas en el esquema privado `app` con RLS activado: la API pública de Supabase no las expone.
- Comprobantes e imágenes en la base, servidos con `Content-Security-Policy: sandbox`; firma real de archivo
  verificada; ZIP con límites contra "bombas zip" y rutas maliciosas.
- Web servida con CSP estricta (sin `unsafe-inline` en scripts), HSTS y `frame-ancestors 'none'`.
- Bitácora inmutable de acciones administrativas y de seguridad; CSV protegido contra inyección de fórmulas.
- Retención: comprobantes de compras no concretadas se borran tras 90 días.

## Licencia

Uso interno de la Asociación Infantil Hogar Sol.
