// Reglamento del Bingo Benéfico. Los plazos y decisiones marcados en docs/LEGAL-REVISION.md
// deben confirmarlos la Junta Directiva y la asesoría legal antes del evento.
import { PATHS } from '../../routing/paths';
import { ContactEmail } from '../../components/layout/LegalLayout';
import { AGE_NOTE, legalIdText, MOTORCYCLE_REQUIREMENT, PAYMENT_DETAIL, SITE } from '../../config/site';
import { eventDateLabel, eventTimeLabel } from '../../components/event/EventCountdown';

/** Lugar del evento tal como lo configuró el panel: "Salón de Eventos de Tinamaste, Higuito". */
const placeOf = (event) => [event?.venue, event?.venueArea].filter(Boolean).join(', ');

/** Las secciones dependen del evento vigente (fecha, hora y lugar se editan en Administración > Eventos). */
const SECTIONS = ({ event } = {}) => [
  {
    title: 'Organización del evento',
    body: (
      <>
        <p>
          El Bingo Benéfico lo organiza la {SITE.name}
          {legalIdText()} con fines exclusivamente benéficos.{' '}
          {event ? (
            <>
              El próximo evento, <strong>{event.name}</strong>, se realiza el <strong>{eventDateLabel(event.startsAt)}</strong> a las{' '}
              <strong>{eventTimeLabel(event.startsAt)}</strong> (hora de Costa Rica)
              {placeOf(event) && (
                <>
                  {' '}
                  en el <strong>{placeOf(event)}</strong>
                </>
              )}
              , y se transmite en vivo por esta plataforma.
            </>
          ) : (
            'La fecha, la hora y el lugar de cada evento se publican en la portada y en esta sección en cuanto se confirman.'
          )}
        </p>
        <p>
          Se puede jugar de forma presencial en el salón o en línea. Ambos canales juegan con las mismas bolas, al mismo tiempo y con las
          mismas reglas.
        </p>
      </>
    ),
  },
  {
    title: 'Edad, cuentas y tutoría legal',
    body: (
      <>
        <p>
          <strong>{AGE_NOTE}</strong>
        </p>
        <ul>
          <li>Las cuentas solo las abren y administran personas mayores de 18 años, con cédula de identidad o DIMEX vigente.</li>
          <li>
            Una persona menor de edad puede jugar con cartones de la cuenta de su madre, padre o representante legal, que responde por la
            cuenta y por los pagos.
          </li>
          <li>
            Si gana un cartón jugado por una persona menor, el premio se entrega a su representante legal, que debe acreditar el vínculo con
            documentos oficiales. Los premios mayores siempre se entregan a una persona mayor de edad.
          </li>
          <li>Un premio reclamado con la cuenta o el documento de un tercero sin su autorización se anula.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Cómo se juega',
    body: (
      <ul>
        <li>
          Bingo de 75 bolas: columnas B (1-15), I (16-30), N (31-45), G (46-60) y O (61-75). El centro del cartón es un espacio libre.
        </li>
        <li>El patrón ganador de cada ronda (línea, cuatro esquinas, letra X o cartón lleno) se anuncia antes de empezar.</li>
        <li>Las bolas se extraen al azar en el salón, frente al público y la cámara, y se registran al instante en el sistema.</li>
        <li>
          En línea, tus cartones se marcan solos. Cuando completes el patrón aparece el botón <strong>“¡Bingo!”</strong>; púlsalo de
          inmediato. En el salón, se canta en voz alta.
        </li>
        <li>
          El sistema verifica automáticamente cada cartón vendido contra las bolas cantadas. Un bingo solo es válido si coincide con ese
          registro oficial.
        </li>
      </ul>
    ),
  },
  {
    title: 'Política de pagos',
    body: (
      <ul>
        <li>
          Medios aceptados: <strong>SINPE Móvil</strong>, <strong>transferencia bancaria</strong> a la cuenta de la Asociación que se muestra
          al comprar, o <strong>efectivo</strong> en los puntos de venta presenciales autorizados.
        </li>
        <li>
          En SINPE y transferencias, el detalle debe decir <strong>{PAYMENT_DETAIL}</strong> (o <strong>{PAYMENT_DETAIL} - tu cédula</strong>) y debes adjuntar el comprobante con su número de
          referencia. La compra se confirma cuando el dinero se acredita en la cuenta de la Asociación.
        </li>
        <li>
          Cada comprobante sirve para una sola compra. El sistema detecta comprobantes repetidos (mismo número o misma imagen) y una misma
          cédula usada desde varias cuentas.
        </li>
        <li>
          Las transacciones viajan cifradas (HTTPS/TLS). La plataforma no recibe ni guarda números de tarjeta ni claves bancarias: el pago
          se hace desde tu propia aplicación bancaria.
        </li>
        <li>Los precios están en colones costarricenses (₡) e incluyen todos los cargos.</li>
      </ul>
    ),
  },
  {
    title: 'Verificación de identidad (KYC) y de ganadores',
    body: (
      <>
        <p>
          Para proteger a los participantes y cumplir con la ley, aplicamos una política de “conozca a su cliente” (KYC, por sus siglas en
          inglés):
        </p>
        <ul>
          <li>
            Al comprar se registra el número de <strong>cédula de identidad costarricense</strong> o de <strong>DIMEX</strong> (documento de
            identidad migratorio para personas extranjeras) de quien compra.
          </li>
          <li>
            Antes de entregar un premio, la persona ganadora debe presentar ese mismo documento, <strong>vigente y en original</strong>. El
            nombre y el número deben coincidir con los de la compra.
          </li>
          <li>
            Los bingos en línea se confirman con el registro del sistema (cartón, bolas y hora del reclamo). Los bingos del salón se
            confirman leyendo el cartón físico en voz alta frente al público y la cámara, contra el mismo registro.
          </li>
          <li>La Asociación puede pedir información adicional si detecta indicios de fraude, y retener el premio mientras lo verifica.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Requisitos para premios mayores: motocicleta',
    body: (
      <>
        <p>
          <strong>{MOTORCYCLE_REQUIREMENT}</strong>
        </p>
        <p>En detalle, quien retira la motocicleta debe:</p>
        <ul>
          <li>Ser mayor de edad. Si el cartón ganador lo jugó una persona menor, la retira su representante legal.</li>
          <li>
            Contar con <strong>licencia de conducir al día</strong>, del tipo que corresponda a la cilindrada del vehículo (tipo A), emitida
            conforme a la Ley de Tránsito por Vías Públicas Terrestres y Seguridad Vial N.° 9078.
          </li>
          <li>
            Presentar su cédula de identidad <strong>física y al día</strong> (o DIMEX vigente, si es persona extranjera), a nombre de la
            titular de la cuenta que compró el cartón ganador.
          </li>
          <li>
            Firmar el traspaso registral ante notario público para la inscripción a su nombre en el Registro Nacional (Registro de Bienes
            Muebles). Hasta que el traspaso quede inscrito, el vehículo no se entrega.
          </li>
          <li>
            Asumir los gastos de traspaso e inscripción, el derecho de circulación (marchamo) y el seguro obligatorio, salvo que el anuncio
            del premio indique que los cubre la Asociación.
          </li>
        </ul>
        <p>
          Si la persona ganadora no tiene la licencia al día, la Asociación custodiará el premio hasta por <strong>90 días naturales</strong>{' '}
          para que la obtenga. Vencido ese plazo, se aplica la regla de premios no reclamados de la Política de contingencias. El premio no
          puede cambiarse por dinero.
        </p>
      </>
    ),
  },
  {
    title: 'Entrega de premios',
    body: (
      <ul>
        <li>
          <strong>Ganadores en el salón:</strong> los premios menores se entregan en el acto, tras la verificación presencial del cartón y
          del documento de identidad.
        </li>
        <li>
          <strong>Ganadores en línea:</strong> la Asociación los contacta al correo y teléfono registrados dentro de los{' '}
          <strong>3 días hábiles</strong> siguientes al evento para coordinar la entrega.
        </li>
        <li>
          <strong>Lugar:</strong> la entrega se hace en el domicilio de la Asociación o en el lugar que se acuerde por escrito. La
          verificación puede hacerse de forma presencial o por videollamada con el documento en mano (verificación homologada), pero la
          entrega física del premio requiere presentar el documento original.
        </li>
        <li>
          <strong>Plazo para reclamar:</strong> <strong>30 días naturales</strong> desde el evento (90 días en el caso de la motocicleta, por
          el trámite de licencia y traspaso).
        </li>
        <li>Se levanta un acta de entrega firmada por la persona ganadora y un representante de la Asociación.</li>
        <li>Los premios son personales e intransferibles y no se canjean por dinero, salvo que el anuncio diga lo contrario.</li>
      </ul>
    ),
  },
  {
    title: 'Transparencia tributaria',
    body: (
      <>
        <p>
          Los premios de sorteos pueden estar sujetos a obligaciones tributarias según la Ley del Impuesto sobre la Renta N.° 7092, su
          reglamento y las disposiciones de la Dirección General de Tributación del Ministerio de Hacienda. La condición benéfica de la
          Asociación no exime por sí sola a la persona ganadora de esas obligaciones.
        </p>
        <ul>
          <li>
            Si corresponde retener algún impuesto, la Asociación lo informará a la persona ganadora <strong>antes</strong> de la entrega,
            con el monto, el porcentaje y la base legal, y le dará el comprobante de la retención.
          </li>
          <li>Si el premio está exento o no corresponde retención, también se le indicará por escrito.</li>
          <li>La Asociación declara los premios entregados ante el Ministerio de Hacienda cuando la normativa lo exige.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Publicación de resultados',
    body: (
      <p>
        Los resultados se publican en la sección “Resultados” con el número de cartón y solo el primer nombre y la inicial del apellido de
        quien gana. El registro completo de bolas cantadas queda guardado y disponible para auditoría.
      </p>
    ),
  },
  {
    title: 'Consultas',
    body: (
      <p>
        Para dudas sobre este reglamento escríbenos a <ContactEmail />. Durante el evento, el personal de la Asociación en el salón atiende
        las consultas presenciales.
      </p>
    ),
  },
];

const DOC = {
  id: 'rules',
  path: PATHS.rules,
  title: 'Reglamento del juego, pagos y premios',
  intro: "Cómo se juega, cómo se paga y qué se necesita para recibir un premio, incluida la motocicleta.",
  sections: SECTIONS,
};

export default DOC;
