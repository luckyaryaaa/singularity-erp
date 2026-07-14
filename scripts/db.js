'use strict';
require('../backend/core/env').loadEnv();
const command = process.argv[2] || 'status';
if (command !== 'health' && process.env.MIGRATION_DATABASE_URL) process.env.DATABASE_URL = process.env.MIGRATION_DATABASE_URL;
const migrations = require('../backend/infrastructure/database/migrations');
const pool = require('../backend/infrastructure/database/pool');

(async () => {
  try {
    if (command === 'health') console.log(JSON.stringify(await pool.healthCheck(), null, 2));
    else if (command === 'status') console.table(await migrations.status());
    else if (command === 'migrate') console.log(JSON.stringify({ applied: await migrations.up() }, null, 2));
    else if (command === 'validate') console.log(JSON.stringify({ valid: true, migrations: await migrations.validate() }, null, 2));
    else throw new Error(`Perintah database tidak dikenal: ${command}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await pool.close(); }
})();
