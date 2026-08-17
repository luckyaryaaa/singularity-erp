BEGIN;
-- Balikan 094: lepas policy tenant, DISABLE RLS (diaktifkan di sini), FK, index, kolom.
DO $$
DECLARE
  t text;
  targets text[] := ARRAY[
    'account_dimension_policy','asset_categories','asset_depreciation_entries','bank_transactions','bom_headers','bom_lines','branches','business_partner_contacts','business_partner_identifiers','business_partner_merge_lineage','business_partner_roles','business_partner_sites','business_partner_survivorship_rules','business_units','chart_of_accounts','cost_centers','credit_overrides','customer_addresses','customer_contacts','customer_link_drafts','customer_product_prices','customers','departments','document_lines','document_postings','document_relations','document_sequences','document_templates','dunning_notices','dunning_policies','exchange_rate_proposals','exchange_rates','file_metadata','fiscal_calendars','fixed_assets','generated_artifacts','hr_calendar_config','import_batches','journal_lines','leave_policies','ledgers','legal_entities','master_data_quality_issues','match_tolerance_config','mrp_suggestions','notification_deliveries','notification_receipts','numbering_configurations','org_warehouses','organization_assets','organization_signatories','payment_allocations','payment_proposal_lines','payroll_rule_versions','plants','po_change_orders','posting_profile_legs','posting_profiles','pricing_conditions','procurement_budgets','product_cost_revisions','product_files','product_uom_conversions','product_variants','products','profit_centers','project_wbs','quotation_revisions','reconciliation_runs','report_saved_filters','report_schedules','rfq_quote_lines','rfq_quotes','stock_lot_movements','stock_opname_lines','storage_locations','supplier_addresses','supplier_bank_accounts','supplier_contacts','supplier_documents','supplier_evaluations','supplier_materials','supplier_price_history','supplier_score_policies','suppliers','system_settings','tax_invoices','tax_number_ranges','tax_rates','tax_transaction_codes','three_way_matches','transaction_dimension_policies','warehouse_bins','withholding_certificates','work_calendar','work_centers','work_locations','work_shifts'
  ];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_rows ON %I', t);
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, t || '_tenant_fk');
    EXECUTE format('DROP INDEX IF EXISTS %I', t || '_tenant_idx');
    EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS tenant_id', t);
  END LOOP;
END $$;
COMMIT;
