-- Foto de perfil: imagen cuadrada (la recorta y comprime el navegador) guardada en app.files.

alter table app.files drop constraint files_kind_check;
alter table app.files add constraint files_kind_check check (kind in ('PROOF', 'CARD_IMAGE', 'AVATAR'));

alter table app.users add column avatar_file_id uuid references app.files (id) on delete set null;
