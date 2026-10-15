// El access token vive SOLO en memoria (no en localStorage) para que un XSS no pueda robarlo de forma persistente.
// El refresh token vive en una cookie HttpOnly + Secure + SameSite=Strict que JavaScript no puede leer.
let accessToken = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token) => {
    accessToken = token;
  },
  clear: () => {
    accessToken = null;
  },
};
