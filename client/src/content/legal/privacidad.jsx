// Redactada conforme a la Ley N.° 8968 (Protección de la Persona frente al Tratamiento de sus Datos Personales)
// y su reglamento. Debe revisarla asesoría legal (ver docs/LEGAL-REVISION.md).
import { Link } from 'react-router-dom';
import { ContactEmail } from '../../components/layout/LegalLayout';
import { legalIdText, SITE } from '../../config/site';
import { PATHS } from '../../routing/paths';

const SECTIONS = [
  {
    title: 'Responsable de la base de datos',
    body: (
      <>
        <p>
          La responsable del tratamiento de tus datos personales es la <strong>{SITE.name}</strong>
          {legalIdText()}, con domicilio en {SITE.address}. Puedes contactarnos en <ContactEmail /> o al {SITE.contactPhone}.
        </p>
        <p>
          Esta política se rige por la <strong>Ley N.° 8968</strong>, Protección de la Persona frente al Tratamiento de sus Datos
          Personales, y su reglamento. La autoridad de control es la Agencia de Protección de Datos de los Habitantes (PRODHAB).
        </p>
      </>
    ),
  },
  {
    title: 'Consentimiento informado',
    body: (
      <p>
        Al crear tu cuenta marcas la casilla de aceptación y, con ella, nos das tu consentimiento expreso para tratar tus datos con las
        finalidades descritas aquí, como exige el artículo 5 de la Ley 8968. Puedes retirar el consentimiento en cualquier momento (sección
        “Tus derechos”), sin efecto retroactivo y sabiendo que sin algunos datos no podremos venderte cartones ni entregarte premios.
      </p>
    ),
  },
  {
    title: 'Qué datos recopilamos',
    body: (
      <ul>
        <li>
          <strong>Cuenta:</strong> nombre, correo electrónico, teléfono (opcional) y contraseña (guardada cifrada; nadie puede leerla).
        </li>
        <li>
          <strong>Compra y verificación de identidad:</strong> nombre completo, número de cédula de identidad o DIMEX, teléfono, correo,
          método de pago, número y foto o PDF del comprobante.
        </li>
        <li>
          <strong>Juego:</strong> cartones comprados, reclamos de bingo y premios.
        </li>
        <li>
          <strong>Seguridad:</strong> dirección IP, fecha y hora de inicios de sesión y de acciones importantes (bitácora), para prevenir
          fraudes y ataques.
        </li>
        <li>
          <strong>Preferencias:</strong> tamaño de letra, modo día/noche, contraste y tu decisión sobre cookies, guardadas solo en tu
          navegador.
        </li>
      </ul>
    ),
  },
  {
    title: 'Datos sensibles y de menores de edad',
    body: (
      <>
        <p>No solicitamos datos sensibles (salud, origen étnico, creencias, orientación sexual, etc.).</p>
        <p>
          Las cuentas solo las abren personas mayores de edad. Si una persona menor de edad juega, lo hace con cartones de la cuenta de su
          madre, padre o representante legal, y solo tratamos los datos de la persona adulta. Si para entregar un premio se necesitan datos de
          la persona menor, se piden a su representante legal, con su consentimiento y conforme a la Ley 8968 y al Código de la Niñez y la
          Adolescencia (Ley N.° 7739).
        </p>
      </>
    ),
  },
  {
    title: 'Para qué usamos tus datos',
    body: (
      <ul>
        <li>Crear y proteger tu cuenta.</li>
        <li>Verificar tus pagos, asignarte cartones y enviarte avisos sobre tus compras.</li>
        <li>Verificar tu identidad y, cuando corresponda, la representación legal antes de entregar un premio (política KYC del Reglamento).</li>
        <li>Validar reclamos de bingo, entregar premios y cumplir obligaciones tributarias y contables.</li>
        <li>Prevenir fraudes: detectar comprobantes repetidos, cuentas duplicadas o uso de programas automatizados.</li>
        <li>Publicar resultados con transparencia, solo con tu primer nombre y la inicial de tu apellido.</li>
        <li>Medir el uso del sitio de forma agregada, únicamente si aceptas las cookies de analítica.</li>
      </ul>
    ),
  },
  {
    title: 'Con quién compartimos tus datos',
    body: (
      <>
        <p>No vendemos, alquilamos ni cedemos tus datos con fines comerciales. Solo los conocen:</p>
        <ul>
          <li>El personal autorizado de la Asociación que verifica pagos y premios, bajo deber de confidencialidad.</li>
          <li>
            Proveedores tecnológicos que nos prestan alojamiento, base de datos y envío de correos, que actúan por cuenta nuestra y no
            pueden usarlos para otros fines. Algunos alojan la información fuera de Costa Rica con medidas de seguridad equivalentes.
          </li>
          <li>Autoridades públicas, cuando una ley o una orden judicial lo exija (por ejemplo, el Ministerio de Hacienda).</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Cómo protegemos tus datos',
    body: (
      <ul>
        <li>Todas las conexiones al sitio van cifradas con HTTPS (TLS) y la conexión con la base de datos también usa TLS.</li>
        <li>Las contraseñas se guardan con cifrado de una vía (bcrypt): ni siquiera el personal puede verlas.</li>
        <li>Las sesiones usan credenciales de corta duración y cookies protegidas que el código de la página no puede leer.</li>
        <li>Los comprobantes de pago solo los ven tú y el personal que verifica pagos.</li>
        <li>Toda acción administrativa queda registrada en una bitácora que no se puede modificar.</li>
        <li>Límites de intentos y bloqueos automáticos protegen contra ataques de fuerza bruta.</li>
      </ul>
    ),
  },
  {
    title: 'Cuánto tiempo guardamos tus datos',
    body: (
      <ul>
        <li>Los comprobantes de compras no concretadas (vencidas, rechazadas o canceladas) se eliminan automáticamente a los 90 días.</li>
        <li>
          Los datos de compras aprobadas y premios se conservan durante el plazo que exige la normativa tributaria y contable; luego se
          eliminan o anonimizan.
        </li>
        <li>Los datos de tu cuenta se conservan mientras la cuenta exista. Si pides eliminarla, se borran salvo lo que la ley obligue a guardar.</li>
      </ul>
    ),
  },
  {
    title: 'Tus derechos',
    body: (
      <>
        <p>
          Conforme a la Ley 8968 tienes derecho de <strong>acceso</strong> (saber qué datos tenemos), <strong>rectificación</strong>{' '}
          (corregirlos), <strong>supresión</strong> (pedir que se eliminen) y a <strong>revocar tu consentimiento</strong>.
        </p>
        <p>
          Para ejercerlos escribe a <ContactEmail /> desde el correo de tu cuenta, indicando qué derecho quieres ejercer y adjuntando copia
          de tu identificación. Responderemos dentro de los plazos de la Ley 8968 y su reglamento, sin costo. Tu nombre y teléfono también
          puedes corregirlos tú mismo en “Mi perfil”.
        </p>
        <p>
          Si consideras que no atendimos tu solicitud, puedes presentar una denuncia ante la Agencia de Protección de Datos de los
          Habitantes (PRODHAB).
        </p>
      </>
    ),
  },
  {
    title: 'Cookies y almacenamiento local',
    body: (
      <p>
        Usamos solo una cookie técnica para mantener tu sesión y, si lo aceptas, cookies de analítica. El detalle está en la{' '}
        <Link to={PATHS.cookies} className="font-bold text-sol-blue underline dark:text-sol-gold">
          Política de cookies
        </Link>
        .
      </p>
    ),
  },
  {
    title: 'Cambios a esta política',
    body: (
      <p>
        Si cambiamos esta política, publicaremos la nueva versión aquí con su fecha. Si el cambio afecta las finalidades para las que diste
        tu consentimiento, te lo pediremos de nuevo.
      </p>
    ),
  },
];

const DOC = {
  id: 'privacy',
  path: PATHS.privacy,
  title: 'Política de privacidad y protección de datos personales',
  intro: `En la ${SITE.name} cuidamos tus datos personales conforme a la Ley N.° 8968 de Costa Rica. Aquí te explicamos qué datos usamos, para qué y cuáles son tus derechos.`,
  sections: SECTIONS,
};

export default DOC;
