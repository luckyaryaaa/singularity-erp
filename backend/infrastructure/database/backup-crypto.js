'use strict';
// Enkripsi salinan backup offsite: AES-256-GCM dengan kunci turunan scrypt.
// Format berkas: MAGIC(6) | salt(16) | iv(12) | authTag(16) | ciphertext.

const crypto = require('node:crypto');

const MAGIC = Buffer.from('MATBK1');
const SCRYPT = { N: 16384, r: 8, p: 1 };

function deriveKey(passphrase, salt) {
  if (!passphrase || String(passphrase).length < 16) {
    throw new Error('MAT_BACKUP_ENCRYPTION_KEY minimal 16 karakter untuk enkripsi offsite.');
  }
  return crypto.scryptSync(String(passphrase), salt, 32, SCRYPT);
}

function encrypt(buffer, passphrase) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(passphrase, salt), iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), ciphertext]);
}

function decrypt(buffer, passphrase) {
  if (!buffer.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('Bukan berkas backup terenkripsi MAT (magic header tidak cocok).');
  }
  let offset = MAGIC.length;
  const salt = buffer.subarray(offset, offset += 16);
  const iv = buffer.subarray(offset, offset += 12);
  const authTag = buffer.subarray(offset, offset += 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(passphrase, salt), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(buffer.subarray(offset)), decipher.final()]);
}

module.exports = { encrypt, decrypt, MAGIC };
