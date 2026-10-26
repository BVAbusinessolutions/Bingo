// BORRADOR: este texto es una base de trabajo. Debe revisarlo asesoría legal antes de publicar
// (Ley 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales).
import LegalLayout from '../../components/layout/LegalLayout';
import { SITE } from '../../config/site';

const SECTIONS = [
  {
    title: 'Qué datos recopilamos',
    body: (
      <ul>
        <li>
          <strong>Cuenta:</strong> nombre, correo electrónico y, si lo agregas, teléfono.
        </li>
        <li>
          <strong>Compra:</strong> nombre completo, número de identificación, teléfono, correo y el comprobante de pago que adjuntes.
        </li>
        <li>
          <strong>Juego:</strong> cartones comprados y reclamos de bingo.
        </li>
      </ul>
    ),
  },
  {
    title: 'Para qué los usamos',
    body: (
      <ul>
        <li>Verificar tus pagos y asignarte los cartones.</li>
        <li>Validar y entregar premios.</li>
        <li>Enviarte avisos sobre tus compras, tu cuenta y los eventos en los que participas.</li>
      </ul>
    ),
  },
  {
    title: 'Con quién los compartimos',
    body: (
      <p>
        No vendemos ni alquilamos tus datos. Solo el personal autorizado de la Asociación puede verlos. En la página de resultados se
        publica únicamente tu primer nombre y la inicial de tu apellido si resultas ganador.
      </p>
    ),
  },
  {
    title: 'Cómo los protegemos',
    body: (
      <ul>
        <li>Las contraseñas se guardan cifradas; nadie de la Asociación puede verlas.</li>
        <li>Las conexiones al sitio van cifradas y el acceso administrativo está restringido.</li>
        <li>Los comprobantes de pago solo los ven tú y el personal que verifica los pagos.</li>
      </ul>
    ),
  },
  {
    title: 'Cuánto tiempo los guardamos',
    body: (
      <p>
        Conservamos los datos de compra el tiempo necesario para cumplir obligaciones contables y legales. Luego se eliminan o anonimizan.
      </p>
    ),
  },
  {
    title: 'Tus derechos',
    body: (
      <p>
        Puedes pedir acceso, corrección o eliminación de tus datos, o retirar tu consentimiento, escribiendo a{' '}
        <a className="font-bold text-sol-blue underline dark:text-sol-gold" href={`mailto:${SITE.contactEmail}`}>
          {SITE.contactEmail}
        </a>
        . Tu nombre y teléfono también puedes editarlos desde “Mi perfil”.
      </p>
    ),
  },
  {
    title: 'Preferencias guardadas en tu navegador',
    body: <p>Guardamos en tu navegador solo tus preferencias de modo día/noche y tamaño de letra. No usamos cookies de publicidad.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Política de privacidad"
      intro={`En la ${SITE.name} cuidamos tus datos personales. Aquí te explicamos qué datos usamos y por qué.`}
      sections={SECTIONS}
    />
  );
}
