-- Esquema inicial del Bingo Hogar Sol (Postgres / Supabase).
-- Todo vive en el esquema privado "app": Supabase solo expone "public" por su API REST,
-- y además se activa RLS sin políticas en cada tabla como segunda barrera.
-- El servidor Node se conecta con un rol propietario y es el único que lee/escribe.

create schema if not exists app;

-- ---------------------------------------------------------------- usuarios y sesiones
create table app.users (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 3 and 80),
  email             text not null unique check (email = lower(email) and char_length(email) <= 120),
  phone             text check (phone ~ '^\+?[0-9 -]{8,15}$'),
  role              text not null default 'CLIENTE' check (role in ('ADMIN', 'CLIENTE')),
  status            text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  password_hash     text not null,
  email_verified    boolean not null default false,
  terms_accepted_at timestamptz,
  failed_logins     integer not null default 0 check (failed_logins >= 0),
  locked_until      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table app.refresh_tokens (
  jti        uuid primary key,
  user_id    uuid not null references app.users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index refresh_tokens_user_idx on app.refresh_tokens (user_id);

-- Enlaces de un solo uso (restablecer contraseña / verificar correo). Solo se guarda el hash.
create table app.one_time_tokens (
  token_hash text primary key check (char_length(token_hash) = 64),
  user_id    uuid not null references app.users (id) on delete cascade,
  purpose    text not null check (purpose in ('RESET_PASSWORD', 'VERIFY_EMAIL')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index one_time_tokens_user_idx on app.one_time_tokens (user_id, purpose);

-- ---------------------------------------------------------------- archivos (comprobantes, imágenes de cartones)
create table app.files (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('PROOF', 'CARD_IMAGE')),
  mime       text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size       integer not null check (size > 0 and size <= 6 * 1024 * 1024),
  data       bytea not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- series de cartones (biblioteca)
-- Cada carga (ZIP de imágenes o generación automática) es una serie. Un evento elige qué serie se juega.
create table app.card_series (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 120),
  source     text not null check (source in ('GENERATED', 'IMPORT')),
  file_name  text,
  status     text not null default 'READY' check (status in ('PROCESSING', 'READY', 'FAILED')),
  card_count integer not null default 0 check (card_count >= 0),
  notes      text not null default '',
  created_by uuid references app.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table app.series_cards (
  id           uuid primary key default gen_random_uuid(),
  series_id    uuid not null references app.card_series (id) on delete cascade,
  serial       text not null check (serial ~ '^[0-9]{1,8}$'),
  grid         jsonb not null check (jsonb_typeof(grid) = 'array' and jsonb_array_length(grid) = 5),
  image_id     uuid references app.files (id) on delete set null,
  needs_review boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (series_id, serial)
);
create index series_cards_image_idx on app.series_cards (image_id);

-- ---------------------------------------------------------------- eventos
create table app.events (
  id              text primary key default ('evt-' || substr(gen_random_uuid()::text, 1, 8)) check (id ~ '^[a-z0-9-]{3,64}$'),
  name            text not null check (char_length(name) between 3 and 80),
  description     text not null default '' check (char_length(description) <= 300),
  pattern         text not null check (pattern in ('LINE', 'FOUR_CORNERS', 'X', 'FULL')),
  price           integer not null check (price between 0 and 1000000), -- colones enteros
  starts_at       timestamptz not null,
  status          text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED')),
  stream_provider text check (stream_provider in ('youtube', 'twitch', 'vimeo')),
  stream_video_id text check (stream_video_id ~ '^[A-Za-z0-9_-]{2,64}$'),
  series_id       uuid references app.card_series (id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check ((stream_provider is null) = (stream_video_id is null))
);
create index events_series_idx on app.events (series_id);

-- ---------------------------------------------------------------- reservas / compras
create table app.reservations (
  id                uuid primary key default gen_random_uuid(),
  event_id          text not null references app.events (id) on delete restrict,
  user_id           uuid references app.users (id) on delete restrict, -- null = venta manual sin cuenta
  channel           text not null default 'WEB' check (channel in ('WEB', 'MANUAL')),
  status            text not null check (status in ('PENDING', 'PROOF_SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'REFUNDED')),
  total             integer not null check (total >= 0),
  buyer_full_name   text,
  buyer_national_id text,
  buyer_phone       text,
  buyer_email       text,
  payment_method    text check (payment_method in ('SINPE', 'TRANSFER', 'CASH')),
  payment_reference text check (char_length(payment_reference) <= 40),
  proof_file_id     uuid references app.files (id) on delete set null,
  proof_uploaded_at timestamptz,
  expires_at        timestamptz not null,
  decided_at        timestamptz,
  decided_by        uuid references app.users (id) on delete set null,
  refunded_at       timestamptz,
  created_at        timestamptz not null default now(),
  check (channel = 'MANUAL' or user_id is not null),
  check (status in ('PENDING', 'EXPIRED', 'CANCELLED') or buyer_full_name is not null)
);
create index reservations_user_idx on app.reservations (user_id, created_at desc);
create index reservations_event_status_idx on app.reservations (event_id, status);
create index reservations_pending_idx on app.reservations (expires_at) where status = 'PENDING';
create index reservations_proof_file_idx on app.reservations (proof_file_id);

-- ---------------------------------------------------------------- cartones de cada evento
create table app.cards (
  id             uuid primary key default gen_random_uuid(),
  event_id       text not null references app.events (id) on delete cascade,
  series_card_id uuid references app.series_cards (id) on delete set null,
  serial         text not null check (serial ~ '^[0-9]{1,8}$'),
  grid           jsonb not null check (jsonb_typeof(grid) = 'array' and jsonb_array_length(grid) = 5),
  status         text not null default 'AVAILABLE' check (status in ('AVAILABLE', 'RESERVED', 'SOLD')),
  owner_id       uuid references app.users (id) on delete set null,
  reservation_id uuid references app.reservations (id) on delete set null,
  unique (event_id, serial),
  check (status <> 'AVAILABLE' or (reservation_id is null and owner_id is null))
);
create index cards_event_status_idx on app.cards (event_id, status);
create index cards_owner_idx on app.cards (owner_id) where owner_id is not null;
create index cards_reservation_idx on app.cards (reservation_id) where reservation_id is not null;
create index cards_series_card_idx on app.cards (series_card_id);

-- Historial: qué cartones tuvo cada reserva (se conserva aunque los cartones se liberen).
create table app.reservation_cards (
  reservation_id uuid not null references app.reservations (id) on delete cascade,
  card_id        uuid not null references app.cards (id) on delete cascade,
  primary key (reservation_id, card_id)
);
create index reservation_cards_card_idx on app.reservation_cards (card_id);

-- ---------------------------------------------------------------- sorteo y reclamos
create table app.draws (
  event_id  text not null references app.events (id) on delete cascade,
  number    smallint not null check (number between 1 and 75),
  seq       bigint generated always as identity,
  called_at timestamptz not null default now(),
  called_by uuid references app.users (id) on delete set null,
  primary key (event_id, number)
);
create index draws_event_seq_idx on app.draws (event_id, seq);

create table app.claims (
  id              uuid primary key default gen_random_uuid(),
  event_id        text not null references app.events (id) on delete cascade,
  card_id         uuid not null references app.cards (id) on delete cascade,
  user_id         uuid not null references app.users (id) on delete cascade,
  status          text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'REJECTED')),
  called_count    integer not null check (called_count between 0 and 75),
  called_at_claim smallint[] not null,
  created_at      timestamptz not null default now(),
  decided_at      timestamptz,
  decided_by      uuid references app.users (id) on delete set null
);
-- Un solo reclamo activo por cartón (los rechazados permiten reintentar).
create unique index claims_one_active_per_card on app.claims (card_id) where status <> 'REJECTED';
create index claims_event_idx on app.claims (event_id, created_at);
create index claims_user_idx on app.claims (user_id);

-- ---------------------------------------------------------------- configuración y auditoría
create table app.settings (
  key        text primary key check (key in ('payment')),
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references app.users (id) on delete set null
);

-- Bitácora append-only de acciones administrativas y de seguridad.
create table app.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references app.users (id) on delete set null,
  action      text not null check (char_length(action) <= 64),
  target_type text,
  target_id   text,
  details     jsonb not null default '{}'::jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on app.audit_log (created_at desc);
create index audit_log_actor_idx on app.audit_log (actor_id);

-- ---------------------------------------------------------------- RLS: deny-all para cualquier rol que no sea el dueño
alter table app.users enable row level security;
alter table app.refresh_tokens enable row level security;
alter table app.one_time_tokens enable row level security;
alter table app.files enable row level security;
alter table app.card_series enable row level security;
alter table app.series_cards enable row level security;
alter table app.events enable row level security;
alter table app.reservations enable row level security;
alter table app.cards enable row level security;
alter table app.reservation_cards enable row level security;
alter table app.draws enable row level security;
alter table app.claims enable row level security;
alter table app.settings enable row level security;
alter table app.audit_log enable row level security;
