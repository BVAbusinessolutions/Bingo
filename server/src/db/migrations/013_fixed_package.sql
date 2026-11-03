-- Ya no se venden cartones sueltos: todo evento abierto pasa a "2 cartones por ₡3 000".
-- Las compras ya hechas guardan su propio total, así que no cambian; los eventos cerrados quedan como se jugaron.
update app.events set bundle_size = 2, price = 3000 where status in ('SCHEDULED', 'LIVE');
alter table app.events alter column bundle_size set default 2;
alter table app.events alter column price set default 3000;
