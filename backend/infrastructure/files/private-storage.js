'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { AppError } = require('../../core/errors');
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
function absolute(relative){const target=path.resolve(ROOT,relative);if(target!==ROOT&&!target.startsWith(ROOT+path.sep))throw new AppError('RESOURCE_NOT_FOUND');return target;}

async function upload(client,{buffer,filename,mimeType,user,module,documentId,accessLevel='PRIVATE',retentionPolicy}){
  if(!Buffer.isBuffer(buffer)||!buffer.length)throw new AppError('VALIDATION_ERROR','File kosong.');
  if(buffer.length>MAX_BYTES)throw new AppError('FILE_TOO_LARGE',`Batas unggahan ${Math.floor(MAX_BYTES/1048576)} MB.`);
  const ext=TYPES.get(String(mimeType||'').toLowerCase());if(!ext)throw new AppError('VALIDATION_ERROR','Tipe file tidak diizinkan.');
  if(!signatureOk(buffer,mimeType))throw new AppError('VALIDATION_ERROR','Isi file tidak sesuai tipe yang dinyatakan.');
  const now=new Date(),relative=path.join(String(now.getUTCFullYear()),String(now.getUTCMonth()+1).padStart(2,'0'),`${randomUUID()}${ext}`),target=absolute(relative),temporary=`${target}.uploading`;
  await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(temporary,buffer,{flag:'wx',mode:0o600});await fs.rename(temporary,target);
  const checksum=createHash('sha256').update(buffer).digest('hex'),stored=path.basename(target);
  try{return camel((await client.query(`INSERT INTO file_metadata(original_filename,stored_filename,storage_path,mime_type,size_bytes,checksum_sha256,uploaded_by,related_module,related_document_id,access_level,retention_policy,scan_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'CLEAN') RETURNING *`,[safeName(filename),stored,relative,mimeType,buffer.length,checksum,user.id,module,documentId||null,accessLevel,retentionPolicy||null])).rows[0]);}
  catch(error){await fs.unlink(target).catch(()=>{});throw error;}
}
async function list(client,{documentId,module}){const params=[];let where='NOT is_deleted';if(documentId){params.push(documentId);where+=` AND related_document_id=$${params.length}`;}if(module){params.push(module);where+=` AND related_module=$${params.length}`;}return(await client.query(`SELECT * FROM file_metadata WHERE ${where} ORDER BY uploaded_at DESC LIMIT 100`,params)).rows.map(camel);}
async function metadata(client,id){return camel((await client.query('SELECT * FROM file_metadata WHERE id=$1 AND NOT is_deleted',[id])).rows[0]);}
async function download(client,id){const item=await metadata(client,id);if(!item||item.scanStatus!=='CLEAN')throw new AppError('RESOURCE_NOT_FOUND');const buffer=await fs.readFile(absolute(item.storagePath));const checksum=createHash('sha256').update(buffer).digest('hex');if(checksum!==item.checksumSha256)throw new AppError('INTERNAL','Integritas file gagal diverifikasi.');return{item,buffer};}
async function remove(client,id,user){const row=(await client.query(`UPDATE file_metadata SET is_deleted=true,deleted_at=now(),deleted_by=$2 WHERE id=$1 AND NOT is_deleted RETURNING *`,[id,user.id])).rows[0];if(!row)throw new AppError('RESOURCE_NOT_FOUND');return camel(row);}

module.exports={ROOT,MAX_BYTES,TYPES,upload,list,metadata,download,remove,safeName};
