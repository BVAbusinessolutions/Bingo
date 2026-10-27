-- Detección de comprobantes repetidos: el mismo n.º de comprobante o la misma foto en otra compra.

-- Huella SHA-256 de cada archivo: dos fotos idénticas (byte a byte) tienen la misma huella.
alter table app.files add column sha256 text;
update app.files set sha256 = encode(sha256(data), 'hex');
create index files_proof_sha256_idx on app.files (sha256) where kind = 'PROOF';

-- N.º de comprobante normalizado (sin espacios ni guiones, en mayúsculas): "snp-123 45" = "SNP12345".
create index reservations_reference_norm_idx
  on app.reservations ((upper(regexp_replace(payment_reference, '[^0-9A-Za-z]', '', 'g'))))
  where payment_reference is not null;
