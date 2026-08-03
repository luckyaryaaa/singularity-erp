'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { AppError } = require('../../core/errors');
const { hasGlobalScope } = require('../../core/data-scope');
const { camel } = require('../database/repositories/runtime');

const ROOT = path.resolve(__dirname, '../../../storage/private');
const MAX_BYTES = Number(process.env.MAT_UPLOAD_MAX_BYTES || 20 * 1024 * 1024);
const TYPES = new Map([
  ['application/pdf','.pdf'],['image/png','.png'],['image/jpeg','.jpg'],['image/webp','.webp'],
  ['text/csv','.csv'],['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.xlsx'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document','.docx']
]);

function safeName(value='file') { return path.basename(String(value)).replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,180) || 'file'; }
function signatureOk(buffer,mime){
  if(mime==='application/pdf')return buffer.subarray(0,5).toString()==='%PDF-';
  if(mime==='image/png')return buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if(mime==='image/jpeg')return buffer[0]===0xff&&buffer[1]===0xd8&&buffer.at(-2)===0xff&&buffer.at(-1)===0xd9;
  if(mime==='image/webp')return buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';
  if(mime.includes('openxmlformats'))return buffer[0]===0x50&&buffer[1]===0x4b;
  if(mime==='text/csv')return !buffer.includes(0);
  return false;
}
function archiveSafe(buffer){
  let offset=0,entries=0,totalCompressed=0,totalUncompressed=0;
  while((offset=buffer.indexOf(Buffer.from([0x50,0x4b,0x01,0x02]),offset))>=0){
    if(offset+46>buffer.length)return false;entries++;const compressed=buffer.readUInt32LE(offset+20),uncompressed=buffer.readUInt32LE(offset+24),name=buffer.readUInt16LE(offset+28),extra=buffer.readUInt16LE(offset+30),comment=buffer.readUInt16LE(offset+32);totalCompressed+=compressed;totalUncompressed+=uncompressed;if(entries>5000||totalUncompressed>500*1024*1024)return false;offset+=46+name+extra+comment;
  }
  return !entries||totalUncompressed/Math.max(totalCompressed,1)<=100;
}
function absolute(relative){const target=path.resolve(ROOT,relative);if(target!==ROOT&&!target.startsWith(ROOT+path.sep))throw new AppError('RESOURCE_NOT_FOUND');return target;}

