-- 016_enterprise_iam_sod_approval.sql — Sprint 6 enterprise IAM, SoD,
-- access review, emergency access, dan approval policy versioning.
BEGIN;

ALTER TABLE app_users DROP CONSTRAINT ck_app_users_role;
UPDATE app_users SET role='system_admin' WHERE role='admin';
UPDATE app_users SET role='finance_manager' WHERE role='finance';
ALTER TABLE app_users ADD CONSTRAINT ck_app_users_role CHECK(role IN
  ('owner','system_admin','security_admin','finance_manager','accounting','tax','hrd','sales',
   'procurement','warehouse','production','auditor','employee'));

CREATE TABLE enterprise_roles (
  code varchar(40) PRIMARY KEY,
  name varchar(100) NOT NULL,
  category varchar(20) NOT NULL CHECK(category IN('EXECUTIVE','PLATFORM','CONTROL','BUSINESS','SELF_SERVICE')),
  approval_level varchar(30),
  privileged boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO enterprise_roles(code,name,category,approval_level,privileged,description) VALUES
('owner','Owner / Direktur Utama','EXECUTIVE','owner',true,'Otoritas bisnis tertinggi dan emergency approval.'),
('system_admin','System Administrator','PLATFORM',NULL,true,'Operasi platform tanpa kewenangan transaksi finansial.'),
('security_admin','Security Administrator','CONTROL',NULL,true,'IAM, access review, sesi, dan monitoring keamanan.'),
('finance_manager','Finance Manager','BUSINESS','finance',false,'Treasury, AR/AP, dan approval finansial.'),
('accounting','Accounting','BUSINESS','finance',false,'Jurnal, ledger, closing, dan pelaporan akuntansi.'),
('tax','Tax','BUSINESS',NULL,false,'Perpajakan dan pelaporan fiskal.'),
('hrd','Human Resources','BUSINESS','supervisor',false,'Employee, attendance, leave, dan payroll preparation.'),
('sales','Sales','BUSINESS','supervisor',false,'Order-to-cash dan master customer.'),
('procurement','Procurement','BUSINESS','supervisor',false,'Source-to-pay dan master supplier.'),
('warehouse','Warehouse','BUSINESS','supervisor',false,'Inventory, receiving, issue, transfer, dan delivery.'),
('production','Production','BUSINESS','supervisor',false,'Work order, production, dan quality.'),
('auditor','Internal Auditor','CONTROL',NULL,false,'Akses read-only lintas organisasi untuk assurance.'),
('employee','Employee Self Service','SELF_SERVICE',NULL,false,'Akses data pribadi, attendance, dan leave sendiri.');

CREATE TABLE permission_catalog (
  code varchar(80) PRIMARY KEY,
  module varchar(50) NOT NULL,
  action varchar(30) NOT NULL,
  sensitive boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  active boolean NOT NULL DEFAULT true
);
INSERT INTO permission_catalog(code,module,action,sensitive,description)
SELECT m||'.'||a,m,a,a IN('approve','post','void','edit'),initcap(m)||' — '||a
FROM unnest(ARRAY['dashboard','approval','notification','customer','supplier','product','inquiry','quotation','customer_po','sales_order','project','work_order','production','quality','purchase_request','purchase_order','goods_receipt','inventory','material_issue','stock_transfer','stock_adjustment','delivery','invoice','payment','supplier_invoice','supplier_payment','expense','asset','journal','ledger','closing','payroll','employee','attendance','leave','tax','report','audit','user','iam','sod','access_review','approval_policy','settings','monitoring','job','selftest','backup']) m
CROSS JOIN unnest(ARRAY['view','create','edit','submit','approve','reject','post','void','cancel','export','import']) a;
INSERT INTO permission_catalog(code,module,action,sensitive,description) VALUES
('payroll.view_self','payroll','view_self',true,'Melihat slip payroll sendiri'),
('employee.view_self','employee','view_self',true,'Melihat profil employee sendiri')
ON CONFLICT DO NOTHING;

CREATE TABLE user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id),
  role_code varchar(40) NOT NULL REFERENCES enterprise_roles(code),
  scope_type varchar(30) NOT NULL DEFAULT 'BRANCH' CHECK(scope_type IN
    ('GLOBAL','LEGAL_ENTITY','BUSINESS_UNIT','BRANCH','PLANT','WAREHOUSE','DEPARTMENT','PROJECT','OWN_RECORD')),
  scope_id uuid,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN('PENDING','ACTIVE','REVOKED','EXPIRED','REJECTED')),
  is_primary boolean NOT NULL DEFAULT true,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  reason text NOT NULL,
  requested_by uuid REFERENCES app_users(id), approved_by uuid REFERENCES app_users(id),
  approved_at timestamptz, revoked_by uuid REFERENCES app_users(id), revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(effective_until IS NULL OR effective_until>effective_from)
);
CREATE UNIQUE INDEX ux_user_primary_role_active ON user_role_assignments(user_id)
  WHERE is_primary AND status='ACTIVE';
