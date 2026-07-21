'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey , asList } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  const paymentPage = {
    permission: 'payment.view',
    onEvent() { this._table?.reload(); },
    render(main) {
      main.innerHTML = pageHead({ eyebrow: 'KEUANGAN', title: 'Pembayaran', sub: 'Pembayaran masuk dan keluar dengan alokasi tagihan yang tervalidasi.', actions: can('payment.edit') ? `<button class="btn primary" id="paymentAllocate">${ICONS.check} Alokasikan pembayaran</button>` : '' }) + '<section id="paymentTable"></section>';
      const isOwner = state.session?.user?.role === 'owner';
      this._table = dataTable(main.querySelector('#paymentTable'), { key: 'documents:payments', endpoint: '/api/documents', params: { type: 'CUSTOMER_PAYMENT,SUPPLIER_PAYMENT' }, title: 'Daftar pembayaran', eyebrow: 'KEUANGAN', columns: [{ label: 'Dokumen', render: docCell }, { label: 'Relasi', render: r => esc(r.partyName || '—') }, { label: 'Nilai', right: true, render: r => `<span class="money">${fmtIDR(r.amount)}</span>` }, { label: 'Status', render: r => r.payload && r.payload.reversal ? `${chip(r.status)} <span class="chip lavender">Direversal</span>` : chip(r.status) }, { label: 'Diperbarui', render: r => relTime(r.updatedAt) }, { label: '', render: r => isOwner && ['APPROVED', 'COMPLETED', 'CLOSED'].includes(r.status) && !(r.payload && r.payload.reversal) ? `<button class="btn danger-outline sm" data-payrev="${esc(r.id)}">Reverse</button>` : '' }], statusFilter: ['DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'COMPLETED', 'CLOSED', 'VOID'], onRow: (row, reload) => openDrawer(row.id, { onChange: reload }) });
      main.querySelector('#paymentTable').addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-payrev]');
        if (!btn) return;
        e.stopPropagation();
        const answer = await actionDialog({ title: 'Reverse pembayaran', description: 'Jurnal pembalik diposting ke periode terbuka, alokasi dilepas (invoice kembali terbuka), dan pembayaran menjadi VOID. Tindakan kritis: Owner + PIN + alasan.', requireReason: true, requirePin: true, confirmLabel: 'Reverse pembayaran', danger: true });
        if (!answer) return;
        try { const r = await api(`/api/payments/${btn.dataset.payrev}/reverse`, { method: 'POST', idempotencyKey: newIdemKey(), body: answer }); toast('Pembayaran direversal', `${r.documentNumber} · ${r.reversedLines} baris jurnal pembalik · invoice terdampak ${r.affectedInvoices.length}`); invalidate('documents:payments'); this._table.reload(); }
        catch (error) { toast('Reversal gagal', error.message, 'coral'); }
      });
      main.querySelector('#paymentAllocate')?.addEventListener('click', async () => { try { const [payments, invoices] = await Promise.all([api('/api/documents?type=CUSTOMER_PAYMENT,SUPPLIER_PAYMENT&limit=100'), api('/api/documents?type=INVOICE,SUPPLIER_INVOICE&limit=100')]); const usablePayments = payments.items.filter(x => ['APPROVED', 'COMPLETED', 'CLOSED'].includes(x.status)), openInvoices = invoices.items.filter(x => !['CLOSED', 'VOID', 'CANCELLED'].includes(x.status)); if (!usablePayments.length || !openInvoices.length) throw new Error('Dibutuhkan minimal satu pembayaran disetujui dan satu tagihan terbuka.'); const value = await formDialog({ title: 'Alokasikan pembayaran', description: 'Jenis pembayaran harus sesuai dengan tagihan. Sistem mencegah alokasi melebihi saldo.', fields: [{ name: 'paymentId', label: 'Pembayaran', type: 'select', options: usablePayments.map(x => [x.id, `${x.documentNumber} · ${fmtIDR(x.amount)}`]), required: true }, { name: 'invoiceId', label: 'Tagihan', type: 'select', options: openInvoices.map(x => [x.id, `${x.documentNumber} · ${fmtIDR(x.amount)}`]), required: true }, { name: 'amount', label: 'Nilai alokasi', type: 'number', min: 1, required: true }], submitLabel: 'Alokasikan' }); if (!value) return; const result = await api('/api/payments/allocate', { method: 'POST', body: value, idempotencyKey: newIdemKey() }); toast('Pembayaran dialokasikan', `Sisa tagihan ${fmtIDR(result.remaining)}`); this._table.reload(); } catch (error) { toast('Alokasi gagal', error.message, 'coral'); } });
    }
  };

  // ── Produksi: cockpit WO, QC formal, MRP (Sprint 12 / R019) ───────────────

  const accounting = {
    permission: 'journal.view',
    async render(main, _p, signal) {
      this.period = this.period || new Date().toISOString().slice(0, 7);
      const period = this.period;
      const [s, ledger, reconciliations, profiles, payrollRules] = await Promise.all([
        query(`accounting:${period}`, () => api(`/api/accounting/summary?period=${period}`, { signal }), { staleMs: 60_000 }),
        query(`ledger:${period}`, () => api(`/api/accounting/ledger?period=${period}&limit=50`, { signal }), { staleMs: 60_000 }),
        api(`/api/accounting/reconciliation?period=${period}`, { signal }),
        query('posting-profiles', () => api('/api/accounting/posting-profiles', { signal }), { staleMs: 300_000 }),
        can('payroll.view') ? query('payroll-rules', () => api('/api/accounting/payroll-rules', { signal }), { staleMs: 300_000 }) : Promise.resolve({ items: [] })
      ]);
      const pl = s.profitLoss;
      const balanced = Math.abs(s.debitTotal - s.creditTotal) < 0.01;
      const reconciled = reconciliations.items[0];
      const actions = `<label class="period-picker"><span>Periode</span><input id="accountingPeriod" type="month" value="${esc(period)}"></label>
        ${can('journal.create') ? `<button class="btn secondary" id="manualJournal">${ICONS.plus} Jurnal manual</button>` : ''}
        ${can('ledger.import') ? `<button class="btn secondary" id="bankImport">${ICONS.job} Import bank</button><input id="bankFile" type="file" accept=".csv,text/csv" hidden>` : ''}
        ${can('job.create') ? `<button class="btn secondary" id="reconcilePeriod">${ICONS.refresh} Rekonsiliasi</button>` : ''}
        ${s.closingStatus === 'CLOSED' && can('closing.edit') ? `<button class="btn secondary" id="reopenPeriod">Buka periode</button>` : ''}
        ${s.closingStatus !== 'CLOSED' && can('closing.post') ? `<button class="btn primary" id="closePeriod">Tutup periode</button>` : ''}`;
      main.innerHTML = pageHead({ eyebrow: 'AKUNTANSI', title: 'Buku besar & laporan', sub: `Periode ${s.period} · ${s.closingStatus === 'CLOSED' ? 'Ditutup' : 'Terbuka'}`, actions }) + `
        <section class="process-rail" aria-label="Status proses tutup buku">
          <div class="done"><span>${ICONS.check}</span><b>Posting</b><small>${s.journals} jurnal</small></div>
          <i></i><div class="${balanced ? 'done' : 'warn'}"><span>${balanced ? ICONS.check : ICONS.alert}</span><b>Trial balance</b><small>${balanced ? 'Seimbang' : 'Selisih ditemukan'}</small></div>
          <i></i><div class="${reconciled ? (Math.abs(reconciled.difference) < .01 ? 'done' : 'warn') : ''}"><span>${reconciled ? (Math.abs(reconciled.difference) < .01 ? ICONS.check : ICONS.alert) : '3'}</span><b>Rekonsiliasi</b><small>${reconciled ? `Selisih ${fmtIDR(reconciled.difference)}` : 'Belum dijalankan'}</small></div>
          <i></i><div class="${s.closingStatus === 'CLOSED' ? 'done' : ''}"><span>${s.closingStatus === 'CLOSED' ? ICONS.check : '4'}</span><b>Closing</b><small>${s.closingStatus === 'CLOSED' ? 'Periode terkunci' : 'Menunggu closing'}</small></div>
        </section>
        <section class="metrics">
          ${kpiCard({ label: 'Pendapatan', value: fmtIDR(pl.revenue), note: 'Akumulasi periode berjalan', orb: 'chart', orbTone: 'blue' })}
          ${kpiCard({ label: 'Laba kotor', value: fmtIDR(pl.grossMargin), note: `Margin ${Math.round(pl.grossMargin / Math.max(pl.revenue, 1) * 100)}%`, orb: 'wallet', orbTone: 'mint' })}
          ${kpiCard({ label: 'Beban operasional', value: fmtIDR(pl.opex), note: 'Termasuk penyusutan', orb: 'ledger', orbTone: 'amber' })}
          ${kpiCard({ label: 'Laba bersih', value: fmtIDR(pl.netIncome), note: pl.netIncome >= 0 ? 'Positif — sehat' : 'Perlu perhatian', tone: pl.netIncome >= 0 ? 'up' : 'warn', orb: 'trend', orbTone: 'lavender' })}
        </section>
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">NERACA PERCOBAAN</p><h2>Trial balance</h2></div></header>
            <div class="table-wrap"><table>
              <thead><tr><th>Akun</th><th class="right">Debit</th><th class="right">Kredit</th></tr></thead>
              <tbody>${s.trialBalance.map((r) => `<tr><td><b>${esc(r.account)}</b></td><td class="right money">${r.debit ? fmtIDRFull(r.debit) : '—'}</td><td class="right money">${r.credit ? fmtIDRFull(r.credit) : '—'}</td></tr>`).join('')}</tbody>
              <tfoot><tr><th>Total</th><th class="right money">${fmtIDRFull(s.debitTotal)}</th><th class="right money">${fmtIDRFull(s.creditTotal)}</th></tr></tfoot>
            </table></div>
          </article>
          <article class="panel"><header><div><p class="eyebrow">JURNAL</p><h2>Status posting</h2></div></header>
            <div class="panel-body stack">
              <div class="stat-row"><span>Total jurnal periode ini</span><b>${s.journals}</b></div>
              <div class="stat-row"><span>Belum diposting</span><b>${s.unposted}</b></div>
              <a class="btn secondary block" href="#/accounting/journals">Buka daftar jurnal ${ICONS.arrow}</a>
              <p class="muted">Reopen periode yang sudah ditutup membutuhkan PIN Owner dan tercatat pada audit.</p>
            </div>
          </article>
        </section>
        <section class="panel"><header><div><p class="eyebrow">BUKU BESAR</p><h2>50 transaksi jurnal terbaru</h2></div><span class="chip ${balanced ? 'mint' : 'coral'}">${balanced ? 'Debit = kredit' : 'Tidak seimbang'}</span></header>
          <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Dokumen</th><th>Akun</th><th class="right">Debit</th><th class="right">Kredit</th></tr></thead>
          <tbody>${ledger.items.map(r => `<tr><td>${fmtDate(r.postingDate)}</td><td><b>${esc(r.documentNumber)}</b><small>${esc(r.title)}</small></td><td>${esc(r.accountCode)} · ${esc(r.accountName)}</td><td class="right money">${r.debit ? fmtIDRFull(r.debit) : '—'}</td><td class="right money">${r.credit ? fmtIDRFull(r.credit) : '—'}</td></tr>`).join('') || '<tr><td colspan="5" class="table-loading">Belum ada jurnal pada periode ini.</td></tr>'}</tbody></table></div>
        </section>
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">KONFIGURASI · §18.2</p><h2>Posting profile</h2></div><span class="chip mint">Configuration-driven</span></header>
            <div class="table-wrap"><table><thead><tr><th>Transaksi</th><th>Jurnal (kaki)</th><th>Ver</th></tr></thead>
            <tbody>${profiles.items.map(pr => `<tr><td><b>${esc(TYPE_LABEL[pr.transactionType] || pr.transactionType)}</b><small>${esc(pr.code)}</small></td><td>${(pr.legs || []).map(l => `<span class="chip ${l.side === 'D' ? 'blue' : 'amber'}">${l.side} ${esc(l.account)}${l.source !== 'AMOUNT' ? '·' + esc(l.source) : ''}</span>`).join(' ')}</td><td>v${pr.version}</td></tr>`).join('') || '<tr><td colspan="3" class="table-loading">Belum ada profil.</td></tr>'}</tbody></table></div>
            <div class="panel-body"><p class="muted">Akun jurnal ditentukan profil ini (bukan hardcoded); tiap dokumen menyimpan snapshot versi profil.</p></div>
          </article>
          ${can('payroll.view') ? `<article class="panel"><header><div><p class="eyebrow">KONFIGURASI · §19.5</p><h2>Aturan payroll ber-versi</h2></div></header>
            <div class="panel-body stack">
              ${payrollRules.items.map(r => `<div class="stat-row"><span><b>${esc(r.ruleType)}</b><small class="muted"> · berlaku ${fmtDate(r.effectiveFrom)}</small></span><b>${esc(JSON.stringify(r.config).replace(/[{}"]/g, '').replace(/,/g, ', '))} <span class="chip gray">v${r.version}</span></b></div>`).join('') || '<p class="muted">Belum ada aturan.</p>'}
              <p class="muted">Tarif BPJS/PTKP/PPh21 effective-dated; setiap payroll run menyimpan snapshot aturan yang dipakai.</p>
            </div>
          </article>` : ''}
        </section>`;
      main.querySelector('#accountingPeriod').addEventListener('change', (e) => { this.period = e.target.value; this.render(main); });
      main.querySelector('#closePeriod')?.addEventListener('click', async () => {
        const answer = await actionDialog({ title: `Tutup periode ${period}`, description: 'Server menjalankan SELURUH checklist closing cockpit: FAIL memblokir mutlak; WARN membutuhkan waiver tertulis.', requireReason: true, confirmLabel: 'Tutup periode' }); if (!answer) return;
        try { await api('/api/accounting/period/close', { method: 'POST', body: { period, ...answer } }); invalidate(`accounting:${period}`); toast('Periode ditutup', `${period} sekarang terkunci.`); this.render(main); }
        catch (error) {
          // Checklist WARN: minta waiver formal lalu ulangi dengan waiveWarnings.
          if (error.code === 'REASON_REQUIRED' && /waiveWarnings/.test(error.detail || error.message)) {
            const waiver = await actionDialog({ title: 'Waiver checklist WARN', description: `${error.detail || error.message}\n\nWaiver terekam permanen pada bukti closing dan audit trail.`, requireReason: true, confirmLabel: 'Tutup dengan waiver', danger: true });
            if (!waiver) return;
            try { await api('/api/accounting/period/close', { method: 'POST', body: { period, ...answer, waiveWarnings: waiver.reason } }); invalidate(`accounting:${period}`); toast('Periode ditutup dengan waiver', `${period} terkunci — waiver terekam.`); this.render(main); return; }
            catch (retryError) { toast('Closing gagal', retryError.detail || retryError.message, 'coral'); return; }
          }
          toast('Closing gagal', error.detail || error.message, 'coral');
        }
      });
      main.querySelector('#reopenPeriod')?.addEventListener('click', async () => { const answer = await actionDialog({ title: `Buka kembali ${period}`, description: 'Tindakan kritis ini memerlukan PIN Owner dan alasan tertulis.', requireReason: true, requirePin: true, confirmLabel: 'Buka periode', danger: true }); if (!answer) return; try { await api('/api/accounting/period/reopen', { method: 'POST', body: { period, ...answer } }); invalidate(`accounting:${period}`); toast('Periode dibuka kembali', period); this.render(main); } catch (error) { toast('Reopen gagal', error.message, 'coral'); } });
      main.querySelector('#reconcilePeriod')?.addEventListener('click', async () => { try { await api('/api/jobs', { method: 'POST', body: { type: 'RECONCILIATION', params: { period } } }); toast('Rekonsiliasi dijadwalkan', 'Worker akan mencocokkan mutasi bank dan buku besar.'); } catch (error) { toast('Rekonsiliasi gagal', error.message, 'coral'); } });
      main.querySelector('#manualJournal')?.addEventListener('click', async () => { try { const accounts = await api('/api/accounting/accounts'), options = accounts.items.map(x => [x.code, `${x.code} · ${x.name}`]); const value = await formDialog({ title: 'Buat jurnal manual', description: 'Template debit–kredit sederhana. Dokumen tetap dibuat sebagai draft untuk approval sebelum posting.', fields: [{ name: 'title', label: 'Judul jurnal', required: true }, { name: 'debitAccount', label: 'Akun debit', type: 'select', options, required: true }, { name: 'creditAccount', label: 'Akun kredit', type: 'select', options, required: true }, { name: 'amount', label: 'Nilai', type: 'number', min: 1, required: true }, { name: 'memo', label: 'Memo', type: 'textarea' }], submitLabel: 'Buat draft jurnal' }); if (!value) return; if (value.debitAccount === value.creditAccount) throw new Error('Akun debit dan kredit harus berbeda.'); const doc = await api('/api/documents', { method: 'POST', idempotencyKey: newIdemKey(), body: { type: 'JOURNAL', title: value.title, amount: value.amount, payload: { period, journalLines: [{ accountCode: value.debitAccount, debit: value.amount, credit: 0, memo: value.memo }, { accountCode: value.creditAccount, debit: 0, credit: value.amount, memo: value.memo }] } } }); toast('Draft jurnal dibuat', doc.documentNumber); openDrawer(doc.id, { onChange: () => this.render(main) }); } catch (error) { toast('Jurnal gagal dibuat', error.message, 'coral'); } });
      const bankPicker = main.querySelector('#bankFile'); main.querySelector('#bankImport')?.addEventListener('click', () => bankPicker.click()); bankPicker?.addEventListener('change', async () => { const file = bankPicker.files[0]; if (!file) return; try { const saved = await uploadFile('/api/files?module=ledger', file); await api('/api/jobs', { method: 'POST', body: { type: 'IMPORT_CSV', params: { module: 'bank', fileId: saved.id } } }); toast('Mutasi bank dijadwalkan', 'Format: transaction_date, reference, description, direction, amount.'); } catch (error) { toast('Import bank gagal', error.message, 'coral'); } });
    }
  };

  // ── Pajak ─────────────────────────────────────────────────────────────────
  const taxCenter = {
    permission: 'tax.view',
    async render(main, _p, signal) {
      this.period = this.period || new Date().toISOString().slice(0, 7);
      const period = this.period;
      const [t, cmp] = await Promise.all([
        query(`tax:${period}`, () => api(`/api/tax/summary?period=${period}`, { signal }), { staleMs: 60_000 }),
        api(`/api/tax/compliance?period=${period}`, { signal })
      ]);
      const actions = `<a class="btn secondary" href="/api/tax/efaktur.csv?period=${esc(period)}" target="_blank" rel="noopener">${ICONS.doc} Ekspor e-Faktur</a><label class="period-picker"><span>Periode</span><input id="taxPeriod" type="month" value="${esc(period)}"></label>${can('tax.edit') ? `<button class="btn primary" id="taxSync">${ICONS.refresh} Sinkronkan pajak</button>` : ''}`;
      main.innerHTML = pageHead({ eyebrow: 'PERPAJAKAN', title: 'Tax center', sub: `Periode ${t.period}. Kalkulasi bersumber dari transaksi yang sudah disetujui.`, actions }) + `
        <section class="metrics">
          ${kpiCard({ label: 'PPN keluaran', value: fmtIDR(t.ppnOutput), note: 'Faktur pajak diterbitkan', orb: 'tax', orbTone: 'blue' })}
          ${kpiCard({ label: 'PPN masukan', value: fmtIDR(t.ppnInput), note: 'Dapat dikreditkan', orb: 'doc', orbTone: 'mint' })}
          ${kpiCard({ label: 'PPN kurang bayar', value: fmtIDR(t.ppnPayable), note: 'Setor sebelum akhir bulan', tone: 'warn', orb: 'wallet', orbTone: 'amber' })}
          ${kpiCard({ label: 'PPh 21 + 23', value: fmtIDR(t.pph21 + t.pph23), note: 'Potongan masa berjalan', orb: 'payslip', orbTone: 'lavender' })}
        </section>
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">KEPATUHAN</p><h2>Tenggat pajak</h2></div></header>
            <div class="panel-body stack">
              ${t.deadlines.map((d) => `<div class="stat-row"><span>${esc(d.tax)}<small class="muted"> · ${fmtDate(d.dueDate)}</small></span>${chip(d.status)}</div>`).join('')}
            </div>
          </article>
          <article class="panel"><header><div><p class="eyebrow">DOKUMEN</p><h2>Dokumen pajak</h2></div></header>
            <div class="table-wrap"><table>
              <thead><tr><th>Jenis</th><th class="right">DPP</th><th class="right">Pajak</th><th>Status</th></tr></thead>
              <tbody>${t.documents.map((d) => `<tr><td><b>${esc(d.taxType)}</b><small>${esc(d.documentId || 'Rekap manual')}</small></td><td class="right money">${fmtIDRFull(d.baseAmount)}</td><td class="right money">${fmtIDRFull(d.taxAmount)}</td><td>${d.reported ? '<span class="chip mint">Dilaporkan</span>' : can('tax.edit') ? `<button class="btn secondary sm" data-tax-report="${esc(d.id)}">Tandai lapor</button>` : '<span class="chip amber">Belum dilaporkan</span>'}</td></tr>`).join('') || '<tr><td colspan="4" class="table-loading">Belum ada transaksi pajak pada periode ini.</td></tr>'}</tbody>
            </table></div>
          </article>
        </section>
        <section class="kpi-grid">
          <article class="kpi"><span>Sisa jatah NSFP</span><strong>${cmp.nsfpRemaining}</strong><small>${cmp.nsfpRanges} rentang aktif dari DJP</small></article>
          <article class="kpi"><span>Faktur Pajak terbit</span><strong>${cmp.faktur.issued}</strong><small>${cmp.faktur.replaced} pengganti · ${cmp.faktur.cancelled} batal</small></article>
          <article class="kpi"><span>DPP dilaporkan</span><strong>${fmtIDR(cmp.faktur.dpp)}</strong><small>PPN ${fmtIDR(cmp.faktur.ppn)}</small></article>
          <article class="kpi"><span>Bukti potong</span><strong>${cmp.withholding.reduce((n, x) => n + x.n, 0)}</strong><small>${cmp.withholding.map((x) => `${esc(x.taxType)} ${fmtIDR(x.amount)}`).join(' · ') || 'Belum ada'}</small></article>
        </section>
        <section class="panel table-panel"><header><div><p class="eyebrow">FAKTUR PAJAK KELUARAN</p><h2>e-Faktur masa ${esc(period)}</h2></div>
          ${can('tax.post') ? `<div class="row-actions"><button class="btn secondary sm" id="nsfpAdd">${ICONS.plus} Jatah NSFP</button><button class="btn primary sm" id="fpIssue">${ICONS.plus} Terbitkan Faktur Pajak</button></div>` : ''}</header>
          <div class="table-wrap"><table><thead><tr><th>Nomor Faktur Pajak</th><th>Invoice</th><th>Pembeli</th><th class="right">DPP</th><th class="right">PPN</th><th>Status</th><th></th></tr></thead>
          <tbody>${cmp.taxInvoices.length ? cmp.taxInvoices.map((f) => `<tr><td><b>${esc(f.fpNumber)}</b><small>${fmtDate(f.fpDate)} · kode ${esc(f.transactionCode)}</small></td><td>${esc(f.documentNumber)}</td><td>${esc(f.buyerName)}<small>${esc(f.buyerNpwp || 'tanpa NPWP')}</small></td><td class="right money">${fmtIDRFull(f.dpp)}</td><td class="right money">${fmtIDRFull(f.ppn)}</td><td>${chip(f.status)}</td><td class="right">${f.status === 'ISSUED' && can('tax.post') ? `<button class="btn ghost sm" data-fp-replace="${esc(f.id)}">Ganti</button><button class="btn danger-outline sm" data-fp-cancel="${esc(f.id)}">Batalkan</button>` : ''}</td></tr>`).join('') : `<tr><td colspan="7"><div class="empty-state">${clayOrb('blue', 'tax')}<h3>Belum ada Faktur Pajak</h3><p>Daftarkan jatah NSFP dari DJP lalu terbitkan Faktur Pajak atas invoice yang sudah disetujui.</p></div></td></tr>`}</tbody></table></div>
        </section>
        <section class="dashboard-grid">
          <article class="panel table-panel"><header><div><p class="eyebrow">NSFP</p><h2>Jatah nomor seri</h2></div></header>
            <div class="table-wrap"><table><thead><tr><th>Surat DJP</th><th>Rentang</th><th class="right">Sisa</th><th>Status</th></tr></thead>
            <tbody>${cmp.ranges.length ? cmp.ranges.map((r) => `<tr><td><b>${esc(r.dgtLetterNumber)}</b><small>${fmtDate(r.issuedDate)}</small></td><td>${esc(r.prefix)}.${String(r.serialStart).padStart(8, '0')} – ${String(r.serialEnd).padStart(8, '0')}</td><td class="right">${r.remaining}</td><td>${chip(r.status)}</td></tr>`).join('') : '<tr><td colspan="4" class="table-loading">Belum ada jatah NSFP terdaftar.</td></tr>'}</tbody></table></div>
          </article>
          <article class="panel table-panel"><header><div><p class="eyebrow">e-BUPOT</p><h2>Bukti potong PPh</h2></div>${can('tax.post') ? `<button class="btn secondary sm" id="bupotAdd">${ICONS.plus} Terbitkan</button>` : ''}</header>
            <div class="table-wrap"><table><thead><tr><th>Nomor</th><th>Lawan transaksi</th><th class="right">Bruto</th><th class="right">PPh</th></tr></thead>
            <tbody>${cmp.withholding.length ? cmp.withholding.map((w) => `<tr><td><b>${esc(w.certificateNumber)}</b><small>${esc(w.taxType)} · ${Number(w.ratePct)}%</small></td><td>${esc(w.partnerName)}<small>${esc(w.partnerNpwp || 'tanpa NPWP')}</small></td><td class="right money">${fmtIDRFull(w.grossAmount)}</td><td class="right money">${fmtIDRFull(w.taxAmount)}</td></tr>`).join('') : '<tr><td colspan="4" class="table-loading">Belum ada bukti potong pada masa ini.</td></tr>'}</tbody></table></div>
          </article>
        </section>`;
      const reloadTax = () => { invalidate(`tax:${period}`); this.render(main); };
      main.querySelector('#nsfpAdd')?.addEventListener('click', async () => {
        const v = await formDialog({ title: 'Daftarkan jatah NSFP', description: 'Masukkan rentang Nomor Seri Faktur Pajak sesuai surat pemberian DJP. Rentang tidak boleh tumpang tindih.', fields: [{ name: 'dgtLetterNumber', label: 'Nomor surat DJP', required: true }, { name: 'prefix', label: 'Prefix (mis. 001-26)', required: true }, { name: 'serialStart', label: 'Serial awal', type: 'number', min: 1, required: true }, { name: 'serialEnd', label: 'Serial akhir', type: 'number', min: 1, required: true }, { name: 'issuedDate', label: 'Tanggal surat', type: 'date' }], submitLabel: 'Daftarkan' });
        if (!v) return;
        try { await api('/api/tax/nsfp', { method: 'POST', body: v }); toast('Jatah NSFP terdaftar'); reloadTax(); } catch (e) { toast('Gagal mendaftarkan', e.detail || e.message, 'coral'); }
      });
      main.querySelector('#fpIssue')?.addEventListener('click', async () => {
        const invoices = asList(await api('/api/documents?type=INVOICE&limit=100'));
        const usable = invoices.filter((d) => !['DRAFT', 'REJECTED', 'CANCELLED', 'VOID'].includes(d.status));
        if (!usable.length) return toast('Tidak ada invoice', 'Belum ada invoice disetujui untuk diterbitkan Faktur Pajak.', 'amber');
        const v = await formDialog({ title: 'Terbitkan Faktur Pajak', description: 'Nomor diambil otomatis dari jatah NSFP aktif. DPP dan PPN dihitung dari baris invoice.', fields: [
          { name: 'documentId', label: 'Invoice', type: 'select', options: usable.map((d) => [d.id, `${d.documentNumber} · ${d.partyName || ''}`]), required: true },
          { name: 'transactionCode', label: 'Kode transaksi', type: 'select', options: cmp.transactionCodes.map((c) => [c.code, `${c.code} · ${c.name}`]), required: true },
          { name: 'npwp', label: 'NPWP pembeli' }, { name: 'nik', label: 'NIK pembeli (bila tanpa NPWP)' },
          { name: 'name', label: 'Nama pembeli (kosongkan = dari master)' }, { name: 'address', label: 'Alamat pembeli', type: 'textarea' },
          { name: 'fpDate', label: 'Tanggal faktur', type: 'date' }
        ], submitLabel: 'Terbitkan' });
        if (!v) return;
        try { const fp = await api('/api/tax/faktur', { method: 'POST', body: { documentId: v.documentId, transactionCode: v.transactionCode, fpDate: v.fpDate || undefined, buyer: { npwp: v.npwp, nik: v.nik, name: v.name, address: v.address } }, idempotencyKey: newIdemKey() }); toast('Faktur Pajak terbit', fp.fpNumber); reloadTax(); }
        catch (e) { toast('Penerbitan gagal', e.detail || e.message, 'coral'); }
      });
      main.querySelectorAll('[data-fp-replace]').forEach((b) => b.addEventListener('click', async () => {
        const a = await actionDialog({ title: 'Terbitkan Faktur Pajak pengganti', description: 'Faktur lama menjadi REPLACED. Nomor seri tetap, kode pengganti naik satu — sesuai ketentuan DJP.', requireReason: true, confirmLabel: 'Terbitkan pengganti' });
        if (!a) return;
        try { const fp = await api(`/api/tax/faktur/${b.dataset.fpReplace}/replace`, { method: 'POST', body: a }); toast('Faktur pengganti terbit', fp.fpNumber); reloadTax(); } catch (e) { toast('Gagal', e.detail || e.message, 'coral'); }
      }));
      main.querySelectorAll('[data-fp-cancel]').forEach((b) => b.addEventListener('click', async () => {
        const a = await actionDialog({ title: 'Batalkan Faktur Pajak', description: 'Pembatalan tercatat permanen pada audit trail dan wajib dilaporkan ke DJP.', requireReason: true, confirmLabel: 'Batalkan faktur' });
        if (!a) return;
        try { await api(`/api/tax/faktur/${b.dataset.fpCancel}/cancel`, { method: 'POST', body: a }); toast('Faktur Pajak dibatalkan'); reloadTax(); } catch (e) { toast('Gagal', e.detail || e.message, 'coral'); }
      }));
      main.querySelector('#bupotAdd')?.addEventListener('click', async () => {
        const v = await formDialog({ title: 'Terbitkan bukti potong PPh', description: 'Tarif mengikuti ketentuan yang berlaku dan dicatat pada bukti potong (tidak di-hardcode sistem).', fields: [
          { name: 'taxType', label: 'Jenis PPh', type: 'select', options: [['PPH23', 'PPh 23'], ['PPH21', 'PPh 21'], ['PPH26', 'PPh 26'], ['PPH22', 'PPh 22'], ['PPH_FINAL', 'PPh Final']], required: true },
          { name: 'objectCode', label: 'Kode objek pajak' }, { name: 'name', label: 'Nama lawan transaksi', required: true },
          { name: 'npwp', label: 'NPWP lawan transaksi' }, { name: 'grossAmount', label: 'Jumlah bruto', type: 'number', min: 0, required: true },
          { name: 'ratePct', label: 'Tarif (%)', type: 'number', min: 0, required: true }, { name: 'certificateDate', label: 'Tanggal bukti potong', type: 'date' }
        ], submitLabel: 'Terbitkan' });
        if (!v) return;
        try { const bp = await api('/api/tax/bupot', { method: 'POST', body: { taxType: v.taxType, objectCode: v.objectCode, grossAmount: v.grossAmount, ratePct: v.ratePct, certificateDate: v.certificateDate || undefined, partner: { name: v.name, npwp: v.npwp } } }); toast('Bukti potong terbit', bp.certificateNumber); reloadTax(); }
        catch (e) { toast('Gagal', e.detail || e.message, 'coral'); }
      });
      main.querySelector('#taxPeriod').addEventListener('change', (e) => { this.period = e.target.value; this.render(main); });
      main.querySelector('#taxSync')?.addEventListener('click', async () => { try { await api('/api/tax/sync', { method: 'POST', body: { period } }); invalidate(`tax:${period}`); toast('Pajak disinkronkan', `Data masa ${period} diperbarui.`); this.render(main); } catch (error) { toast('Sinkronisasi gagal', error.message, 'coral'); } });
      main.querySelectorAll('[data-tax-report]').forEach(btn => btn.addEventListener('click', async () => { const answer = await actionDialog({ title: 'Tandai sudah dilaporkan', description: 'Pastikan pelaporan pada sistem DJP telah berhasil. Tindakan ini masuk audit trail.', requireReason: true, confirmLabel: 'Tandai lapor' }); if (!answer) return; try { await api(`/api/tax/records/${btn.dataset.taxReport}/report`, { method: 'POST', body: answer }); invalidate(`tax:${period}`); toast('Status pelaporan diperbarui'); this.render(main); } catch (error) { toast('Pembaruan gagal', error.message, 'coral'); } }));
    }
  };


  const R = router.register.bind(router);
  // ── Collection & dunning (Sprint 9 / R016) ────────────────────────────────
  const collectionPage = {
    permission: 'invoice.view',
    async render(main) {
      const data = await api('/api/collection/dunning');
      const LEVEL_CHIP = { 1: 'blue', 2: 'amber', 3: 'coral' };
      main.innerHTML = pageHead({
        eyebrow: 'KEUANGAN', title: 'Collection & dunning', sub: 'Jenjang penagihan dari kebijakan (7/14/30 hari — dapat dikonfigurasi); level tertinggi otomatis menahan kredit pelanggan.',
        actions: can('invoice.post') ? `<button class="btn primary" id="dunRun">${ICONS.refresh} Jalankan dunning</button>` : ''
      }) + `
        <section class="metrics">
          ${kpiCard({ label: 'Notice terbuka', value: String(data.summary.openCount), note: 'Belum diselesaikan', orb: 'bell', orbTone: 'amber' })}
          ${kpiCard({ label: 'Nilai tertunggak', value: fmtIDR(data.summary.openValue), note: 'Total outstanding pada notice terbuka', orb: 'wallet', orbTone: 'coral' })}
          ${kpiCard({ label: 'Kritis (level 3)', value: String(data.summary.critical), note: 'Rekomendasi hold kredit aktif', tone: data.summary.critical > 0 ? 'warn' : 'up', orb: 'alert', orbTone: 'lavender' })}
        </section>
        <section class="panel"><header><div><p class="eyebrow">DAFTAR PENAGIHAN</p><h2>Notice dunning terbuka</h2></div></header>
          <div class="table-wrap"><table><thead><tr><th>Notice</th><th>Invoice</th><th>Pelanggan</th><th>Level</th><th class="right">Telat</th><th class="right">Outstanding</th><th>Terbit</th><th></th></tr></thead>
          <tbody>${data.items.map((r) => `<tr><td><b>${esc(r.noticeNumber)}</b></td>
            <td>${esc(r.invoiceNumber)}<small>jatuh tempo ${fmtDate(r.dueDate)}</small></td>
            <td>${esc(r.customerName || '—')}</td>
            <td><span class="chip ${LEVEL_CHIP[r.level] || 'gray'}">L${r.level} · ${esc(r.policySnapshot?.name || '')}</span></td>
            <td class="right">${r.daysOverdue} hari</td><td class="right money">${fmtIDRFull(r.outstanding)}</td>
            <td>${relTime(r.createdAt)}</td>
            <td>${can('invoice.edit') ? `<button class="btn secondary sm" data-dunres="${r.id}">Selesaikan</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="table-loading">Tidak ada tunggakan — jalankan dunning untuk memindai ulang.</td></tr>'}</tbody></table></div>
          <div class="panel-body"><p class="muted">Notice idempoten per invoice per level. Lepas hold kredit pelanggan melalui override kredit finance setelah pembayaran diterima.</p></div>
        </section>`;
      main.querySelector('#dunRun')?.addEventListener('click', async () => {
        try { const r = await api('/api/collection/dunning/run', { method: 'POST', idempotencyKey: newIdemKey(), body: {} }); toast('Dunning selesai', `${r.scanned} invoice dipindai · ${r.issued} notice terbit · ${r.creditHolds} hold kredit.`); this.render(main); }
        catch (error) { toast('Dunning gagal', error.message, 'coral'); }
      });
      main.querySelectorAll('[data-dunres]').forEach((b) => b.addEventListener('click', async () => {
        const answer = await actionDialog({ title: 'Selesaikan notice', description: 'Catat pembayaran/komitmen pelanggan sebagai alasan penyelesaian.', requireReason: true, confirmLabel: 'Tandai selesai' });
        if (!answer) return;
        try { await api(`/api/collection/dunning/${b.dataset.dunres}/resolve`, { method: 'POST', idempotencyKey: newIdemKey(), body: answer }); toast('Notice diselesaikan', ''); this.render(main); }
        catch (error) { toast('Gagal', error.message, 'coral'); }
      }));
    }
  };

  // ── Aset tetap & depresiasi (Sprint 13 / R020) ─────────────────────────────
  const assetsPage = {
    permission: 'asset.view',
    async render(main) {
      const data = await api('/api/assets');
      const ST_CHIP = { ACTIVE: 'mint', FULLY_DEPRECIATED: 'gray', DISPOSED: 'coral' };
      main.innerHTML = pageHead({
        eyebrow: 'KEUANGAN', title: 'Aset tetap', sub: 'Registry aset dengan penyusutan garis lurus otomatis — umur & akun dari konfigurasi kategori.',
        actions: `${can('asset.post') ? `<button class="btn secondary" id="faRun">${ICONS.refresh} Jalankan penyusutan</button>` : ''}${can('asset.create') ? `<button class="btn primary" id="faAdd">${ICONS.plus} Daftarkan aset</button>` : ''}`
      }) + `
        <section class="metrics">
          ${kpiCard({ label: 'Nilai perolehan', value: fmtIDR(data.totals.cost), note: `${data.items.length} aset terdaftar`, orb: 'building', orbTone: 'blue' })}
          ${kpiCard({ label: 'Akumulasi penyusutan', value: fmtIDR(data.totals.accumulated), note: 'Kontra aset (1590)', orb: 'trend', orbTone: 'amber' })}
          ${kpiCard({ label: 'Nilai buku', value: fmtIDR(data.totals.bookValue), note: 'Perolehan − akumulasi', orb: 'wallet', orbTone: 'mint' })}
        </section>
        <section class="panel"><header><div><p class="eyebrow">REGISTRY</p><h2>Daftar aset</h2></div></header>
          <div class="table-wrap"><table><thead><tr><th>Aset</th><th>Kategori</th><th>Perolehan</th><th class="right">Nilai perolehan</th><th class="right">Akumulasi</th><th class="right">Nilai buku</th><th class="right">/bulan</th><th>Status</th><th></th></tr></thead>
          <tbody>${data.items.map((r) => `<tr><td><b>${esc(r.assetNumber)}</b><small>${esc(r.name)}${r.custodianName ? ' · ' + esc(r.custodianName) : ''}</small></td>
            <td>${esc(r.categoryName)}<small>${r.usefulLifeMonths || r.categoryLife} bulan</small></td>
            <td>${fmtDate(r.acquisitionDate)}${r.sourceNumber ? `<small>${esc(r.sourceNumber)}</small>` : ''}</td>
            <td class="right money">${fmtIDRFull(r.acquisitionCost)}</td><td class="right money">${fmtIDRFull(r.accumulated)}</td>
            <td class="right money"><b>${fmtIDRFull(r.bookValue)}</b></td><td class="right money">${fmtIDR(r.monthlyDepreciation)}</td>
            <td><span class="chip ${ST_CHIP[r.status] || 'gray'}">${esc(r.status)}</span></td>
            <td>${r.status !== 'DISPOSED' && can('asset.void') ? `<button class="btn danger-outline sm" data-fadispose="${r.id}">Lepas</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="table-loading">Belum ada aset terdaftar.</td></tr>'}</tbody></table></div>
          <div class="panel-body"><p class="muted">Penyusutan bulanan diposting sebagai satu jurnal sistem (JRN-*) per periode: D Beban Penyusutan / C Akumulasi. Pelepasan menghitung nilai buku dan menjurnal otomatis.</p></div>
        </section>`;
      main.querySelector('#faAdd')?.addEventListener('click', async () => {
        try {
          const cats = await api('/api/assets/categories');
          const value = await formDialog({ title: 'Daftarkan aset tetap', description: 'Umur manfaat & akun jurnal mengikuti kategori (dapat di-override umurnya).', fields: [
            { name: 'name', label: 'Nama aset', required: true },
            { name: 'categoryCode', label: 'Kategori', type: 'select', options: cats.items.map((x) => [x.code, `${x.name} (${x.usefulLifeMonths} bln)`]), required: true },
            { name: 'acquisitionDate', label: 'Tanggal perolehan (YYYY-MM-DD)', required: true },
            { name: 'acquisitionCost', label: 'Nilai perolehan', type: 'number', min: 1, required: true },
            { name: 'salvageValue', label: 'Nilai residu', type: 'number', min: 0 },
            { name: 'usefulLifeMonths', label: 'Override umur (bulan, opsional)', type: 'number', min: 1 },
            { name: 'location', label: 'Lokasi' }
          ], submitLabel: 'Daftarkan' });
          if (!value) return;
          const asset = await api('/api/assets', { method: 'POST', idempotencyKey: newIdemKey(), body: { ...value, acquisitionCost: Number(value.acquisitionCost), salvageValue: Number(value.salvageValue || 0), usefulLifeMonths: value.usefulLifeMonths ? Number(value.usefulLifeMonths) : null } });
          toast('Aset terdaftar', asset.assetNumber);
          this.render(main);
        } catch (error) { toast('Gagal mendaftarkan aset', error.message, 'coral'); }
      });
      main.querySelector('#faRun')?.addEventListener('click', async () => {
        const value = await formDialog({ title: 'Jalankan penyusutan', description: 'Idempoten per aset per periode — aman dijalankan ulang.', fields: [{ name: 'period', label: 'Periode (YYYY-MM)', required: true }], submitLabel: 'Jalankan' });
        if (!value) return;
        try { const r = await api('/api/assets/depreciation/run', { method: 'POST', idempotencyKey: newIdemKey(), body: value }); toast('Penyusutan selesai', r.journal ? `${r.assets} aset · ${fmtIDR(r.total)} · ${r.journal}` : (r.message || 'Tidak ada aset.')); this.render(main); }
        catch (error) { toast('Penyusutan gagal', error.message, 'coral'); }
      });
      main.querySelectorAll('[data-fadispose]').forEach((b) => b.addEventListener('click', async () => {
        const value = await formDialog({ title: 'Lepas aset (disposal)', description: 'Nilai buku dihitung sistem dan dijurnal otomatis. Wajib alasan.', fields: [
          { name: 'reason', label: 'Alasan pelepasan', type: 'textarea', required: true },
          { name: 'proceeds', label: 'Hasil penjualan (bila dijual)', type: 'number', min: 0 }
        ], submitLabel: 'Lepas aset' });
        if (!value) return;
        try { const r = await api(`/api/assets/${b.dataset.fadispose}/dispose`, { method: 'POST', idempotencyKey: newIdemKey(), body: { reason: value.reason, proceeds: Number(value.proceeds || 0) } }); toast('Aset dilepas', `Nilai buku ${fmtIDR(r.bookValue)} · jurnal ${r.journal}`); this.render(main); }
        catch (error) { toast('Pelepasan gagal', error.message, 'coral'); }
      }));
    }
  };

  // ── Laporan keuangan formal (Sprint 13 / R020) ────────────────────────────
  const statementsPage = {
    permission: 'ledger.view',
    async render(main) {
      this._period = this._period || new Date().toISOString().slice(0, 7);
      const st = await api(`/api/accounting/financial-statements?period=${this._period}`);
      const bs = st.balanceSheet, is = st.incomeStatement;
      const rowsOf = (list) => asList(list).map((r) => `<tr><td>${esc(r.code)} · ${esc(r.name)}</td><td class="right money">${fmtIDRFull(r.balance)}</td></tr>`).join('');
      main.innerHTML = pageHead({
        eyebrow: 'AKUNTANSI', title: 'Laporan keuangan', sub: `Neraca (kumulatif s/d ${st.period}) & laba rugi periode berjalan.`,
        actions: `<label class="period-picker"><span>Periode</span><input id="fsPeriod" type="month" value="${esc(this._period)}"></label>
          <span class="chip ${bs.balanced ? 'mint' : 'coral'}">${bs.balanced ? 'Neraca seimbang' : 'Neraca TIDAK seimbang'}</span>`
      }) + `
        ${bs.publishBlocked ? `<section class="attention"><div class="attention-orb">${ICONS.alert}</div><div><p class="eyebrow">PUBLIKASI DIBLOKIR</p><h2>${bs.unmappedLines.length} akun berkategori tidak dikenal (${fmtIDRFull(bs.unmappedTotal)})</h2><p>Akun berikut tidak masuk neraca dan tidak lagi diam-diam ditambahkan ke ekuitas: ${bs.unmappedLines.map((r) => esc(`${r.code} ${r.name} [${r.category}]`)).join(', ')}. Perbaiki kategori pada bagan akun sebelum laporan diterbitkan.</p></div></section>` : ''}
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">NERACA</p><h2>Posisi keuangan</h2></div></header>
            <div class="table-wrap"><table>
              <thead><tr><th>ASET</th><th class="right"></th></tr></thead><tbody>${rowsOf(bs.assets)}</tbody>
              <tfoot><tr><th>Total aset</th><th class="right money">${fmtIDRFull(bs.totalAssets)}</th></tr></tfoot>
            </table></div>
            <div class="table-wrap"><table>
              <thead><tr><th>KEWAJIBAN</th><th class="right"></th></tr></thead><tbody>${rowsOf(bs.liabilities)}</tbody>
              <thead><tr><th>EKUITAS</th><th class="right"></th></tr></thead><tbody>${rowsOf(bs.equity)}</tbody>
              <tfoot><tr><th>Total kewajiban + ekuitas</th><th class="right money">${fmtIDRFull(bs.totalLiabilitiesAndEquity)}</th></tr></tfoot>
            </table></div>
          </article>
          <article class="panel"><header><div><p class="eyebrow">LABA RUGI</p><h2>Kinerja periode ${esc(st.period)}</h2></div></header>
            <div class="table-wrap"><table>
              <thead><tr><th>PENDAPATAN</th><th class="right"></th></tr></thead><tbody>${rowsOf(is.revenueLines) || '<tr><td colspan="2" class="muted">—</td></tr>'}</tbody>
              <thead><tr><th>BEBAN POKOK</th><th class="right"></th></tr></thead><tbody>${rowsOf(is.cogsLines) || '<tr><td colspan="2" class="muted">—</td></tr>'}</tbody>
              <thead><tr><th>BEBAN OPERASIONAL</th><th class="right"></th></tr></thead><tbody>${rowsOf(is.expenseLines) || '<tr><td colspan="2" class="muted">—</td></tr>'}</tbody>
              <tfoot>
                <tr><th>Laba kotor</th><th class="right money">${fmtIDRFull(is.grossMargin)}</th></tr>
                <tr><th>Laba bersih periode</th><th class="right money">${fmtIDRFull(is.netIncome)}</th></tr>
              </tfoot>
            </table></div>
            <div class="panel-body"><p class="muted">Akun kontra (akumulasi penyusutan, retur penjualan) tampil negatif dan mengurangi kelompoknya — identitas aset = kewajiban + ekuitas terjaga.</p></div>
          </article>
        </section>
        <section class="panel"><header><div><p class="eyebrow">SUBLEDGER</p><h2>AR / AP vs buku besar</h2></div><div class="chip-tabs"><button class="btn ${this._sub !== 'AP' ? 'primary' : 'secondary'}" data-subtype="AR">Piutang (AR)</button><button class="btn ${this._sub === 'AP' ? 'primary' : 'secondary'}" data-subtype="AP">Utang (AP)</button></div></header>
          <div id="subledgerBox"><div class="table-loading">Memuat…</div></div>
        </section>`;
      main.querySelector('#fsPeriod').addEventListener('change', (e) => { this._period = e.target.value; this.render(main); });
      main.querySelectorAll('[data-subtype]').forEach((b) => b.addEventListener('click', () => { this._sub = b.dataset.subtype; this.render(main); }));
      const sub = await api(`/api/accounting/subledger?type=${this._sub || 'AR'}&period=${this._period}`);
      main.querySelector('#subledgerBox').innerHTML = `
        <div class="table-wrap"><table><thead><tr><th>Relasi</th><th class="right">Tertagih</th><th class="right">Terbayar</th><th class="right">Outstanding</th></tr></thead>
        <tbody>${sub.items.map((r) => `<tr><td><b>${esc(r.partyCode || '')}</b> ${esc(r.partyName)}<small>${r.invoices} dokumen</small></td><td class="right money">${fmtIDRFull(r.billed)}</td><td class="right money">${fmtIDRFull(r.settled)}</td><td class="right money"><b>${fmtIDRFull(r.outstanding)}</b></td></tr>`).join('') || '<tr><td colspan="4" class="table-loading">Tidak ada data.</td></tr>'}</tbody>
        <tfoot><tr><th>Total subledger</th><th class="right money">${fmtIDRFull(sub.totals.billed)}</th><th class="right money">${fmtIDRFull(sub.totals.settled)}</th><th class="right money">${fmtIDRFull(sub.totals.outstanding)}</th></tr>
        <tr><th>Saldo GL ${esc(sub.glAccount)}</th><th colspan="2" class="right muted">selisih ${fmtIDRFull(sub.difference)}</th><th class="right money">${fmtIDRFull(sub.glBalance)}</th></tr></tfoot></table></div>`;
    }
  };

  // ── Closing cockpit (Sprint 13 / R020) ────────────────────────────────────
  const closingCockpitPage = {
    permission: 'closing.view',
    async render(main) {
      this._period = this._period || new Date().toISOString().slice(0, 7);
      const ck = await api(`/api/accounting/closing-cockpit?period=${this._period}`);
      const READY_CHIP = { READY: 'mint', REVIEW: 'amber', BLOCKED: 'coral' };
      const ST_ICON = { PASS: ICONS.check, WARN: ICONS.alert, FAIL: ICONS.close };
      const ST_CHIP = { PASS: 'mint', WARN: 'amber', FAIL: 'coral' };
      main.innerHTML = pageHead({
        eyebrow: 'AKUNTANSI', title: 'Closing cockpit', sub: `Checklist kesiapan tutup buku ${esc(ck.period)} — rekonsiliasi bank, inventori, payroll, pajak, subledger, dan penyusutan.`,
        actions: `<label class="period-picker"><span>Periode</span><input id="ckPeriod" type="month" value="${esc(this._period)}"></label>
          <span class="chip ${READY_CHIP[ck.readiness]}">${ck.readiness === 'READY' ? 'Siap ditutup' : ck.readiness === 'REVIEW' ? 'Perlu review' : 'Terblokir'}</span>
          ${ck.closingStatus !== 'CLOSED' && can('closing.post') && ck.readiness !== 'BLOCKED' ? `<button class="btn primary" id="ckClose">Tutup periode</button>` : ''}`
      }) + `
        <section class="metrics">
          ${kpiCard({ label: 'Lulus', value: String(ck.summary.pass), note: 'Pemeriksaan hijau', orb: 'check', orbTone: 'mint' })}
          ${kpiCard({ label: 'Perlu perhatian', value: String(ck.summary.warn), note: 'Boleh ditutup dengan catatan', tone: ck.summary.warn ? 'warn' : '', orb: 'alert', orbTone: 'amber' })}
          ${kpiCard({ label: 'Memblokir', value: String(ck.summary.fail), note: 'Wajib dibereskan sebelum closing', tone: ck.summary.fail ? 'warn' : 'up', orb: 'lock', orbTone: 'coral' })}
        </section>
        <section class="panel"><header><div><p class="eyebrow">CHECKLIST</p><h2>${ck.checks.length} pemeriksaan</h2></div>${ck.closingStatus === 'CLOSED' ? '<span class="chip gray">Periode sudah ditutup</span>' : ''}</header>
          <div class="table-wrap"><table><thead><tr><th></th><th>Pemeriksaan</th><th>Detail</th></tr></thead>
          <tbody>${ck.checks.map((c2) => `<tr><td><span class="chip ${ST_CHIP[c2.status]}">${ST_ICON[c2.status]} ${c2.status}</span></td><td><b>${esc(c2.name)}</b></td><td>${esc(c2.detail)}</td></tr>`).join('')}</tbody></table></div>
          <div class="panel-body"><p class="muted">FAIL memblokir closing; WARN adalah selisih yang harus dijelaskan (mis. saldo stok legacy tanpa jurnal). Tutup periode tetap memvalidasi trial balance & dokumen menggantung di server.</p></div>
        </section>`;
      main.querySelector('#ckPeriod').addEventListener('change', (e) => { this._period = e.target.value; this.render(main); });
      main.querySelector('#ckClose')?.addEventListener('click', async () => {
        const answer = await actionDialog({ title: `Tutup periode ${this._period}`, description: 'Periode tertutup tidak menerima transaksi. Reopen membutuhkan PIN Owner.', requireReason: true, confirmLabel: 'Tutup periode' });
        if (!answer) return;
        try { await api('/api/accounting/period/close', { method: 'POST', body: { period: this._period, ...answer } }); invalidate(`accounting:${this._period}`); toast('Periode ditutup', this._period); this.render(main); }
        catch (error) { toast('Closing gagal', error.message, 'coral'); }
      });
    }
  };

  R('/finance/invoices', docListPage({ type: 'INVOICE', module: 'invoice', title: 'Invoice', eyebrow: 'KEUANGAN', statuses: ['DRAFT','WAITING_APPROVAL','APPROVED','PARTIALLY_PAID','OVERDUE','CLOSED','VOID'] }));
  R('/finance/assets', assetsPage);
  R('/accounting/statements', statementsPage);
  R('/accounting/closing', closingCockpitPage);
  R('/finance/collection', collectionPage);
  R('/finance/payments', paymentPage);
  R('/finance/supplier-invoices', docListPage({ type: 'SUPPLIER_INVOICE', module: 'supplier_invoice', title: 'Tagihan supplier', eyebrow: 'KEUANGAN' }));
  R('/finance/expenses', docListPage({ type: 'EXPENSE', module: 'expense', title: 'Pengeluaran & reimburse', eyebrow: 'KEUANGAN' }));
  R('/accounting', accounting);
  R('/accounting/journals', docListPage({ type: 'JOURNAL', module: 'journal', title: 'Jurnal', eyebrow: 'AKUNTANSI' }));
  R('/tax', taxCenter);
})();
