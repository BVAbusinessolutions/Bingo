-- Finanzas: comprobantes adjuntados por la administración (ventas del salón o pagos verificados sin foto)
-- y gastos del evento con su factura o recibo, para cuadrar ingresos, egresos y balance.

alter table app.files drop constraint files_kind_check;
alter table app.files add constraint files_kind_check check (kind in ('PROOF', 'CARD_IMAGE', 'AVATAR', 'RECEIPT'));

-- Quién adjuntó el comprobante cuando no lo subió el comprador (null = lo subió el comprador).
alter table app.reservations add column proof_attached_by uuid references app.users (id) on delete set null;

create table app.expenses (
  id              uuid primary key default gen_random_uuid(),
  event_id        text not null references app.events (id) on delete cascade,
  concept         text not null check (length(concept) between 3 and 120),
  category        text not null check (category in ('PREMIOS', 'LOCAL', 'PUBLICIDAD', 'LOGISTICA', 'IMPRESION', 'OTROS')),
  amount          integer not null check (amount > 0 and amount <= 100000000),
  spent_on        date not null,
  method          text not null check (method in ('CASH', 'SINPE', 'TRANSFER')),
  reference       text check (reference is null or length(reference) <= 40),
  receipt_file_id uuid references app.files (id) on delete set null,
  created_by      uuid references app.users (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index expenses_event_idx on app.expenses (event_id, spent_on desc);
create index expenses_receipt_idx on app.expenses (receipt_file_id);
alter table app.expenses enable row level security;
