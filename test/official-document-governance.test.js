'use strict';

require('../backend/core/env').loadEnv();
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const runtime = require('../backend/infrastructure/database/repositories/runtime');
const documentsRoute = require('../backend/routes/documents');
const docVerify = require('../backend/core/doc-verification');

const dbTest = process.env.DATABASE_URL ? test : test.skip;

dbTest('official document: DRAFT ditolak, issuance immutable, reprint COPY, signature tervalidasi', async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");
    const owner = runtime.camel((await client.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE role='owner' AND active LIMIT 1`)).rows[0]);
    const doc = await runtime.createDocument(client, { type: 'QUOTATION', title: 'Immutable official title', amount: 12345, payload: { lines: [{ description: 'Official line', qty: 1, unitPrice: 12345 }] }, user: owner, requestId: randomUUID() });
    const lines = (await client.query('SELECT line_no,description,qty,uom,unit_price,discount_pct,tax_pct,line_total FROM document_lines WHERE document_id=$1 ORDER BY line_no', [doc.id])).rows.map(runtime.camel);
    await assert.rejects(() => documentsRoute.issueOfficial(client, doc, lines, owner, randomUUID()), (error) => error.code === 'STATUS_INVALID');
    await client.query(`UPDATE business_documents SET status='APPROVED' WHERE id=$1`, [doc.id]);
    const approved = await runtime.getDocument(client, doc.id);
    const first = await documentsRoute.issueOfficial(client, approved, lines, owner, randomUUID());
    assert.equal(first.copy, false);
    assert.equal(first.document.title, 'Immutable official title');
    const stored = runtime.camel((await client.query('SELECT official_signature,official_key_id,official_template_version,official_payload FROM business_documents WHERE id=$1', [doc.id])).rows[0]);
    assert.ok(stored.officialSignature);
    assert.equal(docVerify.verifyPayload(stored.officialPayload, stored.officialSignature, process.env, stored.officialKeyId), true);
    await client.query(`UPDATE business_documents SET title='Mutable transactional title' WHERE id=$1`, [doc.id]);
    const current = await runtime.getDocument(client, doc.id);
    const reprint = await documentsRoute.issueOfficial(client, current, [], owner, randomUUID());
    assert.equal(reprint.copy, true);
    assert.equal(reprint.document.title, 'Immutable official title');
    assert.equal(reprint.document.officialSignature, stored.officialSignature);
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
});

dbTest('official document: VOID tidak dapat diterbitkan ulang sebagai dokumen resmi', async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN'); await client.query("SELECT set_config('app.is_system','on',true),set_config('app.is_platform','on',true),set_config('app.tenant_id','00000000-0000-0000-0000-000000000001',true)");
    const owner = runtime.camel((await client.query(`SELECT id,username,display_name "displayName",role,branch_id "branchId",branch_scope "branchScope" FROM app_users WHERE role='owner' AND active LIMIT 1`)).rows[0]);
    const doc = await runtime.createDocument(client, { type: 'INVOICE', title: 'Void official guard', amount: 1, user: owner, requestId: randomUUID() });
    await client.query(`UPDATE business_documents SET status='VOID' WHERE id=$1`, [doc.id]);
    const current = await runtime.getDocument(client, doc.id);
    await assert.rejects(() => documentsRoute.issueOfficial(client, current, [], owner, randomUUID()), (error) => error.code === 'STATUS_INVALID');
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    await client.end();
  }
});
