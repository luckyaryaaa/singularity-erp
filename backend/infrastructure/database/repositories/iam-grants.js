'use strict';
// B1/B2 — resolusi kewenangan runtime dari database.
//
// Sebelumnya `hasPermission` hanya membaca konstanta ROLE_GRANTS di source dan
// hanya melihat SATU peran (`app_users.role`). Akibatnya: (a) mengubah
// kewenangan menuntut deploy ulang, dan (b) peran tambahan yang sah pada
// user_role_assignments tidak pernah berpengaruh.
//
// Modul ini BUKAN mesin otorisasi kedua: keputusannya tetap dibuat
// core/permissions.hasPermission. Yang berubah hanya dari mana daftar grant
// berasal — database, dengan ROLE_GRANTS sebagai baseline awal.
const { ROLE_GRANTS, grantsFor } = require('../../../core/permissions');

// Seed sekali per peran: hanya peran yang belum punya baris sama sekali yang
// diisi. Dengan begitu penyesuaian oleh admin tidak pernah ditimpa kembali
// oleh baseline, dan peran yang sengaja dikosongkan tetap kosong.
async function syncBaseline(client) {
  const existing = new Set((await client.query(
    `SELECT DISTINCT role FROM role_permissions WHERE source='BASELINE'`)).rows.map((r) => r.role));
  const known = new Set((await client.query('SELECT code FROM enterprise_roles')).rows.map((r) => r.code));
  let inserted = 0; const seeded = [];
  for (const [role, codes] of Object.entries(ROLE_GRANTS)) {
    if (existing.has(role) || !known.has(role)) continue;   // alias legacy tanpa enterprise_role dilewati
    const list = [...grantsFor(role)];
    if (!list.length) continue;
    const result = await client.query(
      `INSERT INTO role_permissions(role,permission_code,source) SELECT $1,unnest($2::text[]),'BASELINE'
       ON CONFLICT(role,permission_code) DO NOTHING`, [role, list]);
    inserted += result.rowCount; seeded.push(role);
  }
  return { inserted, roles: seeded };
}

// Union kewenangan seluruh peran AKTIF milik pengguna (B2), bukan hanya yang
// primary. Peran yang masa berlakunya habis tidak ikut.
async function grantsForUser(client, userId) {
  const rows = (await client.query(
    `SELECT DISTINCT p.permission_code FROM user_role_assignments a
       JOIN role_permissions p ON p.role=a.role_code AND p.active
     WHERE a.user_id=$1 AND a.status='ACTIVE'
       AND a.effective_from<=now() AND (a.effective_until IS NULL OR a.effective_until>now())`,
    [userId])).rows;
  return rows.map((r) => r.permission_code);
}

// Daftar peran aktif — dipakai UI/audit agar peran tambahan terlihat, bukan
// hanya peran primary.
async function rolesForUser(client, userId) {
  return (await client.query(
    `SELECT role_code,is_primary,scope_type,scope_id,effective_until FROM user_role_assignments
     WHERE user_id=$1 AND status='ACTIVE' AND effective_from<=now()
       AND (effective_until IS NULL OR effective_until>now())
     ORDER BY is_primary DESC, role_code`, [userId])).rows
    .map((r) => ({ role: r.role_code, primary: r.is_primary, scopeType: r.scope_type, scopeId: r.scope_id, until: r.effective_until }));
}

module.exports = { syncBaseline, grantsForUser, rolesForUser };
