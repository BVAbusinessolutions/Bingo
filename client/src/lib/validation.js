import { z } from 'zod';
import DOMPurify from 'dompurify';

// Quita cualquier HTML. React ya escapa al renderizar; esto es defensa en profundidad
// para datos que viajan a otros sistemas (correos, PDFs, panel admin).
export const clean = (value) =>
  DOMPurify.sanitize(String(value ?? ''), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();

const personName = z
  .string()
  .trim()
  .min(3, 'Requerido')
  .max(80)
  .regex(/^[\p{L}\p{M}\s'.-]+$/u, 'Caracteres no permitidos');

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido').max(120),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(128),
});

export const registerSchema = z.object({
  name: personName,
  email: z.string().trim().toLowerCase().email('Correo inválido').max(120),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(128)
    .regex(/[A-Za-z]/, 'Debe incluir letras')
    .regex(/\d/, 'Debe incluir números'),
});

export const buyerSchema = z.object({
  fullName: personName,
  nationalId: z.string().trim().regex(/^[0-9A-Za-z-]{5,20}$/, 'Cédula inválida'),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{8,15}$/, 'Teléfono inválido'),
  email: z.string().trim().toLowerCase().email('Correo inválido').max(120),
});

/** Devuelve { data, errors } con el primer error por campo. */
export function validate(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return { data: result.data, errors: {} };
  const errors = {};
  for (const issue of result.error.issues) errors[issue.path[0]] ??= issue.message;
  return { data: null, errors };
}

const reference = z
  .string()
  .trim()
  .regex(/^[0-9A-Za-z-]{4,30}$/, 'Solo letras, números y guiones (4 a 30)')
  .or(z.literal(''));

/** Confirmación de pago SINPE / Transferencia: comprador + referencia y/o comprobante. */
export const paymentConfirmSchema = buyerSchema.extend({
  method: z.enum(['SINPE', 'TRANSFER']),
  reference,
});
