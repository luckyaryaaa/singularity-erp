'use strict';
// Helper login uji yang MENYELESAIKAN tantangan MFA.
//
// Sejak akun privileged (owner, system_admin) mendaftarkan MFA — sesuai
// penegakan B4/UAT — login mengembalikan {mfaRequired, mfaToken} TANPA cookie,
// bukan langsung sesi. Helper login lama yang mengasumsikan sesi seketika
// karenanya pecah pada `set-cookie`.split(null). Ini bukan regresi keamanan:
// justru bukti MFA privileged bekerja. Helper ini menegakkan langkah TOTP.
//
// Rahasia TOTP dibaca dari DB dan didekripsi HANYA di dalam helper uji, tidak
// pernah dicetak. Kode TOTP dihitung dari rahasia itu, bukan dari secret UI.
const crypto = require('node:crypto');
const totp = require('../../backend/core/totp');

// Derivasi kunci identik dengan auth repository (cipherKey()).
const cipherKey = () => crypto.createHash('sha256')
  .update(process.env.MAT_MFA_ENCRYPTION_KEY || process.env.DATABASE_URL || 'mat-erp-v2-development').digest();

function decryptSecret(value) {
  const [iv, tag, body] = String(value || '').split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', cipherKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
}

// Kode TOTP valid saat ini untuk sebuah username, dibaca dari DB.
async function currentTotp(client, username) {
  const row = (await client.query(
    'SELECT totp_secret_ciphertext FROM app_users WHERE lower(username)=lower($1)', [username])).rows[0];
  if (!row || !row.totp_secret_ciphertext) return null;
  const secret = decryptSecret(row.totp_secret_ciphertext);
  const counter = Math.floor(Date.now() / 1000 / 30);
  return totp.hotp(secret, counter);
}

// Login penuh terhadap server HTTP, menyelesaikan MFA bila diminta.
// Mengembalikan { cookie, csrf, role } — kontrak yang sama dengan helper lama.
// `client` adalah koneksi pg untuk membaca rahasia TOTP saat mfaRequired.
async function loginHttp(base, username, password, client) {
  const first = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const body = await first.json();
  if (body && body.mfaRequired) {
    if (!client) throw new Error(`Login ${username} menuntut MFA tetapi helper tidak diberi koneksi DB.`);
    const code = await currentTotp(client, username);
    if (!code) throw new Error(`Akun ${username} menuntut MFA tetapi rahasia TOTP tidak ditemukan.`);
    const verify = await fetch(`${base}/api/auth/mfa`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mfaToken: body.mfaToken, code })
    });
    const setCookie = verify.headers.get('set-cookie');
    if (!setCookie) throw new Error(`Verifikasi MFA ${username} gagal (status ${verify.status}).`);
    const vb = await verify.json();
    return { cookie: setCookie.split(';')[0], csrf: vb.csrfToken, role: vb.user.role };
  }
  const setCookie = first.headers.get('set-cookie');
  if (!setCookie) throw new Error(`Login ${username} tidak mengembalikan sesi (status ${first.status}: ${body.code || body.detail || body.message || 'unknown'}).`);
  return { cookie: setCookie.split(';')[0], csrf: body.csrfToken, role: body.user.role };
}

module.exports = { loginHttp, currentTotp };
