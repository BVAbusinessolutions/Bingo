import logoUrl from '../../assets/svg/logo-hogar-sol.svg';

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
 * Sin marco de color: una sombra leve y un filo translúcido lo separan del fondo (Manual de Marca §3).
 */
export function BrandBadge({ className = '', logoClassName = 'h-full w-auto', decorative = true }) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-2xl bg-[#fff] p-1 shadow-[0_4px_14px_rgb(2_6_23/0.25)] ${className}`}
    >
      <BrandLogo decorative={decorative} className={logoClassName} />
    </span>
  );
}
