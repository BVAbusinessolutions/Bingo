-- Lugar del evento editable desde el panel y ganadores del salón (cartones vendidos en persona, sin cuenta web).

-- ---------------------------------------------------------------- lugar del evento
alter table app.events add column venue text not null default '' check (char_length(venue) <= 120);
alter table app.events add column venue_area text not null default '' check (char_length(venue_area) <= 120);

-- ---------------------------------------------------------------- ganadores del salón
-- WEB: lo reclama el jugador con el botón ¡Bingo!. SALON: lo registra el admin tras verificar el cartón físico.
alter table app.claims add column channel text not null default 'WEB' check (channel in ('WEB', 'SALON'));
alter table app.claims alter column user_id drop not null;
alter table app.claims add constraint claims_channel_user_check check (channel = 'SALON' or user_id is not null);
