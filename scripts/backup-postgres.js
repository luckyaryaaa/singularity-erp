'use strict';
require('../backend/core/env').loadEnv();
process.env.DATABASE_URL=process.env.MIGRATION_DATABASE_URL||process.env.DATABASE_URL;
const pool=require('../backend/infrastructure/database/pool');
const backup=require('../backend/infrastructure/database/backup');
(async()=>{try{const command=process.argv[2]||'run';if(command==='run'){const result=await backup.runBackup(pool.getPool());console.log(JSON.stringify({ok:true,backupId:result.id,sizeBytes:result.sizeBytes,checksumVerified:true},null,2));}else if(command==='restore-test'){const result=await backup.restoreDrill(pool.getPool(),{});console.log(JSON.stringify({ok:true,...result},null,2));}else throw new Error('Gunakan: run | restore-test');}catch(error){console.error(error.message);process.exitCode=1;}finally{await pool.close();}})();
