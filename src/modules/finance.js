'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  const paymentPage = {
    permission: 'payment.view',
    onEvent() { this._table?.reload(); },
    render(main) {
      main.innerHTML = pageHead({ eyebrow: 'KEUANGAN', title: 'Pembayaran', sub: 'Pembayaran masuk dan keluar dengan alokasi tagihan yang tervalidasi.', actions: can('payment.edit') ? `<button class="btn primary" id="paymentAllocate">${ICONS.check} Alokasikan pembayaran</button>` : '' }) + '<section id="paymentTable"></section>';
      this._table = dataTable(main.querySelector('#paymentTable'), { key: 'documents:payments', endpoint: '/api/documents', params: { type: 'CUSTOMER_PAYMENT,SUPPLIER_PAYMENT' }, title: 'Daftar pembayaran', eyebrow: 'KEUANGAN', columns: [{ label: 'Dokumen', render: docCell }, { label: 'Relasi', render: r => esc(r.partyName || '—') }, { label: 'Nilai', right: true, render: r => `<span class="money">${fmtIDR(r.amount)}</span>` }, { label: 'Status', render: r => chip(r.status) }, { label: 'Diperbarui', render: r => relTime(r.updatedAt) }], statusFilter: ['DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'COMPLETED', 'CLOSED', 'VOID'], onRow: (row, reload) => openDrawer(row.id, { onChange: reload }) });
      main.querySelector('#paymentAllocate')?.addEventListener('click', async () => { try { const [payments, invoices] = await Promise.all([api('/api/documents?type=CUSTOMER_PAYMENT,SUPPLIER_PAYMENT&limit=100'), api('/api/documents?type=INVOICE,SUPPLIER_INVOICE&limit=100')]); const usablePayments = payments.items.filter(x => ['APPROVED', 'COMPLETED', 'CLOSED'].includes(x.status)), openInvoices = invoices.items.filter(x => !['CLOSED', 'VOID', 'CANCELLED'].includes(x.status)); if (!usablePayments.length || !openInvoices.length) throw new Error('Dibutuhkan minimal satu pembayaran disetujui dan satu tagihan terbuka.'); const value = await formDialog({ title: 'Alokasikan pembayaran', description: 'Jenis pembayaran harus sesuai dengan tagihan. Sistem mencegah alokasi melebihi saldo.', fields: [{ name: 'paymentId', label: 'Pembayaran', type: 'select', options: usablePayments.map(x => [x.id, `${x.documentNumber} · ${fmtIDR(x.amount)}`]), required: true }, { name: 'invoiceId', label: 'Tagihan', type: 'select', options: openInvoices.map(x => [x.id, `${x.documentNumber} · ${fmtIDR(x.amount)}`]), required: true }, { name: 'amount', label: 'Nilai alokasi', type: 'number', min: 1, required: true }], submitLabel: 'Alokasikan' }); if (!value) return; const result = await api('/api/payments/allocate', { method: 'POST', body: value }); toast('Pembayaran dialokasikan', `Sisa tagihan ${fmtIDR(result.remaining)}`); this._table.reload(); } catch (error) { toast('Alokasi gagal', error.message, 'coral'); } });
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
      main.querySelector('#closePeriod')?.addEventListener('click', async () => { const answer = await actionDialog({ title: `Tutup periode ${period}`, description: 'Pastikan posting, trial balance, dan rekonsiliasi sudah selesai. Periode yang ditutup tidak dapat menerima transaksi.', requireReason: true, confirmLabel: 'Tutup periode' }); if (!answer) return; try { await api('/api/accounting/period/close', { method: 'POST', body: { period, ...answer } }); invalidate(`accounting:${period}`); toast('Periode ditutup', `${period} sekarang terkunci.`); this.render(main); } catch (error) { toast('Closing gagal', error.message, 'coral'); } });
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
      const t = await query(`tax:${period}`, () => api(`/api/tax/summary?period=${period}`, { signal }), { staleMs: 60_000 });
      const actions = `<label class="period-picker"><span>Periode</span><input id="taxPeriod" type="month" value="${esc(period)}"></label>${can('tax.edit') ? `<button class="btn primary" id="taxSync">${ICONS.refresh} Sinkronkan pajak</button>` : ''}`;
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
        </section>`;
      main.querySelector('#taxPeriod').addEventListener('change', (e) => { this.period = e.target.value; this.render(main); });
      main.querySelector('#taxSync')?.addEventListener('click', async () => { try { await api('/api/tax/sync', { method: 'POST', body: { period } }); invalidate(`tax:${period}`); toast('Pajak disinkronkan', `Data masa ${period} diperbarui.`); this.render(main); } catch (error) { toast('Sinkronisasi gagal', error.message, 'coral'); } });
      main.querySelectorAll('[data-tax-report]').forEach(btn => btn.addEventListener('click', async () => { const answer = await actionDialog({ title: 'Tandai sudah dilaporkan', description: 'Pastikan pelaporan pada sistem DJP telah berhasil. Tindakan ini masuk audit trail.', requireReason: true, confirmLabel: 'Tandai lapor' }); if (!answer) return; try { await api(`/api/tax/records/${btn.dataset.taxReport}/report`, { method: 'POST', body: answer }); invalidate(`tax:${period}`); toast('Status pelaporan diperbarui'); this.render(main); } catch (error) { toast('Pembaruan gagal', error.message, 'coral'); } }));
    }
  };


  const R = router.register.bind(router);
  R('/finance/invoices', docListPage({ type: 'INVOICE', module: 'invoice', title: 'Invoice', eyebrow: 'KEUANGAN', statuses: ['DRAFT','WAITING_APPROVAL','APPROVED','PARTIALLY_PAID','OVERDUE','CLOSED','VOID'] }));
  R('/finance/payments', paymentPage);
  R('/finance/supplier-invoices', docListPage({ type: 'SUPPLIER_INVOICE', module: 'supplier_invoice', title: 'Tagihan supplier', eyebrow: 'KEUANGAN' }));
  R('/finance/expenses', docListPage({ type: 'EXPENSE', module: 'expense', title: 'Pengeluaran & reimburse', eyebrow: 'KEUANGAN' }));
  R('/accounting', accounting);
  R('/accounting/journals', docListPage({ type: 'JOURNAL', module: 'journal', title: 'Jurnal', eyebrow: 'AKUNTANSI' }));
  R('/tax', taxCenter);
})();
