'use strict';
require('../backend/core/env').loadEnv();
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { assertDedicatedUatDatabase } = require('./uat-database-guard');

const ROOT = path.join(__dirname, '..');
const target = String(process.env.MAT_UAT_DATABASE_NAME || 'mat_erp_v2_lan_uat');
if (!/^[a-z_][a-z0-9_]*$/.test(target)) throw new Error('MAT_UAT_DATABASE_NAME tidak aman.');
const withDatabase = (raw) => { const url = new URL(raw); url.pathname = `/${target}`; return url.toString(); };
if (!process.env.DATABASE_URL || !process.env.MIGRATION_DATABASE_URL) throw new Error('DATABASE_URL dan MIGRATION_DATABASE_URL wajib tersedia.');
const childEnv = {
  ...process.env,
  PGDATABASE: target,
  DATABASE_URL: withDatabase(process.env.DATABASE_URL),
  MIGRATION_DATABASE_URL: withDatabase(process.env.MIGRATION_DATABASE_URL),
  MAT_ENVIRONMENT: 'LAN-UAT',
  MAT_DEPLOY_STAGE: 'LAN-UAT',
  npm_config_offline: process.env.npm_config_offline || 'true',
  npm_config_cache: process.env.npm_config_cache || '.npm-cache'
};
assertDedicatedUatDatabase(childEnv);
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath tidak tersedia; jalankan melalui npm run uat:technical.');
const steps = [
  ['Provision database UAT', ['run','db:provision']],
  ['Migration UAT', ['run','db:migrate']],
  ['Field encryption backfill UAT', ['run','security:rotate-fields']],
  ['Least-privilege grant UAT', ['run','db:grant-runtime']],
  ['Seed lintas role UAT', ['run','db:seed:uat']],
  ['Seed HR/Finance UAT', ['run','db:seed:uat:sprint4']],
  ['Opening inventory UAT', ['run','cutover:opening-inventory']],
  ['Validasi migration UAT', ['run','db:validate']],
  ['Health database UAT', ['run','db:health']],
  ['Backup database UAT', ['run','backup:run']],
  ['Restore drill database UAT', ['run','backup:restore-test']],
  ['Validasi kesiapan evidence UAT', ['run','uat:evidence:check']]
];
if (!process.argv.includes('--skip-predeploy')) steps.push(['Predeploy LAN-UAT', ['run','predeploy']]);
for (const [label,args] of steps) {
  console.log(`\n=== ${label} ===`);
  const result=spawnSync(process.execPath,[npmCli,...args],{cwd:ROOT,env:childEnv,stdio:'inherit',shell:false});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} gagal dengan exit ${result.status}.`);
}
console.log(JSON.stringify({ok:true,database:target,environment:'LAN-UAT',predeploy:!process.argv.includes('--skip-predeploy')}));