CREATE INDEX ix_role_assignments_review ON user_role_assignments(status,effective_until,user_id);
INSERT INTO user_role_assignments(user_id,role_code,scope_type,scope_id,status,is_primary,reason,approved_by,approved_at)
SELECT id,role,CASE WHEN branch_scope='*' THEN 'GLOBAL' WHEN role='employee' THEN 'OWN_RECORD' ELSE 'BRANCH' END,
  CASE WHEN branch_scope='*' OR role='employee' THEN NULL ELSE branch_id END,'ACTIVE',true,
  'Backfill migration 016',id,now() FROM app_users;

CREATE TABLE sod_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(80) UNIQUE NOT NULL,
  name varchar(160) NOT NULL, rule_type varchar(30) NOT NULL CHECK(rule_type IN('ROLE_CONFLICT','TRANSACTION_DUTY')),
  left_role varchar(40), right_role varchar(40), maker_action varchar(80), checker_action varchar(80),
  severity varchar(10) NOT NULL CHECK(severity IN('LOW','MEDIUM','HIGH','CRITICAL')),
  override_allowed boolean NOT NULL DEFAULT false, description text NOT NULL,
  active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO sod_rules(code,name,rule_type,left_role,right_role,maker_action,checker_action,severity,override_allowed,description) VALUES
('ROLE-SYS-SEC','System Admin ≠ Security Admin','ROLE_CONFLICT','system_admin','security_admin',NULL,NULL,'CRITICAL',false,'Administrasi platform harus terpisah dari administrasi keamanan.'),
('ROLE-SALES-AR','Sales ≠ Accounting','ROLE_CONFLICT','sales','accounting',NULL,NULL,'HIGH',false,'Pencipta penjualan tidak boleh menguasai pencatatan piutang.'),
('ROLE-PROC-AP','Procurement ≠ Finance Manager','ROLE_CONFLICT','procurement','finance_manager',NULL,NULL,'HIGH',false,'Pengadaan harus terpisah dari pelepasan pembayaran.'),
('DUTY-CREATE-APPROVE','Document Creator ≠ Approver','TRANSACTION_DUTY',NULL,NULL,'document.create','document.approve','CRITICAL',true,'Pembuat dokumen tidak boleh menyetujui dokumen yang sama.'),
('DUTY-VENDOR-BANK','Vendor Maker ≠ Bank Verifier','TRANSACTION_DUTY',NULL,NULL,'supplier.bank.create','supplier.bank.approve','CRITICAL',false,'Pengusul rekening supplier tidak boleh memverifikasi.'),
('DUTY-PAYMENT','Payment Creator ≠ Releaser','TRANSACTION_DUTY',NULL,NULL,'payment.create','payment.post','CRITICAL',true,'Pembuat pembayaran tidak boleh melepas pembayaran.'),
('DUTY-PAYROLL','Payroll Preparer ≠ Final Approver','TRANSACTION_DUTY',NULL,NULL,'payroll.create','payroll.approve','CRITICAL',true,'Penyusun payroll tidak boleh memberi final approval.'),
('DUTY-JOURNAL','Journal Creator ≠ Poster','TRANSACTION_DUTY',NULL,NULL,'journal.create','journal.post','CRITICAL',true,'Pembuat jurnal tidak boleh melakukan posting.');

