'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const UAT_DIR = path.join(ROOT, 'docs', 'uat');
const REQUIRED_ROLES = Object.freeze([
  'owner','system_admin','security_admin','finance_manager','accounting','tax',
  'hrd','sales','procurement','warehouse','production','auditor','employee'
]);
const REQUIRED_RECONCILIATIONS = Object.freeze(['TRIAL_BALANCE','AR_GL','AP_GL','INVENTORY_GL','PAYROLL_GL','TAX']);
const FINAL_FILES = Object.freeze({
  plan:'UAT_PLAN.json', results:'UAT_RESULTS.json', issues:'ISSUE_REGISTER.json',
  training:'TRAINING_ATTENDANCE.json', reconciliation:'RECONCILIATION.json',
  restore:'RESTORE_DRILL.json', signoff:'FINAL_SIGNOFF.json'
});
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const present = (value) => typeof value === 'string' && value.trim().length >= 2 && !/^(?:TBD|TODO|N\/A|PLACEHOLDER)$/i.test(value.trim());

function validatePack(pack, { final = false } = {}) {
  const errors = [], plan = pack.plan || {}, scenarios = Array.isArray(plan.scenarios) ? plan.scenarios : [];
  const scenarioIds = new Set(), scenarioRoles = new Set();
  if (!present(plan.name)) errors.push('UAT plan name wajib diisi.');
  for (const scenario of scenarios) {
    if (!present(scenario.id) || scenarioIds.has(scenario.id)) errors.push(`Scenario ID tidak valid/duplikat: ${scenario.id || '(kosong)'}.`);
    scenarioIds.add(scenario.id); scenarioRoles.add(scenario.role);
    if (!REQUIRED_ROLES.includes(scenario.role)) errors.push(`${scenario.id}: role tidak dikenal.`);
    if (!present(scenario.title) || !Array.isArray(scenario.steps) || !scenario.steps.length || !present(scenario.expected)) errors.push(`${scenario.id}: title/steps/expected wajib lengkap.`);
  }
  for (const role of REQUIRED_ROLES) if (!scenarioRoles.has(role)) errors.push(`Scenario UAT untuk role ${role} belum ada.`);
  if (!Array.isArray(pack.results?.executions)) errors.push('UAT_RESULTS.executions wajib array.');
  if (!Array.isArray(pack.issues?.issues)) errors.push('ISSUE_REGISTER.issues wajib array.');
  if (!Array.isArray(pack.training?.sessions)) errors.push('TRAINING_ATTENDANCE.sessions wajib array.');
  if (!Array.isArray(pack.reconciliation?.checks)) errors.push('RECONCILIATION.checks wajib array.');
  if (!pack.restore || typeof pack.restore !== 'object') errors.push('RESTORE_DRILL wajib tersedia.');
  if (!final) return { ok: errors.length === 0, errors, requiredRoles: REQUIRED_ROLES.length, scenarios: scenarios.length };

  const manifest = pack.manifest || {}, results = pack.results || {};
  if (!present(results.runId)) errors.push('UAT runId belum diisi.');
  if (results.releaseVersion !== manifest.version) errors.push('Versi hasil UAT tidak sama dengan release manifest.');
  if (results.releaseSha256 !== manifest.releaseSha256) errors.push('SHA release hasil UAT tidak sama dengan release manifest.');
  if (results.migrationLatest !== manifest.migrationLatest) errors.push('Migration hasil UAT tidak sama dengan release manifest.');
  const executionById = new Map((results.executions || []).map((item) => [item.scenarioId, item]));
  for (const scenario of scenarios) {
    const item = executionById.get(scenario.id);
    if (!item) { errors.push(`${scenario.id}: belum dieksekusi.`); continue; }
    if (item.status !== 'PASS') errors.push(`${scenario.id}: status harus PASS, saat ini ${item.status || '(kosong)'}.`);
    if (!present(item.executedBy) || !present(item.executedAt) || !present(item.evidenceRef)) errors.push(`${scenario.id}: executor, waktu, dan evidence wajib lengkap.`);
  }
  for (const issue of pack.issues?.issues || []) {
    if (['CRITICAL','HIGH'].includes(issue.severity) && issue.status !== 'CLOSED') errors.push(`Issue ${issue.id || '(tanpa ID)'} ${issue.severity} belum CLOSED.`);
    if (issue.status === 'CLOSED' && (!present(issue.retestEvidence) || !present(issue.closedBy))) errors.push(`Issue ${issue.id}: closure/retest evidence belum lengkap.`);
  }
  const trained = new Set((pack.training?.sessions || []).filter((s) => s.status === 'ATTENDED' && present(s.attendee) && present(s.evidenceRef)).map((s) => s.role));
  for (const role of REQUIRED_ROLES) if (!trained.has(role)) errors.push(`Training/attendance role ${role} belum terbukti.`);
  const recon = new Map((pack.reconciliation?.checks || []).map((item) => [item.code, item]));
  for (const code of REQUIRED_RECONCILIATIONS) {
    const item = recon.get(code);
    if (item?.status !== 'PASS' || !present(item.evidenceRef) || !present(item.approvedBy)) errors.push(`Rekonsiliasi ${code} belum PASS/approved/evidenced.`);
  }
  if (pack.restore?.status !== 'PASS' || !(Number(pack.restore.actualRtoMinutes) >= 0) || !(Number(pack.restore.actualRpoMinutes) >= 0) || !present(pack.restore.evidenceRef)) errors.push('Restore drill belum PASS dengan actual RTO/RPO dan evidence.');
  const signoff = pack.signoff || {};
  if (signoff.approved !== true || !present(signoff.owner) || !present(signoff.approvedAt) || !present(signoff.statement)) errors.push('Owner final sign-off belum lengkap atau belum approved.');
  if (signoff.releaseSha256 !== manifest.releaseSha256 || signoff.runId !== results.runId) errors.push('Owner sign-off tidak menunjuk run/release yang diuji.');
  return { ok: errors.length === 0, errors, requiredRoles: REQUIRED_ROLES.length, scenarios: scenarios.length };
}

function loadPack(dir = UAT_DIR, { final = false } = {}) {
  const pack = {};
  for (const [key, name] of Object.entries(FINAL_FILES)) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) { if (final || key !== 'signoff') pack[key] = null; continue; }
    pack[key] = readJson(file);
  }
  const manifestPath = path.join(ROOT, 'release', 'MAT-ERP-V2-RELEASE', 'release-manifest.json');
  pack.manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : null;
  return pack;
}

function validateFiles(dir = UAT_DIR, { final = false } = {}) {
  const pack = loadPack(dir, { final });
  const missing = [];
  for (const [key, name] of Object.entries(FINAL_FILES)) if ((final || key !== 'signoff') && !pack[key]) missing.push(`${name} belum tersedia/valid.`);
  if (final && !pack.manifest) missing.push('Release manifest belum tersedia.');
  const result = validatePack(pack, { final });
  return { ...result, errors: [...missing, ...result.errors], ok: !missing.length && result.ok };
}

if (require.main === module) {
  const final = String(process.argv[2] || 'readiness').toLowerCase() === 'validate';
  try {
    const result = validateFiles(UAT_DIR, { final });
    console.log(JSON.stringify({ mode: final ? 'FINAL' : 'READINESS', ...result }, null, 2));
    if (!result.ok) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { REQUIRED_ROLES, REQUIRED_RECONCILIATIONS, FINAL_FILES, validatePack, loadPack, validateFiles };
