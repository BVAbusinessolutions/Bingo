import logoUrl from '../../assets/svg/logo-hogar-sol.svg';
import badgeUrl from '../../assets/svg/logo-hogar-sol-placa.svg';

/**
 * Logo oficial de la Asociación Infantil Hogar Sol (única fuente: src/assets/svg/logo-hogar-sol.svg).
 * Tiene texto azul oscuro: sobre fondos azules va dentro de <BrandBadge>, que le da la placa blanca.
 * `decorative` cuando el contenedor ya tiene su propia etiqueta accesible (p. ej. el enlace al inicio).
 */
export default function BrandLogo({ decorative = false, className = '', ...props }) {
  return (
    <img
      src={logoUrl}
      alt={decorative ? '' : 'Asociación Infantil Hogar Sol'}
      width={183}
      height={201}
      decoding="async"
      draggable={false}
      // h-auto solo sin tamaño propio: si se combinara con h-10/h-full, el orden del CSS decidiría la altura.
      className={`select-none ${className || 'h-auto'}`}
      {...props}
    />
  );
}

/**
 * Logo sobre placa blanca de bordes suaves, para fondos oscuros (encabezado, pie, portada).
 * Sin marco de color: una sombra leve lo separa del fondo (Manual de Marca §3).
 * La placa va dentro del SVG (logo-hogar-sol-placa.svg) y no como fondo CSS: el modo oscuro forzado de Chrome
 * para Android y Samsung Internet oscurecía el fondo blanco y el logo se veía negro. Las imágenes no las toca.
 */
export function BrandBadge({ className = '', decorative = true }) {
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-2xl shadow-[0_4px_14px_rgb(2_6_23/0.25)] ${className}`}>
      <img
        src={badgeUrl}
        alt={decorative ? '' : 'Asociación Infantil Hogar Sol'}
        width={223}
        height={223}
        decoding="async"
        draggable={false}
        className="block h-full w-full select-none"
      />
    </span>
  );
}
