import { http } from './httpClient';

const data = (r) => r.data;

export const authApi = {
  login: (credentials) => http.post('/auth/login', credentials).then(data),
  register: (payload) => http.post('/auth/register', payload).then(data),
  logout: () => http.post('/auth/logout'),
  me: () => http.get('/auth/me').then(data),
  updateProfile: (body) => http.patch('/auth/me', body).then(data),
  changePassword: (body) => http.post('/auth/change-password', body).then(data),
  logoutAll: () => http.post('/auth/logout-all'),
  forgotPassword: (email) => http.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => http.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => http.post('/auth/verify-email', { token }).then(data),
  resendVerification: () => http.post('/auth/resend-verification'),
};

export const contactApi = {
  payment: () => http.get('/contact/payment').then(data),
  send: (body) => http.post('/contact/message', body).then(data),
};

export const eventsApi = {
  current: () => http.get('/events/current').then(data),
  list: () => http.get('/events').then(data),
  catalog: (eventId) => http.get(`/events/${eventId}/cards/catalog`).then(data),
  results: () => http.get('/events/results').then(data),
};

export const claimsApi = {
  create: (eventId, cardId) => http.post(`/events/${eventId}/claims`, { cardId }).then(data),
  mine: (eventId) => http.get(`/events/${eventId}/claims/mine`).then(data),
};

export const cardsApi = {
  mine: (eventId) => http.get(`/events/${eventId}/cards/mine`).then(data),
};

export const reservationsApi = {
  create: (body) => http.post('/reservations', body).then(data),
  mine: () => http.get('/reservations/mine').then(data),
  get: (id) => http.get(`/reservations/${id}`).then(data),
  cancel: (id) => http.delete(`/reservations/${id}`).then(data),
  proofBlob: (id) => http.get(`/reservations/${id}/proof`, { responseType: 'blob' }).then(data),
  /** Confirmación de pago: datos del comprador + referencia y/o comprobante (multipart). */
  confirmPayment: (id, { file, ...fields }) => {
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => v && form.append(k, v));
    if (file) form.append('proof', file);
    return http.post(`/reservations/${id}/proof`, form).then(data);
  },
};

export const drawApi = {
  state: (eventId) => http.get(`/events/${eventId}/draw`).then(data),
  call: (eventId, number) => http.post(`/events/${eventId}/draw/call`, { number }).then(data),
  undo: (eventId) => http.post(`/events/${eventId}/draw/undo`).then(data),
  winningCards: (eventId) => http.get(`/events/${eventId}/draw/winning-cards`).then(data),
  salonWinner: (eventId, cardId) => http.post(`/events/${eventId}/draw/salon-winner`, { cardId }).then(data),
};

export const adminApi = {
  stats: (eventId) => http.get(`/admin/events/${eventId}/stats`).then(data),
  events: () => http.get('/admin/events').then(data),
  createEvent: (body) => http.post('/admin/events', body).then(data),
  updateEvent: (id, body) => http.patch(`/admin/events/${id}`, body).then(data),
  assignSeries: (eventId, seriesId) => http.post(`/admin/events/${eventId}/series`, { seriesId }).then(data),
  cards: (eventId, params) => http.get(`/admin/events/${eventId}/cards`, { params }).then(data),
  printCards: (eventId, from, to) => http.get(`/admin/events/${eventId}/cards/print`, { params: { from, to } }).then(data),
  reservations: (status, eventId) => http.get('/admin/reservations', { params: { status, eventId } }).then(data),
  reservation: (id) => http.get(`/admin/reservations/${id}`).then(data),
  proofBlob: (id) => http.get(`/admin/reservations/${id}/proof`, { responseType: 'blob' }).then(data),
  decide: (id, approve, method) => http.post(`/admin/reservations/${id}/decision`, { approve, method }).then(data),
  refund: (id) => http.post(`/admin/reservations/${id}/refund`).then(data),
  manualSale: (body) => http.post('/admin/manual-sales', body).then(data),
  exportReservations: (params) => http.get('/admin/reservations/export.csv', { params, responseType: 'blob' }).then(data),
  claims: (eventId) => http.get('/admin/claims', { params: { eventId } }).then(data),
  decideClaim: (id, approve) => http.post(`/admin/claims/${id}/decision`, { approve }).then(data),
  users: (params) => http.get('/admin/users', { params }).then(data),
  createUser: (body) => http.post('/admin/users', body).then(data),
  updateUser: (id, body) => http.patch(`/admin/users/${id}`, body).then(data),
  sanctionUser: (id, body) => http.post(`/admin/users/${id}/sanction`, body).then(data),
  audit: (params) => http.get('/admin/audit', { params }).then(data),
  payment: () => http.get('/admin/settings/payment').then(data),
  updatePayment: (body) => http.put('/admin/settings/payment', body).then(data),
  series: () => http.get('/admin/series').then(data),
  seriesOne: (id) => http.get(`/admin/series/${id}`).then(data),
  seriesCards: (id, params) => http.get(`/admin/series/${id}/cards`, { params }).then(data),
  generateSeries: (body) => http.post('/admin/series/generate', body).then(data),
  importSeries: (file, name, onUploadProgress) => {
    const form = new FormData();
    form.append('name', name);
    form.append('file', file);
    return http.post('/admin/series/import', form, { timeout: 10 * 60_000, onUploadProgress }).then(data);
  },
  updateSeriesCard: (id, body) => http.put(`/admin/series-cards/${id}`, body).then(data),
  deleteSeries: (id) => http.delete(`/admin/series/${id}`).then(data),
};
