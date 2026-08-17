BEGIN;

-- 099 · Singularity Fase 1 — branding & auth-policy per-tenant (white-label).
-- Dipakai halaman login untuk warna aksen, tagline, dan kebijakan autentikasi
-- (MFA/SSO/passkey) yang spesifik per tenant. jsonb kosong = pakai default
-- Singularity di sisi klien.

ALTER TABLE tenants ADD COLUMN branding    jsonb NOT NULL DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN auth_policy jsonb NOT NULL DEFAULT '{}';

UPDATE tenants SET
  branding = '{"accentColor":"#c8a24d","tagline":"Presisi manufaktur, terkelola.","displayName":"Mandiri Abadi Teknik"}',
  auth_policy = '{"mfaRequired":true,"passkeyEnabled":true,"ssoEnabled":false,"mfaMethods":["authenticator","recovery"],"deviceTrustDays":30,"sessionIdleSeconds":900}'
WHERE code = 'mat';

COMMIT;
