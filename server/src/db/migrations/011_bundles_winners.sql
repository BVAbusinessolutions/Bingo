-- Precio por paquete ("2 cartones por ₡3 000"): events.price pasa a ser el precio del paquete y bundle_size
-- cuántos cartones trae. Con 1 es el precio por cartón de siempre (los eventos existentes no cambian).
alter table app.events add column bundle_size smallint not null default 1 check (bundle_size between 1 and 10);

-- Premio entregado a un ganador en línea (lo anota la administración al confirmar).
alter table app.claims add column prize text check (prize is null or length(prize) between 2 and 120);

-- Ganadores del salón (bingo jugado con cartones físicos): nombre, premio, modalidad, serie de cartones y número.
create table app.manual_winners (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null references app.events (id) on delete cascade,
  name         text not null check (length(name) between 3 and 120),
  prize        text not null check (length(prize) between 2 and 120),
  pattern      text check (pattern is null or pattern in ('LINE', 'TWO_LINES', 'FOUR_CORNERS', 'X', 'PLUS', 'T', 'L', 'FRAME', 'INNER_SQUARE', 'FULL')),
  series_id    uuid references app.card_series (id) on delete set null,
  series_label text check (series_label is null or length(series_label) <= 80),
  serial       text check (serial is null or serial ~ '^[0-9]{1,8}$'),
  phone        text check (phone is null or length(phone) <= 20),
  notes        text check (notes is null or length(notes) <= 300),
  created_by   uuid references app.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index manual_winners_event_idx on app.manual_winners (event_id, created_at);
alter table app.manual_winners enable row level security;
