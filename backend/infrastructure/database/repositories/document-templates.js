'use strict';
// Registry template dokumen resmi (R022 lanjutan) — judul, syarat &
// ketentuan, blok tanda tangan, QR, dan warna aksen berasal dari konfigurasi
// (§35), effective-dated & ber-versi. Dokumen menyimpan SNAPSHOT template
// saat dicetak pertama kali sehingga cetak ulang selalu identik.
const businessDate = require('../../../core/business-date');
const { randomUUID } = require('node:crypto');
const { AppError } = require('../../../core/errors');

// Nilai dasar bila tipe dokumen belum punya template terkonfigurasi.
const FALLBACK = {
  accentColor: '#16243c', showQr: true, showSignature: true, showTerbilang: true,
  signatureLabel: 'Hormat kami', partyLabel: 'Kepada Yth.', termsTitle: '', terms: [], footerNote: ''
};

async function resolveTemplate(client, documentType, onDate) {
  const date = onDate || businessDate.today();
  const row = (await client.query(`SELECT id,document_type,name,version,config FROM document_templates
    WHERE active AND document_type=$1 AND effective_from<=$2 AND (effective_until IS NULL OR effective_until>=$2)
    ORDER BY effective_from DESC, version DESC LIMIT 1`, [documentType, date])).rows[0];
  if (!row) return { ...FALLBACK, templateId: null, templateVersion: 0, name: null, documentType };
  return { ...FALLBACK, ...row.config, templateId: row.id, templateVersion: row.version, name: row.name, documentType };
}

async function listTemplates(client) {
  const runtime = require('./runtime');
  const rows = (await client.query(`SELECT t.*,u.display_name created_by_name FROM document_templates t
    LEFT JOIN app_users u ON u.id=t.created_by WHERE t.active ORDER BY t.document_type, t.version DESC`)).rows;
  return { items: rows.map(runtime.camel) };
}

// Simpan revisi template: versi baru dibuat, versi lama dinonaktifkan —
// histori desain tidak hilang dan dokumen lama tetap memakai snapshot-nya.
async function saveTemplate(client, { documentType, name, config, user, requestId }) {
  if (!documentType) throw new AppError('VALIDATION_ERROR', 'documentType wajib diisi.');
  if (config && typeof config !== 'object') throw new AppError('VALIDATION_ERROR', 'config harus objek.');
  const current = (await client.query(`SELECT id,version,config,name FROM document_templates
    WHERE document_type=$1 AND active ORDER BY version DESC LIMIT 1`, [documentType])).rows[0];
  const merged = { ...FALLBACK, ...(current?.config || {}), ...(config || {}) };
  if (Array.isArray(merged.terms)) merged.terms = merged.terms.map((t) => String(t).slice(0, 300)).slice(0, 12);
  const nextVersion = (current?.version || 0) + 1;
  if (current) await client.query('UPDATE document_templates SET active=false,updated_at=now() WHERE id=$1', [current.id]);
  const row = (await client.query(`INSERT INTO document_templates(id,document_type,name,version,config,created_by)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [randomUUID(), documentType, String(name || current?.name || documentType).slice(0, 160), nextVersion, merged, user.id])).rows[0];
  const runtime = require('./runtime');
  await runtime.audit(client, { userId: user.id, action: 'UPDATE', module: 'settings', entityType: 'DOCUMENT_TEMPLATE', entityId: row.id, documentNumber: `${documentType} v${nextVersion}`, oldValue: current?.config || null, newValue: merged, requestId });
  return runtime.camel(row);
}

module.exports = { resolveTemplate, listTemplates, saveTemplate, FALLBACK };
