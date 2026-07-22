'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey , asList } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  const docDetail = {
    async render(main, params, signal) {
      const doc = await query(`doc:${params.id}`, () => api(`/api/documents/${params.id}`, { signal }), { staleMs: 10_000, force: true });
      const moduleCode = MODULE_OF_TYPE[doc.documentType];
      const files = await api(`/api/files?documentId=${encodeURIComponent(doc.id)}`, { signal });
      // Baris otoritatif dari document_lines. Sebelumnya halaman ini membaca
      // doc.payload.lines dan mengharapkan {name, price} — padahal bentuk
      // kanoniknya {description, unitPrice} — sehingga nama item kosong,
      // harga tampil "—", dan total tampil "Rp NaN" pada SETIAP dokumen.
      const lines = doc.lines || [];
      main.innerHTML = pageHead({
        eyebrow: (TYPE_LABEL[doc.documentType] || doc.documentType).toUpperCase(),
        title: doc.documentNumber,
        sub: esc(doc.title),
        actions: conversionButtonFor(doc) + actionButtonsFor(doc, moduleCode)
      }) + `
        <section class="detail-grid">
          <div class="detail-main">
            <article class="panel"><header><div><p class="eyebrow">RINGKASAN</p><h2>Informasi dokumen</h2></div>${chip(doc.status)}</header>
              <div class="panel-body"><dl class="detail-dl">
                <div><dt>Relasi</dt><dd>${esc(doc.partyName || '—')}</dd></div>
                <div><dt>Nilai</dt><dd class="money">${fmtIDRFull(doc.amount)}</dd></div>
                <div><dt>Jatuh tempo</dt><dd>${fmtDate(doc.dueDate)}</dd></div>
                <div><dt>Versi</dt><dd>v${doc.version}</dd></div>
                <div><dt>Cabang</dt><dd>${esc(state.user.branchName || 'Head Office')}</dd></div>
                <div><dt>Dibuat</dt><dd>${esc(doc.createdByName)} · ${fmtDateTime(doc.createdAt)}</dd></div>
              </dl></div>
            </article>
            ${lines.length ? `<article class="panel"><header><div><p class="eyebrow">RINCIAN</p><h2>Baris item</h2></div></header>
              <div class="table-wrap"><table>
                <thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Harga satuan</th><th class="right">Total</th></tr></thead>
                <tbody>${lines.map((l) => `<tr><td><b>${esc(l.description || l.name || '—')}</b></td><td class="right">${Number(l.qty)} ${esc(l.uom || '')}</td><td class="right money">${fmtIDRFull(l.unitPrice ?? l.price ?? 0)}</td><td class="right money">${fmtIDRFull(l.lineTotal ?? (Number(l.qty) * Number(l.unitPrice ?? l.price ?? 0)))}</td></tr>`).join('')}</tbody>
              </table></div></article>` : ''}
            ${(doc.relations || []).length ? `<article class="panel"><header><div><p class="eyebrow">ALUR</p><h2>Dokumen terkait</h2></div></header><div class="panel-body stack">${doc.relations.map((r) => { const other = r.parentId === doc.id ? { id:r.childId, no:r.childNumber, type:r.childType } : { id:r.parentId, no:r.parentNumber, type:r.parentType }; return `<a class="relation-link" href="#/doc/${esc(other.id)}"><span><b>${esc(other.no)}</b><small>${esc(TYPE_LABEL[other.type] || other.type)}</small></span>${ICONS.arrow}</a>`; }).join('')}</div></article>` : ''}
            <article class="panel"><header><div><p class="eyebrow">AUDIT</p><h2>Jejak lengkap</h2></div></header>
              <div class="panel-body timeline">
                ${(doc.auditTrail || []).map((row) => `<div class="timeline-row"><span class="timeline-dot"></span><span><b>${esc(AUDIT_LABEL[row.action] || row.action)}</b> oleh ${esc(row.userName)} <span class="chip gray">${esc(row.role)}</span>${row.reason ? `<br><i>"${esc(row.reason)}"</i>` : ''}<small>${fmtDateTime(row.occurredAt)}</small></span></div>`).join('') || '<p class="muted">Belum ada aktivitas tercatat.</p>'}
              </div>
            </article>
          </div>
          <aside class="detail-side">
            ${(doc.approvalChain || []).length ? `<article class="panel"><header><div><p class="eyebrow">PERSETUJUAN</p><h2>Rantai keputusan</h2></div></header>
              <div class="panel-body chain">${doc.approvalChain.map((s) => `<div class="chain-step ${s.done ? 'done' : ''}"><span class="chain-dot">${s.done ? ICONS.check : ''}</span><span><b>${esc(s.level)}</b><small>${s.done ? `${esc(s.done.userName)} · ${fmtDateTime(s.done.at)}` : 'Menunggu keputusan'}</small></span></div>`).join('')}</div></article>` : ''}
            ${doc.documentType === 'SUPPLIER_INVOICE' ? `<article class="panel" id="matchPanel"><header><div><p class="eyebrow">PENGADAAN</p><h2>Three-way match</h2></div></header><div class="panel-body stack" id="matchBody"><span class="spinner"></span> Mengevaluasi…</div></article>` : ''}
            ${doc.documentType === 'SALES_ORDER' ? `<article class="panel" id="fulfilPanel"><header><div><p class="eyebrow">PEMENUHAN</p><h2>Progres pengiriman</h2></div></header><div class="panel-body" id="fulfilBody"><span class="spinner"></span> Memuat…</div></article>` : ''}
            ${['INVOICE','SALES_ORDER'].includes(doc.documentType) && doc.partyId && can('credit.view') ? `<article class="panel" id="creditPanel"><header><div><p class="eyebrow">KREDIT</p><h2>Status kredit</h2></div></header><div class="panel-body stack" id="creditBody"><span class="spinner"></span> Memuat…</div></article>` : ''}
            <article class="panel"><header><div><p class="eyebrow">DOKUMEN</p><h2>Lampiran & cetak</h2></div></header>
              <div class="panel-body stack">
                <button class="btn secondary block" id="detailPdf">${ICONS.doc} Buat PDF (latar belakang)</button>
                ${doc.documentType === 'PAYROLL_RUN' && can('payroll.view') ? `<button class="btn secondary block" id="payrollSlips">${ICONS.payslip} Buat seluruh slip gaji</button>` : ''}
                ${can(`${moduleCode}.edit`) ? `<button class="btn secondary block" id="detailUpload">${ICONS.plus} Unggah lampiran</button><input id="detailFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.docx" hidden>` : ''}
                <div class="file-list">${files.items.map(file => `<div class="file-row"><span>${ICONS.doc}<span><b>${esc(file.originalFilename)}</b><small>${Math.ceil(file.sizeBytes / 1024).toLocaleString('id-ID')} KB · ${fmtDateTime(file.uploadedAt)} · ${chip(file.scanStatus || 'PENDING_SCAN')}</small></span></span><span>${file.scanStatus === 'CLEAN' ? `<a class="icon-btn" href="/api/files/${esc(file.id)}" aria-label="Unduh ${esc(file.originalFilename)}">${ICONS.arrow}</a>` : ''}${can(`${moduleCode}.edit`) ? `<button class="icon-btn" data-file-delete="${esc(file.id)}" aria-label="Hapus ${esc(file.originalFilename)}">${ICONS.close}</button>` : ''}</span></div>`).join('') || '<p class="muted">Belum ada lampiran.</p>'}</div>
                <p class="muted">File tersimpan di storage privat; unduhan melalui endpoint yang memeriksa izin.</p>
              </div>
            </article>
          </aside>
        </section>`;
      main.querySelectorAll('[data-doc-action]').forEach((btn) => {
        btn.addEventListener('click', () => runDocAction(doc, btn.dataset.docAction, moduleCode, () => this.render(main, params)));
      });
      const convert = main.querySelector('[data-doc-convert]'); if (convert) convert.addEventListener('click', () => runDocConversion(doc, () => this.render(main, params)));
      main.querySelector('#detailPdf').addEventListener('click', async () => {
        try {
          await api('/api/jobs', { method: 'POST', body: { type: 'GENERATE_PDF', params: { documentNumber: doc.documentNumber } } });
          toast('PDF dijadwalkan', 'Anda akan menerima notifikasi begitu selesai.');
        } catch (error) { toast('Gagal menjadwalkan PDF', error.message, 'coral'); }
      });
      main.querySelector('#payrollSlips')?.addEventListener('click', async () => { try { await api('/api/jobs', { method: 'POST', body: { type: 'PAYROLL_SLIPS', params: { documentId: doc.id } } }); toast('Slip gaji dijadwalkan', 'PDF privat diproses oleh worker.'); } catch (error) { toast('Pembuatan slip gagal', error.message, 'coral'); } });
      const filePicker = main.querySelector('#detailFile');
      main.querySelector('#detailUpload')?.addEventListener('click', () => filePicker.click());
      filePicker?.addEventListener('change', async () => { const file = filePicker.files[0]; if (!file) return; try { await uploadFile(`/api/files?module=${encodeURIComponent(moduleCode)}&documentId=${encodeURIComponent(doc.id)}`, file); toast('Lampiran tersimpan', file.name); this.render(main, params); } catch (error) { toast('Unggah gagal', error.message, 'coral'); } });
      main.querySelectorAll('[data-file-delete]').forEach(btn => btn.addEventListener('click', async () => { const answer = await actionDialog({ title: 'Hapus lampiran', description: 'File akan dihapus dari storage privat dan tindakan dicatat pada audit trail.', confirmLabel: 'Hapus', danger: true }); if (!answer) return; try { await api(`/api/files/${btn.dataset.fileDelete}`, { method: 'DELETE' }); toast('Lampiran dihapus'); this.render(main, params); } catch (error) { toast('Penghapusan gagal', error.message, 'coral'); } }));

      // Three-way match panel (tagihan supplier).
      // P1-4 — progres pemenuhan per baris. Sebelumnya pemenuhan parsial tidak
      // terlihat sama sekali: pengiriman tidak tertaut ke baris pesanan.
      const fulfilBody = main.querySelector('#fulfilBody');
      if (fulfilBody) {
        api(`/api/documents/${doc.id}/fulfilment`).then((f) => {
          const tone = { FULFILLED: 'mint', PARTIAL: 'amber', OPEN: 'blue', NO_LINES: 'gray' }[f.status] || 'gray';
          const label = { FULFILLED: 'Terpenuhi', PARTIAL: 'Sebagian', OPEN: 'Belum dikirim', NO_LINES: 'Tanpa baris' }[f.status] || f.status;
          fulfilBody.innerHTML = `<div class="stat-row"><span>Status</span><span class="chip ${tone}">${esc(label)}</span></div>
            <div class="stat-row"><span>Dikirim</span><b>${Number(f.totals.delivered)} dari ${Number(f.totals.ordered)}</b></div>
            <div class="stat-row"><span>Ditagih</span><b>${Number(f.totals.invoiced)}</b></div>
            ${f.lines.length ? `<div class="table-wrap"><table><thead><tr><th>Baris</th><th class="right">Dipesan</th><th class="right">Dikirim</th><th class="right">Ditagih</th><th class="right">Sisa</th></tr></thead><tbody>${f.lines.map((l) => `
              <tr><td><b>${esc(l.description)}</b></td><td class="right">${Number(l.orderedQty)}</td>
                <td class="right">${Number(l.deliveredQty)}</td><td class="right">${Number(l.invoicedQty)}</td>
                <td class="right ${Number(l.remainingQty) > 0 ? 'error-text' : ''}"><b>${Number(l.remainingQty)}</b></td></tr>`).join('')}</tbody></table></div>` : ''}`;
        }).catch((e) => { fulfilBody.innerHTML = `<p class="error-text">${esc(e.message)}</p>`; });
      }

      const matchBody = main.querySelector('#matchBody');
      if (matchBody) {
        api(`/api/supplier-invoices/${doc.id}/match`).then((match) => {
          const tone = { MATCHED: 'mint', EXCEPTION: 'coral', OVERRIDDEN: 'amber' }[match.result] || 'gray';
          matchBody.innerHTML = `
            <div class="stat-row"><span>Hasil</span><span class="chip ${tone}">${esc(match.result)}</span></div>
            <div class="stat-row"><span>Nilai PO</span><b>${fmtIDR(match.poAmount)}</b></div>
            <div class="stat-row"><span>Nilai tagihan</span><b>${fmtIDR(match.invoiceAmount)}</b></div>
            <div class="stat-row"><span>Selisih</span><b>${match.amountVariance != null ? fmtIDR(match.amountVariance) : '—'}${match.priceVariancePct != null ? ` (${Number(match.priceVariancePct).toFixed(1)}%)` : ''}</b></div>
            ${(match.lineVariances || []).length ? `<div class="table-wrap"><table><thead><tr><th>Baris</th><th class="right">Dipesan</th><th class="right">Diterima</th><th class="right">Sudah ditagih</th><th class="right">Ditagih kini</th><th class="right">Harga PO</th><th class="right">Harga tagihan</th></tr></thead><tbody>${match.lineVariances.map((l) => `<tr><td><b>${esc(l.code)}</b></td>
              <td class="right">${Number(l.orderedQty)}</td><td class="right">${Number(l.receivedQty)}</td><td class="right">${Number(l.previouslyInvoicedQty)}</td>
              <td class="right"><b>${Number(l.invoicedQty)}</b></td><td class="right">${fmtIDR(l.poUnitPrice)}</td>
              <td class="right ${Number(l.invoiceUnitPrice) > Number(l.poUnitPrice) ? 'error-text' : ''}">${fmtIDR(l.invoiceUnitPrice)}</td></tr>`).join('')}</tbody></table></div>` : ''}
            ${(match.exceptions || []).length ? `<div class="stat-row"><span>Pengecualian</span></div>${match.exceptions.map((x) => `<p class="muted note-fine">• ${esc(x)}</p>`).join('')}` : ''}
            ${match.overrideReason ? `<p class="muted">Override: "${esc(match.overrideReason)}"</p>` : ''}`;
        }).catch((e) => { matchBody.innerHTML = `<p class="error-text">${esc(e.message)}</p>`; });
      }
      // Status kredit pelanggan (invoice/sales order).
      const creditBody = main.querySelector('#creditBody');
      if (creditBody) {
        api(`/api/credit/${doc.partyId}`).then((c) => {
          const overLimit = c.creditLimit > 0 && c.exposure > c.creditLimit;
          creditBody.innerHTML = `
            <div class="stat-row"><span>Status</span><span class="chip ${c.creditHold ? 'coral' : 'mint'}">${c.creditHold ? 'Credit hold' : 'Normal'}</span></div>
            <div class="stat-row"><span>Batas kredit</span><b>${c.creditLimit > 0 ? fmtIDR(c.creditLimit) : 'Tak dibatasi'}</b></div>
            <div class="stat-row"><span>Eksposur berjalan</span><b class="${overLimit ? 'warn' : ''}">${fmtIDR(c.exposure)}</b></div>
            ${c.available != null ? `<div class="stat-row"><span>Sisa plafon</span><b>${fmtIDR(c.available)}</b></div>` : ''}
            <div class="stat-row"><span>Termin</span><b>${c.termDays} hari</b></div>`;
        }).catch((e) => { creditBody.innerHTML = `<p class="error-text">${esc(e.message)}</p>`; });
      }
    }
  };

  // ── Master data & inventori ───────────────────────────────────────────────

  const R = router.register.bind(router);
  R('/doc/:id', docDetail);
})();
