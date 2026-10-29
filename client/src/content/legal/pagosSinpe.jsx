import { PATHS } from '../../routing/paths';
import { ContactEmail } from '../../components/layout/LegalLayout';
import { PAYMENT_DETAIL, SITE } from '../../config/site';

const SECTIONS = [
  {
    title: 'Antes de pagar',
    body: (
      <ul>
        <li>Para comprar cartones debes iniciar sesión o crear una cuenta gratis. Así tus cartones quedan a tu nombre y puedes jugar en línea.</li>
        <li>
          Elige tus cartones y pulsa “Continuar al pago”. Quedan apartados a tu nombre por un tiempo limitado, que ves en pantalla. Si no
          envías el comprobante a tiempo, vuelven a la venta.
        </li>
        <li>
          Paga solo a los datos que muestra la plataforma al comprar (también los publicamos en Contacto). La {SITE.name} nunca te pedirá
          pagar a otro número ni a otra cuenta por WhatsApp, llamada o redes sociales.
        </li>
      </ul>
    ),
  },
  {
    title: 'Pago por SINPE Móvil',
    body: (
      <ol>
        <li>Abre la aplicación de tu banco y elige SINPE Móvil.</li>
        <li>Envía el monto exacto al número que aparece en tu compra. Verifica que el nombre del titular sea el de la Asociación.</li>
        <li>
          En el detalle o motivo escribe <strong>{PAYMENT_DETAIL}</strong>, o <strong>{PAYMENT_DETAIL} - tu número de cédula</strong> (por
          ejemplo, “{PAYMENT_DETAIL} - 1-2345-6789”). Sin esa palabra no podemos identificar tu pago.
        </li>
        <li>Guarda el comprobante: lo necesitas en el paso siguiente.</li>
      </ol>
    ),
  },
  {
    title: 'Pago por transferencia bancaria u otro medio',
    body: (
      <ul>
        <li>Transfiere el monto exacto a la cuenta IBAN que aparece en tu compra, a nombre de la Asociación.</li>
        <li>
          El detalle de la transferencia también debe decir <strong>{PAYMENT_DETAIL}</strong> o <strong>{PAYMENT_DETAIL} - tu cédula</strong>.
        </li>
        <li>Las transferencias interbancarias pueden tardar en acreditarse según el horario del banco.</li>
      </ul>
    ),
  },
  {
    title: 'Enviar el comprobante',
    body: (
      <ul>
        <li>
          En tu compra, indica si pagaste por <strong>SINPE Móvil</strong> o por <strong>transferencia u otro medio</strong>, escribe el
          número de comprobante y adjunta la foto o captura.
        </li>
        <li>Los datos de la persona compradora (nombre y cédula o DIMEX) deben ser los de quien recibirá el premio.</li>
        <li>Cada comprobante sirve para una sola compra. El sistema detecta comprobantes repetidos y pagos de otras compras.</li>
      </ul>
    ),
  },
  {
    title: 'Verificación y confirmación',
    body: (
      <ul>
        <li>
          Una persona de la Asociación revisa que el dinero haya llegado, que el monto y el detalle coincidan y que el comprobante sea
          válido, y confirma el método de cobro.
        </li>
        <li>Al aprobarse recibes un correo y tus cartones aparecen en “Mis compras”, listos para imprimir y jugar en vivo.</li>
        <li>
          Si el pago no se puede verificar, la compra se rechaza, te avisamos por correo y los cartones vuelven a la venta. Si el dinero sí
          llegó, se devuelve según la política de devoluciones.
        </li>
        <li>
          Solo las compras aprobadas cuentan como recaudación del evento. Las reservas apartadas o con comprobante sin revisar no son
          ingresos.
        </li>
      </ul>
    ),
  },
  {
    title: 'Problemas con un pago',
    body: (
      <p>
        Si enviaste el dinero pero tu compra venció o fue rechazada, escríbenos a <ContactEmail /> con el número de comprobante. No vuelvas a
        pagar la misma compra.
      </p>
    ),
  },
];

const DOC = {
  id: 'sinpe',
  path: PATHS.sinpe,
  title: 'Procedimiento de pago por SINPE Móvil y transferencia',
  intro: 'Paso a paso para pagar tus cartones, qué escribir en el detalle y cómo verificamos cada pago.',
  sections: SECTIONS,
};

export default DOC;
