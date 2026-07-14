BEGIN;
CREATE TABLE document_postings (
  document_id uuid NOT NULL REFERENCES business_documents(id) ON DELETE RESTRICT,
  posting_kind varchar(30) NOT NULL CHECK(posting_kind IN('INVENTORY','ACCOUNTING')),
  posted_at timestamptz NOT NULL DEFAULT now(),
  posted_by uuid NOT NULL REFERENCES app_users(id),
  result jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY(document_id,posting_kind)
);
CREATE INDEX ix_document_postings_at ON document_postings(posted_at DESC);

CREATE TABLE inventory_movements_default PARTITION OF inventory_movements DEFAULT;
CREATE INDEX ix_inventory_movements_default_product ON inventory_movements_default(product_id,occurred_at DESC);

ALTER TABLE inventory_balances
  ADD CONSTRAINT ck_inventory_reserved_nonnegative CHECK(qty_reserved>=0),
  ADD CONSTRAINT ck_inventory_version_positive CHECK(version>0);

ALTER TABLE journal_lines
  ADD CONSTRAINT ck_journal_line_one_side CHECK((debit>0 AND credit=0) OR (credit>0 AND debit=0));

INSERT INTO chart_of_accounts(code,name,normal_side,category) VALUES
('1100','Kas & Bank','D','ASSET'),('1200','Piutang Usaha','D','ASSET'),
('1300','Persediaan','D','ASSET'),('2100','Utang Usaha','C','LIABILITY'),
('2300','Utang Pajak','C','LIABILITY'),('4100','Pendapatan','C','REVENUE'),
('5100','Beban Pokok Penjualan','D','COGS'),('6100','Beban Operasional','D','EXPENSE')
ON CONFLICT(code) DO NOTHING;
COMMIT;
