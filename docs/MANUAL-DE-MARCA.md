# Manual de marca · Bingo Benéfico Hogar Sol

Guía visual de la plataforma. Los valores viven como tokens en
[client/src/styles/tokens.css](../client/src/styles/tokens.css) (`@theme`), así que cualquier cambio se hace ahí
y se aplica en todo el sitio. Este documento explica cómo usarlos.

## 1. Paleta de color

### Base: azul marino profundo

Se usa en la barra de navegación, el pie, la portada, la sección de premios y los fondos de las tarjetas oscuras.

| Token | Clase Tailwind | Hex | Uso |
|---|---|---|---|
| `--color-navy-950` | `bg-navy-950` | `#0a1128` | Fondo principal oscuro, barra y pie |
| `--color-navy-900` | `bg-navy-900` | `#0f172a` | Tarjetas en modo noche |
| `--color-navy-800` | `bg-navy-800` | `#1e293b` | Superficies secundarias |
| `--color-navy-700` | `bg-navy-700` | `#243354` | Bordes y separadores sobre marino |

### Acento: dorado

Solo para **llamados a la acción** ("Comprar cartones", "Crear cuenta"), el elemento activo de la navegación y
los destacados (la cuenta regresiva y el premio mayor). No se usa para texto largo.

| Token | Clase | Hex | Uso |
|---|---|---|---|
| `--color-accent` | `bg-accent`, `text-accent` | `#fbbf24` | Botón principal, destacados |
| `--color-accent-strong` | `bg-accent-strong` | `#f59e0b` | Hover y estado presionado del acento |

Sobre el dorado, el texto va siempre en `text-navy-950` (contraste 11:1).

### Identidad Hogar Sol (logo y cartón)

| Token | Hex | Uso |
|---|---|---|
| `--color-sol-blue` | `#0e4a8e` | Botón primario en modo día, títulos (`text-brand`) |
| `--color-sol-blue-light` | `#1d63b8` | Hover del primario, halos de luz |
| `--color-sol-red` | `#d32f2f` | "En vivo", alertas, sobrelíneas de sección |

### Colores semánticos (cambian solos entre día y noche)

`bg-page`, `bg-card`, `bg-muted`, `border-line`, `text-fg`, `text-fg-muted`, `text-fg-subtle` y `text-brand`.
En los componentes siempre se usan estos, nunca un hex suelto. El **alto contraste** (menú de accesibilidad)
los redefine a negro y blanco puros.

## 2. Vidrio (glassmorphism)

| Utilidad | Efecto | Dónde |
|---|---|---|
| `glass` | `rgba(255,255,255,0.05)` + `backdrop-filter: blur(16px)` + borde `rgba(255,255,255,0.1)` | Sobre fondo marino: tarjeta del evento en la portada, premio mayor, incentivos |
| `glass-light` | Blanco al 72 % + blur 12 px | Sobre fondos claros |
| `glass-panel` | Color de tarjeta al 97 % + blur 20 px (sigue el modo día/noche; el texto de atrás no se cuela) | Paneles flotantes: ajustes visuales |
| `glass-border` | Borde con gradiente sutil blanco → dorado | Tarjetas de vidrio destacadas |
| `shadow-neon` | Brillo dorado suave + sombra profunda | Solo el premio mayor y la tarjeta del evento |

Reglas:

- El vidrio **solo funciona sobre fondos oscuros o con imagen**. Sobre blanco se usa `surface`.
- Máximo un elemento con `shadow-neon` por pantalla.
- Si el navegador no soporta `backdrop-filter`, `glass` cae a un fondo marino sólido legible.

### Fotografía del premio mayor

- Archivos: `client/public/img/premio-motocicleta*.webp` (recortes con fondo transparente) o la URL de
  `VITE_PRIZE_IMAGE`. Sin textos ni logos sobreimpuestos.
- **Escenario único:** una sola superficie de vidrio con foco de luz arriba y sombra de piso bajo las ruedas.
  Nada de marco dentro de marco.
- **Marco 4:3 con `object-contain`:** acomoda por igual la foto horizontal y las casi cuadradas, así la moto
  mantiene un tamaño parecido entre fotos.
- **Pasa sola** cada 4,5 s con fundido, siempre (sin botón de pausa, por decisión de la Asociación). Si la
  persona elige una foto, la cuenta empieza de nuevo desde ahí. Miniaturas y contador en una barra propia debajo
  de la foto. En celular no hay flechas (se desliza o se usan las miniaturas).
- **Distribución:** fotos en 7 de 12 columnas, información (título, requisito de retiro y compra) en 5, y los
  incentivos debajo en tres columnas iguales.
- Si una foto no carga, se quita; si no queda ninguna, el escenario no se muestra (nunca una imagen rota).

## 3. Logo

- **Archivo único:** `client/src/assets/svg/logo-hogar-sol.svg`. Se usa con el componente `BrandLogo` o
  `BrandBadge` (`client/src/components/brand/BrandLogo.jsx`). Nunca se copia el SVG en otro lugar.
- **Sobre fondos oscuros:** `BrandBadge`, una placa blanca con radio `rounded-xl`/`2xl`, una sombra leve y un filo
  `ring-white/40`. **Sin marcos de color:** el borde amarillo grueso anterior se eliminó porque competía con el
  logo.
- **Tamaños:** 44–48 px en la barra, 64 px en el pie, 80–96 px en la 404 y en la portada sin evento, y 13 % del
  ancho del cartón en el centro libre. **No** se superpone a tarjetas, contadores ni fotografías.
- **Área de respeto:** al menos 4 px de placa blanca alrededor del dibujo (`p-1`).
- No se deforma, no se recolorea y no se le aplican sombras de color.

## 4. Iconografía

