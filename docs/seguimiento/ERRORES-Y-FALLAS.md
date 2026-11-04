# Errores y fallas

Lo más reciente arriba. Estado: 🔴 abierto · 🟡 en observación · 🟢 resuelto.

## 04/11/2026

### 🔴 Render no pudo cobrar la tarjeta
- **Qué pasa:** aviso "Payment failed" en Render. Factura de octubre 2026 sin pagar ($2.84, Visa terminada en 2852).
  Noviembre proyecta unos $7.00.
- **Riesgo:** Render puede cortar el servicio y la página se cae (no indica fecha exacta).
- **Solución:** pagar en Render → Billing → Invoice History → *Pay Invoice* y, si la Visa ya no sirve, cambiarla en
  *Payment Method*.

### 🟡 Muchos avisos de "Posible robo de sesión" en la Bitácora
- **Qué pasa:** el 03/11 y el 04/11 aparecen varios "se cerraron todas las sesiones" para Administración Hogar Sol
  y Shirlene Santillán.
- **Causa probable:** la misma cuenta abierta en varias pestañas o equipos a la vez (el sistema lo toma como
  sesión robada y cierra todas por seguridad). Falta confirmarlo.
- **Pendiente:** revisar si pasa sin motivo real.

### 🟢 Render no publica solo al subir cambios
- **Qué pasa:** después de cada `git push` hay que hacer *Manual Deploy → Deploy latest commit* en Render.
- **Cómo se maneja:** se publica a mano en cada cambio.

### 🟢 Cambiar el correo en el código no cambiaba la página
- **Causa:** la variable `VITE_CONTACT_EMAIL` de Render manda sobre el código y se incrusta al compilar.
- **Solución:** cambiar la variable en Render y usar *Save, rebuild, and deploy*.

### 🟢 La cuenta de BVA aparecía como "dfaf"
- **Qué pasó:** existía una cuenta registrada el 26/10 con el correo de BVA y nombre de prueba ("dfaf"), con el
  correo confirmado. Al activar el admin superior apareció como tal.
- **Solución:** es la cuenta de BVA; recuperar la contraseña con "¿Olvidaste tu contraseña?" y cambiar el nombre en
  *Mi perfil*.

## 30/10/2026

### 🟢 Pantalla en blanco con bloqueador de anuncios
- **Causa:** uBlock/AdBlock bloqueaban archivos por su nombre (`visitCounter.js`), la app no arrancaba.
- **Solución:** se renombraron los archivos (commit `2b7fe60`).

## 27/10/2026

### 🟢 Todos los cartones del OCR quedaban "por revisar"
- **Causa:** una condición revisaba el número de serie, que siempre llega vacío del lector.
- **Solución:** se quitó esa condición (commit `27b8805`).
