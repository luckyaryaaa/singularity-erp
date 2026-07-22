'use strict';
require('../backend/core/env').loadEnv();
const command = process.argv[2] || 'status';
if (command !== 'health' && process.env.MIGRATION_DATABASE_URL) process.env.DATABASE_URL = process.env.MIGRATION_DATABASE_URL;
const migrations = require('../backend/infrastructure/database/migrations');
const pool = require('../backend/infrastructure/database/pool');
const iamGrants = require('../backend/infrastructure/database/repositories/iam-grants');

// B1: setelah migrasi, baseline ROLE_GRANTS di-seed ke role_permissions untuk
// peran yang belum punya baris sama sekali. Penyesuaian oleh admin tidak
// pernah ditimpa, dan peran yang sengaja dikosongkan tetap kosong.
const { withTransaction } = require('../backend/infrastructure/database/transaction');
const syncRoleBaseline = () => withTransaction((client) => iamGrants.syncBaseline(client));

(async () => {
  try {
    if (command === 'health') console.log(JSON.stringify(await pool.healthCheck(), null, 2));
    else if (command === 'status') console.table(await migrations.status());
    else if (command === 'migrate') { const applied = await migrations.up(); const baseline = await syncRoleBaseline(); console.log(JSON.stringify({ applied, roleBaseline: baseline }, null, 2)); }
    else if (command === 'validate') console.log(JSON.stringify({ valid: true, migrations: await migrations.validate() }, null, 2));
    else throw new Error(`Perintah database tidak dikenal: ${command}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await pool.close(); }
})();
