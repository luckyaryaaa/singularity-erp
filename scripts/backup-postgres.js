'use strict';
require('../backend/core/env').loadEnv();
process.env.DATABASE_URL=process.env.MIGRATION_DATABASE_URL||process.env.DATABASE_URL;
const pool=require('../backend/infrastructure/database/pool');
const backup=require('../backend/infrastructure/database/backup');
(async()=>{try{const command=process.argv[2]||'run';
  if(command==='run'){const result=await backup.runBackup(pool.getPool());console.log(JSON.stringify({ok:true,backupId:result.id,sizeBytes:result.sizeBytes,checksumVerified:true,offsite:result.offsite},null,2));}
  else if(command==='restore-test'){const result=await backup.restoreDrill(pool.getPool(),{});console.log(JSON.stringify({ok:true,...result},null,2));}
  else if(command==='decrypt'){
    // Pulihkan dump dari salinan offsite terenkripsi: node scripts/backup-postgres.js decrypt <file.enc> [keluaran.dump]
    const fs=require('node:fs');const crypto=require('../backend/infrastructure/database/backup-crypto');
    const input=process.argv[3];if(!input)throw new Error('Gunakan: decrypt <file.dump.enc> [keluaran.dump]');
    const output=process.argv[4]||input.replace(/\.enc$/,'');
    fs.writeFileSync(output,crypto.decrypt(fs.readFileSync(input),process.env.MAT_BACKUP_ENCRYPTION_KEY));
    console.log(JSON.stringify({ok:true,output},null,2));
  }
  else throw new Error('Gunakan: run | restore-test | decrypt');}catch(error){console.error(error.message);process.exitCode=1;}finally{await pool.close();}})();
