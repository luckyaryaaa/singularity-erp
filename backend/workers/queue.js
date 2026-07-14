'use strict';
// Antrean kerja latar belakang: prioritas tinggi/sedang/rendah, batas konkurensi,
// batas job aktif per pengguna, status terpantau, notifikasi saat selesai.

const { store } = require('../infrastructure/database/store');
const { uid, nowIso } = require('../core/util');
const { AppError } = require('../core/errors');
const events = require('../core/events');
const notifications = require('../core/notifications');

const PRIORITY = { high: 0, medium: 1, low: 2 };
const JOB_TYPES = {
  GENERATE_PDF:     { priority: 'medium', label: 'Pembuatan PDF', durationMs: 350 },
  PAYROLL_SLIPS:    { priority: 'medium', label: 'Slip gaji massal', durationMs: 600 },
  EXPORT_EXCEL:     { priority: 'low',    label: 'Ekspor Excel', durationMs: 500, perUserLimit: 2 },
  IMPORT_CSV:       { priority: 'low',    label: 'Impor CSV', durationMs: 500, perUserLimit: 1 },
  IMAGE_COMPRESS:   { priority: 'low',    label: 'Kompresi gambar', durationMs: 250, perUserLimit: 2 },
  REPORT_GENERATE:  { priority: 'medium', label: 'Pembuatan laporan', durationMs: 700 },
  NOTIFICATION_SEND:{ priority: 'high',   label: 'Pengiriman notifikasi', durationMs: 120 },
  BACKUP_RUN:       { priority: 'low',    label: 'Backup terjadwal', durationMs: 800 },
  ARCHIVE_RUN:      { priority: 'low',    label: 'Arsip data lama', durationMs: 600 },
  RECONCILIATION:   { priority: 'low',    label: 'Rekonsiliasi besar', durationMs: 900 }
};

const MAX_CONCURRENT = 3;
let running = 0;
let processedTotal = 0;
let failedTotal = 0;
const waiting = [];

function enqueue({ type, user, params = {} }) {
  const spec = JOB_TYPES[type];
  if (!spec) throw new AppError('VALIDATION_ERROR', `Tipe job '${type}' tidak dikenal.`);
  const jobs = store.collection('jobs');
  if (spec.perUserLimit) {
    const active = jobs.count((row) => row.requestedBy === user.id && row.type === type && ['QUEUED','PROCESSING'].includes(row.status));
    if (active >= spec.perUserLimit) throw new AppError('JOB_LIMIT', `Maksimal ${spec.perUserLimit} job '${spec.label}' aktif per pengguna.`);
  }
  const job = jobs.insert({
    id: uid(), type, label: spec.label, priority: spec.priority, params,
    status: 'QUEUED', progress: 0,
    requestedBy: user.id, requestedByName: user.displayName,
    createdAt: nowIso(), startedAt: null, finishedAt: null, result: null, error: null
  });
  waiting.push(job.id);
  events.publish('job.updated', { entityId: job.id, status: 'QUEUED', jobType: type });
  setImmediate(pump);
  return job;
}

function pump() {
  if (running >= MAX_CONCURRENT || !waiting.length) return;
  const jobs = store.collection('jobs');
  // Ambil job antrean dengan prioritas tertinggi (angka terkecil), FIFO dalam prioritas.
  waiting.sort((a, b) => {
    const ja = jobs.get(a); const jb = jobs.get(b);
    return (PRIORITY[ja.priority] - PRIORITY[jb.priority]) || (ja.createdAt < jb.createdAt ? -1 : 1);
  });
  const id = waiting.shift();
  const job = jobs.get(id);
  if (!job) return pump();
  running += 1;
  jobs.update(id, { status: 'PROCESSING', startedAt: nowIso(), progress: 10 });
  events.publish('job.updated', { entityId: id, status: 'PROCESSING', jobType: job.type });

  const spec = JOB_TYPES[job.type];
  setTimeout(() => {
    try {
      const result = execute(job);
      jobs.update(id, { status: 'COMPLETED', progress: 100, finishedAt: nowIso(), result });
      processedTotal += 1;
      notifications.notify({ userId: job.requestedBy, category: 'SUCCESS', title: `${job.label} selesai`, body: result.summary, link: '#/system/jobs', dedupeKey: `job:${id}` });
      events.publish('job.updated', { entityId: id, status: 'COMPLETED', jobType: job.type });
    } catch (error) {
      failedTotal += 1;
      jobs.update(id, { status: 'FAILED', finishedAt: nowIso(), error: error.message });
      notifications.notify({ userId: job.requestedBy, category: 'SYSTEM_ALERT', title: `${job.label} gagal`, body: error.message, link: '#/system/jobs', dedupeKey: `job:${id}` });
      events.publish('job.updated', { entityId: id, status: 'FAILED', jobType: job.type });
    } finally {
      running -= 1;
      setImmediate(pump);
    }
  }, spec.durationMs).unref();
}

// Eksekusi job simulasi deterministik — kontrak hasil sama dengan worker produksi.
function execute(job) {
  const docs = store.collection('documents');
  switch (job.type) {
    case 'EXPORT_EXCEL': {
      const rows = docs.count((d) => !job.params.type || d.documentType === job.params.type);
      return { summary: `${rows} baris diekspor ke ${job.params.type || 'semua dokumen'}.xlsx`, artifact: `export-${job.id.slice(0, 8)}.xlsx`, rows };
    }
    case 'GENERATE_PDF':
      return { summary: `PDF ${job.params.documentNumber || 'dokumen'} dibuat.`, artifact: `${job.params.documentNumber || 'dokumen'}.pdf` };
    case 'PAYROLL_SLIPS': {
      const count = store.collection('employees').count((e) => e.active);
      return { summary: `${count} slip gaji dibuat untuk periode ${job.params.period || 'berjalan'}.`, artifact: `payslips-${job.params.period || 'current'}.zip` };
    }
    case 'BACKUP_RUN': {
      const backup = { id: uid(), at: nowIso(), sizeMb: 428, checksum: 'sha256:ok', restoreTested: true, target: 'NAS + offsite terenkripsi' };
      store.collection('backups').insert(backup);
      return { summary: `Backup 428 MB tersimpan, checksum terverifikasi, restore drill lulus.`, backupId: backup.id };
    }
    case 'REPORT_GENERATE':
      return { summary: `Laporan ${job.params.report || 'operasional'} selesai dibuat.`, artifact: `report-${job.id.slice(0, 8)}.pdf` };
    default:
      return { summary: `${job.label} selesai diproses.` };
  }
}

function stats() {
  const jobs = store.collection('jobs');
  return {
    maxConcurrent: MAX_CONCURRENT,
    running,
    queued: waiting.length,
    processedTotal, failedTotal,
    failed: jobs.count((row) => row.status === 'FAILED')
  };
}

module.exports = { enqueue, stats, JOB_TYPES };
