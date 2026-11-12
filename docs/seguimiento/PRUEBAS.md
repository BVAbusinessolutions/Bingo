# Pruebas

Lo más reciente arriba. ✅ satisfactoria · ❌ falló · ⏳ pendiente.

## 11/11/2026 · En local
| Prueba | Resultado |
|---|---|
| 500 jugadores conectados por socket (rampa de 10 s) | ✅ 500/500, p95 5 ms, 0 desconexiones |
| 500 jugadores reconectándose a la vez | ✅ 500/500, p95 224 ms |
| Pruebas automáticas (146 servidor + 52 web) | ✅ |
| Prueba de carga contra Render | ⏳ Antes del evento |
| Corte real de la transmisión y cambio al respaldo | ⏳ Probar apagando el encoder |
| Monitor de UptimeRobot sobre `/api/health` | ⏳ |

## 04/11/2026 · En producción
| Prueba | Resultado |
|---|---|
| Primera compra real (reserva, pago, comprobante y aprobación) | ✅ Salió todo bien |
| Correo de contacto `promotor@hogarsol.org` visible en la página | ✅ |
| Reglamento sin licencia de conducir y con retiro de la moto en la agencia | ✅ Revisado en el sitio publicado |
| Admin superior visible en Usuarios con la etiqueta 👑 | ✅ |
| Deploys en Render (`162ca57`, `cfce417`, `4e4912b`, `f745495`) | ✅ Todos "Deploy succeeded" |
| Entrar con la cuenta de BVA y cambiarle el nombre | ⏳ |
| Sorteo en vivo completo con jugadores reales | ⏳ Antes del 15/11 |

## 04/11/2026 · Automáticas (en la computadora)
| Prueba | Resultado |
|---|---|
| Servidor: 142 pruebas (incluye admin superior y avisos a cada admin) | ✅ 142/142 |
| Página (cliente): 52 pruebas | ✅ 52/52 |
| Lint y compilación | ✅ |

Para correrlas: `npm test` en la carpeta del proyecto.
