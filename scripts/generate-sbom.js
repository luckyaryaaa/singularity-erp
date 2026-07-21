'use strict';
// P0 — SBOM (Software Bill of Materials) format CycloneDX 1.5 minimal,
// dihasilkan dari package-lock.json (sumber kebenaran dependensi terkunci).
// Dependensi runtime aplikasi ini sengaja kecil (pg, qrcode, fflate) sehingga
// SBOM juga menjadi tripwire: komponen tak dikenal = indikasi supply-chain.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');

function generate(targetDir) {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
  const components = [];
  for (const [key, meta] of Object.entries(lock.packages || {})) {
    if (!key) continue;                                      // root
    const name = key.replace(/^node_modules\//, '');
    components.push({
      type: 'library',
      name,
      version: meta.version,
      purl: `pkg:npm/${name}@${meta.version}`,
      ...(meta.integrity ? { hashes: [{ alg: 'SHA-512', content: meta.integrity.replace(/^sha512-/, '') }] } : {}),
      ...(meta.dev ? { scope: 'excluded' } : { scope: 'required' })
    });
  }
  const bom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      component: { type: 'application', name: pkg.name, version: pkg.version }
    },
    components
  };
  const out = path.join(targetDir || ROOT, 'sbom.cdx.json');
  fs.writeFileSync(out, JSON.stringify(bom, null, 2) + '\n');
  return { out, components: components.length };
}

if (require.main === module) {
  const result = generate(process.argv[2]);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}
module.exports = { generate };
