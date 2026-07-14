'use strict';
// Persistensi durable untuk abstraksi penyimpanan: snapshot JSON atomik dengan
// debounce tulis, rotasi backup, dan flush sinkron saat proses berhenti.
// Data bertahan lintas restart. Jalur scale-up: PostgreSQL (data/migrations).

const fs = require('node:fs');
const path = require('node:path');

const state = {
  store: null,
  filePath: null,
  dirty: false,
  timer: null,
  lastSavedAt: null,
  saveCount: 0,
  enabled: false
};

const DEBOUNCE_MS = 400;

function init(store, filePath) {
  state.store = store;
  state.filePath = filePath;
  state.enabled = true;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  let loaded = false;
  for (const candidate of [filePath, `${filePath}.bak`]) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const snapshot = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      for (const [name, rows] of Object.entries(snapshot.collections || {})) {
        const collection = store.collection(name);
        for (const row of rows) collection.rows.set(row.id, row);
      }
      state.lastSavedAt = snapshot.savedAt || null;
      loaded = true;
      break;
    } catch (error) {
      // Snapshot korup: coba backup berikutnya, jangan hentikan boot.
      console.error(JSON.stringify({ level: 'error', service: 'persistence', message: `Snapshot ${path.basename(candidate)} korup: ${error.message}` }));
    }
  }

  store.onChange = markDirty;
  process.on('exit', () => { if (state.dirty) flush(); });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => { if (state.dirty) flush(); process.exit(0); });
  }
  return loaded;
}

function markDirty() {
  if (!state.enabled) return;
  state.dirty = true;
  if (state.timer) return;
  state.timer = setTimeout(() => { state.timer = null; flush(); }, DEBOUNCE_MS);
  state.timer.unref();
}

// Tulis atomik: tmp → rename; salinan sebelumnya menjadi .bak.
function flush() {
  if (!state.enabled || !state.store) return;
  try {
    const collections = {};
    for (const [name, collection] of state.store.collections) {
      collections[name] = [...collection.rows.values()];
    }
    const payload = JSON.stringify({ savedAt: new Date().toISOString(), version: 1, collections });
    const tmp = `${state.filePath}.tmp`;
    fs.writeFileSync(tmp, payload);
    if (fs.existsSync(state.filePath)) fs.copyFileSync(state.filePath, `${state.filePath}.bak`);
    fs.renameSync(tmp, state.filePath);
    state.dirty = false;
    state.lastSavedAt = new Date().toISOString();
    state.saveCount += 1;
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', service: 'persistence', message: `Gagal menyimpan snapshot: ${error.message}` }));
  }
}

function stats() {
  let sizeKb = 0;
  try { if (state.filePath && fs.existsSync(state.filePath)) sizeKb = Math.round(fs.statSync(state.filePath).size / 1024); } catch { /* nonkritis */ }
  return { enabled: state.enabled, file: state.filePath, lastSavedAt: state.lastSavedAt, saveCount: state.saveCount, sizeKb, dirty: state.dirty };
}

module.exports = { init, flush, stats, markDirty };
