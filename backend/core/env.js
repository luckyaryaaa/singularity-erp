'use strict';
const fs = require('node:fs');
const path = require('node:path');

function loadEnv(file = path.join(__dirname, '..', '..', '.env')) {
  if (!fs.existsSync(file)) return false;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals < 1) continue;
    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

const ENVIRONMENTS = new Set(['LOCAL-DEVELOPMENT','LOCAL-INTEGRATION','LAN-UAT','PRODUCTION']);
const weak = (value='') => !value || value.length < 24 || /CHANGE_ME|GENERATED_BY|password/i.test(value);
function environmentName(env=process.env) {
  return env.MAT_ENVIRONMENT || (env.NODE_ENV === 'production' ? 'PRODUCTION' : env.NODE_ENV === 'test' ? 'LOCAL-INTEGRATION' : 'LOCAL-DEVELOPMENT');
}
function validateEnvironment(env=process.env,{forBoot=false}={}) {
  const name=environmentName(env),errors=[];
  if(!ENVIRONMENTS.has(name))errors.push(`MAT_ENVIRONMENT '${name}' tidak dikenal.`);
  if(env.NODE_ENV==='production'&&name!=='PRODUCTION')errors.push('NODE_ENV=production wajib memakai MAT_ENVIRONMENT=PRODUCTION.');
  if(name==='PRODUCTION'){
    if(env.NODE_ENV!=='production')errors.push('PRODUCTION wajib memakai NODE_ENV=production.');
    if(env.MAT_DB_MODE!=='postgres')errors.push('PRODUCTION wajib memakai MAT_DB_MODE=postgres.');
    if(/(?:_dev|_uat)(?:$|[?&])/i.test(env.PGDATABASE||'')||/(?:_dev|_uat)(?:\?|$)/i.test(env.DATABASE_URL||''))errors.push('Database development/UAT dilarang untuk PRODUCTION.');
    if(weak(env.MAT_MFA_ENCRYPTION_KEY))errors.push('MAT_MFA_ENCRYPTION_KEY production belum kuat.');
    if(weak(env.MAT_BACKUP_ENCRYPTION_KEY))errors.push('MAT_BACKUP_ENCRYPTION_KEY production belum kuat.');
    if(env.MAT_COOKIE_SECURE!=='1')errors.push('MAT_COOKIE_SECURE=1 wajib di production.');
    if(env.MAT_FILE_SCAN_MODE!=='defender'&&env.MAT_FILE_SCAN_MODE!=='clamav')errors.push('Malware scanner production wajib defender atau clamav.');
    if(forBoot&&env.MAT_PRODUCTION_ACTIVATION_ALLOWED!=='1')errors.push('MAT_PRODUCTION_ACTIVATION_ALLOWED belum 1.');
  }
  return {name,valid:errors.length===0,errors};
}
function assertEnvironment(options){const result=validateEnvironment(process.env,options);if(!result.valid)throw new Error(`ENVIRONMENT_BLOCKED: ${result.errors.join(' ')}`);return result;}
function assertSeedAllowed(kind,env=process.env){const name=environmentName(env);if(name==='PRODUCTION'||env.NODE_ENV==='production')throw new Error(`Seed ${kind} dilarang di production.`);if(kind==='development'&&name!=='LOCAL-DEVELOPMENT')throw new Error(`Seed development hanya boleh di LOCAL-DEVELOPMENT, bukan ${name}.`);if(kind==='uat'&&name!=='LAN-UAT'&&env.MAT_ALLOW_UAT_SEED_LOCAL!=='1')throw new Error(`Seed UAT hanya boleh di LAN-UAT (atau override lokal eksplisit), bukan ${name}.`);return true;}

module.exports = { loadEnv, environmentName, validateEnvironment, assertEnvironment, assertSeedAllowed, ENVIRONMENTS };
