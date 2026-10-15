import { http } from './httpClient';

const data = (r) => r.data;

export const authApi = {
  login: (credentials) => http.post('/auth/login', credentials).then(data),
  register: (payload) => http.post('/auth/register', payload).then(data),
  logout: () => http.post('/auth/logout'),
  me: () => http.get('/auth/me').then(data),
};

export const eventsApi = {
  current: () => http.get('/events/current').then(data),
  list: () => http.get('/events').then(data),
  catalog: (eventId) => http.get(`/events/${eventId}/cards/catalog`).then(data),
};

export const cardsApi = {
  mine: (eventId) => http.get(`/events/${eventId}/cards/mine`).then(data),
};

export const reservationsApi = {
  create: (body) => http.post('/reservations', body).then(data),
  mine: () => http.get('/reservations/mine').then(data),
  get: (id) => http.get(`/reservations/${id}`).then(data),
  cancel: (id) => http.delete(`/reservations/${id}`).then(data),
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
};

export const adminApi = {
  stats: (eventId) => http.get(`/admin/events/${eventId}/stats`).then(data),
  events: () => http.get('/admin/events').then(data),
  createEvent: (body) => http.post('/admin/events', body).then(data),
  updateEvent: (id, body) => http.patch(`/admin/events/${id}`, body).then(data),
  cards: (eventId, params) => http.get(`/admin/events/${eventId}/cards`, { params }).then(data),
  generateCards: (eventId, count) => http.post(`/admin/events/${eventId}/cards/generate`, { count }).then(data),
  reservations: (status) => http.get('/admin/reservations', { params: { status } }).then(data),
  proofBlob: (id) => http.get(`/admin/reservations/${id}/proof`, { responseType: 'blob' }).then(data),
  decide: (id, approve) => http.post(`/admin/reservations/${id}/decision`, { approve }).then(data),
};
