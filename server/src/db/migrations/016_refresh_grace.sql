-- Renovación de sesión con margen de gracia: el refresh token usado se marca (used_at) en vez de borrarse.
-- Si el mismo token vuelve a llegar en pocos segundos (recarga a mitad de la renovación, dos pestañas a la vez,
-- datos móviles que cortan la respuesta) se emite una sesión nueva sin cerrar todas las del usuario.
alter table app.refresh_tokens add column used_at timestamptz;
