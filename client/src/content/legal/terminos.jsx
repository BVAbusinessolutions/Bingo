// Texto base redactado conforme a la legislación costarricense vigente. Debe revisarlo asesoría legal
// antes de cada evento (ver docs/LEGAL-REVISION.md: decisiones de la Asociación y datos por completar).
import { Link } from 'react-router-dom';
import { ContactEmail } from '../../components/layout/LegalLayout';
import { AGE_NOTE, SITE } from '../../config/site';
import { PATHS } from '../../routing/paths';

const linkCls = 'font-bold text-sol-blue underline dark:text-sol-gold';

const SECTIONS = [
  {
    title: 'Aviso legal e información corporativa',
    body: (
      <>
        <p>
          Este sitio web y la plataforma del Bingo Benéfico son operados por la <strong>{SITE.name}</strong>, asociación sin fines de lucro
          constituida conforme a la Ley de Asociaciones N.° 218 de la República de Costa Rica e inscrita en el Registro de Personas Jurídicas
          del Registro Nacional.
        </p>
        <ul>
          <li>
            <strong>Razón social:</strong> {SITE.name}.
          </li>
          {SITE.legalId && (
            <li>
              <strong>Cédula jurídica:</strong> {SITE.legalId}.
            </li>
          )}
          <li>
            <strong>Domicilio:</strong> {SITE.address}.
          </li>
          <li>
            <strong>Correo de contacto:</strong> <ContactEmail />. <strong>Teléfono:</strong> {SITE.contactPhone}.
          </li>
          <li>
            <strong>Finalidad:</strong> atención y protección integral de niñas y niños en condición de vulnerabilidad: hogar, alimentación,
            educación y acompañamiento. La totalidad de lo recaudado con el bingo, una vez cubiertos los premios y los costos del evento, se
            destina a esa finalidad.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: 'Aceptación de estos términos',
    body: (
      <>
        <p>
          Al crear una cuenta, comprar cartones o usar este sitio aceptas estos Términos y Condiciones, el{' '}
          <Link to={PATHS.rules} className={linkCls}>
            Reglamento del juego
          </Link>
          , la{' '}
          <Link to={PATHS.contingencies} className={linkCls}>
            Política de contingencias, devoluciones y antifraude
          </Link>{' '}
          y la{' '}
          <Link to={PATHS.privacy} className={linkCls}>
            Política de privacidad
          </Link>
          . Si no estás de acuerdo con alguno de ellos, no uses la plataforma.
        </p>
        <p>
          La Asociación puede actualizar estos documentos. Los cambios rigen desde su publicación y nunca afectan las compras ya confirmadas
          de un evento en curso, salvo que lo exija la ley.
        </p>
      </>
    ),
  },
  {
    title: 'Quién puede participar',
    body: (
      <ul>
        <li>
          <strong>{AGE_NOTE}</strong>
        </li>
        <li>
          Las <strong>cuentas</strong> de la plataforma solo pueden abrirlas personas mayores de 18 años con cédula de identidad
          costarricense o DIMEX vigente. Una persona menor de edad puede jugar con cartones comprados y administrados por su madre, padre o
          representante legal, quien es responsable de la cuenta conforme al Código de la Niñez y la Adolescencia (Ley N.° 7739).
        </li>
        <li>
          Los premios mayores solo se entregan a una persona mayor de edad: la titular de la cuenta o, si el cartón lo jugó una persona menor,
          su representante legal, que debe demostrar ese vínculo.
        </li>
        <li>Cada persona puede tener una sola cuenta. Las cuentas son personales e intransferibles.</li>
        <li>
          No pueden participar los miembros de la Junta Directiva ni el personal que opera el sorteo o verifica pagos, ni sus familiares
          hasta el segundo grado, para garantizar la transparencia.
        </li>
      </ul>
    ),
  },
  {
    title: 'Tu cuenta',
    body: (
      <ul>
        <li>Debes registrar datos reales y confirmar tu correo electrónico para comprar.</li>
        <li>Eres responsable de mantener tu contraseña en secreto. Si crees que alguien la conoce, cámbiala desde “Mi perfil” y avísanos.</li>
        <li>
          La Asociación puede suspender temporalmente o cancelar una cuenta ante indicios de fraude, suplantación de identidad, uso de
          programas automatizados o incumplimiento de estos términos, según la{' '}
          <Link to={PATHS.contingencies} className={linkCls}>
            Política antifraude
          </Link>
          .
        </li>
      </ul>
    ),
  },
  {
    title: 'Compra de cartones',
    body: (
      <ul>
        <li>Al reservar, los cartones quedan apartados a tu nombre por un tiempo limitado mientras realizas el pago.</li>
        <li>Si el pago no se confirma a tiempo, la reserva vence y los cartones vuelven a estar disponibles.</li>
        <li>
          La compra queda confirmada solo cuando la Asociación verifica el pago (SINPE Móvil, transferencia o pago en efectivo en el
          salón). Los detalles están en el{' '}
          <Link to={PATHS.rules} className={linkCls}>
            Reglamento: política de pagos
          </Link>
          .
        </li>
        <li>Cada cartón tiene un número de serie único y solo puede pertenecer a una persona por evento.</li>
      </ul>
    ),
  },
  {
    title: 'Asignación de cartones y validación anti-duplicados',
    body: (
      <ul>
        <li>
          Cada cartón tiene un número de serie único dentro de su evento y una combinación de números que no se repite en la serie. La base de
          datos impide que un mismo cartón se asigne a dos personas, aunque dos compras se hagan en el mismo instante.
        </li>
        <li>Los cartones se apartan a tu nombre al reservarlos y solo pasan a ser tuyos cuando la Asociación aprueba el pago.</li>
        <li>
          El sistema cruza automáticamente cada compra con las anteriores y avisa al personal si detecta: el mismo número de comprobante, la
          misma imagen de comprobante, o la misma cédula o DIMEX usada desde otra cuenta o desde una cuenta sancionada. Esas compras se revisan
          una por una antes de aprobarse.
        </li>
        <li>Los cartones vendidos en el salón y los vendidos en línea pertenecen a la misma serie, de modo que nunca hay dos iguales.</li>
      </ul>
    ),
  },
  {
    title: 'Uso permitido de la plataforma',
    body: (
      <>
        <p>Está prohibido:</p>
        <ul>
          <li>Usar bots, scripts o cualquier medio automatizado para reservar, comprar o reclamar cartones.</li>
          <li>Intentar acceder a cuentas, datos o funciones ajenas, o vulnerar la seguridad del sitio.</li>
          <li>Presentar comprobantes de pago falsos, alterados o ya usados en otra compra.</li>
          <li>Revender cartones o usar la marca de la Asociación sin autorización escrita.</li>
        </ul>
        <p>
          Estas conductas pueden constituir delitos informáticos (Código Penal, reformado por la Ley N.° 9048) y se denunciarán ante las
          autoridades competentes.
        </p>
      </>
    ),
  },
  {
    title: 'Disponibilidad del servicio y responsabilidad',
    body: (
      <>
        <p>
          La Asociación procura que la plataforma funcione sin interrupciones, pero no puede garantizarlo ante fallas de internet, del
          proveedor de transmisión, de energía o del dispositivo de cada persona. El registro oficial de balotas cantadas es el que guarda el
          sistema y respalda el acta del sorteo.
        </p>
        <p>
          La Asociación no responde por la imposibilidad de una persona de conectarse a la transmisión por causas ajenas a la plataforma.
          Los cartones comprados participan igualmente y sus bingos se verifican de forma automática contra las balotas cantadas.
        </p>
      </>
    ),
  },
  {
    title: 'Derechos de las personas consumidoras',
    body: (
      <p>
        Nada de lo aquí dispuesto limita los derechos que la Ley de Promoción de la Competencia y Defensa Efectiva del Consumidor N.° 7472 y
        su reglamento reconocen a las personas consumidoras. Las reglas sobre retracto, cancelaciones y devoluciones están en la{' '}
        <Link to={PATHS.contingencies} className={linkCls}>
          Política de contingencias
        </Link>
        .
      </p>
    ),
  },
  {
    title: 'Ley aplicable y solución de controversias',
    body: (
      <p>
        Estos términos se rigen por las leyes de la República de Costa Rica. Antes de acudir a otra vía, te pedimos escribirnos a{' '}
        <ContactEmail /> para buscar una solución directa. Cualquier controversia se someterá a los tribunales competentes de Costa Rica,
        sin perjuicio del derecho de la persona consumidora de acudir a la Comisión Nacional del Consumidor del MEIC.
      </p>
    ),
  },
];

const DOC = {
  id: 'terms',
  path: PATHS.terms,
  title: 'Términos, aviso legal e información corporativa',
  intro: "Reglas de uso de la plataforma del Bingo Benéfico y datos de la organización responsable.",
  sections: SECTIONS,
};

export default DOC;
