import { useRef } from 'react';

/**
 * Props para el fondo oscuro de un diálogo: cierra solo si el clic EMPIEZA y TERMINA sobre el fondo.
 * Con un simple onClick, seleccionar texto dentro del diálogo y soltar el mouse afuera lo cerraba
 * (y se perdía lo escrito en el formulario).
 */
export function useBackdropClose(onClose) {
  const pressedOnBackdrop = useRef(false);
  return {
    onMouseDown: (e) => {
      pressedOnBackdrop.current = e.target === e.currentTarget;
    },
    onClick: (e) => {
      if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
      pressedOnBackdrop.current = false;
    },
  };
}
