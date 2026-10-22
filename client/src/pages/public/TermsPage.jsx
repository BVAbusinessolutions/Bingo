// BORRADOR: este texto es una base de trabajo. Debe revisarlo asesoría legal antes de publicar
// (ver pendientes/TAREAS-PENDIENTES.md, sección Legal).
import LegalLayout from '../../components/layout/LegalLayout';
import { SITE } from '../../config/site';

const SECTIONS = [
  {
    title: 'Quiénes somos',
    body: (
      <p>
        El Bingo Benéfico es organizado por la <strong>{SITE.name}</strong>. Todo lo recaudado se destina a los programas de la
        Asociación.
      </p>
    ),
  },
  {
    title: 'Cuenta de usuario',
    body: (
      <ul>
        <li>Para comprar cartones necesitas una cuenta con un correo electrónico confirmado.</li>
        <li>Eres responsable de mantener tu contraseña en secreto. Si crees que alguien la conoce, cámbiala desde “Mi perfil”.</li>
        <li>Debes ser mayor de edad para comprar cartones.</li>
      </ul>
    ),
  },
  {
    title: 'Compra de cartones',
    body: (
      <ul>
        <li>Al reservar, los cartones quedan apartados por un tiempo limitado mientras realizas el pago.</li>
        <li>Si el pago no se confirma a tiempo, la reserva vence y los cartones vuelven a estar disponibles.</li>
        <li>La compra queda confirmada solo cuando la Asociación verifica el pago (SINPE Móvil o transferencia).</li>
      </ul>
    ),
  },
  {
    title: 'Cómo se juega',
    body: (
      <ul>
        <li>Las balotas se cantan en vivo durante la transmisión. El patrón ganador (línea, doble línea o cartón lleno) se indica en cada evento.</li>
        <li>Cuando completes el patrón, pulsa el botón <strong>“¡Bingo!”</strong>. El sistema verifica tu cartón con las balotas cantadas.</li>
        <li>La Asociación confirma cada premio antes de entregarlo. Si hay varios ganadores con la misma balota, se aplicarán las reglas anunciadas para ese evento.</li>
      </ul>
    ),
  },
  {
    title: 'Premios',
    body: (
      <p>
        Los premios se anuncian en cada evento. Te contactaremos al correo o teléfono registrados para coordinar la entrega. El premio
        no es transferible ni canjeable por dinero salvo que se indique lo contrario.
      </p>
    ),
  },
  {
    title: 'Cancelaciones y reembolsos',
    body: (
      <p>
        Por tratarse de una actividad benéfica, las compras confirmadas no son reembolsables, excepto si el evento se cancela. En ese
        caso, la Asociación te contactará para devolver el dinero o trasladar tus cartones a un nuevo evento.
      </p>
    ),
  },
  {
    title: 'Fallas técnicas',
    body: (
      <p>
        Si la transmisión o el sitio fallan durante el sorteo, el registro oficial de balotas cantadas es el que guarda el sistema. La
        Asociación podrá pausar o reprogramar el sorteo e informará por los medios oficiales.
      </p>
    ),
  },
  {
    title: 'Contacto',
    body: (
      <p>
        Para dudas sobre estos términos escríbenos a <a className="font-bold text-sol-blue underline dark:text-sol-gold" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return <LegalLayout title="Términos y condiciones" intro="Estas son las reglas para comprar cartones y participar en el Bingo Benéfico." sections={SECTIONS} />;
}
