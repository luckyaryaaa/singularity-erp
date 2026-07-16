'use strict';
// Definisi seluruh halaman. Satu pola: route → permission → render(main).
// Semua daftar memakai paginasi server, debounce 400 ms, pembatalan request.
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;

  const progressBar = (pct) => { const value = Math.min(100, Math.max(0, Number(pct) || 0)); return `<div class="progress"><progress max="100" value="${value}" aria-label="Progres ${value}%"></progress><span>${value}%</span></div>`; };
  const docCell = (row) => `<b>${esc(row.documentNumber)}</b><small>${esc(row.title)}</small>`;

  // ── Pabrik halaman daftar dokumen ─────────────────────────────────────────
  function docListPage({ type, module, title, eyebrow, statuses, columns, createLabel, createRoute, empty, rowRoute, onCreate }) {
    const cols = columns || [
      { label: 'Dokumen', sort: 'document_number', render: docCell },
      { label: 'Relasi', render: (r) => esc(r.partyName || '—') },
      { label: 'Nilai', sort: 'amount', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
      { label: 'Jatuh tempo', sort: 'due_date', render: (r) => fmtDate(r.dueDate) },
      { label: 'Status', sort: 'status', render: (r) => chip(r.status) },
      { label: 'Diperbarui', sort: 'updated_at', render: (r) => `<small>${relTime(r.updatedAt)}</small>` }
    ];
    return {
      permission: `${module}.view`,
      onEvent() { if (this._table) this._table.reload(); },
      render(main) {
        main.innerHTML = pageHead({
          eyebrow, title,
          sub: `Kelola dokumen ${title.toLowerCase()} dengan persetujuan berjenjang dan jejak audit penuh.`,
          actions: (createLabel && can(`${module}.create`)) ? `<button class="btn secondary" id="pgExport">${ICONS.job} Ekspor</button>${onCreate ? `<button class="btn primary" id="pgCreateInline">${ICONS.plus} ${esc(createLabel)}</button>` : `<a class="btn primary" href="${createRoute || '#'}" id="pgCreate">${ICONS.plus} ${esc(createLabel)}</a>`}` : `<button class="btn secondary" id="pgExport">${ICONS.job} Ekspor</button>`
        }) + `<section id="pgTable"></section>`;
        this._table = dataTable(main.querySelector('#pgTable'), {
          key: `documents:${type}`, endpoint: '/api/documents', params: { type },
          title: `Daftar ${title.toLowerCase()}`, eyebrow, columns: cols, sort: 'updated_at:desc',
          statusFilter: statuses || ['DRAFT','WAITING_APPROVAL','APPROVED','IN_PROCESS','COMPLETED','CLOSED','REJECTED','OVERDUE'],
          onRow: rowRoute ? (row) => router.go(rowRoute(row)) : (row, refresh) => openDrawer(row.id, { onChange: refresh }),
          empty
        });
        main.querySelector('#pgCreateInline')?.addEventListener('click', () => onCreate(() => this._table.reload()));
        const exportBtn = main.querySelector('#pgExport');
        if (exportBtn) exportBtn.addEventListener('click', async () => {
          try {
            await api('/api/jobs', { method: 'POST', body: { type: 'EXPORT_EXCEL', params: { type } } });
            toast('Ekspor dijadwalkan', 'Berjalan di latar belakang — pantau di Sistem → Job.');
          } catch (error) { toast('Ekspor gagal', error.message, 'coral'); }
        });
        if (!can(`${module}.create`) || !createRoute) {
          const createBtn = main.querySelector('#pgCreate');
          if (createBtn && !createRoute) createBtn.remove();
        }
      }
    };
  }

  function masterPage({ endpoint, key, permission, title, eyebrow, columns, fields, empty, detailType }) {
    return {
      permission,
      async render(main) {
        const module=permission.split('.')[0],editable=can(`${module}.edit`),creatable=can(`${module}.create`),importable=can(`${module}.import`),resolved=(typeof fields==='function'?await fields():fields)||[],importModule=endpoint.replace('/api/','');
        // Master enterprise: baris membuka halaman detail bertab. Master lain: edit inline.
        const openRow = detailType ? (row) => router.go(`#/masters/${detailType}/detail/${row.id}`) : (editable ? async(row,reload)=>{const value=await formDialog({title:`Edit ${title}`,description:'Perubahan langsung dicatat pada audit trail.',fields:resolved,initial:row,submitLabel:'Simpan perubahan'});if(!value)return;try{await api(`${endpoint}/${row.id}`,{method:'PATCH',body:value});invalidate(key);toast(`${title} diperbarui`,row.name||row.code);reload();}catch(error){toast('Perubahan gagal',error.message,'coral');}} : null);
        main.innerHTML = pageHead({ eyebrow, title, sub: detailType ? 'Klik baris untuk membuka profil enterprise lengkap (kontak, dokumen, riwayat, dan tata kelola).' : 'Master data adalah fondasi seluruh transaksi — jaga tetap akurat.',actions:`${importable ? `<button class="btn secondary" id="masterImport">${ICONS.job} Import CSV</button><input id="masterFile" type="file" accept=".csv,text/csv" hidden>` : ''}${creatable?`<button class="btn primary" id="masterCreate">${ICONS.plus} Tambah ${esc(title)}</button>`:''}` }) + '<section id="pgTable"></section>';
        this._table=dataTable(main.querySelector('#pgTable'), { key, endpoint, params: {}, title: `Daftar ${title.toLowerCase()}`, eyebrow, columns, staleMs: 900_000, empty,onRow:openRow });
        const create=main.querySelector('#masterCreate');if(create)create.addEventListener('click',async()=>{const value=await formDialog({title:`Tambah ${title}`,description:'Isi data utama. Kolom bertanda bintang wajib diisi.',fields:resolved,submitLabel:`Tambah ${title}`});if(!value)return;try{const item=await api(endpoint,{method:'POST',body:value});invalidate(key);toast(`${title} ditambahkan`,item.name||item.code);this._table.reload();}catch(error){toast('Penyimpanan gagal',error.message,'coral');}});
        const picker=main.querySelector('#masterFile');main.querySelector('#masterImport')?.addEventListener('click',()=>picker.click());picker?.addEventListener('change',async()=>{const file=picker.files[0];if(!file)return;try{const saved=await uploadFile(`/api/files?module=${encodeURIComponent(module)}`,file);await api('/api/jobs',{method:'POST',body:{type:'IMPORT_CSV',params:{module:importModule,fileId:saved.id}}});toast('Import dijadwalkan',`${file.name} diproses di latar belakang.`);}catch(error){toast('Import gagal',error.message,'coral');}});
      }
    };
  }


  window.PageKit = { progressBar, docCell, docListPage, masterPage };
})();
