'use strict';
// Definisi seluruh halaman. Satu pola: route → permission → render(main).
// Semua daftar memakai paginasi server, debounce 400 ms, pembatalan request.
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;

  const progressBar = (pct) => { const value = Math.min(100, Math.max(0, Number(pct) || 0)); return `<div class="progress"><progress max="100" value="${value}" aria-label="Progres ${value}%"></progress><span>${value}%</span></div>`; };
  const docCell = (row) => `<b>${esc(row.documentNumber)}</b><small>${esc(row.title)}</small>`;

  // ── Pabrik halaman daftar dokumen ─────────────────────────────────────────
  function docListPage({ type, module, title, eyebrow, statuses, columns, createLabel, createRoute, empty }) {
    const cols = columns || [
      { label: 'Dokumen', render: docCell },
      { label: 'Relasi', render: (r) => esc(r.partyName || '—') },
      { label: 'Nilai', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
      { label: 'Jatuh tempo', render: (r) => fmtDate(r.dueDate) },
      { label: 'Status', render: (r) => chip(r.status) },
      { label: 'Diperbarui', render: (r) => `<small>${relTime(r.updatedAt)}</small>` }
    ];
    return {
      permission: `${module}.view`,
      onEvent() { if (this._table) this._table.reload(); },
      render(main) {
        main.innerHTML = pageHead({
          eyebrow, title,
          sub: `Kelola dokumen ${title.toLowerCase()} dengan persetujuan berjenjang dan jejak audit penuh.`,
          actions: (createLabel && can(`${module}.create`)) ? `<button class="btn secondary" id="pgExport">${ICONS.job} Ekspor</button><a class="btn primary" href="${createRoute || '#'}" id="pgCreate">${ICONS.plus} ${esc(createLabel)}</a>` : `<button class="btn secondary" id="pgExport">${ICONS.job} Ekspor</button>`
        }) + `<section id="pgTable"></section>`;
        this._table = dataTable(main.querySelector('#pgTable'), {
          key: `documents:${type}`, endpoint: '/api/documents', params: { type },
          title: `Daftar ${title.toLowerCase()}`, eyebrow, columns: cols,
          statusFilter: statuses || ['DRAFT','WAITING_APPROVAL','APPROVED','IN_PROCESS','COMPLETED','CLOSED','REJECTED','OVERDUE'],
          onRow: (row, refresh) => openDrawer(row.id, { onChange: refresh }),
          empty
        });
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

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const dashboard = {
    permission: 'dashboard.view',
    onEvent() { this.render(document.getElementById('main')); },
    async render(main, _params, signal) {
      const data = await query('dashboard', () => api('/api/dashboard', { signal }), { staleMs: 30_000 });
      const hour = new Date().getHours();
      const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';
      const firstName = state.user.displayName.split(' ')[0];
      const k = data.kpi; const h = data.health;

      // Grafik pendapatan kumulatif bulan berjalan.
      const series = data.revenueSeries;
      const maxVal = Math.max(...series.map((p) => p.value), 1);
      const w = 620, hgt = 140, pad = 18;
      const coords = series.map((p, i) => [pad + i * (w - pad * 2) / Math.max(series.length - 1, 1), hgt - 16 - (p.value / maxVal) * (hgt - 40)]);
      const line = coords.map((c, i) => `${i ? 'L' : 'M'}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ');
      const today = new Date();
      const monthName = today.toLocaleDateString('id-ID', { month: 'long' });

      main.innerHTML = `
        ${pageHead({
          eyebrow: today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(),
          title: `${greet}, ${esc(firstName)}.`,
          sub: 'Berikut kondisi bisnis yang perlu Anda ketahui hari ini.',
          actions: `<button class="btn secondary" id="dashRefresh">${ICONS.refresh} Segarkan</button>${can('quotation.create') ? `<a class="btn primary" href="#/sales/quotations/new">${ICONS.plus} Buat penawaran</a>` : ''}`
        })}
        ${data.attention.pendingApprovals ? `
        <section class="attention">
          <div class="attention-orb">${ICONS.bell}</div>
          <div><p class="eyebrow">PERLU PERHATIAN</p>
            <h2>${data.attention.pendingApprovals} keputusan menunggu persetujuan Anda</h2>
            <p>Nilai total ${fmtIDR(data.attention.pendingAmount)} · ${data.attention.slaRisk} dokumen bernilai besar menunggu keputusan.</p></div>
          <a class="btn ink" href="#/approvals">Buka pusat persetujuan ${ICONS.arrow}</a>
        </section>` : ''}
        <section class="metrics">
          ${kpiCard({ label: `Pendapatan ${monthName}`, value: fmtIDR(k.revenueMonth), note: `↑ ${k.revenueGrowthPct}% dari bulan lalu`, tone: 'up', orb: 'chart', orbTone: 'blue' })}
          ${kpiCard({ label: 'Piutang jatuh tempo', value: fmtIDR(k.arOverdue), note: `${k.arOverdueCount} invoice perlu ditagih`, tone: 'warn', orb: 'doc', orbTone: 'amber' })}
          ${kpiCard({ label: 'Pesanan aktif', value: String(k.activeOrders), note: `${k.inProduction} dalam proses produksi`, orb: 'cart', orbTone: 'mint' })}
          ${kpiCard({ label: 'Progres produksi', value: `${k.utilizationPct}%`, note: `Target operasional ${k.utilizationTarget}%`, orb: 'factory', orbTone: 'lavender' })}
        </section>
        <section class="dashboard-grid">
          <article class="panel revenue-panel">
            <header><div><p class="eyebrow">KINERJA KEUANGAN</p><h2>Arus pendapatan</h2></div>
              <div class="legend"><span><i></i>Kumulatif ${monthName}</span></div></header>
            <div class="chart-summary"><div><span>Pendapatan bulan ini</span><strong>${fmtIDR(k.revenueMonth)}</strong>
              <small class="up">${ICONS.trend} ${k.revenueGrowthPct}% dari bulan lalu</small></div></div>
            <div class="chart" role="img" aria-label="Grafik pendapatan kumulatif bulan berjalan.">
              <svg viewBox="0 0 ${w} ${hgt}" preserveAspectRatio="none">
                <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#8db9ff" stop-opacity=".28"/><stop offset="1" stop-color="#8db9ff" stop-opacity="0"/></linearGradient></defs>
                ${[30, 60, 90, 120].map((y) => `<path class="gridline" d="M${pad} ${y}H${w - pad}"/>`).join('')}
                <path class="area" d="${line} L${coords.at(-1)[0]},${hgt - 12} L${pad},${hgt - 12}Z"/>
                <path class="line" d="${line}"/>
                <circle cx="${coords.at(-1)[0]}" cy="${coords.at(-1)[1]}" r="4"/>
                <text x="${pad}" y="${hgt - 2}">1 ${monthName.slice(0, 3)}</text><text x="${w - 60}" y="${hgt - 2}">${today.getDate()} ${monthName.slice(0, 3)}</text>
              </svg>
            </div>
          </article>
          <article class="panel health-panel">
            <header><div><p class="eyebrow">KESEHATAN BISNIS</p><h2>Posisi hari ini</h2></div>
              ${can('journal.view') ? `<a class="text-btn" href="#/accounting">Lihat laporan ${ICONS.arrow}</a>` : ''}</header>
            <div class="health-list">
              <div class="health-row"><span class="health-icon blue">${ICONS.wallet}</span><span><b>Piutang usaha</b><small>${h.arCount} invoice terbuka</small></span><strong>${fmtIDR(h.arTotal)}</strong></div>
              <div class="health-row"><span class="health-icon amber">${ICONS.doc}</span><span><b>Utang usaha</b><small>${h.apCount} tagihan supplier</small></span><strong>${fmtIDR(h.apTotal)}</strong></div>
              <div class="health-row"><span class="health-icon mint">${ICONS.box}</span><span><b>Persediaan</b><small>${h.skuCount} SKU · ${h.criticalStock} stok kritis</small></span><strong>${fmtIDR(h.inventoryValue)}</strong></div>
              <div class="health-row"><span class="health-icon lavender">${ICONS.project}</span><span><b>Order book</b><small>${h.orderCount} pekerjaan aktif</small></span><strong>${fmtIDR(h.orderBook)}</strong></div>
            </div>
            <div class="cash-card"><span>Posisi kas & bank<small>Per ${fmtDateTime(data.asOf)}</small></span><strong>${fmtIDR(h.cashPosition)}</strong></div>
          </article>
        </section>
        <section class="panel work-panel">
          <header><div><p class="eyebrow">OPERASIONAL</p><h2>Pekerjaan aktif</h2></div>
            ${can('work_order.view') ? `<a class="text-btn" href="#/production/work-orders">Lihat semua ${ICONS.arrow}</a>` : ''}</header>
          <div class="table-wrap"><table>
            <thead><tr><th>Pekerjaan</th><th>Pelanggan</th><th>Progres</th><th class="right">Nilai</th><th>Jatuh tempo</th><th>Status</th></tr></thead>
            <tbody>${data.activeJobs.map((j) => `
              <tr class="clickable" tabindex="0" role="button" data-doc="${esc(j.id)}">
                <td><b>${esc(j.documentNumber)}</b><small>${esc(j.title)}</small></td>
                <td>${esc(j.party || '—')}</td>
                <td>${progressBar(j.progress)}</td>
                <td class="right"><span class="money">${fmtIDR(j.amount)}</span></td>
                <td>${fmtDate(j.dueDate)}</td>
                <td>${chip(j.status)}</td>
              </tr>`).join('') || `<tr><td colspan="6"><div class="empty-state">${clayOrb('mint', 'check')}<h3>Tidak ada pekerjaan aktif</h3><p>Semua pesanan selesai. Waktunya menjemput order baru.</p></div></td></tr>`}
            </tbody>
          </table></div>
        </section>`;

      main.querySelector('#dashRefresh').addEventListener('click', async (e) => {
        const btn = e.currentTarget; btn.disabled = true;
        invalidate('dashboard');
        await dashboard.render(main);
        toast('Data disegarkan', 'Ringkasan terbaru sudah ditampilkan.');
      });
      main.querySelectorAll('[data-doc]').forEach((tr) => {
        const open = () => openDrawer(tr.dataset.doc, { onChange: () => { invalidate('dashboard'); dashboard.render(main); } });
        tr.addEventListener('click', open);
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      });
    }
  };

  // ── Pusat persetujuan ─────────────────────────────────────────────────────
  const approvals = {
    permission: 'approval.view',
    onEvent() { if (this._table) this._table.reload(); },
    render(main) {
      main.innerHTML = pageHead({
        eyebrow: 'PUSAT PERSETUJUAN', title: 'Persetujuan saya',
        sub: 'Keputusan diurutkan dari nilai terbesar. Routing mengikuti matriks approval terpusat.'
      }) + `<section id="apprTable"></section>`;
      const riskChip = { high: '<span class="chip coral">Risiko tinggi</span>', medium: '<span class="chip amber">Risiko sedang</span>', low: '<span class="chip gray">Risiko rendah</span>' };
      this._table = dataTable(main.querySelector('#apprTable'), {
        key: 'approvals', endpoint: '/api/approvals', params: {},
        title: 'Menunggu keputusan Anda', eyebrow: 'ANTREAN', staleMs: 15_000, sort: 'amount:desc',
        columns: [
          { label: 'Dokumen', render: (r) => `<b>${esc(r.documentNumber)}</b><small>${esc(TYPE_LABEL[r.documentType] || r.documentType)} · ${esc(r.title)}</small>` },
          { label: 'Pemohon', render: (r) => `${esc(r.createdByName)}<small>${esc(r.partyName || '')}</small>` },
          { label: 'Nilai', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
          { label: 'Jenjang', render: (r) => `<span class="chip blue">Level ${esc(r.approvalLevel)} · ${esc(r.nextLevel || '')}</span>` },
          { label: 'Umur', render: (r) => `${r.ageDays} hari` },
          { label: 'Risiko', render: (r) => riskChip[r.risk] },
          { label: '', render: (r) => can('approval.approve') || can('*') ? `<div class="row-actions"><button class="btn primary sm" data-quick="approve" data-id="${esc(r.id)}">Setujui</button><button class="btn danger-outline sm" data-quick="reject" data-id="${esc(r.id)}">Tolak</button></div>` : '' }
        ],
        onRow: (row, refresh) => openDrawer(row.id, { onChange: refresh }),
        empty: { icon: 'checkCircle', title: 'Tidak ada persetujuan tertunda', hint: 'Semua keputusan sudah diambil. Kerja bagus.' }
      });
      main.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-quick]');
        if (!btn) return;
        e.stopPropagation();
        api(`/api/documents/${btn.dataset.id}`).then((doc) => {
          runDocAction(doc, btn.dataset.quick, MODULE_OF_TYPE[doc.documentType], () => this._table.reload());
        });
      });
    }
  };

  // ── Notifikasi ────────────────────────────────────────────────────────────
  const notifications = {
    permission: 'notification.view',
    onEvent(type) { if (type === 'notification.created') this.render(document.getElementById('main')); },
    async render(main, _p, signal) {
      const data = await query('notifications', () => api('/api/notifications', { signal }), { staleMs: 15_000, force: true });
      const catIcon = { ACTION_REQUIRED: 'bell', WARNING: 'alert', INFORMATION: 'doc', SUCCESS: 'check', SYSTEM_ALERT: 'monitor' };
      const catTone = { ACTION_REQUIRED: 'amber', WARNING: 'coral', INFORMATION: 'blue', SUCCESS: 'mint', SYSTEM_ALERT: 'coral' };
      main.innerHTML = pageHead({
        eyebrow: 'PUSAT NOTIFIKASI', title: 'Notifikasi',
        sub: `${data.unread} belum dibaca dari ${data.items.length} notifikasi terakhir.`,
        actions: data.unread ? `<button class="btn secondary" id="readAll">${ICONS.check} Tandai semua dibaca</button>` : ''
      }) + `
        <section class="notif-list">
          ${data.items.map((n) => `
            <article class="notif-card ${n.readAt ? 'read' : ''}">
              <span class="notif-icon ${catTone[n.category]}">${ICONS[catIcon[n.category]]}</span>
              <div><div class="notif-head"><b>${esc(n.title)}</b>${chip(n.category)}</div>
                <p>${esc(n.body)}</p><small>${relTime(n.createdAt)}</small></div>
              <div class="notif-actions">
                ${n.link ? `<a class="btn secondary sm" href="${esc(n.link)}">Buka</a>` : ''}
                ${!n.readAt ? `<button class="btn ghost sm" data-read="${esc(n.id)}">Tandai dibaca</button>` : ''}
              </div>
            </article>`).join('') || `<div class="empty-state">${clayOrb('mint', 'bell')}<h3>Tidak ada notifikasi</h3><p>Semua informasi penting akan muncul di sini.</p></div>`}
        </section>`;
      main.querySelectorAll('[data-read]').forEach((btn) => btn.addEventListener('click', async () => {
        await api(`/api/notifications/${btn.dataset.read}/read`, { method: 'POST' });
        invalidate('notifications'); window.MAT.refreshBadge(); this.render(main);
      }));
      const readAll = main.querySelector('#readAll');
      if (readAll) readAll.addEventListener('click', async () => {
        await api('/api/notifications/read-all', { method: 'POST' });
        invalidate('notifications'); window.MAT.refreshBadge(); this.render(main);
      });
    }
  };

  // ── Wizard penawaran (form kompleks bertahap) ─────────────────────────────
  const quotationWizard = {
    permission: 'quotation.create',
    async render(main, _p, signal) {
      const DRAFT_KEY = 'mat-draft-quotation';
      const saved = localStorage.getItem(DRAFT_KEY);
      const draft = saved ? JSON.parse(saved) : { customerId: '', customerName: '', lines: [], taxPct: 11, discountPct: 0, terms: 'Net 30', deliveryWeeks: 4, notes: '' };
      let step = 0;
      const steps = ['Pelanggan', 'Produk & jumlah', 'Harga & pajak', 'Pengiriman & termin', 'Tinjau', 'Ajukan'];
      const [customers, products] = await Promise.all([
        query('customers:all', () => api('/api/customers?limit=100', { signal }), { staleMs: 900_000 }),
        query('products:all', () => api('/api/products?limit=100', { signal }), { staleMs: 900_000 })
      ]);
      const persist = () => localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      const subtotal = () => draft.lines.reduce((s, l) => s + l.qty * l.price, 0);
      const discount = () => subtotal() * draft.discountPct / 100;
      const tax = () => (subtotal() - discount()) * draft.taxPct / 100;
      const total = () => subtotal() - discount() + tax();

      function view() {
        const stepsHtml = steps.map((label, i) => `<div class="wiz-step ${i === step ? 'active' : i < step ? 'done' : ''}"><span>${i < step ? ICONS.check : i + 1}</span><b>${label}</b></div>`).join('<i class="wiz-line"></i>');
        let body = '';
        if (step === 0) body = `
          <label class="field"><span>Pelanggan <b>*</b></span>
            <select id="wizCustomer" name="customerId" autocomplete="off" class="select block">${['<option value="">— Pilih pelanggan —</option>', ...customers.items.map((c) => `<option value="${esc(c.id)}" ${c.id === draft.customerId ? 'selected' : ''}>${esc(c.name)} · ${esc(c.city)}</option>`)].join('')}</select>
            <small>Termin pembayaran dan alamat mengikuti master pelanggan.</small></label>`;
        if (step === 1) body = `
          <div class="wiz-lines">
            ${draft.lines.map((l, i) => `
              <div class="wiz-line-row">
                <span><b>${esc(l.name)}</b><small>${fmtIDRFull(l.price)} / ${esc(l.uom)}</small></span>
                <input name="lineQty${i}" autocomplete="off" type="number" min="1" value="${l.qty}" data-line-qty="${i}" aria-label="Jumlah ${esc(l.name)}">
                <span class="money">${fmtIDR(l.qty * l.price)}</span>
                <button class="icon-btn sm" data-line-del="${i}" aria-label="Hapus baris">${ICONS.close}</button>
              </div>`).join('') || `<div class="empty-inline">${clayOrb('blue', 'box')}<p>Belum ada baris produk. Tambahkan dari daftar di bawah.</p></div>`}
          </div>
          <label class="field"><span>Tambah produk</span>
            <select id="wizAddProduct" name="productId" autocomplete="off" class="select block"><option value="">— Pilih produk/jasa —</option>${products.items.map((p) => `<option value="${esc(p.id)}">${esc(p.name)} · ${fmtIDRFull(p.price)}</option>`).join('')}</select></label>`;
        if (step === 2) body = `
          <div class="field-grid">
            <label class="field"><span>Diskon (%)</span><input id="wizDiscount" name="discountPct" autocomplete="off" type="number" min="0" max="100" step="0.5" value="${draft.discountPct}"></label>
            <label class="field"><span>PPN (%)</span><input id="wizTax" name="taxPct" autocomplete="off" type="number" min="0" max="100" step="0.5" value="${draft.taxPct}"></label>
          </div>
          <div class="totals-card">
            <div><span>Subtotal</span><b>${fmtIDRFull(subtotal())}</b></div>
            <div><span>Diskon</span><b>− ${fmtIDRFull(discount())}</b></div>
            <div><span>PPN ${draft.taxPct}%</span><b>${fmtIDRFull(tax())}</b></div>
            <div class="grand"><span>Total penawaran</span><b>${fmtIDRFull(total())}</b></div>
          </div>`;
        if (step === 3) body = `
          <div class="field-grid">
            <label class="field"><span>Termin pembayaran</span>
              <select id="wizTerms" name="paymentTerms" autocomplete="off" class="select block">${['DP 50% - Pelunasan', 'Net 14', 'Net 30', 'Net 45'].map((t) => `<option ${t === draft.terms ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
            <label class="field"><span>Estimasi pengerjaan (minggu)</span><input id="wizWeeks" name="deliveryWeeks" autocomplete="off" type="number" min="1" max="52" value="${draft.deliveryWeeks}"></label>
          </div>
          <label class="field"><span>Catatan untuk pelanggan</span><textarea id="wizNotes" name="customerNotes" autocomplete="off" rows="3" placeholder="Contoh: syarat garansi, lingkup pekerjaan, dan pengecualian…">${esc(draft.notes)}</textarea></label>`;
        if (step >= 4) body = `
          <div class="review-card">
            <div class="review-row"><span>Pelanggan</span><b>${esc(draft.customerName || '—')}</b></div>
            <div class="review-row"><span>Baris produk</span><b>${draft.lines.length} item</b></div>
            <div class="review-row"><span>Termin</span><b>${esc(draft.terms)} · ${draft.deliveryWeeks} minggu</b></div>
            <div class="review-row grand"><span>Total penawaran</span><b>${fmtIDRFull(total())}</b></div>
            ${step === 5 ? `<p class="review-note">Dokumen dibuat sebagai draft lalu langsung diajukan ke jenjang persetujuan (${total() > 50_000_000 ? 'supervisor → finance → owner' : total() > 5_000_000 ? 'supervisor → finance' : 'supervisor'}).</p>` : ''}
          </div>`;

        main.innerHTML = pageHead({ eyebrow: 'PENJUALAN · PENAWARAN BARU', title: 'Buat penawaran', sub: 'Draft tersimpan otomatis — data tidak hilang saat berpindah langkah.' }) + `
          <section class="panel wizard-panel">
            <div class="wiz-steps">${stepsHtml}</div>
            <div class="wiz-body">${body}<p class="error-text" id="wizError" role="alert"></p></div>
            <footer class="wiz-footer">
              <button class="btn secondary" id="wizBack" ${step === 0 ? 'disabled' : ''}>Kembali</button>
              <span class="wiz-progress">Langkah ${step + 1} dari ${steps.length}</span>
              <button class="btn primary" id="wizNext">${step === 5 ? 'Buat & ajukan penawaran' : step === 4 ? 'Lanjut ke pengajuan' : 'Lanjut'}</button>
            </footer>
          </section>`;
        bind();
      }

      function bind() {
        const err = (msg) => { main.querySelector('#wizError').textContent = msg; };
        main.querySelector('#wizBack').addEventListener('click', () => { if (step > 0) { step -= 1; view(); } });
        main.querySelector('#wizNext').addEventListener('click', async () => {
          if (step === 0 && !draft.customerId) return err('Pilih pelanggan terlebih dahulu.');
          if (step === 1 && !draft.lines.length) return err('Tambahkan minimal satu baris produk.');
          if (step < 5) { step += 1; persist(); view(); return; }
          const btn = main.querySelector('#wizNext');
          btn.disabled = true; btn.textContent = 'Memproses…'; // cegah klik ganda
          try {
            const doc = await api('/api/documents', { method: 'POST', idempotencyKey: newIdemKey(), body: {
              type: 'QUOTATION', title: `Penawaran ${draft.lines[0].name}${draft.lines.length > 1 ? ` +${draft.lines.length - 1} item` : ''}`,
              amount: Math.round(total()), partyId: draft.customerId, partyName: draft.customerName,
              payload: { lines: draft.lines, discountPct: draft.discountPct, taxPct: draft.taxPct, terms: draft.terms, deliveryWeeks: draft.deliveryWeeks, notes: draft.notes }
            } });
            await api(`/api/documents/${doc.id}/action`, { method: 'POST', idempotencyKey: newIdemKey(), body: { action: 'submit' } });
            localStorage.removeItem(DRAFT_KEY);
            invalidate('documents'); invalidate('dashboard'); invalidate('approvals');
            toast(`${doc.documentNumber} diajukan`, 'Penawaran masuk antrean persetujuan.');
            router.go('#/sales/quotations');
          } catch (error) {
            btn.disabled = false; btn.textContent = 'Buat & ajukan penawaran';
            err(error.message);
          }
        });
        const customerSel = main.querySelector('#wizCustomer');
        if (customerSel) customerSel.addEventListener('change', () => {
          draft.customerId = customerSel.value;
          draft.customerName = customerSel.selectedOptions[0] ? customerSel.selectedOptions[0].textContent.split(' · ')[0] : '';
          persist();
        });
        const addSel = main.querySelector('#wizAddProduct');
        if (addSel) addSel.addEventListener('change', () => {
          const p = products.items.find((x) => x.id === addSel.value);
          if (p) { draft.lines.push({ productId: p.id, name: p.name, uom: p.uom, price: p.price, qty: 1 }); persist(); view(); }
        });
        main.querySelectorAll('[data-line-qty]').forEach((input) => input.addEventListener('change', () => {
          draft.lines[Number(input.dataset.lineQty)].qty = Math.max(1, Number(input.value) || 1); persist(); view();
        }));
        main.querySelectorAll('[data-line-del]').forEach((btn) => btn.addEventListener('click', () => {
          draft.lines.splice(Number(btn.dataset.lineDel), 1); persist(); view();
        }));
        const bindNum = (id, key) => { const el = main.querySelector(id); if (el) el.addEventListener('change', () => { draft[key] = Number(el.value) || 0; persist(); view(); }); };
        bindNum('#wizDiscount', 'discountPct'); bindNum('#wizTax', 'taxPct'); bindNum('#wizWeeks', 'deliveryWeeks');
        const terms = main.querySelector('#wizTerms'); if (terms) terms.addEventListener('change', () => { draft.terms = terms.value; persist(); });
        const notes = main.querySelector('#wizNotes'); if (notes) notes.addEventListener('input', window.MAT.debounce(() => { draft.notes = notes.value; persist(); }, 1000));
      }
      view();
    }
  };

  // ── Detail dokumen penuh ──────────────────────────────────────────────────
  const docDetail = {
    async render(main, params, signal) {
      const doc = await query(`doc:${params.id}`, () => api(`/api/documents/${params.id}`, { signal }), { staleMs: 10_000, force: true });
      const moduleCode = MODULE_OF_TYPE[doc.documentType];
      const files = await api(`/api/files?documentId=${encodeURIComponent(doc.id)}`, { signal });
      const lines = (doc.payload && doc.payload.lines) || [];
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
                <tbody>${lines.map((l) => `<tr><td><b>${esc(l.name)}</b></td><td class="right">${l.qty} ${esc(l.uom || '')}</td><td class="right money">${fmtIDRFull(l.price)}</td><td class="right money">${fmtIDRFull(l.qty * l.price)}</td></tr>`).join('')}</tbody>
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
            <article class="panel"><header><div><p class="eyebrow">DOKUMEN</p><h2>Lampiran & cetak</h2></div></header>
              <div class="panel-body stack">
                <button class="btn secondary block" id="detailPdf">${ICONS.doc} Buat PDF (latar belakang)</button>
                ${doc.documentType === 'PAYROLL_RUN' && can('payroll.view') ? `<button class="btn secondary block" id="payrollSlips">${ICONS.payslip} Buat seluruh slip gaji</button>` : ''}
                ${can(`${moduleCode}.edit`) ? `<button class="btn secondary block" id="detailUpload">${ICONS.plus} Unggah lampiran</button><input id="detailFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.docx" hidden>` : ''}
                <div class="file-list">${files.items.map(file => `<div class="file-row"><span>${ICONS.doc}<span><b>${esc(file.originalFilename)}</b><small>${Math.ceil(file.sizeBytes / 1024).toLocaleString('id-ID')} KB · ${fmtDateTime(file.uploadedAt)}</small></span></span><span><a class="icon-btn" href="/api/files/${esc(file.id)}" aria-label="Unduh ${esc(file.originalFilename)}">${ICONS.arrow}</a>${can(`${moduleCode}.edit`) ? `<button class="icon-btn" data-file-delete="${esc(file.id)}" aria-label="Hapus ${esc(file.originalFilename)}">${ICONS.close}</button>` : ''}</span></div>`).join('') || '<p class="muted">Belum ada lampiran.</p>'}</div>
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
    }
  };

  // ── Master data & inventori ───────────────────────────────────────────────
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

  const inventory = {
    permission: 'inventory.view',
    onEvent() { if (this._table) this._table.reload(); },
    render(main) {
      main.innerHTML = pageHead({ eyebrow: 'GUDANG', title: 'Persediaan', sub: 'Saldo stok per gudang. Baris merah berada di bawah stok minimum.' }) + '<section id="pgTable"></section>';
      this._table = dataTable(main.querySelector('#pgTable'), {
        key: 'inventory', endpoint: '/api/inventory', params: {}, title: 'Saldo stok', eyebrow: 'INVENTORI', staleMs: 60_000, sort: 'productCode:asc',
        columns: [
          { label: 'Produk', render: (r) => `<b>${esc(r.productCode)}</b><small>${esc(r.productName)}</small>` },
          { label: 'Gudang', render: (r) => esc(r.warehouseName) },
          { label: 'Stok', right: true, render: (r) => `<span class="money">${r.qtyOnHand} ${esc(r.uom)}</span>` },
          { label: 'Direservasi', right: true, render: (r) => `${r.qtyReserved} ${esc(r.uom)}` },
          { label: 'Min.', right: true, render: (r) => `${r.minQty} ${esc(r.uom)}` },
          { label: 'Nilai', right: true, render: (r) => `<span class="money">${fmtIDR(r.valueIdr)}</span>` },
          { label: 'Status', render: (r) => r.qtyOnHand < r.minQty ? '<span class="chip coral">Stok kritis</span>' : '<span class="chip mint">Aman</span>' }
        ],
        empty: { icon: 'box', title: 'Belum ada stok tercatat' }
      });
    }
  };

  const paymentPage = {
    permission: 'payment.view',
    onEvent() { this._table?.reload(); },
    render(main) {
      main.innerHTML = pageHead({ eyebrow: 'KEUANGAN', title: 'Pembayaran', sub: 'Pembayaran masuk dan keluar dengan alokasi tagihan yang tervalidasi.', actions: can('payment.edit') ? `<button class="btn primary" id="paymentAllocate">${ICONS.check} Alokasikan pembayaran</button>` : '' }) + '<section id="paymentTable"></section>';
      this._table = dataTable(main.querySelector('#paymentTable'), { key: 'documents:payments', endpoint: '/api/documents', params: { type: 'CUSTOMER_PAYMENT,SUPPLIER_PAYMENT' }, title: 'Daftar pembayaran', eyebrow: 'KEUANGAN', columns: [{ label: 'Dokumen', render: docCell }, { label: 'Relasi', render: r => esc(r.partyName || '—') }, { label: 'Nilai', right: true, render: r => `<span class="money">${fmtIDR(r.amount)}</span>` }, { label: 'Status', render: r => chip(r.status) }, { label: 'Diperbarui', render: r => relTime(r.updatedAt) }], statusFilter: ['DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'COMPLETED', 'CLOSED', 'VOID'], onRow: (row, reload) => openDrawer(row.id, { onChange: reload }) });
      main.querySelector('#paymentAllocate')?.addEventListener('click', async () => { try { const [payments, invoices] = await Promise.all([api('/api/documents?type=CUSTOMER_PAYMENT,SUPPLIER_PAYMENT&limit=100'), api('/api/documents?type=INVOICE,SUPPLIER_INVOICE&limit=100')]); const usablePayments = payments.items.filter(x => ['APPROVED', 'COMPLETED', 'CLOSED'].includes(x.status)), openInvoices = invoices.items.filter(x => !['CLOSED', 'VOID', 'CANCELLED'].includes(x.status)); if (!usablePayments.length || !openInvoices.length) throw new Error('Dibutuhkan minimal satu pembayaran disetujui dan satu tagihan terbuka.'); const value = await formDialog({ title: 'Alokasikan pembayaran', description: 'Jenis pembayaran harus sesuai dengan tagihan. Sistem mencegah alokasi melebihi saldo.', fields: [{ name: 'paymentId', label: 'Pembayaran', type: 'select', options: usablePayments.map(x => [x.id, `${x.documentNumber} · ${fmtIDR(x.amount)}`]), required: true }, { name: 'invoiceId', label: 'Tagihan', type: 'select', options: openInvoices.map(x => [x.id, `${x.documentNumber} · ${fmtIDR(x.amount)}`]), required: true }, { name: 'amount', label: 'Nilai alokasi', type: 'number', min: 1, required: true }], submitLabel: 'Alokasikan' }); if (!value) return; const result = await api('/api/payments/allocate', { method: 'POST', body: value }); toast('Pembayaran dialokasikan', `Sisa tagihan ${fmtIDR(result.remaining)}`); this._table.reload(); } catch (error) { toast('Alokasi gagal', error.message, 'coral'); } });
    }
  };

  // ── Akuntansi ─────────────────────────────────────────────────────────────
  const accounting = {
    permission: 'journal.view',
    async render(main, _p, signal) {
      this.period = this.period || new Date().toISOString().slice(0, 7);
      const period = this.period;
      const [s, ledger, reconciliations] = await Promise.all([
        query(`accounting:${period}`, () => api(`/api/accounting/summary?period=${period}`, { signal }), { staleMs: 60_000 }),
        query(`ledger:${period}`, () => api(`/api/accounting/ledger?period=${period}&limit=50`, { signal }), { staleMs: 60_000 }),
        api(`/api/accounting/reconciliation?period=${period}`, { signal })
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

  const attendancePage = {
    permission: 'attendance.view',
    async render(main, _p, signal) {
      this.period = this.period || new Date().toISOString().slice(0, 7);
      const period = this.period;
      const [attendance, balances] = await Promise.all([
        api(`/api/hr/attendance?period=${period}&limit=250`, { signal }),
        api(`/api/hr/leave-balances?year=${period.slice(0, 4)}`, { signal })
      ]);
      const counts = attendance.items.reduce((out, row) => (out[row.status] = (out[row.status] || 0) + 1, out), {});
      const editable = can('attendance.edit'), entry = editable || can('attendance.create');
      const actions = `<label class="period-picker"><span>Periode</span><input id="attendancePeriod" type="month" value="${esc(period)}"></label>${editable ? `<button class="btn secondary" id="attendanceImport">${ICONS.job} Import CSV</button><input id="attendanceFile" type="file" accept=".csv,text/csv" hidden>` : ''}${entry ? `<button class="btn primary" id="attendanceCreate">${ICONS.plus} Catat kehadiran</button>` : ''}`;
      main.innerHTML = pageHead({ eyebrow: 'HRD', title: 'Kehadiran & cuti', sub: 'Kehadiran harian, saldo cuti, dan sumber data tercatat dalam satu kontrol operasional.', actions }) + `
        <section class="metrics">
          ${kpiCard({ label: 'Hadir', value: String((counts.PRESENT || 0) + (counts.LATE || 0)), note: `${counts.LATE || 0} terlambat`, orb: 'checkCircle', orbTone: 'mint' })}
          ${kpiCard({ label: 'Tidak hadir', value: String(counts.ABSENT || 0), note: 'Mempengaruhi kalkulasi payroll', tone: counts.ABSENT ? 'warn' : '', orb: 'alert', orbTone: 'coral' })}
          ${kpiCard({ label: 'Cuti / sakit', value: String((counts.LEAVE || 0) + (counts.SICK || 0)), note: `${counts.LEAVE || 0} cuti · ${counts.SICK || 0} sakit`, orb: 'clock', orbTone: 'amber' })}
          ${kpiCard({ label: 'Data tercatat', value: String(attendance.total), note: `Periode ${period}`, orb: 'people', orbTone: 'blue' })}
        </section>
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">KEHADIRAN</p><h2>Catatan harian</h2></div></header><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Karyawan</th><th>Masuk–keluar</th><th>Status</th><th>Sumber</th></tr></thead><tbody>${attendance.items.map(r => `<tr><td>${fmtDate(r.workDate)}</td><td><b>${esc(r.employeeName)}</b><small>${esc(r.nik)} · ${esc(r.department)}</small></td><td>${r.checkIn ? fmtDateTime(r.checkIn) : '—'}<small>${r.checkOut ? fmtDateTime(r.checkOut) : 'Belum keluar'}</small></td><td>${chip(r.status)}</td><td><span class="chip gray">${esc(r.source)}</span></td></tr>`).join('') || '<tr><td colspan="5" class="table-loading">Belum ada data kehadiran.</td></tr>'}</tbody></table></div></article>
          <article class="panel"><header><div><p class="eyebrow">SALDO CUTI</p><h2>Hak tahun ${esc(period.slice(0, 4))}</h2></div></header><div class="panel-body stack">${balances.items.slice(0, 12).map(r => `<div class="stat-row"><span><b>${esc(r.employeeName)}</b><small>${esc(r.department)}</small></span><b>${Number(r.remaining)} / ${Number(r.entitlement)} hari</b></div>`).join('') || '<p class="muted">Belum ada saldo cuti.</p>'}</div></article>
        </section>`;
      main.querySelector('#attendancePeriod').addEventListener('change', e => { this.period = e.target.value; this.render(main); });
      main.querySelector('#attendanceCreate')?.addEventListener('click', async () => { try { const employees = editable ? await api('/api/employees?limit=250') : null; const fields = [{ name: 'workDate', label: 'Tanggal kerja', type: 'date', value: new Date().toISOString().slice(0, 10), required: true }, { name: 'status', label: 'Status', type: 'select', options: editable ? [['PRESENT', 'Hadir'], ['LATE', 'Terlambat'], ['ABSENT', 'Tidak hadir'], ['LEAVE', 'Cuti'], ['SICK', 'Sakit'], ['REMOTE', 'Remote']] : [['PRESENT', 'Hadir'], ['REMOTE', 'Remote']], required: true }, { name: 'checkIn', label: 'Waktu masuk', type: 'datetime-local' }, { name: 'checkOut', label: 'Waktu keluar', type: 'datetime-local' }, { name: 'notes', label: 'Catatan', type: 'textarea' }]; if (editable) fields.unshift({ name: 'employeeId', label: 'Karyawan', type: 'select', options: employees.items.map(x => [x.id, `${x.nik} · ${x.name}`]), required: true }); const value = await formDialog({ title: 'Catat kehadiran', description: 'Data pada tanggal yang sama akan diperbarui, bukan diduplikasi.', fields, submitLabel: 'Simpan kehadiran' }); if (!value) return; await api('/api/hr/attendance', { method: 'POST', body: value }); toast('Kehadiran tersimpan'); this.render(main); } catch (error) { toast('Penyimpanan gagal', error.message, 'coral'); } });
      const picker = main.querySelector('#attendanceFile'); main.querySelector('#attendanceImport')?.addEventListener('click', () => picker.click()); picker?.addEventListener('change', async () => { const file = picker.files[0]; if (!file) return; try { const saved = await uploadFile('/api/files?module=attendance', file); await api('/api/jobs', { method: 'POST', body: { type: 'IMPORT_CSV', params: { module: 'attendance', fileId: saved.id } } }); toast('Import dijadwalkan', 'Format: nik, work_date, check_in, check_out, status, notes.'); } catch (error) { toast('Import gagal', error.message, 'coral'); } });
    }
  };

  const payrollPage = {
    permission: 'payroll.view|payroll.view_self',
    onEvent() { this._table?.reload(); },
    async render(main) {
      if (!can('payroll.view') && can('payroll.view_self')) {
        const data = await api('/api/payroll/my');
        main.innerHTML = pageHead({ eyebrow: 'PENGGAJIAN', title: 'Slip gaji saya', sub: 'Rincian gaji hanya terlihat oleh Anda dan petugas HR yang berwenang.' }) + `<section class="report-grid">${data.items.map(item => `<article class="panel report-card"><div class="clay-orb mint">${ICONS.payslip}</div><p class="eyebrow">${esc(item.period)}</p><h2>${esc(item.documentNumber)}</h2><div class="stack"><div class="stat-row"><span>Gaji pokok</span><b>${fmtIDR(item.baseSalary)}</b></div><div class="stat-row"><span>Tunjangan & lembur</span><b>${fmtIDR(Number(item.allowances) + Number(item.overtime))}</b></div><div class="stat-row"><span>BPJS + PPh 21</span><b>${fmtIDR(Number(item.bpjsEmployee) + Number(item.pph21))}</b></div><div class="stat-row"><span>Gaji bersih</span><b>${fmtIDR(item.netPay)}</b></div></div><button class="btn secondary" data-slip="${esc(item.payrollDocumentId)}">${ICONS.doc} Buat slip PDF</button></article>`).join('') || '<article class="panel"><div class="empty-state"><div class="clay-orb blue">' + ICONS.payslip + '</div><h3>Belum ada slip gaji</h3><p>Slip tampil setelah payroll disetujui.</p></div></article>'}</section>`;
        main.querySelectorAll('[data-slip]').forEach(btn => btn.addEventListener('click', async () => { try { await api('/api/jobs', { method: 'POST', body: { type: 'PAYROLL_SLIPS', params: { documentId: btn.dataset.slip } } }); toast('Slip dijadwalkan', 'PDF privat akan tersedia di halaman Job.'); } catch (error) { toast('Pembuatan slip gagal', error.message, 'coral'); } }));
        return;
      }
      const create = can('payroll.create');
      main.innerHTML = pageHead({ eyebrow: 'PENGGAJIAN', title: 'Payroll', sub: 'Kalkulasi gaji mengambil gaji pokok, komponen, kehadiran, BPJS, dan PPh 21 secara terkendali.', actions: create ? `<button class="btn primary" id="payrollCreate">${ICONS.plus} Hitung payroll</button>` : '' }) + '<section id="payrollTable"></section>';
      this._table = dataTable(main.querySelector('#payrollTable'), { key: 'documents:PAYROLL_RUN', endpoint: '/api/documents', params: { type: 'PAYROLL_RUN' }, title: 'Payroll run', eyebrow: 'PAYROLL', columns: [{ label: 'Periode', render: docCell }, { label: 'Karyawan', render: r => `${r.payload?.headcount || '—'} orang` }, { label: 'Gaji bersih', right: true, render: r => `<span class="money">${fmtIDR(r.amount)}</span>` }, { label: 'BPJS', right: true, render: r => fmtIDR(r.payload?.bpjs || 0) }, { label: 'PPh 21', right: true, render: r => fmtIDR(r.payload?.pph21 || 0) }, { label: 'Status', render: r => chip(r.status) }], statusFilter: ['DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'CLOSED', 'VOID'], onRow: (row, reload) => openDrawer(row.id, { onChange: reload }), empty: { icon: 'payslip', title: 'Belum ada payroll run' } });
      main.querySelector('#payrollCreate')?.addEventListener('click', async () => { const value = await formDialog({ title: 'Hitung payroll', description: 'Sistem menghitung seluruh karyawan aktif. Hasil dibuat sebagai draft untuk ditinjau sebelum approval dan posting.', fields: [{ name: 'period', label: 'Periode penggajian', type: 'month', value: new Date().toISOString().slice(0, 7), required: true }, { name: 'title', label: 'Judul payroll', value: `Payroll ${new Date().toISOString().slice(0, 7)}` }], submitLabel: 'Hitung payroll' }); if (!value) return; try { const result = await api('/api/payroll/runs', { method: 'POST', body: value }); toast('Payroll dihitung', `${result.headcount} karyawan · ${fmtIDR(result.total)}`); this._table.reload(); openDrawer(result.document.id, { onChange: () => this._table.reload() }); } catch (error) { toast('Kalkulasi gagal', error.message, 'coral'); } });
    }
  };

  // ── Laporan ───────────────────────────────────────────────────────────────
  const reports = {
    permission: 'report.view',
    render(main) {
      const cards = [
        ['Penjualan per pelanggan', 'Rekap penawaran hingga invoice per pelanggan.', 'chart', 'blue'],
        ['AR & AP aging', 'Umur piutang dan utang per relasi bisnis.', 'wallet', 'amber'],
        ['Profitabilitas proyek', 'Margin per proyek: nilai kontrak vs HPP aktual.', 'project', 'mint'],
        ['Kinerja produksi', 'Lead time WO, utilisasi, dan tingkat rework.', 'factory', 'lavender'],
        ['Mutasi persediaan', 'Pergerakan stok per SKU per gudang.', 'box', 'blue'],
        ['Rekap payroll & BPJS', 'Komponen gaji, potongan, dan kewajiban.', 'payslip', 'coral']
      ];
      main.innerHTML = pageHead({ eyebrow: 'PELAPORAN', title: 'Laporan', sub: 'Laporan berat diproses sebagai job latar belakang — antarmuka tetap responsif.' }) + `
        <section class="report-grid">
          ${cards.map(([title, desc, icon, tone], i) => `
            <article class="panel report-card">
              ${clayOrb(tone, icon)}
              <h2>${title}</h2><p>${desc}</p>
              <button class="btn secondary" data-report="${i}" data-title="${esc(title)}">${ICONS.job} Buat laporan</button>
            </article>`).join('')}
        </section>`;
      main.querySelectorAll('[data-report]').forEach((btn) => btn.addEventListener('click', async () => {
        try {
          await api('/api/jobs', { method: 'POST', body: { type: 'REPORT_GENERATE', params: { report: btn.dataset.title } } });
          toast('Laporan dijadwalkan', `${btn.dataset.title} sedang diproses di latar belakang.`);
        } catch (error) { toast('Gagal menjadwalkan', error.message, 'coral'); }
      }));
    }
  };

  // ── Sistem: pengguna, audit, monitoring, job, self-test, pengaturan ──────
  const systemUsers = masterPage({
    endpoint: '/api/system/users', key: 'users', permission: 'user.view', title: 'Pengguna & peran', eyebrow: 'SISTEM',
    columns: [
      { label: 'Pengguna', render: (r) => `<b>${esc(r.displayName)}</b><small>@${esc(r.username)} · ${esc(r.jobTitle || '')}</small>` },
      { label: 'Peran', render: (r) => `<span class="chip blue">${esc(r.role)}</span>` },
      { label: 'Cabang', render: (r) => esc(r.branchName || '—') },
      { label: 'MFA', render: (r) => r.mfaEnabled ? '<span class="chip mint">Aktif</span>' : '<span class="chip gray">Nonaktif</span>' },
      { label: 'Login terakhir', render: (r) => r.lastLoginAt ? relTime(r.lastLoginAt) : 'Belum pernah' },
      { label: 'Status', render: (r) => r.active ? '<span class="chip mint">Aktif</span>' : '<span class="chip coral">Nonaktif</span>' }
    ]
  });

  const auditPage = {
    permission: 'audit.view',
    render(main) {
      main.innerHTML = pageHead({ eyebrow: 'SISTEM', title: 'Log audit', sub: 'Log bersifat append-only dan tidak dapat diubah dari antarmuka.' }) + '<section id="pgTable"></section>';
      dataTable(main.querySelector('#pgTable'), {
        key: 'audit', endpoint: '/api/audit', params: {}, title: 'Aktivitas sistem', eyebrow: 'AUDIT TRAIL', staleMs: 20_000, sort: 'occurredAt:desc',
        columns: [
          { label: 'Waktu', render: (r) => `<b>${fmtDateTime(r.occurredAt)}</b>` },
          { label: 'Pengguna', render: (r) => `${esc(r.userName)}<small>${esc(r.role)}</small>` },
          { label: 'Aksi', render: (r) => `<span class="chip ${['VOID','CANCEL','REJECT','LOGIN_FAILED'].includes(r.action) ? 'coral' : ['APPROVE','LOGIN'].includes(r.action) ? 'mint' : 'gray'}">${esc(r.action)}</span>` },
          { label: 'Modul', render: (r) => esc(r.module) },
          { label: 'Dokumen', render: (r) => esc(r.documentNumber || '—') },
          { label: 'Alasan', render: (r) => r.reason ? `<i>"${esc(r.reason)}"</i>` : '—' }
        ],
        empty: { icon: 'audit', title: 'Belum ada aktivitas' }
      });
    }
  };

  const jobsPage = {
    permission: 'job.view',
    onEvent(type) { if (type === 'job.updated' && this._table) this._table.reload(); },
    render(main) {
      main.innerHTML = pageHead({ eyebrow: 'SISTEM', title: 'Job latar belakang', sub: 'PDF, ekspor, laporan, backup, dan arsip berjalan lewat antrean berprioritas.' }) + '<section id="pgTable"></section>';
      this._table = dataTable(main.querySelector('#pgTable'), {
        key: 'jobs', endpoint: '/api/jobs', params: {}, title: 'Antrean & riwayat', eyebrow: 'WORKER', staleMs: 10_000, sort: 'createdAt:desc',
        columns: [
          { label: 'Job', render: (r) => `<b>${esc(r.label)}</b><small>${esc(r.type)}</small>` },
          { label: 'Pemohon', render: (r) => esc(r.requestedByName) },
          { label: 'Prioritas', render: (r) => `<span class="chip ${r.priority === 'high' ? 'coral' : r.priority === 'medium' ? 'amber' : 'gray'}">${esc(r.priority)}</span>` },
          { label: 'Status', render: (r) => chip(r.status) },
          { label: 'Hasil', render: (r) => r.error ? `<span class="error-text">${esc(r.error)}</span>` : r.result?.artifactId ? `<a class="btn secondary sm" href="/api/artifacts/${esc(r.result.artifactId)}">Unduh ${esc(r.result.fileName || 'file')}</a>` : esc((r.result && (r.result.summary || r.result.note)) || '—') },
          { label: 'Waktu', render: (r) => relTime(r.createdAt) }
        ],
        empty: { icon: 'job', title: 'Belum ada job', hint: 'Jalankan ekspor atau laporan untuk melihat antrean di sini.' }
      });
    }
  };

  const monitoring = {
    permission: 'monitoring.view',
    async render(main, _p, signal) {
      const m = await query('monitoring', () => api('/api/system/monitoring', { signal }), { staleMs: 30_000, force: true });
      const stTone = m.storage.usedPct >= 80 ? 'coral' : m.storage.usedPct >= 70 ? 'amber' : 'mint';
      main.innerHTML = pageHead({
        eyebrow: 'SISTEM', title: 'Monitoring', sub: 'Kondisi server, API, antrean, keamanan, dan backup dalam satu layar.',
        actions: `<button class="btn secondary" id="monRefresh">${ICONS.refresh} Segarkan</button>`
      }) + `
        <section class="metrics">
          ${kpiCard({ label: 'Latensi API (p95)', value: `${m.api.p95Ms} ms`, note: `${m.api.requests} permintaan · error ${m.api.errorRatePct}%`, orb: 'monitor', orbTone: 'blue' })}
          ${kpiCard({ label: 'Memori proses', value: `${m.memory.rssMb} MB`, note: `Heap ${m.memory.heapMb} MB · uptime ${Math.floor(m.uptimeSeconds / 60)} mnt`, orb: 'gear', orbTone: 'mint' })}
          ${kpiCard({ label: 'Penyimpanan', value: `${m.storage.usedPct}%`, note: `${m.storage.usedGb} dari ${m.storage.totalGb} GB · ${m.storage.level}`, tone: m.storage.usedPct >= 70 ? 'warn' : '', orb: 'box', orbTone: stTone })}
          ${kpiCard({ label: 'Sesi aktif', value: String(m.security.activeSessions), note: `${m.security.failedLogins} login gagal tercatat`, orb: 'lock', orbTone: 'lavender' })}
        </section>
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">INFRASTRUKTUR</p><h2>Basis data & antrean</h2></div></header>
            <div class="panel-body stack">
              <div class="stat-row"><span>Engine</span><b>${esc(m.database.engine)}</b></div>
              <div class="stat-row"><span>Total baris</span><b>${m.database.rows.toLocaleString('id-ID')}</b></div>
              <div class="stat-row"><span>Pool koneksi</span><b>min ${m.database.pool.min} · max ${m.database.pool.max} · aktif ${m.database.pool.active}</b></div>
              <div class="stat-row"><span>Job worker</span><b>${m.jobs.running} berjalan · ${m.jobs.queued} antre · ${m.jobs.failed} gagal</b></div>
              <div class="stat-row"><span>Koneksi realtime (SSE)</span><b>${m.sse.activeConnections} aktif · ${m.sse.publishedEvents} event</b></div>
              <div class="stat-row"><span>Rate limiter</span><b>${m.rateLimit.totalRejected} ditolak dari ${m.rateLimit.totalHits} hit</b></div>
            </div>
          </article>
          <article class="panel"><header><div><p class="eyebrow">KETAHANAN</p><h2>Backup 3-2-1</h2></div></header>
            <div class="panel-body stack">
              ${m.backup ? `
                <div class="stat-row"><span>Backup terakhir</span><b>${fmtDateTime(m.backup.at)}</b></div>
                <div class="stat-row"><span>Ukuran</span><b>${m.backup.sizeMb} MB</b></div>
                <div class="stat-row"><span>Checksum</span><b>${esc(m.backup.checksum)}</b></div>
                <div class="stat-row"><span>Uji restore</span>${m.backup.restoreTested ? '<span class="chip mint">Lulus</span>' : '<span class="chip coral">Belum diuji</span>'}</div>
                <div class="stat-row"><span>Target</span><b>${esc(m.backup.target)}</b></div>` : '<p class="muted">Belum ada backup tercatat.</p>'}
              <p class="muted">Kebijakan: harian 30, mingguan 12, bulanan 24 salinan. Backup dinyatakan valid hanya setelah restore drill lulus.</p>
            </div>
          </article>
        </section>`;
      main.querySelector('#monRefresh').addEventListener('click', () => { invalidate('monitoring'); this.render(main); });
    }
  };

  const selfTest = {
    permission: 'selftest.view',
    async render(main, _p, signal) {
      main.innerHTML = pageHead({ eyebrow: 'SISTEM', title: 'Self test', sub: 'Menjalankan pemeriksaan integritas…' }) + `<section class="panel"><div class="panel-body"><span class="spinner"></span> Menjalankan seluruh pemeriksaan…</div></section>`;
      const s = await api('/api/system/self-test', { signal });
      main.innerHTML = pageHead({
        eyebrow: 'SISTEM', title: 'Self test', sub: `${s.passed} lulus · ${s.failed} gagal · dijalankan ${fmtDateTime(s.ranAt)}`,
        actions: `<button class="btn secondary" id="stRerun">${ICONS.refresh} Jalankan ulang</button>`
      }) + `
        <section class="release-gate ${s.releaseBlocked ? 'blocked' : 'clear'}">
          ${clayOrb(s.releaseBlocked ? 'coral' : 'mint', s.releaseBlocked ? 'alert' : 'shield')}
          <div><h2>${s.releaseBlocked ? 'Rilis diblokir' : 'Gerbang rilis terbuka'}</h2>
          <p>${s.releaseBlocked ? `${s.criticalFailed} pemeriksaan kritis gagal — perbaiki sebelum rilis.` : 'Seluruh pemeriksaan kritis lulus. Sistem layak rilis.'}</p></div>
        </section>
        <section class="panel"><header><div><p class="eyebrow">HASIL</p><h2>${s.total} pemeriksaan</h2></div></header>
          <div class="selftest-list">
            ${s.results.map((r) => `
              <div class="selftest-row ${r.status}">
                <span class="st-icon">${r.status === 'pass' ? ICONS.check : ICONS.close}</span>
                <span><b>${esc(r.name)}</b>${r.critical ? ' <span class="chip gray">kritis</span>' : ''}<small>${esc(r.detail)}</small></span>
                <span class="chip ${r.status === 'pass' ? 'mint' : 'coral'}">${r.status === 'pass' ? 'Lulus' : 'Gagal'}</span>
              </div>`).join('')}
          </div>
        </section>`;
      main.querySelector('#stRerun').addEventListener('click', () => this.render(main));
    }
  };

  const settings = {
    permission: 'settings.view',
    async render(main, _p, signal) {
      const [s, devices] = await Promise.all([
        query('settings', () => api('/api/system/settings', { signal }), { staleMs: 1_800_000 }),
        api('/api/auth/devices', { signal })
      ]);
      const c = s.company;
      main.innerHTML = pageHead({ eyebrow: 'SISTEM', title: 'Pengaturan', sub: 'Perubahan identitas bank, pajak, dan penomoran membutuhkan PIN Owner + alasan tertulis.', actions: can('settings.edit') ? `<button class="btn primary" id="settingsEdit">${ICONS.gear} Edit profil</button>` : '' }) + `
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">ORGANISASI</p><h2>Profil perusahaan</h2></div></header>
            <div class="panel-body"><dl class="detail-dl">
              <div><dt>Nama</dt><dd>${esc(c.name)}</dd></div>
              <div><dt>NPWP</dt><dd>${esc(c.npwp)}</dd></div>
              <div><dt>Alamat</dt><dd>${esc(c.address)}</dd></div>
              <div><dt>Bank</dt><dd>${esc(c.bank.name)} · ${esc(c.bank.account)}</dd></div>
              <div><dt>Format penomoran</dt><dd><code>${esc(c.numberingFormat)}</code></dd></div>
              <div><dt>Tahun fiskal</dt><dd>${c.fiscalYear}</dd></div>
            </dl></div>
          </article>
          <article class="panel"><header><div><p class="eyebrow">TATA KELOLA</p><h2>Matriks persetujuan</h2></div></header>
            <div class="panel-body stack">
              ${s.approvalMatrix.map((t) => `<div class="stat-row"><span>${t.maxAmount ? `s.d. ${fmtIDRFull(t.maxAmount)}` : 'Di atas ambang sebelumnya'}</span><b>${t.levels.join(' → ')}</b></div>`).join('')}
              <p class="muted">Routing persetujuan terpusat — tidak di-hardcode pada halaman modul.</p>
            </div>
          </article>
        </section>
        <section class="panel"><header><div><p class="eyebrow">KEAMANAN</p><h2>Sesi & perangkat</h2></div>
          <button class="btn danger-outline" id="logoutAll">${ICONS.logout} Keluar dari semua perangkat</button></header>
          <div class="table-wrap"><table>
            <thead><tr><th>Perangkat</th><th>Masuk</th><th>Aktivitas terakhir</th><th>Status</th></tr></thead>
            <tbody>${devices.items.map((d) => `<tr><td><b>${esc((d.device || '').slice(0, 60))}</b></td><td>${fmtDateTime(d.createdAt)}</td><td>${relTime(d.lastSeenAt)}</td><td>${d.active ? '<span class="chip mint">Aktif</span>' : `<span class="chip gray">${esc(d.endReason || 'berakhir')}</span>`}</td></tr>`).join('')}</tbody>
          </table></div>
        </section>`;
      main.querySelector('#logoutAll').addEventListener('click', async () => {
        await api('/api/auth/logout-all', { method: 'POST' });
        window.MAT.sessionLost();
      });
      main.querySelector('#settingsEdit')?.addEventListener('click', async () => { const value = await formDialog({ title: 'Edit profil perusahaan', description: 'Setelah formulir ini, PIN Owner dan alasan perubahan akan diminta.', initial: { name: c.name, npwp: c.npwp, address: c.address, bankName: c.bank.name, bankAccount: c.bank.account, numberingFormat: c.numberingFormat, fiscalYear: c.fiscalYear }, fields: [{ name: 'name', label: 'Nama perusahaan', required: true }, { name: 'npwp', label: 'NPWP' }, { name: 'address', label: 'Alamat', type: 'textarea' }, { name: 'bankName', label: 'Nama bank' }, { name: 'bankAccount', label: 'Nomor rekening' }, { name: 'numberingFormat', label: 'Format penomoran', required: true }, { name: 'fiscalYear', label: 'Tahun fiskal', type: 'number', min: 2000, max: 2200 }], submitLabel: 'Lanjut verifikasi' }); if (!value) return; const verify = await actionDialog({ title: 'Verifikasi perubahan', description: 'Perubahan sensitif memerlukan PIN Owner dan alasan tertulis untuk audit trail.', requireReason: true, requirePin: true, confirmLabel: 'Simpan perubahan' }); if (!verify) return; try { await api('/api/system/settings/company', { method: 'PATCH', body: { company: { name: value.name, npwp: value.npwp, address: value.address, bank: { name: value.bankName, account: value.bankAccount }, numberingFormat: value.numberingFormat, fiscalYear: value.fiscalYear }, ...verify } }); invalidate('settings'); toast('Pengaturan diperbarui'); this.render(main); } catch (error) { toast('Pembaruan gagal', error.message, 'coral'); } });
    }
  };

  // ── Master detail enterprise (tab-based, R014/R015) ───────────────────────
  // Konfigurasi tab per master: judul, sub-resource endpoint, kolom, form.
  const MASTER_DETAIL = {
    employees: {
      module: 'employee', title: 'Karyawan', base: '/api/masters/employees', listRoute: '#/hr/employees',
      head: (o) => `<b>${esc(o.name)}</b><small>${esc(o.nik)} · ${esc(o.department || '')}</small>`,
      tabs: [
        { id: 'overview', label: 'Overview' },
        { id: 'positions', label: 'Jabatan & Posisi', sub: 'positions', cols: [['positionTitle','Jabatan'],['division','Divisi'],['workLocation','Lokasi'],['payrollFrequency','Frekuensi gaji'],['effectiveFrom','Berlaku','date']],
          form: [{name:'positionTitle',label:'Jabatan',required:true},{name:'division',label:'Divisi'},{name:'workLocation',label:'Lokasi kerja'},{name:'shiftGroup',label:'Grup shift'},{name:'salaryGrade',label:'Grade gaji'},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true}] },
        { id: 'employment-history', label: 'Riwayat Kerja', sub: 'employment-history', cols: [['employmentType','Tipe'],['employmentStatus','Status'],['eventDate','Tanggal','date'],['eventReason','Keterangan']],
          form: [{name:'employmentType',label:'Tipe',type:'select',options:[['PERMANENT','Tetap'],['CONTRACT','Kontrak'],['PROBATION','Percobaan'],['INTERN','Magang'],['OUTSOURCE','Outsource']],required:true},{name:'employmentStatus',label:'Status',type:'select',options:[['ACTIVE','Aktif'],['ON_LEAVE','Cuti'],['SUSPENDED','Diberhentikan sementara'],['TERMINATED','Diberhentikan'],['RESIGNED','Mengundurkan diri'],['RETIRED','Pensiun']],required:true},{name:'eventDate',label:'Tanggal',type:'date',required:true},{name:'eventReason',label:'Keterangan',type:'textarea'}] },
        { id: 'contracts', label: 'Kontrak', sub: 'contracts', cols: [['contractNumber','No. Kontrak'],['contractType','Jenis'],['startDate','Mulai','date'],['endDate','Berakhir','date'],['status','Status','chip']],
          form: [{name:'contractNumber',label:'Nomor kontrak'},{name:'contractType',label:'Jenis',type:'select',options:[['PKWT','PKWT'],['PKWTT','PKWTT'],['MAGANG','Magang'],['OUTSOURCE','Outsource']],required:true},{name:'startDate',label:'Mulai',type:'date',required:true},{name:'endDate',label:'Berakhir',type:'date'},{name:'probationEnd',label:'Akhir percobaan',type:'date'}] },
        { id: 'compensation', label: 'Kompensasi', sub: 'compensation', perm: 'payroll.view', reason: true, cols: [['baseSalary','Gaji pokok','money'],['fixedAllowance','Tunjangan tetap','money'],['effectiveFrom','Berlaku','date'],['approvalReason','Alasan']],
          form: [{name:'baseSalary',label:'Gaji pokok',type:'number',min:0,required:true},{name:'fixedAllowance',label:'Tunjangan tetap',type:'number',min:0},{name:'variableAllowance',label:'Tunjangan variabel',type:'number',min:0},{name:'salaryGrade',label:'Grade'},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true},{name:'changeReason',label:'Alasan perubahan',type:'textarea',required:true}] },
        { id: 'tax-profiles', label: 'Pajak', sub: 'tax-profiles', cols: [['npwp','NPWP'],['taxScheme','Skema'],['ptkpStatus','PTKP'],['terCategory','TER'],['effectiveFrom','Berlaku','date']],
          form: [{name:'npwp',label:'NPWP'},{name:'taxScheme',label:'Skema pajak',type:'select',options:[['PPH21','PPh 21'],['PPH26','PPh 26'],['NONE','Tidak dihitung']],required:true},{name:'ptkpStatus',label:'Status PTKP',type:'select',options:[['TK/0','TK/0'],['TK/1','TK/1'],['K/0','K/0'],['K/1','K/1'],['K/2','K/2'],['K/3','K/3']],required:true},{name:'terCategory',label:'Kategori TER',type:'select',options:[['A','A'],['B','B'],['C','C']]},{name:'taxMethod',label:'Metode',type:'select',options:[['GROSS','Gross'],['NET','Net'],['GROSS_UP','Gross-up']]},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true}] },
        { id: 'bpjs', label: 'BPJS', sub: 'bpjs', cols: [['program','Program'],['membershipNumber','No. Kepesertaan'],['employerPct','% Perusahaan'],['employeePct','% Karyawan'],['activeFrom','Aktif','date']],
          form: [{name:'program',label:'Program',type:'select',options:[['KESEHATAN','Kesehatan'],['JHT','JHT'],['JKK','JKK'],['JKM','JKM'],['JP','JP']],required:true},{name:'membershipNumber',label:'Nomor kepesertaan'},{name:'wageBase',label:'Upah dasar',type:'number',min:0},{name:'employerPct',label:'% Perusahaan',type:'number',min:0},{name:'employeePct',label:'% Karyawan',type:'number',min:0},{name:'activeFrom',label:'Aktif sejak',type:'date',required:true}] },
        { id: 'insurance', label: 'Asuransi', sub: 'insurance', cols: [['insurer','Penyedia'],['policyNumber','No. Polis'],['coverageType','Cakupan'],['premium','Premi','money'],['expiryDate','Kedaluwarsa','date']],
          form: [{name:'insurer',label:'Penyedia asuransi',required:true},{name:'policyNumber',label:'Nomor polis'},{name:'coverageType',label:'Jenis cakupan'},{name:'familyCovered',label:'Termasuk keluarga',type:'checkbox'},{name:'premium',label:'Premi',type:'number',min:0},{name:'effectiveFrom',label:'Berlaku',type:'date'},{name:'expiryDate',label:'Kedaluwarsa',type:'date'}] },
        { id: 'bank-accounts', label: 'Rekening Gaji', sub: 'bank-accounts', reason: true, cols: [['bankName','Bank'],['accountNumber','No. Rekening'],['accountHolder','Pemilik'],['isPrimary','Utama','bool']],
          form: [{name:'bankName',label:'Nama bank',required:true},{name:'accountNumber',label:'Nomor rekening',required:true},{name:'accountHolder',label:'Nama pemilik',required:true},{name:'effectiveFrom',label:'Berlaku',type:'date'},{name:'isPrimary',label:'Jadikan rekening utama',type:'checkbox'},{name:'changeReason',label:'Alasan',type:'textarea',required:true}] },
        { id: 'documents', label: 'Dokumen & Sertifikat', sub: 'documents', cols: [['documentType','Jenis'],['title','Judul'],['expiryDate','Kedaluwarsa','date'],['verified','Terverifikasi','bool']],
          form: [{name:'documentType',label:'Jenis',type:'select',options:[['KTP','KTP'],['NPWP','NPWP'],['KK','KK'],['CONTRACT','Kontrak'],['CERTIFICATE','Sertifikat'],['TRAINING','Pelatihan'],['LICENSE','Lisensi'],['MEDICAL','Medis'],['OTHER','Lainnya']],required:true},{name:'title',label:'Judul dokumen',required:true},{name:'expiryDate',label:'Kedaluwarsa',type:'date'}] },
        { id: 'emergency-contacts', label: 'Kontak Darurat', sub: 'emergency-contacts', perm: 'employee.edit', cols: [['name','Nama'],['relationship','Hubungan'],['phone','Telepon']],
          form: [{name:'name',label:'Nama',required:true},{name:'relationship',label:'Hubungan'},{name:'phone',label:'Telepon'},{name:'address',label:'Alamat',type:'textarea'}] },
        { id: 'access', label: 'Akses & Peran', sub: 'access', cols: [['role','Peran'],['orgScope','Cakupan'],['accessStart','Mulai','date'],['accessEnd','Berakhir','date']],
          form: [{name:'role',label:'Peran'},{name:'orgScope',label:'Cakupan organisasi'},{name:'accessStart',label:'Mulai',type:'date'},{name:'accessEnd',label:'Berakhir',type:'date'}] }
      ]
    },
    customers: {
      module: 'customer', title: 'Pelanggan', base: '/api/masters/customers', listRoute: '#/masters/customers',
      head: (o) => `<b>${esc(o.name)}</b><small>${esc(o.code)} · ${esc(o.city || '')}</small>`,
      tabs: [
        { id: 'overview', label: 'Overview' },
        { id: 'contacts', label: 'Kontak (PIC)', sub: 'contacts', cols: [['name','Nama'],['positionTitle','Jabatan'],['phone','Telepon'],['email','Email'],['isPrimary','Utama','bool']],
          form: [{name:'name',label:'Nama PIC',required:true},{name:'positionTitle',label:'Jabatan'},{name:'department',label:'Departemen'},{name:'phone',label:'Telepon'},{name:'email',label:'Email'},{name:'whatsapp',label:'WhatsApp'},{name:'isPrimary',label:'Kontak utama',type:'checkbox'}] },
        { id: 'addresses', label: 'Alamat', sub: 'addresses', cols: [['addressType','Jenis'],['label','Label'],['city','Kota'],['isDefault','Default','bool']],
          form: [{name:'addressType',label:'Jenis',type:'select',options:[['BILLING','Penagihan'],['DELIVERY','Pengiriman'],['SITE','Lokasi proyek']],required:true},{name:'label',label:'Label'},{name:'address',label:'Alamat',type:'textarea',required:true},{name:'city',label:'Kota'},{name:'province',label:'Provinsi'},{name:'postalCode',label:'Kode pos'},{name:'isDefault',label:'Jadikan default',type:'checkbox'}] },
        { id: 'prices', label: 'Harga Khusus', sub: 'prices', cols: [['productId','Produk'],['price','Harga','money'],['effectiveFrom','Berlaku','date'],['status','Status','chip']],
          form: async () => { const products = await api('/api/products?limit=200'); return [{name:'productId',label:'Produk',type:'select',options:products.items.map(x=>[x.id,`${x.code} · ${x.name}`]),required:true},{name:'price',label:'Harga khusus',type:'number',min:0,required:true},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true},{name:'expiryDate',label:'Kedaluwarsa',type:'date'}]; } }
      ]
    },
    suppliers: {
      module: 'supplier', title: 'Supplier', base: '/api/masters/suppliers', listRoute: '#/masters/suppliers',
      head: (o) => `<b>${esc(o.name)}</b><small>${esc(o.code)} · ${esc(o.category || '')}</small>`,
      tabs: [
        { id: 'overview', label: 'Overview' },
        { id: 'contacts', label: 'Kontak', sub: 'contacts', cols: [['name','Nama'],['positionTitle','Jabatan'],['phone','Telepon'],['email','Email'],['isPrimary','Utama','bool']],
          form: [{name:'name',label:'Nama PIC',required:true},{name:'positionTitle',label:'Jabatan'},{name:'phone',label:'Telepon'},{name:'email',label:'Email'},{name:'whatsapp',label:'WhatsApp'},{name:'isPrimary',label:'Kontak utama',type:'checkbox'}] },
        { id: 'addresses', label: 'Alamat', sub: 'addresses', cols: [['addressType','Jenis'],['city','Kota'],['isDefault','Default','bool']],
          form: [{name:'addressType',label:'Jenis',type:'select',options:[['OFFICE','Kantor'],['FACTORY','Pabrik'],['WAREHOUSE','Gudang']],required:true},{name:'address',label:'Alamat',type:'textarea',required:true},{name:'city',label:'Kota'},{name:'province',label:'Provinsi'}] },
        { id: 'bank-accounts', label: 'Rekening (Maker-Checker)', sub: 'bank-accounts', reason: true, bankApprove: true, cols: [['bankName','Bank'],['accountNumber','No. Rekening'],['accountHolder','Pemilik'],['verificationStatus','Verifikasi','chip']],
          form: [{name:'bankName',label:'Nama bank',required:true},{name:'accountNumber',label:'Nomor rekening',required:true},{name:'accountHolder',label:'Nama pemilik',required:true},{name:'changeReason',label:'Alasan perubahan',type:'textarea',required:true}] },
        { id: 'materials', label: 'Material Disetujui', sub: 'materials', cols: [['category','Kategori'],['gradeSpec','Grade/Spec'],['brand','Merek'],['leadTimeDays','Lead time'],['approvedStatus','Status','chip']],
          form: [{name:'category',label:'Kategori',required:true},{name:'gradeSpec',label:'Grade/Spesifikasi'},{name:'brand',label:'Merek'},{name:'supplierPartNumber',label:'Part number supplier'},{name:'uom',label:'Satuan'},{name:'moq',label:'MOQ',type:'number',min:0},{name:'leadTimeDays',label:'Lead time (hari)',type:'number',min:0}] },
        { id: 'price-history', label: 'Riwayat Harga', sub: 'price-history', append: true, cols: [['materialDesc','Material'],['grade','Grade'],['price','Harga','money'],['revisionNo','Rev.'],['effectiveFrom','Berlaku','date'],['status','Status','chip']],
          form: [{name:'materialDesc',label:'Deskripsi material',required:true},{name:'grade',label:'Grade'},{name:'specification',label:'Spesifikasi'},{name:'uom',label:'Satuan',required:true},{name:'price',label:'Harga',type:'number',min:0,required:true},{name:'taxIncluded',label:'Termasuk pajak',type:'checkbox'},{name:'freightIncluded',label:'Termasuk ongkir',type:'checkbox'},{name:'leadTimeDays',label:'Lead time (hari)',type:'number',min:0},{name:'moq',label:'MOQ',type:'number',min:0},{name:'sourceQuotation',label:'Sumber penawaran'},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true}] },
        { id: 'evaluations', label: 'Evaluasi Kinerja', sub: 'evaluations', cols: [['period','Periode'],['overallScore','Skor'],['riskLevel','Risiko'],['approvedVendor','AVL','bool']],
          form: [{name:'period',label:'Periode (YYYY-MM)',required:true},{name:'onTimeDeliveryPct',label:'On-time delivery (%)',type:'number',min:0,max:100},{name:'qualityAcceptancePct',label:'Quality acceptance (%)',type:'number',min:0,max:100},{name:'overallScore',label:'Skor keseluruhan',type:'number',min:0,max:100},{name:'riskLevel',label:'Level risiko',type:'select',options:[['LOW','Rendah'],['MEDIUM','Sedang'],['HIGH','Tinggi']]},{name:'approvedVendor',label:'Approved vendor',type:'checkbox'},{name:'notes',label:'Catatan',type:'textarea'}] }
      ]
    },
    products: {
      module: 'product', title: 'Produk', base: '/api/masters/products', listRoute: '#/masters/products',
      head: (o) => `<b>${esc(o.name)}</b><small>${esc(o.code)} · ${esc(o.category || o.uom || '')}</small>`,
      tabs: [
        { id: 'overview', label: 'Overview' },
        { id: 'cost-revisions', label: 'BOM & HPP', sub: 'cost-revisions', costActivate: true, cols: [['revisionNo','Rev.'],['totalCost','Total HPP','money'],['status','Status','chip'],['createdAt','Dibuat','date']],
          form: [{name:'costRawMaterial',label:'Bahan baku',type:'number',min:0},{name:'costConsumable',label:'Consumable',type:'number',min:0},{name:'costSubcontract',label:'Subkontrak',type:'number',min:0},{name:'costLabor',label:'Tenaga kerja',type:'number',min:0},{name:'costMachine',label:'Mesin',type:'number',min:0},{name:'costOverhead',label:'Overhead',type:'number',min:0},{name:'costFreight',label:'Ongkir',type:'number',min:0},{name:'costOther',label:'Lainnya',type:'number',min:0},{name:'calculationNotes',label:'Catatan kalkulasi',type:'textarea'}] },
        { id: 'uom-conversions', label: 'Konversi Satuan', sub: 'uom-conversions', cols: [['fromUom','Dari'],['toUom','Ke'],['factor','Faktor']],
          form: [{name:'fromUom',label:'Dari satuan',required:true},{name:'toUom',label:'Ke satuan',required:true},{name:'factor',label:'Faktor konversi',type:'number',min:0,required:true}] },
        { id: 'files', label: 'File Produk', sub: 'files', cols: [['title','Judul'],['fileType','Jenis'],['revision','Rev.'],['confidentiality','Kerahasiaan']],
          form: [{name:'title',label:'Judul',required:true},{name:'fileType',label:'Jenis',type:'select',options:[['DRAWING','Gambar'],['CAD','CAD'],['SPECIFICATION','Spesifikasi'],['QC_STANDARD','Standar QC'],['WORK_INSTRUCTION','Instruksi kerja'],['PHOTO','Foto'],['CERTIFICATE','Sertifikat']],required:true},{name:'revision',label:'Revisi'},{name:'confidentiality',label:'Kerahasiaan',type:'select',options:[['PUBLIC','Publik'],['INTERNAL','Internal'],['CONFIDENTIAL','Rahasia']]},{name:'customerOwned',label:'Milik pelanggan',type:'checkbox'}] }
      ]
    }
  };

  const LIFECYCLE_BTN = { DRAFT: [['submit','Ajukan review']], PENDING_REVIEW: [['approve','Setujui']], APPROVED: [['activate','Aktifkan']], ACTIVE: [['suspend','Suspend']], SUSPENDED: [['activate','Aktifkan'],['block','Blokir']], BLOCKED: [['obsolete','Usangkan']], OBSOLETE: [['archive','Arsipkan']] };
  const fmtCell = (row, col) => {
    const [key, , type] = col; const v = row[key];
    if (type === 'money') return `<span class="money">${fmtIDR(Number(v) || 0)}</span>`;
    if (type === 'date') return fmtDate(v);
    if (type === 'chip') return chip(v);
    if (type === 'bool') return v ? '<span class="chip mint">Ya</span>' : '<span class="chip gray">—</span>';
    return esc(v ?? '—');
  };

  const masterDetail = {
    async render(main, params, signal) {
      const cfg = MASTER_DETAIL[params.type];
      if (!cfg) { main.innerHTML = `<section class="error-state">${clayOrb('coral','alert')}<h1>Master tidak dikenal</h1></section>`; return; }
      if (!can(`${cfg.module}.view`)) { main.innerHTML = `<section class="error-state">${clayOrb('amber','lock')}<h1>Akses dibatasi</h1></section>`; return; }
      const activeTab = this._tab && this._tabFor === params.id ? this._tab : 'overview';
      this._tabFor = params.id;
      let overview;
      try { overview = await api(`${cfg.base}/${params.id}`, { signal }); }
      catch (error) { main.innerHTML = `<section class="error-state">${clayOrb('coral','alert')}<h1>Gagal memuat</h1><p>${esc(error.message)}</p></section>`; return; }

      const lifeBtns = (LIFECYCLE_BTN[overview.lifecycleStatus] || []).filter(() => can(`${cfg.module}.edit`) || can(`${cfg.module}.approve`))
        .map(([a, label]) => `<button class="btn secondary sm" data-life="${a}">${esc(label)}</button>`).join('');

      main.innerHTML = pageHead({
        eyebrow: `MASTER DATA · ${cfg.title.toUpperCase()}`, title: overview.name || overview.code || cfg.title,
        sub: `Status data: ${overview.lifecycleStatus || 'ACTIVE'} · versi ${overview.mdmVersion || 1}`,
        actions: `<a class="btn secondary" href="${cfg.listRoute}">${ICONS.arrow} Kembali</a>${lifeBtns}`
      }) + `
        <div class="master-tabs" role="tablist">
          ${cfg.tabs.filter((t) => !t.perm || can(t.perm)).map((t) => `<button class="master-tab ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}" role="tab">${esc(t.label)}${overview.subCounts && overview.subCounts[t.sub] ? ` <span class="tab-count">${overview.subCounts[t.sub]}</span>` : ''}</button>`).join('')}
        </div>
        <section id="tabBody"></section>`;

      const renderTab = async (tabId) => {
        this._tab = tabId;
        main.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
        const body = main.querySelector('#tabBody');
        const tab = cfg.tabs.find((t) => t.id === tabId);
        if (tabId === 'overview') {
          const rows = cfg.tabs.filter((t) => t.sub).map((t) => `<div class="stat-row"><span>${esc(t.label)}</span><b>${(overview.subCounts && overview.subCounts[t.sub]) || 0} entri</b></div>`).join('');
          body.innerHTML = `<div class="dashboard-grid"><article class="panel"><header><div><p class="eyebrow">RINGKASAN</p><h2>Informasi utama</h2></div>${chip(overview.lifecycleStatus || 'ACTIVE')}</header><div class="panel-body"><dl class="detail-dl">${Object.entries(overview).filter(([k, v]) => !['subCounts','id'].includes(k) && typeof v !== 'object' && v !== null && v !== '').slice(0, 12).map(([k, v]) => `<div><dt>${esc(k.replace(/([A-Z])/g, ' $1'))}</dt><dd>${esc(String(v))}</dd></div>`).join('')}</dl></div></article><article class="panel"><header><div><p class="eyebrow">KELENGKAPAN</p><h2>Sub-data</h2></div></header><div class="panel-body stack">${rows}</div></article></div>`;
          return;
        }
        if (tab.perm && !can(tab.perm)) { body.innerHTML = `<div class="empty-state">${clayOrb('amber','lock')}<h3>Akses dibatasi</h3><p>Tab ini membutuhkan izin khusus.</p></div>`; return; }
        body.innerHTML = `<div class="panel"><div class="panel-body"><span class="spinner"></span> Memuat…</div></div>`;
        let data;
        try { data = await api(`${cfg.base}/${params.id}/${tab.sub}`); }
        catch (error) { body.innerHTML = `<div class="panel"><div class="panel-body error-text">${esc(error.message)}</div></div>`; return; }
        const canEdit = can(`${cfg.module}.edit`);
        const addBtn = canEdit ? `<button class="btn primary sm" id="tabAdd">${ICONS.plus} Tambah</button>` : '';
        body.innerHTML = `<div class="panel table-panel"><header><div><p class="eyebrow">${esc(cfg.title.toUpperCase())}</p><h2>${esc(tab.label)}</h2></div><div class="panel-tools">${addBtn}</div></header>
          <div class="table-wrap"><table><thead><tr>${tab.cols.map((c) => `<th>${esc(c[1])}</th>`).join('')}${(tab.bankApprove || tab.costActivate) ? '<th></th>' : ''}</tr></thead>
          <tbody>${data.items.length ? data.items.map((row) => `<tr>${tab.cols.map((c) => `<td>${fmtCell(row, c)}</td>`).join('')}${tab.bankApprove ? `<td class="right">${row.verificationStatus !== 'VERIFIED' && can('supplier.approve') ? `<button class="btn secondary sm" data-approve-bank="${esc(row.id)}">Verifikasi</button>` : ''}</td>` : ''}${tab.costActivate ? `<td class="right">${['APPROVED','LOCKED'].includes(row.status) && can('product.approve') ? `<button class="btn secondary sm" data-activate-cost="${esc(row.id)}">Set Active HPP</button>` : ['DRAFT','REVIEW'].includes(row.status) && can('product.approve') ? `<button class="btn secondary sm" data-promote-cost="${esc(row.id)}" data-next="${row.status === 'DRAFT' ? 'review' : 'approve'}">${row.status === 'DRAFT' ? 'Ajukan review' : 'Setujui'}</button>` : ''}</td>` : ''}</tr>`).join('') : `<tr><td colspan="${tab.cols.length + 1}"><div class="empty-state">${clayOrb('blue','inbox')}<h3>Belum ada data</h3><p>Tambahkan entri pertama untuk ${esc(tab.label.toLowerCase())}.</p></div></td></tr>`}</tbody></table></div></div>`;

        main.querySelector('#tabAdd')?.addEventListener('click', async () => {
          const fields = typeof tab.form === 'function' ? await tab.form() : tab.form;
          const value = await formDialog({ title: `Tambah ${tab.label}`, description: tab.append ? 'Riwayat bersifat append-only: entri baru menjadi revisi terbaru.' : 'Data tercatat pada audit trail.', fields, submitLabel: 'Simpan' });
          if (!value) return;
          try { await api(`${cfg.base}/${params.id}/${tab.sub}`, { method: 'POST', body: value, idempotencyKey: newIdemKey() }); toast(`${tab.label} ditambahkan`); renderTab(tabId); invalidate(`master:${params.id}`); this.render(main, params); }
          catch (error) { toast('Gagal menyimpan', error.message, 'coral'); }
        });
        body.querySelectorAll('[data-approve-bank]').forEach((b) => b.addEventListener('click', async () => {
          try { await api(`${cfg.base}/${params.id}/bank-accounts/${b.dataset.approveBank}/approve`, { method: 'POST' }); toast('Rekening terverifikasi', 'Payment hold dilepas.'); renderTab(tabId); }
          catch (error) { toast('Verifikasi gagal', error.message, 'coral'); }
        }));
        body.querySelectorAll('[data-activate-cost]').forEach((b) => b.addEventListener('click', async () => {
          try { await api(`${cfg.base}/${params.id}/cost-revisions/${b.dataset.activateCost}/activate`, { method: 'POST' }); toast('Active HPP diperbarui', 'Revisi ini kini menjadi HPP aktif.'); renderTab(tabId); }
          catch (error) { toast('Aktivasi gagal', error.message, 'coral'); }
        }));
        body.querySelectorAll('[data-promote-cost]').forEach((b) => b.addEventListener('click', async () => {
          try { await api(`${cfg.base}/${params.id}/cost-revisions/${b.dataset.promoteCost}/${b.dataset.next}`, { method: 'POST' }); toast('Revisi diperbarui'); renderTab(tabId); }
          catch (error) { toast('Gagal', error.message, 'coral'); }
        }));
      };

      main.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => renderTab(b.dataset.tab)));
      main.querySelectorAll('[data-life]').forEach((b) => b.addEventListener('click', async () => {
        const action = b.dataset.life;
        const needReason = ['suspend','block','obsolete','archive'].includes(action);
        const answer = needReason ? await actionDialog({ title: `${b.textContent.trim()} ${cfg.title}`, description: 'Perubahan status master tercatat pada audit trail.', requireReason: true, confirmLabel: b.textContent.trim() }) : {};
        if (answer === null) return;
        try { await api(`${cfg.base}/${params.id}/lifecycle`, { method: 'POST', body: { action, reason: answer.reason } }); toast('Status master diperbarui'); this.render(main, params); }
        catch (error) { toast('Gagal', error.message, 'coral'); }
      }));
      renderTab(activeTab);
    }
  };

  // ── Registrasi rute ───────────────────────────────────────────────────────
  const R = router.register.bind(router);
  R('/masters/:type/detail/:id', masterDetail);
  R('/dashboard', dashboard);
  R('/approvals', approvals);
  R('/notifications', notifications);
  R('/doc/:id', docDetail);

  R('/sales/inquiries', docListPage({ type: 'CUSTOMER_INQUIRY', module: 'inquiry', title: 'Customer inquiry', eyebrow: 'PENJUALAN' }));
  R('/sales/quotations', docListPage({ type: 'QUOTATION', module: 'quotation', title: 'Penawaran', eyebrow: 'PENJUALAN', createLabel: 'Buat penawaran', createRoute: '#/sales/quotations/new' }));
  R('/sales/quotations/new', quotationWizard);
  R('/sales/customer-pos', docListPage({ type: 'CUSTOMER_PO', module: 'customer_po', title: 'PO pelanggan', eyebrow: 'PENJUALAN' }));
  R('/sales/orders', docListPage({ type: 'SALES_ORDER', module: 'sales_order', title: 'Sales order', eyebrow: 'PENJUALAN' }));
  R('/sales/projects', docListPage({ type: 'PROJECT', module: 'project', title: 'Proyek', eyebrow: 'PENJUALAN' }));

  R('/procurement/requests', docListPage({ type: 'PURCHASE_REQUEST', module: 'purchase_request', title: 'Purchase request', eyebrow: 'PENGADAAN' }));
  R('/procurement/orders', docListPage({ type: 'PURCHASE_ORDER', module: 'purchase_order', title: 'Purchase order', eyebrow: 'PENGADAAN' }));
  R('/warehouse/inventory', inventory);
  R('/warehouse/receipts', docListPage({ type: 'GOODS_RECEIPT', module: 'goods_receipt', title: 'Penerimaan barang', eyebrow: 'GUDANG' }));
  R('/warehouse/movements', docListPage({ type: 'MATERIAL_ISSUE,STOCK_TRANSFER,STOCK_ADJUSTMENT', module: 'inventory', title: 'Mutasi & penyesuaian', eyebrow: 'GUDANG' }));
  R('/warehouse/deliveries', docListPage({ type: 'DELIVERY', module: 'delivery', title: 'Pengiriman', eyebrow: 'GUDANG' }));

  R('/production/work-orders', docListPage({
    type: 'WORK_ORDER', module: 'work_order', title: 'Work order', eyebrow: 'PRODUKSI',
    columns: [
      { label: 'Pekerjaan', render: docCell },
      { label: 'Pelanggan', render: (r) => esc(r.partyName || '—') },
      { label: 'Progres', render: (r) => progressBar((r.payload && r.payload.progress) || 0) },
      { label: 'Nilai', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
      { label: 'Jatuh tempo', render: (r) => fmtDate(r.dueDate) },
      { label: 'Status', render: (r) => chip(r.status) }
    ]
  }));
  R('/production/quality', docListPage({ type: 'QC_INSPECTION', module: 'quality', title: 'Quality control', eyebrow: 'PRODUKSI' }));

  R('/finance/invoices', docListPage({ type: 'INVOICE', module: 'invoice', title: 'Invoice', eyebrow: 'KEUANGAN', statuses: ['DRAFT','WAITING_APPROVAL','APPROVED','PARTIALLY_PAID','OVERDUE','CLOSED','VOID'] }));
  R('/finance/payments', paymentPage);
  R('/finance/supplier-invoices', docListPage({ type: 'SUPPLIER_INVOICE', module: 'supplier_invoice', title: 'Tagihan supplier', eyebrow: 'KEUANGAN' }));
  R('/finance/expenses', docListPage({ type: 'EXPENSE', module: 'expense', title: 'Pengeluaran & reimburse', eyebrow: 'KEUANGAN' }));
  R('/accounting', accounting);
  R('/accounting/journals', docListPage({ type: 'JOURNAL', module: 'journal', title: 'Jurnal', eyebrow: 'AKUNTANSI' }));
  R('/tax', taxCenter);

  R('/hr/employees', masterPage({
    endpoint: '/api/employees', key: 'employees', permission: 'employee.view', title: 'Karyawan', eyebrow: 'HRD', detailType: 'employees',
    fields:async()=>{const branches=await api('/api/branches');return[{name:'nik',label:'NIK',required:true},{name:'name',label:'Nama lengkap',required:true},{name:'department',label:'Departemen',required:true},{name:'jobTitle',label:'Jabatan'},{name:'baseSalary',label:'Gaji pokok',type:'number',min:0,required:true},{name:'branchId',label:'Lokasi kerja',type:'select',options:branches.items.map(x=>[x.id,`${x.code} · ${x.name}`]),required:true},{name:'joinDate',label:'Tanggal bergabung',type:'date'},{name:'bpjs',label:'Terdaftar BPJS',type:'checkbox'},{name:'active',label:'Karyawan aktif',type:'checkbox'}];},
    columns: [
      { label: 'Karyawan', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.nik)} · ${esc(r.jobTitle)}</small>` },
      { label: 'Departemen', render: (r) => esc(r.department) },
      { label: 'Lokasi', render: (r) => esc(r.branchName) },
      { label: 'Gaji pokok', right: true, render: (r) => can('payroll.view') ? `<span class="money">${fmtIDR(r.baseSalary)}</span>` : '<span class="chip gray">Tersembunyi</span>' },
      { label: 'BPJS', render: (r) => r.bpjs ? '<span class="chip mint">Terdaftar</span>' : '<span class="chip gray">—</span>' },
      { label: 'Bergabung', render: (r) => fmtDate(r.joinDate) }
    ]
  }));
  R('/hr/attendance', attendancePage);
  R('/hr/leave', docListPage({ type: 'LEAVE_REQUEST', module: 'leave', title: 'Pengajuan cuti', eyebrow: 'HRD' }));
  R('/payroll', payrollPage);
  R('/reports', reports);

  R('/masters/customers', masterPage({
    endpoint: '/api/customers', key: 'customers', permission: 'customer.view', title: 'Pelanggan', eyebrow: 'MASTER DATA', detailType: 'customers',
    fields:[{name:'code',label:'Kode pelanggan',required:true},{name:'name',label:'Nama pelanggan',required:true},{name:'npwp',label:'NPWP'},{name:'city',label:'Kota'},{name:'address',label:'Alamat',type:'textarea'},{name:'paymentTermDays',label:'Termin pembayaran (hari)',type:'number',min:0,required:true},{name:'creditLimit',label:'Batas kredit',type:'number',min:0},{name:'active',label:'Pelanggan aktif',type:'checkbox'}],
    columns: [
      { label: 'Pelanggan', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.code)}</small>` },
      { label: 'Kota', render: (r) => esc(r.city) },
      { label: 'NPWP', render: (r) => esc(r.npwp) },
      { label: 'Termin', render: (r) => `${r.paymentTermDays} hari` },
      { label: 'Status', render: (r) => r.active ? '<span class="chip mint">Aktif</span>' : '<span class="chip gray">Nonaktif</span>' }
    ]
  }));
  R('/masters/suppliers', masterPage({
    endpoint: '/api/suppliers', key: 'suppliers', permission: 'supplier.view', title: 'Supplier', eyebrow: 'MASTER DATA', detailType: 'suppliers',
    fields:[{name:'code',label:'Kode supplier',required:true},{name:'name',label:'Nama supplier',required:true},{name:'npwp',label:'NPWP'},{name:'category',label:'Kategori'},{name:'rating',label:'Rating',type:'number',min:1,max:5},{name:'bankName',label:'Nama bank'},{name:'bankAccount',label:'Nomor rekening'},{name:'bankHolder',label:'Nama pemilik rekening'},{name:'active',label:'Supplier aktif',type:'checkbox'}],
    columns: [
      { label: 'Supplier', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.code)}</small>` },
      { label: 'Kategori', render: (r) => esc(r.category) },
      { label: 'Rating', render: (r) => '★'.repeat(r.rating || 0) + '<span class="muted">' + '★'.repeat(5 - (r.rating || 0)) + '</span>' },
      { label: 'Status', render: (r) => r.active ? '<span class="chip mint">Aktif</span>' : '<span class="chip gray">Nonaktif</span>' }
    ]
  }));
  R('/masters/products', masterPage({
    endpoint: '/api/products', key: 'products', permission: 'product.view', title: 'Produk & jasa', eyebrow: 'MASTER DATA', detailType: 'products',
    fields:[{name:'code',label:'Kode produk',required:true},{name:'name',label:'Nama produk/jasa',required:true},{name:'uom',label:'Satuan',required:true},{name:'hpp',label:'Harga pokok',type:'number',min:0,required:true},{name:'price',label:'Harga jual',type:'number',min:0,required:true},{name:'active',label:'Produk aktif',type:'checkbox'}],
    columns: [
      { label: 'Produk', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.code)}</small>` },
      { label: 'Satuan', render: (r) => esc(r.uom) },
      { label: 'HPP', right: true, render: (r) => can('payroll.view') || can('journal.view') || can('*') ? `<span class="money">${fmtIDRFull(r.hpp)}</span>` : '<span class="chip gray">Tersembunyi</span>' },
      { label: 'Harga jual', right: true, render: (r) => `<span class="money">${fmtIDRFull(r.price)}</span>` }
    ]
  }));

  R('/system/users', systemUsers);
  R('/system/audit', auditPage);
  R('/system/monitoring', monitoring);
  R('/system/jobs', jobsPage);
  R('/system/selftest', selfTest);
  R('/system/settings', settings);
})();
