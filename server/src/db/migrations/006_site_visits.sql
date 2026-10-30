-- Visitas al sitio: solo un contador por día (sin IP, cookies ni datos personales).
-- El navegador suma una visita por sesión (sessionStorage), así recargar no infla la cifra.

create table app.site_visits (
  day    date primary key,
  visits integer not null default 0 check (visits >= 0)
);
alter table app.site_visits enable row level security;
