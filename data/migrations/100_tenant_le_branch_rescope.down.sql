BEGIN;
-- Kembali ke unique global. Catatan: bila sudah ada >1 tenant memakai code LE
-- atau branch yang sama, rollback ini akan gagal (duplikat) — konsekuensi wajar
-- setelah data multi-tenant terbentuk.
ALTER TABLE legal_entities DROP CONSTRAINT legal_entities_tenant_code_key,
  ADD CONSTRAINT legal_entities_code_key UNIQUE (code);
ALTER TABLE branches DROP CONSTRAINT branches_tenant_code_key,
  ADD CONSTRAINT branches_code_key UNIQUE (code);
COMMIT;
