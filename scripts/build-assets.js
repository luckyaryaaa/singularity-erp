'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.svg', '.json']);

function digest(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function safeAssetName(relative, hash) {
  const parsed = path.posix.parse(relative.replace(/\\/g, '/'));
  const stem = path.posix.join(parsed.dir, parsed.name).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `${stem}.${hash}${parsed.ext.toLowerCase()}`;
}

function writeCompressed(file) {
  const ext = path.extname(file).toLowerCase();
  if (!COMPRESSIBLE.has(ext)) return [];
  const content = fs.readFileSync(file);
  if (content.length < 512) return [];
  const gzipFile = `${file}.gz`;
  const brotliFile = `${file}.br`;
  fs.writeFileSync(gzipFile, zlib.gzipSync(content, { level: 9 }));
  fs.writeFileSync(brotliFile, zlib.brotliCompressSync(content, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 }
  }));
  return [gzipFile, brotliFile];
}

function fingerprintRelease(target) {
  const root = path.resolve(target);
  const indexFile = path.join(root, 'index.html');
  if (!fs.existsSync(indexFile)) throw new Error(`index.html tidak ditemukan di ${root}`);
  let html = fs.readFileSync(indexFile, 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)]
    .map((match) => match[1])
    .filter((ref) => !/^(?:https?:|data:|#|\/)/i.test(ref) && COMPRESSIBLE.has(path.extname(ref).toLowerCase()));
  const uniqueRefs = [...new Set(refs)];
  const outDir = path.join(root, 'assets', 'build');
  fs.mkdirSync(outDir, { recursive: true });
  const assets = {};

  for (const ref of uniqueRefs) {
    const source = path.resolve(root, ref);
    const relative = path.relative(root, source);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.existsSync(source)) {
      throw new Error(`Asset lokal tidak aman atau tidak ditemukan: ${ref}`);
    }
    const content = fs.readFileSync(source);
    const hash = digest(content);
    const builtRelative = `assets/build/${safeAssetName(ref, hash)}`;
    const builtFile = path.join(root, ...builtRelative.split('/'));
    fs.copyFileSync(source, builtFile);
    const compressed = writeCompressed(builtFile).map((file) => path.relative(root, file).replace(/\\/g, '/'));
    assets[ref] = { file: builtRelative, sha256: crypto.createHash('sha256').update(content).digest('hex'), bytes: content.length, compressed };
    html = html.split(`"${ref}"`).join(`"${builtRelative}"`);
  }

  fs.writeFileSync(indexFile, html);
  const indexCompressed = writeCompressed(indexFile).map((file) => path.relative(root, file).replace(/\\/g, '/'));
  const manifest = { version: 1, generatedAt: new Date().toISOString(), entrypoint: 'index.html', indexCompressed, assets };
  fs.writeFileSync(path.join(outDir, 'asset-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeCompressed(path.join(outDir, 'asset-manifest.json'));
  return manifest;
}

if (require.main === module) {
  const target = path.resolve(process.argv[2] || path.join(__dirname, '..', 'release', 'MAT-ERP-V2-RELEASE'));
  const manifest = fingerprintRelease(target);
  console.log(JSON.stringify({ ok: true, target, assets: Object.keys(manifest.assets).length }, null, 2));
}

module.exports = { fingerprintRelease, digest, safeAssetName };
