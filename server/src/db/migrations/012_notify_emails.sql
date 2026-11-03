-- Correos que reciben los avisos de compras y de ¡Bingo! (se editan en el panel).
alter table app.settings drop constraint settings_key_check;
alter table app.settings add constraint settings_key_check check (key in ('payment', 'notify_emails'));
