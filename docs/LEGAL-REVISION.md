# Textos legales: qué debe revisar la asesoría legal

Las páginas `/terminos`, `/privacidad`, `/reglamento`, `/contingencias`, `/propiedad-intelectual` y `/cookies`
se redactaron conforme a la normativa costarricense vigente. Algunas reglas son **decisiones de la
Asociación**: se escribieron con valores razonables, pero deben confirmarlos la Junta Directiva y un abogado
antes del evento del 15 de noviembre de 2026.

## Datos por completar

| Dato | Dónde se configura |
|---|---|
| Cédula jurídica de la Asociación | `VITE_ORG_LEGAL_ID`. Si está vacía, el sitio no la menciona |
| Domicilio, correo y teléfono reales | `VITE_CONTACT_*` |
| Lista de premios confirmados | `client/src/config/prizes.js` |
| URL pública del sitio | `CLIENT_ORIGIN` (servidor) y `VITE_SITE_URL` (cliente) |
| Fecha, hora y lugar del evento | Administración → Eventos (ya no están en el código) |

## Decisiones de la Asociación que hay que confirmar

| Regla | Valor escrito | Archivo |
|---|---|---|
| Quedan excluidos la Junta Directiva, el personal del sorteo y sus familiares hasta 2.º grado | Sí | `content/legal/terminos.jsx` |
| Una sola cuenta por persona | Sí | `content/legal/terminos.jsx` |
| Plazo para reclamar premios | 30 días naturales (90 para la motocicleta) | `content/legal/reglamento.jsx`, `content/legal/contingencias.jsx` |
| Contacto con ganadores en línea | Dentro de 3 días hábiles | `content/legal/reglamento.jsx` |
| Custodia de la motocicleta si el ganador no tiene licencia | Hasta 90 días | `content/legal/reglamento.jsx` |
| Gastos de traspaso, marchamo y seguro de la moto | A cargo del ganador, salvo que el anuncio diga otra cosa | `content/legal/reglamento.jsx` |
| Destino de los premios no reclamados | Pasan a los programas de la Asociación según sus estatutos | `content/legal/contingencias.jsx` |
| Desempate de premios indivisibles | Una balota por cartón empatado; gana la más alta | `content/legal/contingencias.jsx` |
| Reparto de premios divisibles | Partes iguales | `content/legal/contingencias.jsx` |
| Devolución de pagos erróneos | 10 días hábiles | `content/legal/contingencias.jsx` |
| Cancelación por fuerza mayor | Devolución del 100 % en 30 días; si se reprograma, se puede pedir la devolución dentro de 15 días | `content/legal/contingencias.jsx` |
| Descargo ante una anulación | 5 días hábiles | `content/legal/contingencias.jsx` |
| Pausa por falla técnica | Más de 15 minutos | `content/legal/contingencias.jsx` |
| El sorteo se graba y se levanta un acta | Sí | `content/legal/contingencias.jsx` |

## Puntos jurídicos a validar

- **Participación de personas menores de edad (prioridad alta).** Política oficial que aplica el sitio
  (sin contradicciones entre documentos):
  - las cuentas las registran exclusivamente personas mayores de 18 años;
  - una persona menor juega con cartones vinculados a la cuenta de su madre, padre o tutor legal;
  - para reclamar ciertos premios, como la motocicleta, se debe ser mayor de edad o contar con un tutor legal
    que represente a la persona ganadora; los premios mayores se entregan solo al representante legal acreditado.

  Antes del evento, un abogado debe confirmar que esto es compatible con el Código de la Niñez y la Adolescencia
  (**Ley N.° 7739**) y con los permisos del bingo, ya que algunas normas restringen los juegos con premios a
  mayores de 18 años. Archivos: `content/legal/edad.jsx` (pestaña "Edad y tutoría legal"),
  `content/legal/terminos.jsx`, `content/legal/reglamento.jsx`, `content/legal/privacidad.jsx` y las constantes
  `AGE_NOTE`, `ADULT_PRIZES_NOTE` y `MOTORCYCLE_REQUIREMENT` en `config/site.js`.

- **Documentos de tutela:** confirmar qué documentos acreditan la representación (constancia de nacimiento del
  Registro Civil, resolución judicial o del PANI). Hoy se citan en `content/legal/edad.jsx`.

- **Permisos:** confirmar qué autorizaciones requiere un bingo benéfico con premios (por ejemplo, ante la
  municipalidad o la Junta de Protección Social). Por eso los textos no citan una ley de rifas concreta.
- **Impuestos:** confirmar con un contador si los premios tienen retención según la Ley 7092 y la Ley 9635, y
  cuánto. La pestaña "Retención de impuestos" (`content/legal/impuestos.jsx`) promete informar el monto y la base
  legal antes de la entrega y que, en premios en especie, la retención se paga aparte y no se descuenta del bien.
- **Retracto (Ley 7472):** confirmar si aplica a cartones de un evento con fecha fija. Hoy el texto lo limita a
  antes del inicio del sorteo.
- **Ley 8968:** confirmar si la base de datos debe inscribirse ante la PRODHAB y cuál es el plazo de respuesta
  a las solicitudes de acceso, rectificación y supresión.
- **Licencia para la moto:** confirmar el tipo exacto (A1, A2 o A3) según la cilindrada del modelo y anotarlo
  en el anuncio del premio.

El eslogan que la Asociación prohibió usar no aparece en ningún texto legal ni corporativo. Una prueba automática lo
verifica en `client/src/__tests__/features.test.js`.
