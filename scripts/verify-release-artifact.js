'use strict';
// P0 — Final Artifact / DLP Scan.
// Berbeda dari secret-scan.js (yang memindai SOURCE dengan pengecualian
// kategori), skrip ini memindai ARTEFAK RELEASE JADI tanpa pengecualian
// apa pun: setiap byte setiap file diuji terhadap pola secret, nama file
// terlarang ditolak keras, dan seluruh hash manifest diverifikasi ulang.
// "0 findings" dari secret-scan TIDAK membuktikan paket aman — skrip ini yang
// menjadi bukti akhir sebelum distribusi.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { patterns } = require('./secret-scan');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.resolve(process.argv[2] || path.join(ROOT, 'release', 'MAT-ERP-V2-RELEASE'));

// Nama/direktori yang tidak boleh ada di artefak dalam bentuk apa pun.
const FORBIDDEN_DIRS = new Set(['.git', 'node_modules', 'storage', 'backups', '.agents', '.claude', '.vscode', 'coverage']);
const FORBIDDEN_EXT = /\.(?:dump|enc|log|err|tmp|bak|zip|7z|rar|pem|key|p12|pfx)$/i;
const isForbiddenEnv = (base) => base === '.env' || (base.startsWith('.env.') && base !== '.env.example');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (FORBIDDEN_DIRS.has(entry.name)) out.push({ full, kind: 'forbidden-directory' });
      else walk(full, out);
    } else out.push({ full });
  }
  return out;
}

function verify() {
  if (!fs.existsSync(TARGET)) throw new Error(`Artefak release tidak ditemukan: ${TARGET}. Jalankan release:build dahulu.`);
  const findings = [];
  const entries = walk(TARGET);
  const files = [];
  for (const entry of entries) {
    const rel = path.relative(TARGET, entry.full).replace(/\\/g, '/');
    if (entry.kind) { findings.push({ file: rel, kind: entry.kind }); continue; }
    const base = path.basename(entry.full);
    if (isForbiddenEnv(base)) findings.push({ file: rel, kind: 'env-file' });
    if (FORBIDDEN_EXT.test(base)) findings.push({ file: rel, kind: 'forbidden-extension' });
    files.push({ full: entry.full, rel });
  }
  // Pemindaian isi TANPA pengecualian tipe file (binari ikut diuji sebagai teks).
  for (const file of files) {
    const text = fs.readFileSync(file.full).toString('utf8');
    for (const [kind, pattern] of patterns) {
      if (pattern.test(text)) findings.push({ file: file.rel, kind: `secret:${kind}` });
    }
  }
  // Verifikasi manifest: setiap file sesuai hash, tidak ada file di luar manifest.
  const manifestPath = path.join(TARGET, 'release-manifest.json');
  if (!fs.existsSync(manifestPath)) findings.push({ file: 'release-manifest.json', kind: 'manifest-missing' });
  else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const sourcePackage = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const sourceLatestMigration = fs.readdirSync(path.join(ROOT, 'data', 'migrations'))
      .filter((name) => /^\d+_.+\.sql$/.test(name) && !name.endsWith('.down.sql')).sort().at(-1);
    if (manifest.version !== sourcePackage.version) findings.push({ file: 'release-manifest.json', kind: `stale-version:${manifest.version}->${sourcePackage.version}` });
    if (manifest.migrationLatest !== sourceLatestMigration) findings.push({ file: 'release-manifest.json', kind: `stale-migration:${manifest.migrationLatest}->${sourceLatestMigration}` });
    const listed = new Map(manifest.files.map((f) => [f.path, f.sha256]));
    for (const file of files) {
      if (file.rel === 'release-manifest.json') continue;
      const expected = listed.get(file.rel);
      if (!expected) { findings.push({ file: file.rel, kind: 'not-in-manifest' }); continue; }
      const actual = crypto.createHash('sha256').update(fs.readFileSync(file.full)).digest('hex');
      if (actual !== expected) findings.push({ file: file.rel, kind: 'hash-mismatch' });
      listed.delete(file.rel);
    }
    listed.delete('release-manifest.json');
    for (const missing of listed.keys()) findings.push({ file: missing, kind: 'listed-but-missing' });
    // SBOM wajib hadir di artefak.
    if (!manifest.files.some((f) => f.path === 'sbom.cdx.json')) findings.push({ file: 'sbom.cdx.json', kind: 'sbom-missing' });
  }
  return { target: TARGET, filesScanned: files.length, findings };
}

if (require.main === module) {
  try {
    const result = verify();
    if (result.findings.length) { console.error(JSON.stringify({ ok: false, ...result }, null, 2)); process.exit(1); }
    console.log(JSON.stringify({ ok: true, target: result.target, filesScanned: result.filesScanned, findings: 0 }, null, 2));
  } catch (error) { console.error(error.message); process.exit(1); }
}
module.exports = { verify, TARGET };