- Librería única: **lucide-react** (trazo de 2 px, esquinas redondeadas).
- Tamaños: 16 px junto a texto pequeño, 20 px en botones, 24 px en tarjetas y 32–48 px en ilustraciones.
- Los íconos decorativos llevan `aria-hidden`. Los botones que solo tienen ícono llevan `aria-label`.
- Ajustes visuales: silueta humana universal de accesibilidad (`PersonStanding`) en un botón redondo translúcido
  de la barra (`AccessibilityButton`). No se usa el ícono de silla de ruedas: los ajustes sirven a todo el público.
- El premio mayor se muestra con su **fotografía real** (carrusel 16:9, `object-contain`), nunca con un ícono. Los
  íconos de premios solo van en la lista de incentivos. No se usan cintas de texto rodante (marquee): desbordan
  en pantallas angostas.

## 5. Tipografía

| Rol | Familia | Pesos | Token |
|---|---|---|---|
| Títulos (h1–h3, cifras, botones destacados) | **Poppins** | 600, 700, 800 | `font-display` |
| Texto, formularios y navegación | **Inter** | 400–900 | `font-sans` (por defecto) |

Escala (base 17 px; el menú de accesibilidad la sube a 19 o 21 px y todo crece en proporción porque se usa `rem`):

| Nivel | Clases | Uso |
|---|---|---|
| Display | `text-4xl sm:text-5xl lg:text-6xl font-bold` | Título de la portada |
| H1 | `text-3xl sm:text-4xl font-bold` | Título de página |
| H2 | `text-2xl sm:text-3xl font-semibold` | Secciones |
| H3 | `text-lg`–`text-xl font-semibold` | Tarjetas |
| Cuerpo | `text-base`–`text-lg` | Párrafos (interlineado 1.6) |
| Sobrelínea | `text-xs font-bold uppercase tracking-[0.2em]` | Etiqueta sobre títulos |

## 6. Espaciado y simetría

- Escala de 4 px de Tailwind. Se usan solo múltiplos: `gap-2/3/4/5/6`, `p-5/6/8`, secciones `py-14`–`py-16`.
- Contenedor único: `container-page` (máximo 80 rem, margen lateral de 16 px en celular y 24 px desde 640 px).
  Probado sin desbordamiento horizontal de 320 px a 3840 px (4K).
- Radios: `rounded-xl` (botones, campos), `rounded-2xl` (tarjetas internas), `rounded-3xl` (tarjetas héroe y
  modales).
- Área táctil mínima de 44 px en todo control (`min-h-11`/`min-h-12`).

## 7. Movimiento

| Animación | Clase | Uso |
|---|---|---|
| Entrada | `animate-fade-up`, `animate-fade-in` | Contenido al cargar |
| Modal | `animate-modal-in` | Cookies, diálogos, menú de usuario |
| Panel lateral | `animate-slide-in` | Accesibilidad |
| Revelado al hacer scroll | `reveal` | Tarjetas y secciones (sin JavaScript) |
| Elevación | `lift` | Tarjetas al pasar el mouse |
| Botones | Elevación de 2 px en hover y escala al 97 % al presionar | `Button` |
| Flotación | `animate-float` | Logo y premio mayor |

Todo se apaga con "Reducir animaciones" o con la preferencia del sistema operativo.

## 8. Componentes de referencia

| Componente | Archivo |
|---|---|
| Barra de navegación | `components/layout/SiteHeader.jsx` |
| Pie | `components/layout/SiteFooter.jsx` |
| Botón | `components/ui/Button.jsx` (variantes `primary`, `gold`, `danger`, `success`, `outline`, `ghost`, `light`) |
| Premio mayor (vidrio) | `components/event/MainPrizeCard.jsx` |
| Cuenta regresiva | `components/event/EventCountdown.jsx` |
| Modal de cookies | `components/layout/AvisoPrivacidad.jsx` |
| Panel de ajustes visuales | `components/accessibility/AccessibilityMenu.jsx` |
| Aviso "inicia sesión para comprar" | `components/auth/LoginRequiredDialog.jsx` |
| Centro Legal | `pages/public/LegalCenterPage.jsx` |

## 9. Guía de accesibilidad

- **Contraste:** texto normal 4.5:1 como mínimo (WCAG 2.1 AA); sobre el dorado, siempre `text-navy-950`.
- **Menús flotantes:** solo uno abierto a la vez (`lib/overlays.js`). Escala de capas: 30 barras fijas de
  página, 40 barra de navegación, 45 menús flotantes, 50 diálogos, 55 avisos y 70 aviso de cookies.
- **Panel de ajustes visuales:** tamaño de letra (A, A+, A++), modo día/noche, alto contraste, reducir
  animaciones y lectura en voz alta. Se abre **debajo de la barra** (nunca la tapa), con foco atrapado, cierre
  con Escape o clic afuera, y el foco vuelve al botón que lo abrió.
- **Teclado:** todo control es alcanzable con Tab y muestra el anillo de foco dorado.
- **Movimiento:** cada animación se apaga con "Reducir animaciones" o con la preferencia del sistema.
- **Lectores de pantalla:** íconos decorativos con `aria-hidden`, botones de solo ícono con `aria-label`,
  diálogos con `role="dialog"` y `aria-modal`, contenidos que se despliegan con `aria-expanded`.
- **Área táctil:** 44 px como mínimo.

## 10. Panel de administración

- Pantalla completa sin pie de página: solo la barra superior, el menú lateral y el contenido.
- Mismos tokens que el sitio público; las cifras de dinero en `tabular-nums`.

## 11. Tono de los textos

- Español de Costa Rica, cercano y claro, con "tú".
- Sin relleno: cada texto informa o invita a una acción concreta.
- No se usa el eslogan que la Asociación prohibió en textos legales ni corporativos.