CREATE TABLE sod_conflict_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rule_id uuid NOT NULL REFERENCES sod_rules(id),
  user_id uuid REFERENCES app_users(id), assignment_id uuid REFERENCES user_role_assignments(id),
  entity_type varchar(50), entity_id uuid, status varchar(20) NOT NULL DEFAULT 'BLOCKED'
    CHECK(status IN('BLOCKED','OVERRIDDEN','RESOLVED')),
  detail jsonb NOT NULL DEFAULT '{}', detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz, resolved_by uuid REFERENCES app_users(id), resolution_reason text
);
CREATE INDEX ix_sod_conflicts_open ON sod_conflict_events(status,detected_at DESC)
  WHERE status IN('BLOCKED','OVERRIDDEN');

CREATE TABLE emergency_access_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_users(id),
  permission_code varchar(80) NOT NULL REFERENCES permission_catalog(code),
  scope_type varchar(30) NOT NULL, scope_id uuid, reason text NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK(status IN('ACTIVE','EXPIRED','REVOKED')),
  effective_from timestamptz NOT NULL DEFAULT now(), effective_until timestamptz NOT NULL,
  granted_by uuid NOT NULL REFERENCES app_users(id), revoked_by uuid REFERENCES app_users(id),
  revoked_at timestamptz, revoke_reason text, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(effective_until>effective_from), CHECK(effective_until<=effective_from+interval '24 hours')
);

CREATE TABLE access_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar(160) NOT NULL,
  scope_type varchar(30) NOT NULL, scope_id uuid,
  status varchar(20) NOT NULL DEFAULT 'OPEN' CHECK(status IN('OPEN','COMPLETED','CANCELLED')),
  due_at timestamptz NOT NULL, created_by uuid NOT NULL REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(), completed_by uuid REFERENCES app_users(id), completed_at timestamptz
);
CREATE TABLE access_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), review_id uuid NOT NULL REFERENCES access_reviews(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES user_role_assignments(id),
  decision varchar(20) NOT NULL DEFAULT 'PENDING' CHECK(decision IN('PENDING','RETAIN','REVOKE')),
  reason text, decided_by uuid REFERENCES app_users(id), decided_at timestamptz,
  UNIQUE(review_id,assignment_id)
);

CREATE TABLE approval_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), policy_key varchar(80) NOT NULL,
  version integer NOT NULL CHECK(version>0), document_type varchar(50) NOT NULL DEFAULT '*',
  branch_id uuid REFERENCES branches(id), min_amount numeric(20,2) NOT NULL DEFAULT 0,
  max_amount numeric(20,2), steps jsonb NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'DRAFT' CHECK(status IN('DRAFT','ACTIVE','RETIRED')),
  effective_from timestamptz NOT NULL DEFAULT now(), effective_until timestamptz,
  change_reason text NOT NULL, created_by uuid REFERENCES app_users(id), created_at timestamptz NOT NULL DEFAULT now(),
  activated_by uuid REFERENCES app_users(id), activated_at timestamptz,
  UNIQUE(policy_key,version), CHECK(max_amount IS NULL OR max_amount>=min_amount),
  CHECK(jsonb_typeof(steps)='array')
);
CREATE INDEX ix_approval_policy_resolve ON approval_policy_versions(document_type,status,effective_from,branch_id);
INSERT INTO approval_policy_versions(policy_key,version,document_type,min_amount,max_amount,steps,status,change_reason,activated_at)
SELECT 'DEFAULT-'||row_number() OVER(ORDER BY min_amount),1,document_type,min_amount,max_amount,
  (SELECT jsonb_agg(jsonb_build_object('level',level,'sequence',ord,'allowOverride',level<>'owner') ORDER BY ord)
   FROM unnest(approval_levels) WITH ORDINALITY x(level,ord)),
  'ACTIVE','Migrasi dari approval_matrix',now()
FROM approval_matrix WHERE active;

ALTER TABLE business_documents
  ADD COLUMN approval_policy_version_id uuid REFERENCES approval_policy_versions(id),
  ADD COLUMN approval_policy_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMIT;
