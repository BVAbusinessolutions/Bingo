import { z } from 'zod';

// Campos compartidos por registro, perfil y administración de usuarios.
export const emailField = z.string().trim().toLowerCase().email().max(120);
export const nameField = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[\p{L}\p{M}\s'.-]+$/u);
export const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{8,15}$/);
export const newPasswordField = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Za-z]/)
  .regex(/\d/);
