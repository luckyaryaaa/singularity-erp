'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {Client}=require('pg');
const runFile=promisify(execFile);
const alerts=require('../alerts');
const backupCrypto=require('./backup-crypto');
const ROOT=path.resolve(__dirname,'../../../storage/backups');

// Salinan offsite terenkripsi (media kedua / mount NAS / folder sinkronisasi
// object storage). Kegagalan offsite tidak menggagalkan backup lokal — tetapi
// selalu memicu alert karena 3-2-1 belum terpenuhi tanpa salinan itu.
async function offsiteCopy(localFile,bytes){
  const dir=process.env.MAT_BACKUP_OFFSITE_DIR;
  if(!dir)return{enabled:false};
  const key=process.env.MAT_BACKUP_ENCRYPTION_KEY;
  if(!key)throw new Error('MAT_BACKUP_OFFSITE_DIR diset tanpa MAT_BACKUP_ENCRYPTION_KEY — salinan offsite wajib terenkripsi.');
  await fs.mkdir(dir,{recursive:true});
  const target=path.join(dir,`${path.basename(localFile)}.enc`);
  const encrypted=backupCrypto.encrypt(bytes,key);
  await fs.writeFile(target,encrypted);
  // Retensi offsite mengikuti retensi lokal.
  const keep=Math.min(Math.max(Number(process.env.MAT_BACKUP_RETAIN_COUNT||14)||14,2),60);
  const entries=(await fs.readdir(dir)).filter(name=>name.endsWith('.dump.enc')).sort().reverse();
  for(const stale of entries.slice(keep))await fs.unlink(path.join(dir,stale)).catch(()=>{});
  return{enabled:true,target,sizeBytes:encrypted.length};
}
function connection(){const raw=process.env.MIGRATION_DATABASE_URL;if(!raw)throw new Error('MIGRATION_DATABASE_URL wajib untuk backup/restore.');return new URL(raw);}
async function executable(name){const configured=process.env[`PG_${name.toUpperCase()}_PATH`];const candidates=[configured,path.join(process.env.ProgramFiles||'C:\\Program Files','PostgreSQL','16','bin',`${name}.exe`),`${name}.exe`].filter(Boolean);for(const item of candidates){if(!path.isAbsolute(item))return item;try{await fs.access(item);return item;}catch{}}throw new Error(`${name} PostgreSQL 16 tidak ditemukan.`);}
function cli(url){return{host:url.hostname,port:url.port||'5432',user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:decodeURIComponent(url.pathname.slice(1))};}
async function runBackup(client,{requestedBy=null}={}){
  // P0: backup lokal WAJIB terenkripsi at-rest (bukan hanya salinan offsite).
  // Dump plaintext hanya hidup sesaat selama pg_dump lalu langsung dienkripsi
  // dan file plaintext dihapus. Checksum dicatat atas ISI plaintext sehingga
  // restore drill dapat memverifikasi integritas setelah dekripsi.
  const key=process.env.MAT_BACKUP_ENCRYPTION_KEY;
  if(!key)throw new Error('MAT_BACKUP_ENCRYPTION_KEY wajib — backup lokal harus terenkripsi.');
  await fs.mkdir(ROOT,{recursive:true});const id=randomUUID(),stamp=new Date().toISOString().replace(/[:.]/g,'-'),plainFile=path.join(ROOT,`mat-erp-v2-${stamp}.dump`),file=`${plainFile}.enc`,url=connection(),cfg=cli(url);
  await client.query(`INSERT INTO backup_runs(id,target,backup_type,file_path,status) VALUES($1,'LOCAL_ENCRYPTED','FULL',$2,'RUNNING')`,[id,file]);
  try{const pgDump=await executable('pg_dump');await runFile(pgDump,['--format=custom','--compress=9','--no-owner','--no-acl','--host',cfg.host,'--port',cfg.port,'--username',cfg.user,'--file',plainFile,cfg.database],{env:{...process.env,PGPASSWORD:cfg.password},windowsHide:true,maxBuffer:1024*1024});const bytes=await fs.readFile(plainFile),checksum=createHash('sha256').update(bytes).digest('hex'),sizeMb=Math.max(1,Math.ceil(bytes.length/1048576));
    await fs.writeFile(file,backupCrypto.encrypt(bytes,key));
    await fs.unlink(plainFile);
    let offsite={enabled:false};
    try{offsite=await offsiteCopy(plainFile,bytes);}
    catch(offsiteError){offsite={enabled:true,error:offsiteError.message};alerts.send('Salinan backup offsite gagal',offsiteError.message,{key:'backup-offsite'}).catch(()=>{});}
    const target=offsite.enabled&&!offsite.error?'LOCAL_ENCRYPTED+OFFSITE':'LOCAL_ENCRYPTED';
    await client.query(`UPDATE backup_runs SET status='COMPLETED',finished_at=now(),size_mb=$2,checksum=$3,target=$4,restore_test_detail=COALESCE(restore_test_detail,'')||$5 WHERE id=$1`,[id,sizeMb,checksum,target,offsite.error?` [Offsite GAGAL: ${String(offsite.error).slice(0,300)}]`:offsite.enabled?` [Offsite: ${offsite.target}]`:'']);
    await prune(client);return{id,filePath:file,sizeBytes:bytes.length,checksum,offsite,requestedBy};}
  catch(error){await fs.unlink(plainFile).catch(()=>{});await client.query(`UPDATE backup_runs SET status='FAILED',finished_at=now(),error=$2 WHERE id=$1`,[id,String(error.message).slice(0,2000)]);alerts.send('Backup database GAGAL',error.message,{key:'backup-run'}).catch(()=>{});throw error;}
}
async function prune(client,keep=Number(process.env.MAT_BACKUP_RETAIN_COUNT||14)){keep=Math.min(Math.max(Number(keep)||14,2),60);const rows=(await client.query(`SELECT id,file_path FROM backup_runs WHERE status='COMPLETED' AND file_path IS NOT NULL ORDER BY finished_at DESC OFFSET $1`,[keep])).rows;for(const row of rows){const target=path.resolve(row.file_path);if(target.startsWith(ROOT+path.sep)){await fs.unlink(target).catch(error=>{if(error.code!=='ENOENT')throw error;});await client.query(`UPDATE backup_runs SET file_path=NULL,restore_test_detail=COALESCE(restore_test_detail,'')||' [File dipangkas oleh retention policy]' WHERE id=$1`,[row.id]);}}return rows.length;}
async function restoreDrill(client,{backupId,filePath}){
  const row=backupId?(await client.query(`SELECT * FROM backup_runs WHERE id=$1 AND status='COMPLETED'`,[backupId])).rows[0]:(await client.query(`SELECT * FROM backup_runs WHERE status='COMPLETED' ORDER BY finished_at DESC LIMIT 1`)).rows[0];if(!row)throw new Error('Backup completed tidak ditemukan.');let source=filePath||row.file_path;await fs.access(source);
  // Backup lokal terenkripsi: dekripsi ke file sementara + verifikasi checksum
  // plaintext terhadap catatan backup_runs sebelum pg_restore.
  let decryptedTemp=null;
  if(String(source).endsWith('.enc')){
    const keys=[process.env.MAT_BACKUP_ENCRYPTION_KEY,process.env.MAT_BACKUP_PREVIOUS_ENCRYPTION_KEY].filter(Boolean);
    if(!keys.length)throw new Error('MAT_BACKUP_ENCRYPTION_KEY tidak tersedia untuk restore drill.');
    const encrypted=await fs.readFile(source);let plain,lastError;
    for(const k of keys){try{plain=backupCrypto.decrypt(encrypted,k);break;}catch(error){lastError=error;}}
    if(!plain)throw lastError||new Error('Dekripsi backup gagal.');
    if(row.checksum&&createHash('sha256').update(plain).digest('hex')!==row.checksum)throw new Error('Checksum backup tidak cocok setelah dekripsi — file korup atau diubah.');
    decryptedTemp=path.join(ROOT,`.restore-${randomUUID().slice(0,8)}.dump`);
    await fs.writeFile(decryptedTemp,plain);
    source=decryptedTemp;
  }
  const suffix=randomUUID().replace(/-/g,'').slice(0,12),database=`mat_erp_restore_${suffix}`,url=connection(),adminUrl=new URL(url);adminUrl.pathname='/postgres';const admin=new Client({connectionString:adminUrl.toString(),application_name:'mat-erp-restore-drill'});let created=false;
  try{await admin.connect();await admin.query(`CREATE DATABASE ${database}`);created=true;const pgRestore=await executable('pg_restore'),cfg=cli(url);await runFile(pgRestore,['--no-owner','--no-acl','--exit-on-error','--host',cfg.host,'--port',cfg.port,'--username',cfg.user,'--dbname',database,source],{env:{...process.env,PGPASSWORD:cfg.password},windowsHide:true,maxBuffer:4*1024*1024});const restoredUrl=new URL(url);restoredUrl.pathname=`/${database}`;const probe=new Client({connectionString:restoredUrl.toString(),application_name:'mat-erp-restore-probe'});await probe.connect();const result=await probe.query(`SELECT count(*)::int tables FROM information_schema.tables WHERE table_schema='public'`);const migration=await probe.query(`SELECT filename FROM schema_migrations ORDER BY filename DESC LIMIT 1`);await probe.end();const detail={databaseTemporary:true,tables:result.rows[0].tables,latestMigration:migration.rows[0]?.filename};if(detail.tables<10)throw new Error('Restore drill menghasilkan schema yang tidak lengkap.');await client.query(`UPDATE backup_runs SET restore_tested=true,restore_tested_at=now(),restore_test_detail=$2 WHERE id=$1`,[row.id,JSON.stringify(detail)]);return{backupId:row.id,...detail};}
  catch(error){await client.query(`UPDATE backup_runs SET restore_tested=false,restore_tested_at=now(),restore_test_detail=$2 WHERE id=$1`,[row.id,String(error.message).slice(0,2000)]).catch(()=>{});alerts.send('Restore drill backup GAGAL',error.message,{key:'restore-drill'}).catch(()=>{});throw error;}
  finally{if(created)await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`).catch(()=>{});await admin.end().catch(()=>{});if(decryptedTemp)await fs.unlink(decryptedTemp).catch(()=>{});}
}

// Enkripsi in-place seluruh dump plaintext lama (migrasi satu kali, P0):
// enkripsi → verifikasi round-trip dekripsi identik → hapus plaintext →
// perbarui file_path pada backup_runs agar restore drill tetap berfungsi.
async function encryptExistingLocal(client){
  const key=process.env.MAT_BACKUP_ENCRYPTION_KEY;
  if(!key)throw new Error('MAT_BACKUP_ENCRYPTION_KEY wajib untuk enkripsi backup lokal.');
  const results=[];
  for(const name of (await fs.readdir(ROOT)).filter(n=>n.endsWith('.dump'))){
    const plainPath=path.join(ROOT,name),encPath=`${plainPath}.enc`;
    const bytes=await fs.readFile(plainPath);
    const encrypted=backupCrypto.encrypt(bytes,key);
    if(!backupCrypto.decrypt(encrypted,key).equals(bytes))throw new Error(`Round-trip enkripsi gagal untuk ${name} — plaintext TIDAK dihapus.`);
    await fs.writeFile(encPath,encrypted);
    await fs.unlink(plainPath);
    if(client)await client.query(`UPDATE backup_runs SET file_path=$2,target='LOCAL_ENCRYPTED' WHERE file_path=$1`,[plainPath,encPath]);
    results.push({file:name,encrypted:path.basename(encPath),bytes:bytes.length});
  }
  return results;
}
module.exports={ROOT,runBackup,restoreDrill,prune,executable,offsiteCopy,encryptExistingLocal};
