/** Error de negocio con código HTTP y código de error para el cliente (p. ej. 409 CARDS_NOT_AVAILABLE). */
export class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
