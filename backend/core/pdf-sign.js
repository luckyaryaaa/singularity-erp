'use strict';
// Tanda tangan digital dokumen PDF (PAdES/CMS detached, RSA-SHA256).
// Menghasilkan struktur PKCS#7 SignedData yang dipahami Adobe Reader sehingga
// dokumen resmi menjadi TAMPER-EVIDENT pada level PDF — melengkapi kode
// verifikasi HMAC + QR yang sudah ada.
//
// Sertifikat & kunci bersifat KONFIGURASI (§35): MAT_DOC_SIGN_CERT/KEY berisi
// PEM. Bila belum dikonfigurasi, dokumen tetap terbit tanpa tanda tangan
// digital (tidak menggagalkan pencetakan) — statusnya dilaporkan apa adanya.
// Untuk keabsahan hukum di Indonesia, sertifikat wajib berasal dari PSrE
// terdaftar (mis. Privy, VIDA, Peruri, Digisign); sertifikat self-signed hanya
// untuk pengujian dan akan tampil "validity unknown" di Adobe.
const { createSign, createHash, X509Certificate } = require('node:crypto');

// ── DER primitif ────────────────────────────────────────────────────────────
function derLen(n) {
  if (n < 128) return Buffer.from([n]);
  const bytes = []; let x = n;
  while (x > 0) { bytes.unshift(x & 255); x >>= 8; }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}
const tlv = (tag, content) => Buffer.concat([Buffer.from([tag]), derLen(content.length), content]);
const seq = (...items) => tlv(0x30, Buffer.concat(items));
// DER mewajibkan elemen SET OF terurut menurut enkodingnya (X.690 11.6);
// verifier seperti OpenSSL mengurutkan ulang saat memeriksa tanda tangan.
const setOf = (...items) => tlv(0x31, Buffer.concat([...items].sort(Buffer.compare)));
const octet = (buf) => tlv(0x04, buf);
const ctx = (n, content) => tlv(0xa0 | n, content);          // [n] constructed
const NULL_DER = Buffer.from([0x05, 0x00]);

function oid(dotted) {
  const parts = dotted.split('.').map(Number);
  const body = [40 * parts[0] + parts[1]];
  for (const part of parts.slice(2)) {
    const chunk = []; let v = part;
    do { chunk.unshift(v & 0x7f); v >>>= 7; } while (v > 0);
    for (let i = 0; i < chunk.length - 1; i++) chunk[i] |= 0x80;
    body.push(...chunk);
  }
  return tlv(0x06, Buffer.from(body));
}
const algId = (dotted, withNull = true) => seq(oid(dotted), ...(withNull ? [NULL_DER] : []));

// ── DER navigasi minimal (untuk membaca issuer & serial dari sertifikat) ────
function readTlv(buf, offset) {
  const tag = buf[offset];
  let i = offset + 1, length = buf[i++];
  if (length & 0x80) { const count = length & 0x7f; length = 0; for (let k = 0; k < count; k++) length = (length << 8) | buf[i++]; }
  return { tag, start: offset, headerEnd: i, length, end: i + length };
}
function children(buf, node) {
  const out = []; let i = node.headerEnd;
  while (i < node.end) { const child = readTlv(buf, i); out.push(child); i = child.end; }
  return out;
}
// Certificate ::= SEQ { tbsCertificate SEQ { [0] version?, serial INT, sigAlg, issuer Name, ... } }
function issuerAndSerial(certDer) {
  const cert = readTlv(certDer, 0);
  const tbs = children(certDer, cert)[0];
  const fields = children(certDer, tbs);
  let idx = 0;
  if (fields[0].tag === 0xa0) idx = 1;                        // versi eksplisit opsional
  const serial = certDer.subarray(fields[idx].start, fields[idx].end);
  const issuer = certDer.subarray(fields[idx + 2].start, fields[idx + 2].end);
  return { serial, issuer };
}

