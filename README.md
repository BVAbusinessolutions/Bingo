# Bingo Benéfico · Fundación Hogar Sol

Monorepo con `client/` (React + Vite + Tailwind v4) y `server/` (Node + Express + Socket.io).

## 1. Puesta en marcha

Desde la carpeta raíz `Bingo/`:

```bash
npm run setup   # solo la primera vez: instala todo y crea server/.env con secretos aleatorios
```

En dos terminales, desde la carpeta raíz `Bingo/`:

```bash
npm run server  # terminal 1: API (puerto 4000)
npm run dev     # terminal 2: web (puerto 5173)
```

Luego abre <http://localhost:5173>.

Usuarios de prueba (solo en memoria):

| Rol   | Correo                   | Contraseña   |
|-------|--------------------------|--------------|
| ADMIN | `admin@hogarsol.org`     | `Admin123!`  |
| USER  | `jugador@hogarsol.org`   | `Jugador123!`|

Abre `/admin/sorteo` como admin en una ventana y `/jugar` como jugador en otra: cada balota que cante el admin aparece al instante en los cartones del jugador.

### Cómo se creó desde cero

```bash
npm create vite@latest client -- --template react
cd client
npm i react-router-dom axios socket.io-client lucide-react zod dompurify
npm i -D tailwindcss @tailwindcss/vite

mkdir ../server && cd ../server && npm init -y
npm i express socket.io jsonwebtoken bcryptjs cookie-parser cors helmet express-rate-limit zod
```

## 2. Estructura

```text
Bingo/
├── package.json                  # scripts raíz: setup / dev / build / start
├── scripts/ensure-env.mjs
├── client/
│   ├── index.html
│   ├── vite.config.js            # Tailwind + proxy /api y /socket.io -> :4000
│   └── src/
│       ├── main.jsx              # monta <App /> e importa styles/index.css
│       ├── app/
│       │   ├── App.jsx           # Providers + AppRouter
│       │   └── providers.jsx     # Theme, BrowserRouter, Auth
│       ├── routing/
│       │   ├── AppRouter.jsx     # todas las rutas (páginas con carga diferida)
│       │   ├── private-routes.jsx# seguridad: PrivateRoute, PublicOnlyRoute, ACCESS, safeRedirect
│       │   └── paths.js          # constantes de URLs
│       ├── pages/                # una pantalla por ruta
│       │   ├── public/           # Home, Catálogo, Login, Registro
│       │   ├── client/           # Checkout, Mis compras, Live
│       │   ├── admin/            # Dashboard, Pagos, Sorteo, Eventos, Cartones
│       │   └── errors/           # Unauthorized
│       ├── components/           # piezas reutilizables
│       │   ├── ui/               # Field, StatusBadge, ThemeToggle, PageLoader
│       │   ├── layout/           # SiteHeader, PublicLayout, AdminLayout
│       │   └── bingo/ cards/ payments/ player/
│       ├── context/              # AuthContext, ThemeContext
│       ├── constants/            # roles, cardStatus, patterns
│       ├── styles/
│       │   ├── index.css         # entrada: Tailwind + imports
│       │   ├── tokens.css        # marca (sol-red, sol-gold, sol-blue) + Día/Noche
│       │   └── global.css        # base, foco visible, reduced-motion
│       ├── api/
│       │   ├── tokenStore.js     # access token en memoria
│       │   ├── httpClient.js     # Axios + interceptores (Bearer + refresh automático)
│       │   └── endpoints.js
│       ├── hooks/                # useSocket, useCountdown, useCurrentEvent, useAdmin
│       └── lib/                  # validation (zod + sanitización), format
└── server/
    └── src/
        ├── index.js              # Express + helmet + CORS + Socket.io
        ├── config/env.js
        ├── db.js                 # almacén en memoria + datos de prueba (cambiar por BD real)
        ├── middleware/
        │   ├── auth.js           # authenticate (JWT) + authorize(rol)
        │   └── security.js       # rate limits, validación zod, anti-CSRF
        ├── utils/cardGenerator.js  # cartones 90 balotas 3x9 sin duplicados
        └── modules/
            ├── auth/             # login, refresh con rotación, logout, me
            ├── cards/            # mis cartones, inventario, reservas 10 min, generación y aprobación (admin)
            └── draw/             # REST para el admin + difusión por Socket.io
```

## 3. Seguridad implementada

- **JWT:** access token de 15 min guardado solo en memoria. El refresh token de 7 días va en una cookie `HttpOnly`, `Secure` (en producción) y `SameSite=Strict`, limitada a `/api/auth`.
- **Rotación de refresh tokens:** si alguien reutiliza un token ya usado, se revocan todas las sesiones de ese usuario.
- **Interceptor Axios:** agrega `Bearer` a cada petición. Si varias peticiones reciben 401 a la vez, se hace un solo refresh, todas reintentan una vez y, si falla, se cierra la sesión.
- **CSRF:** cookie `SameSite=Strict` y la cabecera obligatoria `X-Requested-With` en refresh y logout.
- **XSS:** React escapa el contenido. Además se usa DOMPurify, helmet (CSP) y el iframe del stream solo acepta proveedores de una lista blanca y un ID validado.
- **Inyección:** zod valida todas las entradas en cliente y servidor, y el body está limitado a 50 kb. Con BD real, usa solo consultas parametrizadas u ORM.
- **Fuerza bruta:** 5 intentos de login cada 15 min, 10 reservas cada 10 min y 300 peticiones por minuto por IP. Bcrypt con coste 12 y comparación de tiempo constante.
- **Autorización:** `ProtectedRoute` solo mejora la experiencia. Cada endpoint vuelve a comprobar el rol en el servidor.

## 4. Pendiente para producción

- Base de datos real (PostgreSQL + Prisma) con transacciones para las reservas.
- Rate limit en Redis si hay varias instancias.
- Guardar los comprobantes en almacenamiento privado (S3) en lugar de `server/uploads/`.
- Cambiar el pago con tarjeta simulado por Stripe Checkout + webhook firmado (el servidor nunca debe recibir números de tarjeta).
- Notificaciones por correo/WhatsApp al aprobar o rechazar pagos.
