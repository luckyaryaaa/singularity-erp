'use strict';
// Komponen bersama: ikon, chip status, tabel enterprise berpaginasi server,
// drawer detail kanan, dialog aksi (alasan/PIN), toast, empty state, wizard.
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, debounce, newIdemKey, api, query, invalidate, router, can, state } = window.MAT;

  // ── Ikon garis (stroke) — satu gaya, satu ketebalan ───────────────────────
  const I = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  window.ICONS = {
    grid: I('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
    check: I('<path d="m5 12 4 4L19 6"/>'),
    checkCircle: I('<path d="M9 11l2 2 4-4"/><circle cx="12" cy="12" r="9"/>'),
    bell: I('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>'),
    doc: I('<path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6"/>'),
    cart: I('<path d="M6 8h14l-2 9H8L6 4H3M9 21h.01M17 21h.01"/>'),
    box: I('<path d="m4 8 8-4 8 4-8 4zM4 8v8l8 4 8-4V8M12 12v8"/>'),
    factory: I('<path d="M4 20V10l6 4v-4l6 4V7h4v13zM7 20v-2M11 20v-2"/>'),
    shield: I('<path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4"/>'),
    wallet: I('<path d="M4 7h16v12H4zM4 10h16M8 15h3"/>'),
    ledger: I('<path d="M6 3h12v18H6zM9 7h6M9 11h6M9 15h3"/>'),
    tax: I('<path d="M7 3h10l3 3v15H7zM10 9h7M10 13h7M10 17h4"/>'),
    people: I('<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 11a3 3 0 0 1 5 2M17 20a5 5 0 0 0-3-4"/>'),
    payslip: I('<path d="M5 4h14v16H5zM8 8h8M8 12h4M8 16h8"/>'),
    chart: I('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
    gear: I('<circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7-.6-1.4.9-1.9-2.1-2.1-1.9.9-1.4-.6L10.5 3h-3l-.7 2-1.4.6-1.9-.9-2.1 2.1.9 1.9-.6 1.4-2 .7v3l2 .7.6 1.4-.9 1.9 2.1 2.1 1.9-.9 1.4.6.7 2h3l.7-2 1.4-.6 1.9.9 2.1-2.1-.9-1.9.6-1.4z"/>'),
    search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    arrow: I('<path d="M5 12h14m-5-5 5 5-5 5"/>'),
    refresh: I('<path d="M20 6v5h-5M4 18v-5h5M6.1 9a7 7 0 0 1 11.5-2.6L20 11M4 13l2.4 4.6A7 7 0 0 0 18 15"/>'),
    close: I('<path d="m6 6 12 12M18 6 6 18"/>'),
    menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    filter: I('<path d="M4 6h16M7 12h10M10 18h4"/>'),
    trend: I('<path d="m4 15 5-5 4 4 7-8M15 6h5v5"/>'),
    alert: I('<path d="M12 3 2 20h20zM12 10v5M12 18h.01"/>'),
    warning: I('<path d="M12 3 2 20h20zM12 10v5M12 18h.01"/>'),
    lock: I('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    clock: I('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>'),
    truck: I('<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>'),
    project: I('<path d="M4 6h6l2 2h8v11H4z"/>'),
    help: I('<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 3.2 2.4c-.9.4-.9 1.1-.9 1.6M12 17h.01"/>'),
    monitor: I('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 12l2.5-3 2 2L15 7"/>'),
    audit: I('<path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M12 8v4l2.5 2.5"/>'),
    job: I('<path d="M4 7h16v13H4zM8 7V5h8v2M4 12h16"/>'),
    logout: I('<path d="M9 21H5V3h4M15 16l4-4-4-4M19 12H9"/>'),
    inbox: I('<path d="M4 4h16v16H4zM4 13h5l1.5 3h3L15 13h5"/>'),
    wand: I('<path d="m14 6 4 4L7 21H3v-4zM13 3l1.5 1.5M19 5l1 1M20 11l1.5 1.5"/>'),
    building: I('<path d="M4 21V5l8-2v18M12 21h8V9l-8-2M7 9h.01M7 13h.01M7 17h.01M16 13h.01M16 17h.01"/>'),
    approval: I('<path d="M9 4h6v2H9zM7 4H5v16h14V4h-2M9 13l2 2 4-4"/>')
  };
  const ICONS = window.ICONS;

  // ── Meta status (chip + warna) — vocabulary konsisten seluruh modul ───────
  const STATUS_META = {
    DRAFT: ['Draft', 'gray'], SUBMITTED: ['Diajukan', 'blue'], WAITING_APPROVAL: ['Menunggu persetujuan', 'amber'],
    APPROVED: ['Disetujui', 'mint'], IN_PROCESS: ['Berjalan', 'blue'], COMPLETED: ['Selesai', 'mint'],
    CLOSED: ['Ditutup', 'gray'], REVISION_REQUIRED: ['Perlu revisi', 'amber'], REJECTED: ['Ditolak', 'coral'],
    CANCELLED: ['Dibatalkan', 'gray'], VOID: ['Void', 'coral'], ON_HOLD: ['Ditahan', 'amber'],
    EXPIRED: ['Kedaluwarsa', 'gray'], OVERDUE: ['Jatuh tempo', 'coral'], PARTIALLY_COMPLETED: ['Selesai sebagian', 'blue'],
    PARTIALLY_PAID: ['Dibayar sebagian', 'blue'], ARCHIVED: ['Diarsipkan', 'gray'],
    QUEUED: ['Antre', 'gray'], CLAIMED: ['Diambil worker', 'blue'], RUNNING: ['Diproses', 'blue'], PROCESSING: ['Diproses', 'blue'], SUCCEEDED: ['Selesai', 'mint'], DEAD_LETTER: ['Butuh intervensi', 'coral'], CANCELLED: ['Dibatalkan', 'gray'], FAILED: ['Gagal', 'coral'],
    QUARANTINED: ['Karantina', 'amber'], PENDING_SCAN: ['Menunggu scan', 'amber'], SCANNING: ['Dipindai', 'blue'], CLEAN: ['Aman', 'mint'], INFECTED: ['Terinfeksi', 'coral'], REJECTED: ['Ditolak', 'coral'],
    ACTION_REQUIRED: ['Perlu tindakan', 'amber'], WARNING: ['Peringatan', 'coral'], INFORMATION: ['Informasi', 'blue'],
    SUCCESS: ['Berhasil', 'mint'], SYSTEM_ALERT: ['Sistem', 'coral'], SELESAI: ['Selesai', 'mint'], BERJALAN: ['Berjalan', 'blue'], MENUNGGU: ['Menunggu', 'amber'],
    PRESENT: ['Hadir', 'mint'], LATE: ['Terlambat', 'amber'], ABSENT: ['Tidak hadir', 'coral'], LEAVE: ['Cuti', 'blue'], SICK: ['Sakit', 'amber'], REMOTE: ['Remote', 'blue'], OPEN: ['Belum dilaporkan', 'amber']
  };
  const chip = (status) => {
    const [label, tone] = STATUS_META[status] || [status, 'gray'];
    return `<span class="chip ${tone}">${esc(label)}</span>`;
  };

  // ── Toast ─────────────────────────────────────────────────────────────────
  let toastTimer = null;
  function toast(title, detail = '', tone = 'mint') {
    const el = document.getElementById('toast');
    el.className = `toast show ${tone}`;
    el.querySelector('svg').outerHTML = tone === 'coral' ? ICONS.alert : ICONS.check;
    el.querySelector('b').textContent = title;
    el.querySelector('small').textContent = detail;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
  }

  // ── Dialog aksi (konfirmasi + alasan + PIN Owner) ─────────────────────────
  function actionDialog({ title, description, requireReason = false, requirePin = false, confirmLabel = 'Konfirmasi', danger = false }) {
    return new Promise((resolve) => {
      const dialog = document.getElementById('actionDialog');
      dialog.innerHTML = `
        <form method="dialog" class="action-form">
          <h2>${esc(title)}</h2>
          <p>${esc(description)}</p>
          ${requireReason ? `<label class="field"><span>Alasan <b>*</b></span><textarea name="reason" rows="3" required placeholder="Tuliskan alasan tindakan ini — tercatat pada audit trail."></textarea></label>` : ''}
          ${requirePin ? `<label class="field"><span>PIN Owner <b>*</b></span><input name="pin" type="password" inputmode="numeric" autocomplete="one-time-code" required placeholder="••••••"></label>` : ''}
          <div class="dialog-actions">
            <button type="button" class="btn secondary" data-cancel>Batal</button>
            <button type="submit" class="btn ${danger ? 'danger' : 'primary'}">${esc(confirmLabel)}</button>
          </div>
        </form>`;
      const form = dialog.querySelector('form');
      dialog.querySelector('[data-cancel]').onclick = () => { dialog.close(); resolve(null); };
      form.onsubmit = (e) => {
        e.preventDefault();
        const data = new FormData(form);
        dialog.close();
        resolve({ reason: data.get('reason') || undefined, pin: data.get('pin') || undefined });
      };
      dialog.oncancel = () => resolve(null);
      dialog.showModal();
      const focusable = form.querySelector('textarea,input');
      if (focusable) focusable.focus();
    });
  }
  function formDialog({title,description='',fields=[],submitLabel='Simpan',initial={}}){return new Promise(resolve=>{const dialog=document.getElementById('actionDialog'),control=f=>{const value=initial[f.name]??f.value??'',required=f.required?'required':'',hint=f.hint?`<small>${esc(f.hint)}</small>`:'';if(f.type==='section')return`<div class="form-section"><span class="fs-ic" aria-hidden="true">${f.icon||''}</span><b>${esc(f.label)}</b>${hint}</div>`;if(f.type==='select')return`<label class="field"><span>${esc(f.label)}${f.required?' <b>*</b>':''}</span><select name="${esc(f.name)}" ${required}>${(f.options||[]).map(o=>{const pair=Array.isArray(o)?o:[o,o];return`<option value="${esc(pair[0])}" ${String(value)===String(pair[0])?'selected':''}>${esc(pair[1])}</option>`;}).join('')}</select>${hint}</label>`;if(f.type==='textarea')return`<label class="field"><span>${esc(f.label)}${f.required?' <b>*</b>':''}</span><textarea name="${esc(f.name)}" rows="${f.rows||3}" autocomplete="off" ${required}>${esc(value)}</textarea>${hint}</label>`;if(f.type==='checkbox')return`<label class="check-field"><input type="checkbox" name="${esc(f.name)}" ${value!==false?'checked':''}><span>${esc(f.label)}</span></label>`;return`<label class="field"><span>${esc(f.label)}${f.required?' <b>*</b>':''}</span><input name="${esc(f.name)}" type="${esc(f.type||'text')}" value="${esc(value)}" autocomplete="off" ${required} ${f.min!==undefined?`min="${esc(f.min)}"`:''} ${f.max!==undefined?`max="${esc(f.max)}"`:''} ${f.step?`step="${esc(f.step)}"`:''} ${f.list?`list="dl-${esc(f.name)}"`:''}>${f.list?`<datalist id="dl-${esc(f.name)}">${(f.list||[]).map(o=>`<option value="${esc(o)}"></option>`).join('')}</datalist>`:''}${hint}</label>`;};dialog.innerHTML=`<form method="dialog" class="action-form form-dialog" autocomplete="off"><h2>${esc(title)}</h2>${description?`<p>${esc(description)}</p>`:''}<div class="form-grid">${fields.map(control).join('')}</div><div class="dialog-actions"><button type="button" class="btn secondary" data-cancel>Batal</button><button type="submit" class="btn primary">${esc(submitLabel)}</button></div></form>`;const form=dialog.querySelector('form');dialog.querySelector('[data-cancel]').onclick=()=>{dialog.close();resolve(null);};form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;const fd=new FormData(form),out={};for(const f of fields){if(f.type==='section')continue;if(f.type==='checkbox')out[f.name]=form.elements[f.name].checked;else{const raw=fd.get(f.name);out[f.name]=f.type==='number'&&raw!==''?Number(raw):raw;}}dialog.close();resolve(out);};dialog.oncancel=()=>resolve(null);dialog.showModal();form.querySelector('input,select,textarea')?.focus();});}
  function secureValueDialog({title,description,value,label='Rahasia sekali tampil'}){
    return new Promise(resolve=>{
      const dialog=document.getElementById('actionDialog');
      dialog.innerHTML=`<section class="action-form secure-value-dialog" aria-labelledby="secureValueTitle">
        <p class="eyebrow">SECURE HANDOFF</p>
        <h2 id="secureValueTitle">${esc(title)}</h2>
        <p>${esc(description)}</p>
        <label class="field"><span>${esc(label)}</span>
          <textarea readonly rows="${String(value).includes('\n')?10:3}" spellcheck="false" autocomplete="off">${esc(value)}</textarea>
          <small>Nilai ini tidak disimpan di browser, toast, maupun audit trail.</small>
        </label>
        <p class="secure-copy-status" aria-live="polite"></p>
        <div class="dialog-actions">
          <button type="button" class="btn secondary" data-copy>${ICONS.copy||ICONS.doc} Salin</button>
          <button type="button" class="btn primary" data-done>Saya sudah simpan</button>
        </div>
      </section>`;
      const field=dialog.querySelector('textarea'),status=dialog.querySelector('.secure-copy-status');
      dialog.querySelector('[data-copy]').onclick=async()=>{
        try{await navigator.clipboard.writeText(String(value));status.textContent='Berhasil disalin ke clipboard.';}
        catch{field.focus();field.select();status.textContent='Pilih teks lalu salin manual.';}
      };
      dialog.querySelector('[data-done]').onclick=()=>{field.value='';dialog.close();resolve(true);};
      dialog.oncancel=(event)=>event.preventDefault();
      dialog.showModal();
      dialog.querySelector('[data-done]').focus();
    });
  }

  // ── Aksi dokumen (dipakai drawer, halaman detail, approval center) ────────
  const DOC_ACTIONS = {
    submit:  { label: 'Ajukan', perm: 'submit', from: ['DRAFT','REVISION_REQUIRED'] },
    approve: { label: 'Setujui', perm: 'approve', from: ['WAITING_APPROVAL'] },
    reject:  { label: 'Tolak', perm: 'approve', from: ['WAITING_APPROVAL'], reason: true, danger: true },
    revise:  { label: 'Minta revisi', perm: 'approve', from: ['WAITING_APPROVAL'], reason: true },
    start:   { label: 'Mulai proses', perm: 'post', from: ['APPROVED'] },
    complete:{ label: 'Selesaikan', perm: 'post', from: ['IN_PROCESS','PARTIALLY_COMPLETED'] },
    close:   { label: 'Tutup', perm: 'post', from: ['COMPLETED','PARTIALLY_PAID'] },
    cancel:  { label: 'Batalkan', perm: 'cancel', from: ['DRAFT','SUBMITTED','WAITING_APPROVAL','REVISION_REQUIRED','APPROVED'], reason: true, danger: true },
    void:    { label: 'Void', perm: 'void', from: ['APPROVED','IN_PROCESS','COMPLETED','CLOSED','PARTIALLY_PAID'], reason: true, danger: true, pin: true }
  };
  const PIN_TYPES = new Set(['INVOICE','CUSTOMER_PAYMENT','SUPPLIER_PAYMENT','PAYROLL_RUN']);
  const DOC_CONVERSIONS = { QUOTATION: ['SALES_ORDER','Sales Order'], CUSTOMER_PO: ['SALES_ORDER','Sales Order'], SALES_ORDER: ['PROJECT','Proyek'], PROJECT: ['WORK_ORDER','Work Order'], PURCHASE_REQUEST: ['PURCHASE_ORDER','Purchase Order'], PURCHASE_ORDER: ['GOODS_RECEIPT','Penerimaan Barang'], DELIVERY: ['INVOICE','Invoice'] };

  async function runDocAction(doc, action, moduleCode, onDone) {
    const spec = DOC_ACTIONS[action];
    const needsPin = (spec.pin && PIN_TYPES.has(doc.documentType)) || (action === 'approve' && doc.documentType === 'PAYROLL_RUN' && state.user.role === 'owner');
    const answers = (spec.reason || needsPin)
      ? await actionDialog({
          title: `${spec.label} ${doc.documentNumber}`,
          description: needsPin ? 'Tindakan kritis: identitas Owner diverifikasi dengan PIN dan seluruh perubahan tercatat pada audit trail.' : 'Tindakan ini tercatat pada audit trail beserta alasan Anda.',
          requireReason: spec.reason, requirePin: needsPin, confirmLabel: spec.label, danger: spec.danger
        })
      : {};
    if (answers === null) return;
    try {
      const updated = await api(`/api/documents/${doc.id}/action`, { method: 'POST', body: { action, ...answers }, idempotencyKey: newIdemKey() });
      invalidate('documents'); invalidate('approvals'); invalidate('dashboard'); invalidate(`doc:${doc.id}`);
      toast(`${doc.documentNumber} — ${STATUS_META[updated.status] ? STATUS_META[updated.status][0] : updated.status}`, `${spec.label} berhasil diproses.`);
      if (onDone) onDone(updated);
    } catch (error) {
      toast(`${spec.label} gagal`, error.message, 'coral');
    }
  }

  function actionButtonsFor(doc, moduleCode, compact = false) {
    const buttons = [];
    for (const [action, spec] of Object.entries(DOC_ACTIONS)) {
      if (!spec.from.includes(doc.status)) continue;
      if (!can(`${moduleCode}.${spec.perm}`)) continue;
      if (['approve','reject','revise'].includes(action) && doc.createdBy === state.user.id && state.user.role !== 'owner' && state.user.role !== 'admin') continue;
      buttons.push(`<button class="btn ${spec.danger ? 'danger-outline' : action === 'approve' || action === 'submit' ? 'primary' : 'secondary'} ${compact ? 'sm' : ''}" data-doc-action="${action}">${esc(spec.label)}</button>`);
    }
    return buttons.join('');
  }
  function conversionButtonFor(doc,compact=false){const spec=DOC_CONVERSIONS[doc.documentType];if(!spec||!['APPROVED','COMPLETED','CLOSED'].includes(doc.status)||!can(`${MODULE_OF_TYPE[spec[0]]}.create`))return'';const exists=(doc.relations||[]).some(r=>r.parentId===doc.id&&r.childType===spec[0]);if(exists)return'';return`<button class="btn secondary ${compact?'sm':''}" data-doc-convert>${ICONS.plus} Buat ${esc(spec[1])}</button>`;}
  async function runDocConversion(doc,onDone){const spec=DOC_CONVERSIONS[doc.documentType];if(!spec)return;const answer=await actionDialog({title:`Buat ${spec[1]}`,description:`Data ${doc.documentNumber} akan disalin menjadi draft ${spec[1]} dan relasinya dicatat permanen.`,confirmLabel:`Buat ${spec[1]}`});if(answer===null)return;try{const result=await api(`/api/documents/${doc.id}/convert`,{method:'POST',body:{},idempotencyKey:newIdemKey()});invalidate('documents');invalidate(`doc:${doc.id}`);toast(`${result.child.documentNumber} dibuat`,`${spec[1]} siap dilengkapi sebelum diajukan.`);if(onDone)onDone(result);}catch(error){toast(`Gagal membuat ${spec[1]}`,error.message,'coral');}}

  // ── Drawer detail kanan ───────────────────────────────────────────────────
  const MODULE_OF_TYPE = { CUSTOMER_INQUIRY: 'inquiry', QUOTATION: 'quotation', CUSTOMER_PO: 'customer_po', SALES_ORDER: 'sales_order', PROJECT: 'project', WORK_ORDER: 'work_order', PURCHASE_REQUEST: 'purchase_request', PURCHASE_ORDER: 'purchase_order', GOODS_RECEIPT: 'goods_receipt', QC_INSPECTION: 'quality', MATERIAL_ISSUE: 'material_issue', STOCK_TRANSFER: 'stock_transfer', STOCK_ADJUSTMENT: 'stock_adjustment', STOCK_OPNAME: 'stock_opname', DELIVERY: 'delivery', RMA: 'rma', INVOICE: 'invoice', CUSTOMER_PAYMENT: 'payment', SUPPLIER_INVOICE: 'supplier_invoice', SUPPLIER_PAYMENT: 'supplier_payment', EXPENSE: 'expense', JOURNAL: 'journal', PAYROLL_RUN: 'payroll', TAX_DOCUMENT: 'tax', LEAVE_REQUEST: 'leave' };
  const TYPE_LABEL = { CUSTOMER_INQUIRY: 'Inquiry', QUOTATION: 'Penawaran', CUSTOMER_PO: 'PO Pelanggan', SALES_ORDER: 'Sales Order', PROJECT: 'Proyek', WORK_ORDER: 'Work Order', PURCHASE_REQUEST: 'Purchase Request', PURCHASE_ORDER: 'Purchase Order', GOODS_RECEIPT: 'Penerimaan Barang', QC_INSPECTION: 'Quality Control', MATERIAL_ISSUE: 'Pengeluaran Material', STOCK_TRANSFER: 'Transfer Stok', STOCK_ADJUSTMENT: 'Penyesuaian Stok', STOCK_OPNAME: 'Stock Opname', DELIVERY: 'Pengiriman', RMA: 'Retur & Garansi (RMA)', INVOICE: 'Invoice', CUSTOMER_PAYMENT: 'Pembayaran Pelanggan', SUPPLIER_INVOICE: 'Tagihan Supplier', SUPPLIER_PAYMENT: 'Pembayaran Supplier', EXPENSE: 'Pengeluaran', JOURNAL: 'Jurnal', PAYROLL_RUN: 'Payroll', TAX_DOCUMENT: 'Dokumen Pajak', LEAVE_REQUEST: 'Pengajuan Cuti' };

  const AUDIT_LABEL = { CREATE: 'dibuat', UPDATE: 'diperbarui', SUBMIT: 'diajukan', APPROVE: 'disetujui', REJECT: 'ditolak', REQUEST_REVISION: 'diminta revisi', POST: 'diposting', PAY: 'dibayar', VOID: 'di-void', CANCEL: 'dibatalkan', ARCHIVE: 'diarsipkan', EXPORT: 'diekspor', LOGIN: 'masuk', LOGOUT: 'keluar' };

  let layerReturnFocus = null;
  function rememberLayerFocus() {
    const active = document.activeElement;
    layerReturnFocus = active instanceof HTMLElement ? active : null;
  }

  async function openDrawer(docId, { onChange } = {}) {
    const drawer = document.getElementById('drawer');
    const scrim = document.getElementById('scrim');
    rememberLayerFocus();
    document.getElementById('app').inert = true;
    drawer.classList.add('open'); scrim.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.querySelector('#drawerClose').focus({ preventScroll: true });
    const content = drawer.querySelector('#drawerContent');
    content.innerHTML = `<div class="drawer-loading"><span class="spinner"></span> Memuat detail…</div>`;

    let doc;
    try { doc = await query(`doc:${docId}`, () => api(`/api/documents/${docId}`), { staleMs: 10_000, force: true }); }
    catch (error) { content.innerHTML = `<div class="drawer-section"><p class="error-text">${esc(error.message)}</p></div>`; return; }

    const moduleCode = MODULE_OF_TYPE[doc.documentType] || 'document';
    drawer.querySelector('#drawerTitle').textContent = doc.documentNumber;
    drawer.querySelector('#drawerEyebrow').textContent = TYPE_LABEL[doc.documentType] || doc.documentType;

    const chain = (doc.approvalChain || []).map((step) => `
      <div class="chain-step ${step.done ? 'done' : ''}">
        <span class="chain-dot">${step.done ? ICONS.check : ''}</span>
        <span><b>${esc(step.level)}</b><small>${step.done ? `${esc(step.done.userName)} · ${fmtDateTime(step.done.at)}` : 'Menunggu'}</small></span>
      </div>`).join('');

    const trail = (doc.auditTrail || []).slice(0, 8).map((row) => `
      <div class="timeline-row">
        <span class="timeline-dot"></span>
        <span><b>${esc(AUDIT_LABEL[row.action] || row.action.toLowerCase())}</b> oleh ${esc(row.userName)}${row.reason ? ` — <i>"${esc(row.reason)}"</i>` : ''}<small>${fmtDateTime(row.occurredAt)}</small></span>
      </div>`).join('');

    content.innerHTML = `
      <div class="drawer-section">
        <div class="drawer-kpi">
          <span>Nilai dokumen<b>${fmtIDRFull(doc.amount)}</b></span>
          ${chip(doc.status)}
        </div>
      </div>
      <div class="drawer-section">
        <h3>Informasi utama</h3>
        <dl>
          <div><dt>Judul</dt><dd>${esc(doc.title)}</dd></div>
          <div><dt>Relasi</dt><dd>${esc(doc.partyName || '—')}</dd></div>
          <div><dt>Jatuh tempo</dt><dd>${fmtDate(doc.dueDate)}</dd></div>
          <div><dt>Versi</dt><dd>v${doc.version}</dd></div>
          <div><dt>Dibuat</dt><dd>${esc(doc.createdByName)} · ${fmtDate(doc.createdAt)}</dd></div>
          <div><dt>Diperbarui</dt><dd>${esc(doc.updatedByName)} · ${relTime(doc.updatedAt)}</dd></div>
        </dl>
      </div>
      ${chain ? `<div class="drawer-section"><h3>Rantai persetujuan</h3><div class="chain">${chain}</div></div>` : ''}
      ${trail ? `<div class="drawer-section"><h3>Jejak audit</h3><div class="timeline">${trail}</div></div>` : ''}
      <div class="drawer-actions">
        <a class="btn secondary" href="#/doc/${esc(doc.id)}">Detail lengkap</a>
        <a class="btn secondary" id="drawerPdf" href="/api/documents/${esc(doc.id)}/official-pdf" target="_blank" rel="noopener">${ICONS.doc} Cetak resmi</a>
        <button class="btn secondary" id="drawerEmail">${ICONS.inbox} Email</button>
        ${conversionButtonFor(doc,true)}
        ${actionButtonsFor(doc, moduleCode, true)}
      </div>`;

    content.querySelectorAll('[data-doc-action]').forEach((btn) => {
      btn.addEventListener('click', () => runDocAction(doc, btn.dataset.docAction, moduleCode, () => {
        closeLayers();
        if (onChange) onChange();
      }));
    });
    const convert=content.querySelector('[data-doc-convert]');if(convert)convert.addEventListener('click',()=>runDocConversion(doc,()=>{closeLayers();if(onChange)onChange();}));
    // Sprint 15: kirim dokumen resmi via email (SMTP; SKIPPED aman bila belum
    // dikonfigurasi) — kode verifikasi keaslian ikut dalam badan email.
    content.querySelector('#drawerEmail')?.addEventListener('click', async () => {
      const value = await formDialog({ title: `Kirim ${doc.documentNumber} via email`, description: 'Isi email berisi ringkasan dokumen + kode verifikasi keaslian. Butuh konfigurasi MAT_SMTP_* di server.', fields: [
        { name: 'to', label: 'Email tujuan', required: true },
        { name: 'subject', label: 'Subjek (opsional)' },
        { name: 'message', label: 'Pesan pembuka (opsional)', type: 'textarea' }
      ], submitLabel: 'Kirim email' });
      if (!value) return;
      try {
        const r = await api(`/api/documents/${doc.id}/email`, { method: 'POST', body: value });
        toast(r.status === 'SENT' ? 'Email terkirim' : 'Email dilewati', `${r.message} Kode verifikasi: ${r.verifyCode}`, r.status === 'SENT' ? undefined : 'coral');
      } catch (error) { toast('Gagal mengirim email', error.message, 'coral'); }
    });
  }

  function closeLayers() {
    const drawer = document.getElementById('drawer');
    const wasOpen = drawer.classList.contains('open') || document.querySelector('.sidebar').classList.contains('open');
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.getElementById('app').inert = false;
    document.getElementById('scrim').classList.remove('open');
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.remove('open');
    sidebar.removeAttribute('role');
    sidebar.removeAttribute('aria-modal');
    document.querySelector('.shell').inert = false;
    const menuButton = document.getElementById('menuBtn');
    const desktopRail = window.matchMedia('(min-width:1101px)').matches;
    menuButton.setAttribute('aria-expanded', desktopRail ? String(!document.getElementById('app').classList.contains('sidebar-collapsed')) : 'false');
    if (wasOpen && layerReturnFocus && layerReturnFocus.isConnected) layerReturnFocus.focus({ preventScroll: true });
    layerReturnFocus = null;
  }

  // ── Empty / clay orb / KPI helpers ───────────────────────────────────────
  const clayOrb = (tone, icon) => `<div class="clay-orb ${tone}">${ICONS[icon] || icon}</div>`;
  const kpiCard = ({ label, value, note, tone = '', orb, orbTone = 'blue' }) => `
    <article class="metric">
      <div class="metric-top"><span class="metric-label">${esc(label)}</span><span class="clay-icon ${orbTone}">${ICONS[orb]}</span></div>
      <strong>${value}</strong><small class="${tone}">${note}</small>
    </article>`;

  const pageHead = ({ eyebrow, title, sub, actions = '' }) => `
    <section class="page-head">
      <div><p class="eyebrow"><span></span> ${esc(eyebrow)}</p><h1>${esc(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div>
      <div class="head-actions">${actions}</div>
    </section>`;

  window.UI = { ICONS, chip, STATUS_META, toast, actionDialog, formDialog, secureValueDialog, openDrawer, closeLayers, rememberLayerFocus, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL };
})();
