'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const css = read('src/styles.css');
const core = read('src/core.js');
const components = read('src/components.js');
const table = read('src/components/enterprise-table.js');

const checks = [
  ['Bahasa dokumen', /<html lang="id">/.test(html)],
  ['Skip link ke konten utama', /class="skip-link" href="#main"/.test(html)],
  ['Landmark main dapat difokuskan', /<main id="main" tabindex="-1"/.test(html)],
  ['Navigasi utama berlabel', /aria-label="Navigasi utama"/.test(html)],
  ['Drawer modal berlabel', /role="dialog" aria-modal="true"[^>]+aria-labelledby="drawerTitle"/.test(html)],
  ['Command dialog berlabel', /id="commandDialog" aria-labelledby="commandTitle"/.test(html)],
  ['Menu mengumumkan expanded state', /id="menuBtn"[^>]+aria-expanded="false"/.test(html)],
  ['Form login memakai autocomplete', /autocomplete="username"/.test(html) && /autocomplete="current-password"/.test(html)],
  ['Status async memakai live region', /role="status" aria-live="polite"/.test(html)],
  ['Focus-visible global tersedia', /:focus-visible/.test(css)],
  ['Reduced motion dihormati', /prefers-reduced-motion:reduce/.test(css)],
  ['Tidak memakai transition all', !/transition\s*:\s*all\b/i.test(css)],
  ['Router memindahkan fokus ke main', /main\.focus\(\{\s*preventScroll:\s*true\s*\}\)/.test(core)],
  ['Drawer mengunci background dengan inert', /getElementById\('app'\)\.inert\s*=\s*true/.test(components)],
  ['Fokus kembali setelah drawer ditutup', /layerReturnFocus\.focus/.test(components)],
  ['Baris tabel memiliki tombol semantik', /class="table-row-action"/.test(table)],
  ['Header urut mengumumkan aria-sort', /aria-sort/.test(table)],
  ['Informasi tabel diumumkan', /aria-live="polite"/.test(table)]
];
const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}`);
console.log(`\nAccessibility audit: ${checks.length - failed.length}/${checks.length} lulus.`);
if (failed.length) process.exitCode = 1;

module.exports = { checks };
