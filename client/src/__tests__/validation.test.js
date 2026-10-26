import { describe, expect, it } from 'vitest';
import { changePasswordSchema, paymentConfirmSchema, registerSchema, validate } from '../lib/validation';
import { parseSerials } from '../components/admin/ManualSaleDialog';

describe('validación de formularios', () => {
  it('el registro exige aceptar términos y contraseña con letras y números', () => {
    const { errors } = validate(registerSchema, {
      name: 'Ana Pérez',
      email: 'ana@example.com',
      password: 'solamenteletras',
      acceptTerms: false,
    });
    expect(errors.password).toBeTruthy();
    expect(errors.acceptTerms).toBe('Debes aceptar para continuar');
  });

  it('el pago exige número de comprobante', () => {
    const base = { fullName: 'Ana Pérez', nationalId: '1-2345-6789', phone: '8888-1234', email: 'ana@example.com', method: 'SINPE' };
    expect(validate(paymentConfirmSchema, { ...base, reference: '' }).errors.reference).toBeTruthy();
    expect(validate(paymentConfirmSchema, { ...base, reference: 'SNP12345' }).data).toBeTruthy();
  });

  it('las contraseñas nuevas deben coincidir', () => {
    const { errors } = validate(changePasswordSchema, { currentPassword: 'x', newPassword: 'Nueva12345', confirmPassword: 'Otra12345' });
    expect(errors.confirmPassword).toBe('Las contraseñas no coinciden');
  });

  it('la venta manual entiende listas y rangos de series', () => {
    expect(parseSerials('1001, 1003 1005-1007')).toEqual(['1001', '1003', '1005', '1006', '1007']);
    expect(parseSerials('abc, 12x')).toEqual([]);
  });
});