// ── CMS SignedData (detached) ───────────────────────────────────────────────
const OID_SIGNED_DATA = '1.2.840.113549.1.7.2', OID_DATA = '1.2.840.113549.1.7.1';
const OID_SHA256 = '2.16.840.1.101.3.4.2.1', OID_RSA = '1.2.840.113549.1.1.1';
const OID_CONTENT_TYPE = '1.2.840.113549.1.9.3', OID_MESSAGE_DIGEST = '1.2.840.113549.1.9.4', OID_SIGNING_TIME = '1.2.840.113549.1.9.5';

function utcTime(date) {
  const p = (n) => String(n).padStart(2, '0');
  const s = `${p(date.getUTCFullYear() % 100)}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`;
  return tlv(0x17, Buffer.from(s, 'latin1'));
}

// digest = SHA-256 atas byte dokumen (di luar placeholder /Contents).
function buildCms(digest, { certPem, keyPem, signingTime = new Date() }) {
  const cert = new X509Certificate(certPem);
  const certDer = cert.raw;
  const { serial, issuer } = issuerAndSerial(certDer);

  // signedAttrs: contentType, signingTime, messageDigest (DER SET saat ditandatangani)
  const attrs = [
    seq(oid(OID_CONTENT_TYPE), setOf(oid(OID_DATA))),
    seq(oid(OID_SIGNING_TIME), setOf(utcTime(signingTime))),
    seq(oid(OID_MESSAGE_DIGEST), setOf(octet(digest)))
  ];
  // Urutan DER dipakai konsisten untuk yang ditandatangani maupun yang disematkan.
  const sortedAttrs = [...attrs].sort(Buffer.compare);
  const signedAttrsForSigning = tlv(0x31, Buffer.concat(sortedAttrs));   // SET OF → yang di-hash
  const signedAttrsInSigner = ctx(0, Buffer.concat(sortedAttrs));        // [0] IMPLICIT di SignerInfo

  const signer = createSign('RSA-SHA256');
  signer.update(signedAttrsForSigning);
  const signature = signer.sign(keyPem);

  const signerInfo = seq(
    tlv(0x02, Buffer.from([1])),                              // version 1
    seq(issuer, serial),                                      // IssuerAndSerialNumber
    algId(OID_SHA256),
    signedAttrsInSigner,
    algId(OID_RSA),
    octet(signature)
  );

  const signedData = seq(
    tlv(0x02, Buffer.from([1])),                              // version
    setOf(algId(OID_SHA256)),                                 // digestAlgorithms
    seq(oid(OID_DATA)),                                       // encapContentInfo (detached)
    ctx(0, certDer),                                          // certificates [0] IMPLICIT
    setOf(signerInfo)
  );
  return seq(oid(OID_SIGNED_DATA), ctx(0, signedData));
}

// Konfigurasi aktif? (PEM boleh memakai \n literal pada .env)
function config(env = process.env) {
  const certPem = String(env.MAT_DOC_SIGN_CERT || '').replace(/\\n/g, '\n').trim();
  const keyPem = String(env.MAT_DOC_SIGN_KEY || '').replace(/\\n/g, '\n').trim();
  if (!certPem || !keyPem) return null;
  return { certPem, keyPem, reason: String(env.MAT_DOC_SIGN_REASON || 'Dokumen resmi diterbitkan sistem MAT ERP'), location: String(env.MAT_DOC_SIGN_LOCATION || 'Bekasi, Indonesia') };
}
const isConfigured = (env = process.env) => Boolean(config(env));

function subjectOf(certPem) {
  try { return new X509Certificate(certPem).subject.replace(/\n/g, ', '); } catch { return 'unknown'; }
}

const sha256 = (buf) => createHash('sha256').update(buf).digest();

module.exports = { buildCms, config, isConfigured, subjectOf, sha256, issuerAndSerial, oid, seq, setOf, octet, tlv };
