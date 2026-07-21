'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey , asList } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  const productionCockpit = {
    permission: 'production.view',
    async render(main, params) {
      const d = await api(`/api/work-orders/${params.id}/production`);
      const doc = d.document, prod = doc.payload?.production, cost = d.costing;
      const planned = d.materials.length > 0;
      const canPlan = can('production.create') && !planned && ['APPROVED', 'IN_PROCESS'].includes(doc.status);
      const canIssue = can('material_issue.create') && planned && d.materials.some((m) => Number(m.plannedQty) > Number(m.issuedQty));
      const canFinish = can('production.post') && planned && doc.status === 'IN_PROCESS' && !d.finishedReceipts.length;
      const OP_CHIP = { PENDING: 'gray', IN_PROGRESS: 'blue', DONE: 'mint' };
      main.innerHTML = pageHead({
        eyebrow: 'PRODUKSI · COCKPIT', title: doc.documentNumber, sub: `${esc(doc.title)} · qty ${doc.payload?.qty || 1} · ${esc(doc.partyName || '')}`,
        actions: `${canPlan ? `<button class="btn primary" id="woPlan">${ICONS.wand} Rencanakan produksi</button>` : ''}
          ${canIssue ? `<button class="btn secondary" id="woIssue">${ICONS.box} Keluarkan material</button>` : ''}
          ${canFinish ? `<button class="btn primary" id="woFinish">${ICONS.check} Selesaikan & terima FG</button>` : ''}
          <button class="btn secondary" id="woDoc">Dokumen ${ICONS.arrow}</button>`
      }) + `
        <section class="metrics">
          ${kpiCard({ label: 'Status WO', value: doc.status, note: prod ? `BOM rev ${prod.bomRevision}` : 'Belum direncanakan', orb: 'factory', orbTone: 'blue' })}
          ${kpiCard({ label: 'Biaya material', value: fmtIDR(cost.materialCost), note: `Rencana ${fmtIDR(prod?.plannedMaterial || 0)}`, orb: 'box', orbTone: 'amber' })}
          ${kpiCard({ label: 'Biaya tenaga kerja', value: fmtIDR(cost.laborCost), note: 'Jam aktual × rate snapshot', orb: 'clock', orbTone: 'lavender' })}
          ${kpiCard({ label: 'Total / unit', value: fmtIDR(cost.costPerUnit), note: prod?.costing ? `Variance vs standar ${fmtIDR(prod.costing.variance)}` : `Total ${fmtIDR(cost.totalCost)}`, tone: prod?.costing?.variance > 0 ? 'warn' : 'up', orb: 'wallet', orbTone: 'mint' })}
        </section>
        ${prod?.shortage?.length ? `<section class="panel"><div class="panel-body"><p><span class="chip coral">Kekurangan stok</span> ${prod.shortage.map((s) => `${esc(s.code)} kurang ${s.shortQty}`).join(' · ')} — jalankan MRP untuk saran pembelian.</p></div></section>` : ''}
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">ROUTING</p><h2>Operasi & jam kerja</h2></div></header>
            <div class="table-wrap"><table><thead><tr><th>#</th><th>Operasi</th><th>Work center</th><th class="right">Rencana</th><th class="right">Aktual</th><th class="right">Biaya</th><th>Status</th><th></th></tr></thead>
            <tbody>${d.operations.map((o) => `<tr><td>${o.opNo}</td><td><b>${esc(o.name)}</b></td><td>${esc(o.workCenterName)}<small>${fmtIDRFull(o.hourlyRateSnapshot)}/jam</small></td>
              <td class="right">${o.plannedHours} j</td><td class="right"><b>${o.actualHours} j</b></td><td class="right money">${fmtIDRFull(o.actualHours * o.hourlyRateSnapshot)}</td>
              <td><span class="chip ${OP_CHIP[o.status]}">${esc(o.status)}</span></td>
              <td>${can('production.edit') && o.status !== 'DONE' && ['APPROVED', 'IN_PROCESS'].includes(doc.status) ? `<div class="row-actions"><button class="btn secondary sm" data-optime="${o.id}">+ Jam</button><button class="btn primary sm" data-opdone="${o.id}">Selesai</button></div>` : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="table-loading">Belum ada routing — rencanakan produksi dahulu.</td></tr>'}</tbody></table></div>
          </article>
          <article class="panel"><header><div><p class="eyebrow">MATERIAL (BOM)</p><h2>Rencana vs realisasi</h2></div></header>
            <div class="table-wrap"><table><thead><tr><th>Komponen</th><th class="right">Rencana</th><th class="right">Reservasi</th><th class="right">Terpakai</th><th class="right">Biaya</th></tr></thead>
            <tbody>${d.materials.map((m) => `<tr><td><b>${esc(m.productCode)}</b><small>${esc(m.productName)}</small></td><td class="right">${Number(m.plannedQty)} ${esc(m.uom || '')}</td>
              <td class="right">${Number(m.reservedQty)}</td><td class="right"><b>${Number(m.issuedQty)}</b></td><td class="right money">${fmtIDRFull(Number(m.issuedQty) * Number(m.unitCostSnapshot))}</td></tr>`).join('') || '<tr><td colspan="5" class="table-loading">Belum ada rencana material.</td></tr>'}</tbody></table></div>
            <div class="panel-body stack">
              ${d.issues.length ? `<div class="stat-row"><span>Material issue</span><b>${d.issues.map((x) => `<a href="#/doc/${x.id}">${esc(x.documentNumber)}</a> ${chip(x.status)}`).join(' · ')}</b></div>` : ''}
              ${d.finishedReceipts.length ? `<div class="stat-row"><span>Penerimaan barang jadi</span><b>${d.finishedReceipts.map((x) => `<a href="#/doc/${x.id}">${esc(x.documentNumber)}</a> ${chip(x.status)}`).join(' · ')}</b></div>` : ''}
              <p class="muted">Alur: rencanakan (BOM + reservasi) → keluarkan material (draft MI, konsumsi lot FIFO saat selesai) → catat jam → selesaikan (job costing + FG masuk ber-lot).</p>
            </div>
          </article>
        </section>`;
      main.querySelector('#woDoc').addEventListener('click', () => openDrawer(doc.id, { onChange: () => this.render(main, params) }));
      main.querySelector('#woPlan')?.addEventListener('click', async () => {
        try {
          const [wcs, locations] = await Promise.all([api('/api/production/work-centers').catch(() => null), api('/api/production/stock-locations').catch(() => null)]);
          const options = wcs?.items?.length ? wcs.items.map((w) => [w.id, `${w.code} · ${w.name} (${fmtIDR(w.hourlyRate)}/jam)`]) : null;
          const locationOptions = locations?.items?.length ? locations.items.map((w) => [w.id, `${w.orgWarehouseCode || w.code} · ${w.name} (${w.branchName})`]) : null;
          if (!options) { toast('Work center tidak tersedia', 'Lengkapi master work center pada modul organisasi.', 'coral'); return; }
          if (!locationOptions) { toast('Lokasi stok tidak tersedia', 'Aktifkan cabang dan master gudang organisasi terlebih dahulu.', 'coral'); return; }
          const value = await formDialog({ title: 'Rencanakan produksi', description: 'Material meledak dari BOM manufacturing EFFECTIVE dan stok tersedia langsung direservasi. Rate work center di-snapshot.', fields: [
            { name: 'warehouseId', label: 'Lokasi stok produksi', type: 'select', options: locationOptions, required: true },
            { name: 'workCenterId', label: 'Work center operasi #1', type: 'select', options, required: true },
            { name: 'opName', label: 'Nama operasi', required: true },
            { name: 'plannedHours', label: 'Rencana jam', type: 'number', min: 0, required: true }
          ], submitLabel: 'Rencanakan + reservasi' });
          if (!value) return;
          const r = await api(`/api/work-orders/${doc.id}/plan`, { method: 'POST', idempotencyKey: newIdemKey(), body: { warehouseId: value.warehouseId, operations: [{ workCenterId: value.workCenterId, name: value.opName, plannedHours: Number(value.plannedHours) }] } });
          toast('Produksi direncanakan', `${r.materials} material · rencana ${fmtIDR(r.plannedMaterial + r.plannedLabor)}${r.shortage.length ? ` · ${r.shortage.length} komponen kurang stok` : ''}`);
          this.render(main, params);
        } catch (error) { toast('Perencanaan gagal', error.message, 'coral'); }
      });
      main.querySelector('#woIssue')?.addEventListener('click', async () => {
        try { const mi = await api(`/api/work-orders/${doc.id}/issue-materials`, { method: 'POST', idempotencyKey: newIdemKey(), body: {} }); toast('Draft MI dibuat', `${mi.documentNumber} — proses sampai selesai untuk konsumsi lot FIFO.`); openDrawer(mi.id, { onChange: () => this.render(main, params) }); }
        catch (error) { toast('Gagal membuat MI', error.message, 'coral'); }
      });
      main.querySelector('#woFinish')?.addEventListener('click', async () => {
        const answer = await actionDialog({ title: `Selesaikan ${doc.documentNumber}`, description: 'Semua operasi harus DONE dan MI selesai. Job costing final dihitung dan draft penerimaan barang jadi dibuat (lot produksi).', confirmLabel: 'Hitung costing + buat FG' });
        if (!answer) return;
        try { const r = await api(`/api/work-orders/${doc.id}/finish`, { method: 'POST', idempotencyKey: newIdemKey(), body: {} }); toast('Produksi selesai dihitung', `${r.finishedReceipt} · total ${fmtIDR(r.costing.totalCost)} · variance ${fmtIDR(r.costing.variance)}`); this.render(main, params); }
        catch (error) { toast('Penyelesaian gagal', error.message, 'coral'); }
      });
      main.querySelectorAll('[data-optime]').forEach((b) => b.addEventListener('click', async () => {
        const value = await formDialog({ title: 'Catat jam kerja', description: 'Jam tercatat append-only; koreksi memakai nilai negatif ber-alasan.', fields: [{ name: 'hours', label: 'Jam', type: 'number', required: true }, { name: 'note', label: 'Catatan' }], submitLabel: 'Catat' });
        if (!value) return;
        try { const r = await api(`/api/production/operations/${b.dataset.optime}/time`, { method: 'POST', idempotencyKey: newIdemKey(), body: { hours: Number(value.hours), note: value.note } }); toast('Jam dicatat', `Total ${r.totalHours} jam · ${fmtIDR(r.cost)}`); this.render(main, params); }
        catch (error) { toast('Gagal mencatat jam', error.message, 'coral'); }
      }));
      main.querySelectorAll('[data-opdone]').forEach((b) => b.addEventListener('click', async () => {
        try { await api(`/api/production/operations/${b.dataset.opdone}/complete`, { method: 'POST', idempotencyKey: newIdemKey(), body: {} }); toast('Operasi selesai', ''); this.render(main, params); }
        catch (error) { toast('Gagal', error.message, 'coral'); }
      }));
    }
  };

  const qcInspectionDetail = {
    permission: 'quality.view',
    async render(main, params) {
      const [doc, list] = await Promise.all([api(`/api/documents/${params.id}`), api(`/api/quality/${params.id}/inspections`)]);
      const RESULT_CHIP = { PASS: 'mint', FAIL: 'coral', PARTIAL: 'amber' };
      const canInspect = can('quality.create') && !['CLOSED', 'CANCELLED', 'VOID', 'REJECTED'].includes(doc.status);
      main.innerHTML = pageHead({
        eyebrow: 'PRODUKSI · QC', title: doc.documentNumber, sub: `${esc(doc.title)} · inspeksi incoming / in-process / final dengan NCR + karantina lot otomatis`,
        actions: `${canInspect ? `<button class="btn primary" id="qcAdd">${ICONS.plus} Catat inspeksi</button>` : ''}<button class="btn secondary" id="qcDoc">Dokumen ${ICONS.arrow}</button>`
      }) + `
        <section class="panel"><header><div><p class="eyebrow">HASIL INSPEKSI</p><h2>${list.items.length} pencatatan</h2></div>${chip(doc.status)}</header>
          <div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Tipe</th><th>Lot / Produk</th><th class="right">Sampel</th><th class="right">Lulus</th><th class="right">Gagal</th><th>Hasil</th><th>NCR / Defect</th><th>Root cause & CAPA</th></tr></thead>
          <tbody>${list.items.map((r) => `<tr><td>${relTime(r.inspectedAt)}<small>${esc(r.inspectorName || '')}</small></td><td>${esc(r.inspectionType)}</td>
            <td>${r.lotNumber ? `<b>${esc(r.lotNumber)}</b><small>${esc(r.heatNumber || '')}</small>` : esc(r.productCode || '—')}</td>
            <td class="right">${Number(r.sampledQty)}</td><td class="right">${Number(r.passedQty)}</td><td class="right">${Number(r.failedQty)}</td>
            <td><span class="chip ${RESULT_CHIP[r.result]}">${esc(r.result)}</span></td>
            <td>${r.ncrNumber ? `<b>${esc(r.ncrNumber)}</b><small>${esc(r.defectCode || '')}</small>` : '—'}</td>
            <td>${r.rootCause ? `${esc(r.rootCause)}${r.correctiveAction ? `<small>CAPA: ${esc(r.correctiveAction)}</small>` : ''}` : '—'}</td></tr>`).join('') || '<tr><td colspan="9" class="table-loading">Belum ada inspeksi tercatat.</td></tr>'}</tbody></table></div>
          <div class="panel-body"><p class="muted">Kegagalan pada lot otomatis mengkarantina lot tersebut (dilewati FIFO) dan menerbitkan nomor NCR. Lepas karantina dari halaman Persediaan › Lot setelah disposisi.</p></div>
        </section>`;
      main.querySelector('#qcDoc').addEventListener('click', () => openDrawer(doc.id, { onChange: () => this.render(main, params) }));
      main.querySelector('#qcAdd')?.addEventListener('click', async () => {
        try {
          const value = await formDialog({ title: 'Catat hasil inspeksi', description: 'Isi nomor lot untuk inspeksi berbasis lot — gagal ≥1 mengkarantina lot dan menerbitkan NCR (wajib defect + root cause).', fields: [
            { name: 'inspectionType', label: 'Tipe', type: 'select', options: [['INCOMING', 'Incoming'], ['IN_PROCESS', 'In-process'], ['FINAL', 'Final']], required: true },
            { name: 'lotSearch', label: 'Nomor lot / heat (opsional)' },
            { name: 'sampledQty', label: 'Qty sampel', type: 'number', min: 0.0001, required: true },
            { name: 'passedQty', label: 'Qty lulus', type: 'number', min: 0, required: true },
            { name: 'failedQty', label: 'Qty gagal', type: 'number', min: 0, required: true },
            { name: 'defectCode', label: 'Kode defect (wajib bila gagal)' },
            { name: 'rootCause', label: 'Root cause (wajib bila gagal)', type: 'textarea' },
            { name: 'correctiveAction', label: 'Tindakan korektif (CAPA)', type: 'textarea' }
          ], submitLabel: 'Simpan inspeksi' });
          if (!value) return;
          let lotId = null;
          if (value.lotSearch) {
            const lots = await api(`/api/inventory/lots?search=${encodeURIComponent(value.lotSearch)}&limit=2`);
            if (!lots.items.length) throw new Error(`Lot "${value.lotSearch}" tidak ditemukan.`);
            lotId = lots.items[0].id;
          }
          const r = await api(`/api/quality/${doc.id}/inspections`, { method: 'POST', idempotencyKey: newIdemKey(), body: { ...value, lotId, sampledQty: Number(value.sampledQty), passedQty: Number(value.passedQty), failedQty: Number(value.failedQty) } });
          toast(r.ncrNumber ? `NCR terbit: ${r.ncrNumber}` : 'Inspeksi tersimpan', r.quarantined ? 'Lot dikarantina otomatis.' : `Hasil ${r.result}.`, r.ncrNumber ? 'coral' : undefined);
          this.render(main, params);
        } catch (error) { toast('Gagal mencatat inspeksi', error.message, 'coral'); }
      });
    }
  };

  const mrpPage = {
    permission: 'production.view',
    async render(main) {
      const data = await api('/api/mrp/suggestions');
      main.innerHTML = pageHead({
        eyebrow: 'PRODUKSI', title: 'MRP & kebutuhan material', sub: 'Kebutuhan WO aktif + stok di bawah minimum vs stok bebas dan PO terbuka.',
        actions: can('production.post') ? `<button class="btn primary" id="mrpRun">${ICONS.refresh} Jalankan MRP</button>` : ''
      }) + `
        <section class="panel"><header><div><p class="eyebrow">SARAN PEMBELIAN</p><h2>${data.items.length} saran terbuka</h2></div></header>
          <div class="table-wrap"><table><thead><tr><th>Komponen</th><th>Gudang</th><th class="right">Kebutuhan</th><th class="right">Stok</th><th class="right">Reservasi</th><th class="right">PO terbuka</th><th class="right">Disarankan beli</th><th>Pemicu</th><th></th></tr></thead>
          <tbody>${data.items.map((r) => `<tr><td><b>${esc(r.productCode)}</b><small>${esc(r.productName)}</small></td>
            <td><small>${esc(r.warehouseName || '—')}</small></td>
            <td class="right">${Number(r.demandQty)}</td><td class="right">${Number(r.onHand)}</td><td class="right">${Number(r.reserved)}</td><td class="right">${Number(r.onOrder)}</td>
            <td class="right"><b class="money">${Number(r.suggestedQty)} ${esc(r.uom || '')}</b></td><td><small>${esc(r.source || '—')}</small></td>
            <td>${can('purchase_request.create') ? `<button class="btn primary sm" data-mrpconv="${r.id}">Buat PR</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="table-loading">Tidak ada saran — jalankan MRP untuk menghitung ulang.</td></tr>'}</tbody></table></div>
          <div class="panel-body"><p class="muted">MRP dihitung <b>per gudang</b>: stok di gudang lain tidak menutup kekurangan di sini karena tetap butuh transfer. Menjalankan MRP menutup saran lama gudang yang dihitung ulang (superseded). Konversi membuat draft Purchase Request yang mengikuti alur approval normal.</p></div>
        </section>`;
      main.querySelector('#mrpRun')?.addEventListener('click', async () => {
        try { const r = await api('/api/mrp/run', { method: 'POST', idempotencyKey: newIdemKey(), body: {} }); toast('MRP selesai', `${r.suggestions} saran dihasilkan.`); this.render(main); }
        catch (error) { toast('MRP gagal', error.message, 'coral'); }
      });
      main.querySelectorAll('[data-mrpconv]').forEach((b) => b.addEventListener('click', async () => {
        try { const r = await api(`/api/mrp/suggestions/${b.dataset.mrpconv}/convert`, { method: 'POST', idempotencyKey: newIdemKey(), body: {} }); toast('Draft PR dibuat', r.documentNumber); this.render(main); }
        catch (error) { toast('Konversi gagal', error.message, 'coral'); }
      }));
    }
  };

  // ── Akuntansi ─────────────────────────────────────────────────────────────

  const R = router.register.bind(router);
  R('/production/work-orders', docListPage({
    type: 'WORK_ORDER', module: 'work_order', title: 'Work order', eyebrow: 'PRODUKSI',
    columns: [
      { label: 'Pekerjaan', render: docCell },
      { label: 'Pelanggan', render: (r) => esc(r.partyName || '—') },
      { label: 'Progres', render: (r) => progressBar((r.payload && r.payload.progress) || 0) },
      { label: 'Nilai', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
      { label: 'Jatuh tempo', render: (r) => fmtDate(r.dueDate) },
      { label: 'Status', render: (r) => chip(r.status) }
    ],
    rowRoute: (row) => `#/production/work-orders/${row.id}`
  }));
  R('/production/work-orders/:id', productionCockpit);
  R('/production/quality', docListPage({ type: 'QC_INSPECTION', module: 'quality', title: 'Quality control', eyebrow: 'PRODUKSI', rowRoute: (row) => `#/production/quality/${row.id}` }));
  R('/production/quality/:id', qcInspectionDetail);
  R('/production/mrp', mrpPage);
})();