async function upload(client,{buffer,filename,mimeType,user,module,documentId,accessLevel='PRIVATE',retentionPolicy,confidentiality='INTERNAL',branchId,legalEntityId}){
  if(!Buffer.isBuffer(buffer)||!buffer.length)throw new AppError('VALIDATION_ERROR','File kosong.');
  if(buffer.length>MAX_BYTES)throw new AppError('FILE_TOO_LARGE',`Batas unggahan ${Math.floor(MAX_BYTES/1048576)} MB.`);
  const ext=TYPES.get(String(mimeType||'').toLowerCase());if(!ext)throw new AppError('VALIDATION_ERROR','Tipe file tidak diizinkan.');
  if(!signatureOk(buffer,mimeType))throw new AppError('VALIDATION_ERROR','Isi file tidak sesuai tipe yang dinyatakan.');
  if(mimeType.includes('openxmlformats')&&!archiveSafe(buffer))throw new AppError('VALIDATION_ERROR','Arsip Office mencurigakan atau melebihi batas ekstraksi.');
  const now=new Date(),relative=path.join(String(now.getUTCFullYear()),String(now.getUTCMonth()+1).padStart(2,'0'),`${randomUUID()}${ext}`),target=absolute(relative),temporary=`${target}.uploading`;
  await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(temporary,buffer,{flag:'wx',mode:0o600});await fs.rename(temporary,target);
  const checksum=createHash('sha256').update(buffer).digest('hex'),stored=path.basename(target);
  try{return camel((await client.query(`INSERT INTO file_metadata(original_filename,stored_filename,storage_path,mime_type,size_bytes,checksum_sha256,uploaded_by,related_module,related_document_id,access_level,retention_policy,scan_status,confidentiality,branch_id,legal_entity_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'QUARANTINED',$12,$13,$14) RETURNING *`,[safeName(filename),stored,relative,mimeType,buffer.length,checksum,user.id,module,documentId||null,accessLevel,retentionPolicy||null,confidentiality,branchId||user.branchId||null,legalEntityId||null])).rows[0]);}
  catch(error){await fs.unlink(target).catch(()=>{});throw error;}
}
async function list(client,{documentId,module,user}){const params=[hasGlobalScope(user),user?.branchId||null,user?.id||null];let where='NOT is_deleted AND ($1::boolean OR branch_id=$2 OR uploaded_by=$3)';if(documentId){params.push(documentId);where+=` AND related_document_id=$${params.length}`;}if(module){params.push(module);where+=` AND related_module=$${params.length}`;}return(await client.query(`SELECT * FROM file_metadata WHERE ${where} ORDER BY uploaded_at DESC LIMIT 100`,params)).rows.map(camel);}
async function metadata(client,id){return camel((await client.query('SELECT * FROM file_metadata WHERE id=$1 AND NOT is_deleted',[id])).rows[0]);}
async function scopedMetadata(client,id,user){return camel((await client.query(`SELECT * FROM file_metadata WHERE id=$1 AND NOT is_deleted AND ($2::boolean OR branch_id=$3 OR uploaded_by=$4 OR access_level='MASTER_PROFILE')`,[id,hasGlobalScope(user),user?.branchId||null,user?.id||null])).rows[0]);}
async function download(client,id){const item=await metadata(client,id);if(!item||item.scanStatus!=='CLEAN')throw new AppError('RESOURCE_NOT_FOUND');const buffer=await fs.readFile(absolute(item.storagePath));const checksum=createHash('sha256').update(buffer).digest('hex');if(checksum!==item.checksumSha256)throw new AppError('INTERNAL','Integritas file gagal diverifikasi.');return{item,buffer};}
async function scan(client,id){
  const row=(await client.query(`UPDATE file_metadata SET scan_status='SCANNING',scan_engine=NULL,scan_detail=NULL WHERE id=$1 AND NOT is_deleted AND scan_status IN('PENDING_SCAN','QUARANTINED') RETURNING *`,[id])).rows[0];if(!row){const current=await metadata(client,id);if(current?.scanStatus==='CLEAN')return current;throw new AppError('RESOURCE_NOT_FOUND','File tidak tersedia untuk dipindai.');}
  const item=camel(row),target=absolute(item.storagePath),buffer=await fs.readFile(target);let clean=true,engine='BUILTIN_SIGNATURE',detail='Signature, checksum, archive safety, dan pola uji malware lulus.';
  if(createHash('sha256').update(buffer).digest('hex')!==item.checksumSha256){clean=false;detail='Checksum file berubah setelah upload.';}
  if(buffer.includes(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'))){clean=false;detail='Pola uji malware EICAR terdeteksi.';}
  if(clean&&item.mimeType.includes('openxmlformats')&&!archiveSafe(buffer)){clean=false;detail='Archive bomb policy menolak file.';}
  const mode=String(process.env.MAT_FILE_SCAN_MODE||'builtin').toLowerCase();
  if(clean&&mode==='defender'){
    const candidates=[process.env.MAT_DEFENDER_CLI,'C:\\Program Files\\Windows Defender\\MpCmdRun.exe',`${process.env.ProgramData||'C:\\ProgramData'}\\Microsoft\\Windows Defender\\Platform`].filter(Boolean);let command=candidates.find(x=>x.toLowerCase().endsWith('.exe'));
    if(!command){clean=false;detail='Executable Microsoft Defender tidak dikonfigurasi.';}else try{await promisify(execFile)(command,['-Scan','-ScanType','3','-File',target,'-DisableRemediation'],{timeout:120000,windowsHide:true});engine='MICROSOFT_DEFENDER';detail='Microsoft Defender scan lulus.';}catch(error){clean=false;engine='MICROSOFT_DEFENDER';detail=`Defender menolak/gagal memindai: ${String(error.message).slice(0,300)}`;}
  } else if(clean&&mode==='clamav'){
    try{await promisify(execFile)(process.env.MAT_CLAMSCAN_PATH||'clamscan',['--no-summary',target],{timeout:120000,windowsHide:true});engine='CLAMAV';detail='ClamAV scan lulus.';}catch(error){clean=false;engine='CLAMAV';detail=`ClamAV menolak/gagal memindai: ${String(error.message).slice(0,300)}`;}
  } else if(clean&&process.env.NODE_ENV==='production'){clean=false;detail='Scanner production wajib defender atau clamav.';}
  const status=clean?'CLEAN':detail.includes('EICAR')?'INFECTED':'REJECTED';return camel((await client.query(`UPDATE file_metadata SET scan_status=$2,scan_engine=$3,scan_detail=$4,scanned_at=now() WHERE id=$1 RETURNING *`,[id,status,engine,detail])).rows[0]);
}
async function remove(client,id,user){const row=(await client.query(`UPDATE file_metadata SET is_deleted=true,scan_status='DELETED',deleted_at=now(),deleted_by=$2 WHERE id=$1 AND NOT is_deleted RETURNING *`,[id,user.id])).rows[0];if(!row)throw new AppError('RESOURCE_NOT_FOUND');return camel(row);}

module.exports={ROOT,MAX_BYTES,TYPES,upload,list,metadata,scopedMetadata,download,scan,remove,safeName,signatureOk,archiveSafe,absolute};
