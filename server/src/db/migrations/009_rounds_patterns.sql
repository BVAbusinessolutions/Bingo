-- Rondas: un mismo evento se juega en varias rondas y la administración elige la modalidad de cada una
-- en Bingo Master. Las bolas y los reclamos pertenecen a una ronda; al empezar otra, el tablero se vacía
-- y cada cartón puede volver a ganar (con la modalidad nueva).

-- Modalidades nuevas (ver server/src/domain/bingo.js).
alter table app.events drop constraint events_pattern_check;
alter table app.events add constraint events_pattern_check check (
  pattern in ('LINE', 'TWO_LINES', 'FOUR_CORNERS', 'X', 'PLUS', 'T', 'L', 'FRAME', 'INNER_SQUARE', 'FULL')
);
alter table app.events add column round smallint not null default 1 check (round between 1 and 99);

-- Bolas por ronda: la misma bola puede volver a salir en otra ronda.
alter table app.draws add column round smallint not null default 1;
alter table app.draws drop constraint draws_pkey;
alter table app.draws add primary key (event_id, round, number);

-- Reclamos por ronda, con la modalidad con la que se validaron (el evento puede cambiarla después).
alter table app.claims add column round smallint not null default 1;
alter table app.claims add column pattern text;
update app.claims cl set pattern = e.pattern from app.events e where e.id = cl.event_id;
alter table app.claims alter column pattern set not null;
drop index app.claims_one_active_per_card;
create unique index claims_one_active_per_card_round on app.claims (card_id, round) where status <> 'REJECTED';

-- Historial: qué modalidad se jugó en cada ronda y cuándo empezó.
create table app.event_rounds (
  event_id   text not null references app.events (id) on delete cascade,
  round      smallint not null check (round between 1 and 99),
  pattern    text not null,
  started_at timestamptz not null default now(),
  primary key (event_id, round)
);
alter table app.event_rounds enable row level security;
insert into app.event_rounds (event_id, round, pattern) select id, 1, pattern from app.events;
