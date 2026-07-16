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
          actions: (createLabel && can(`${module}.create`)) ? `<button class="btn secondary" id="pgExport">${ICONS.job} Ekspor</button>${onCreate ? `<button class="btn primary" id="pgCreateInline">${ICONS.plus} ${esc(createLabel)}</button>` : `<a class="btn primary" href="${createRoute || '#'}" id="pgCreate">${ICONS.plus} ${esc(createLabel)}</a>`}` : `<button class="btn secondary" id="pgExport">${ICONS.job} Ekspor</button>`
        }) + `<section id="pgTable"></section>`;
        this._table = dataTable(main.querySelector('#pgTable'), {
          key: `documents:${type}`, endpoint: '/api/documents', params: { type },
          title: `Daftar ${title.toLowerCase()}`, eyebrow, columns: cols,
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
        sub: 'Keputusan diurutkan dari nilai terbesar, dengan eksposur kredit pelanggan dan versi kebijakan approval yang berlaku.'
      }) + `<section id="apprTable"></section>`;
      const riskChip = { high: '<span class="chip coral">Risiko tinggi</span>', medium: '<span class="chip amber">Risiko sedang</span>', low: '<span class="chip gray">Risiko rendah</span>' };
      this._table = dataTable(main.querySelector('#apprTable'), {
        key: 'approvals', endpoint: '/api/approvals', params: {},
        title: 'Menunggu keputusan Anda', eyebrow: 'ANTREAN', staleMs: 15_000, sort: 'amount:desc',
        columns: [
          { label: 'Dokumen', render: (r) => `<b>${esc(r.documentNumber)}</b><small>${esc(TYPE_LABEL[r.documentType] || r.documentType)} · ${esc(r.title)}</small>` },
          { label: 'Pemohon', render: (r) => `${esc(r.createdByName)}<small>${esc(r.partyName || '')}</small>` },
          { label: 'Nilai', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
          { label: 'Jenjang', render: (r) => `<span class="chip blue">Level ${esc(r.approvalLevel)} · ${esc(r.nextLevel || '')}</span>${r.policyVersion ? `<small class="muted">policy v${esc(r.policyVersion)}</small>` : ''}` },
          { label: 'Kredit', render: (r) => !r.credit ? '<span class="muted">—</span>' : r.credit.hold ? '<span class="chip coral">Hold</span>' : r.credit.overLimit ? `<span class="chip coral">Over ${fmtIDR(r.credit.projected - r.credit.limit)}</span>` : r.credit.limit > 0 ? `<span class="chip mint">Sisa ${fmtIDR(r.credit.limit - r.credit.exposure)}</span>` : '<span class="chip gray">Tanpa batas</span>' },
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
            ${doc.documentType === 'SUPPLIER_INVOICE' ? `<article class="panel" id="matchPanel"><header><div><p class="eyebrow">PENGADAAN</p><h2>Three-way match</h2></div></header><div class="panel-body stack" id="matchBody"><span class="spinner"></span> Mengevaluasi…</div></article>` : ''}
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
      const matchBody = main.querySelector('#matchBody');
      if (matchBody) {
        api(`/api/supplier-invoices/${doc.id}/match`).then((match) => {
          const tone = { MATCHED: 'mint', EXCEPTION: 'coral', OVERRIDDEN: 'amber' }[match.result] || 'gray';
          matchBody.innerHTML = `
            <div class="stat-row"><span>Hasil</span><span class="chip ${tone}">${esc(match.result)}</span></div>
            <div class="stat-row"><span>Nilai PO</span><b>${fmtIDR(match.poAmount)}</b></div>
            <div class="stat-row"><span>Nilai tagihan</span><b>${fmtIDR(match.invoiceAmount)}</b></div>
            <div class="stat-row"><span>Selisih</span><b>${match.amountVariance != null ? fmtIDR(match.amountVariance) : '—'}${match.priceVariancePct != null ? ` (${Number(match.priceVariancePct).toFixed(1)}%)` : ''}</b></div>
            ${(match.exceptions || []).length ? `<div class="stat-row"><span>Pengecualian</span></div>${match.exceptions.map((x) => `<p class="muted" style="font-size:11.5px">• ${esc(x)}</p>`).join('')}` : ''}
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
    onEvent() { this._table?.reload(); },
    render(main) {
      this._tab = this._tab || 'saldo';
      const TABS = [['saldo', 'Saldo stok'], ['lots', 'Lot & Heat Number'], ['opname', 'Stock Opname'], ['valuasi', 'Valuasi']];
      const actions = `<nav class="chip-tabs" aria-label="Tab inventori">${TABS.map(([id, label]) => `<button class="btn ${this._tab === id ? 'primary' : 'secondary'}" data-invtab="${id}">${esc(label)}</button>`).join('')}</nav>
        ${this._tab === 'opname' && can('stock_opname.create') ? `<button class="btn primary" id="startOpname">${ICONS.plus} Mulai opname</button>` : ''}`;
      main.innerHTML = pageHead({ eyebrow: 'GUDANG', title: 'Persediaan', sub: 'Saldo stok, traceability lot/heat number (mill certificate), stock opname, dan valuasi.', actions }) + '<section id="pgTable"></section><section id="pgDetail"></section>';
      main.querySelectorAll('[data-invtab]').forEach((b) => b.addEventListener('click', () => { this._tab = b.dataset.invtab; this.render(main); }));
      const mount = main.querySelector('#pgTable');
      if (this._tab === 'saldo') {
        this._table = dataTable(mount, {
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
      } else if (this._tab === 'lots') {
        const LOT_CHIP = { ACTIVE: 'mint', BLOCKED: 'coral', QUARANTINE: 'amber', CONSUMED: 'gray' };
        this._table = dataTable(mount, {
          key: 'inventory:lots', endpoint: '/api/inventory/lots', params: {}, title: 'Lot & heat number', eyebrow: 'TRACEABILITY', staleMs: 30_000,
          columns: [
            { label: 'Lot', render: (r) => `<b>${esc(r.lotNumber)}</b><small>${esc(r.sourceDocumentNumber || '—')}</small>` },
            { label: 'Produk', render: (r) => `<b>${esc(r.productCode)}</b><small>${esc(r.productName)}</small>` },
            { label: 'Heat / Mill cert', render: (r) => r.heatNumber ? `<b>${esc(r.heatNumber)}</b><small>${esc(r.millCertNo || '—')}</small>` : '<span class="muted">—</span>' },
            { label: 'Gudang', render: (r) => esc(r.warehouseName) },
            { label: 'Sisa', right: true, render: (r) => `<span class="money">${Number(r.qtyOnHand)} ${esc(r.uom || '')}</span><small>dari ${Number(r.qtyReceived)}</small>` },
            { label: 'Supplier', render: (r) => esc(r.supplierName || '—') },
            { label: 'Status', render: (r) => `<span class="chip ${LOT_CHIP[r.status] || 'gray'}">${esc(r.status)}</span>` }
          ],
          empty: { icon: 'box', title: 'Belum ada lot', note: 'Lot tercipta otomatis dari penerimaan barang (heat number diisi pada baris GR).' },
          onRow: (row) => this.showLot(main, row.id)
        });
      } else if (this._tab === 'opname') {
        this._table = dataTable(mount, {
          key: 'documents:opname', endpoint: '/api/documents', params: { type: 'STOCK_OPNAME' }, title: 'Sesi stock opname', eyebrow: 'OPNAME',
          columns: [
            { label: 'Dokumen', render: docCell },
            { label: 'Nilai selisih', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
            { label: 'Status', render: (r) => chip(r.status) },
            { label: 'Diperbarui', render: (r) => relTime(r.updatedAt) }
          ],
          statusFilter: ['DRAFT', 'WAITING_APPROVAL', 'APPROVED', 'REVISION_REQUIRED', 'REJECTED'],
          empty: { icon: 'box', title: 'Belum ada sesi opname' },
          onRow: (row) => { location.hash = `#/warehouse/opname/${row.id}`; }
        });
        main.querySelector('#startOpname')?.addEventListener('click', async () => {
          try {
            const branches = await api('/api/branches');
            const value = await formDialog({ title: 'Mulai stock opname', description: 'Sistem membuat snapshot qty per lot (dan sisa tanpa lot) untuk gudang terpilih. Selisih diposting setelah disetujui approver berbeda (SoD).', fields: [{ name: 'warehouseId', label: 'Gudang', type: 'select', options: branches.items.map((b) => [b.id, b.name]), required: true }, { name: 'title', label: 'Judul (opsional)' }], submitLabel: 'Buat sesi opname' });
            if (!value) return;
            const doc = await api('/api/inventory/opname', { method: 'POST', body: value });
            toast('Sesi opname dibuat', `${doc.documentNumber} · ${doc.lineCount} baris`);
            location.hash = `#/warehouse/opname/${doc.id}`;
          } catch (error) { toast('Gagal membuat opname', error.message, 'coral'); }
        });
      } else {
        api('/api/inventory/valuation').then((v) => {
          mount.innerHTML = `<section class="panel"><header><div><p class="eyebrow">VALUASI</p><h2>Nilai persediaan per produk</h2></div>
            <span class="chip blue">Saldo ${fmtIDR(v.totals.balanceValue)}</span></header>
            <div class="table-wrap"><table><thead><tr><th>Produk</th><th>Gudang</th><th class="right">Qty</th><th class="right">Biaya rata-rata</th><th class="right">Biaya standar (HPP)</th><th class="right">Nilai saldo</th><th class="right">Nilai lapisan lot</th></tr></thead>
            <tbody>${v.items.map((r) => `<tr><td><b>${esc(r.productCode)}</b><small>${esc(r.productName)}</small></td><td>${esc(r.warehouseName)}</td><td class="right money">${r.qtyOnHand}</td><td class="right money">${fmtIDRFull(r.avgCost)}</td><td class="right money">${fmtIDRFull(r.standardCost)}</td><td class="right money">${fmtIDRFull(r.balanceValue)}</td><td class="right money">${r.lotQty > 0 ? fmtIDRFull(r.lotValue) : '—'}</td></tr>`).join('') || '<tr><td colspan="7" class="table-loading">Belum ada saldo.</td></tr>'}</tbody></table></div>
            <div class="panel-body"><p class="muted">Nilai saldo memakai biaya standar (HPP aktif); lapisan lot mencatat biaya saat penerimaan untuk telusur FIFO.</p></div></section>`;
        }).catch((e) => { mount.innerHTML = `<section class="panel"><div class="panel-body"><p class="muted">Gagal memuat valuasi: ${esc(e.message)}</p></div></section>`; });
      }
    },
    async showLot(main, lotId) {
      const box = main.querySelector('#pgDetail');
      try {
        const lot = await api(`/api/inventory/lots/${lotId}`);
        const MV_LABEL = { RECEIPT: 'Penerimaan', ISSUE: 'Pengeluaran', TRANSFER_IN: 'Transfer masuk', TRANSFER_OUT: 'Transfer keluar', ADJUST_IN: 'Penyesuaian +', ADJUST_OUT: 'Penyesuaian −', BLOCK: 'Diblokir', RELEASE: 'Dilepas' };
        box.innerHTML = `<section class="panel"><header><div><p class="eyebrow">DETAIL LOT</p><h2>${esc(lot.lotNumber)}</h2></div>
          <div class="row-actions">${can('inventory.edit') && lot.status === 'ACTIVE' ? `<button class="btn secondary" id="lotBlock">Blokir (QC hold)</button>` : ''}${can('inventory.edit') && ['BLOCKED', 'QUARANTINE'].includes(lot.status) ? `<button class="btn primary" id="lotRelease">Lepas blokir</button>` : ''}</div></header>
          <div class="panel-body stack">
            <div class="stat-row"><span>Heat number / Mill certificate</span><b>${esc(lot.heatNumber || '—')} · ${esc(lot.millCertNo || '—')}</b></div>
            <div class="stat-row"><span>Produk · Gudang</span><b>${esc(lot.productCode)} · ${esc(lot.warehouseName)}</b></div>
            <div class="stat-row"><span>Sisa / diterima</span><b>${Number(lot.qtyOnHand)} / ${Number(lot.qtyReceived)} ${esc(lot.uom || '')} @ ${fmtIDRFull(lot.unitCost)}</b></div>
            <div class="stat-row"><span>Asal</span><b>${esc(lot.sourceDocumentNumber || '—')}${lot.supplierName ? ' · ' + esc(lot.supplierName) : ''}</b></div>
            ${lot.ancestry.length ? `<div class="stat-row"><span>Silsilah (traceability)</span><b>${lot.ancestry.map((a) => `${esc(a.lotNumber)} (${esc(a.warehouseName)})`).join(' ← ')}</b></div>` : ''}
            ${lot.children.length ? `<div class="stat-row"><span>Lot turunan</span><b>${lot.children.map((cRow) => `${esc(cRow.lotNumber)} (${Number(cRow.qtyOnHand)})`).join(', ')}</b></div>` : ''}
            ${lot.blockReason ? `<div class="stat-row"><span>Alasan blokir</span><b>${esc(lot.blockReason)}</b></div>` : ''}
          </div>
          <div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Mutasi</th><th class="right">Qty</th><th>Dokumen</th></tr></thead>
          <tbody>${lot.movements.map((mv) => `<tr><td>${relTime(mv.occurredAt)}</td><td>${esc(MV_LABEL[mv.movementType] || mv.movementType)}${mv.memo ? `<small>${esc(mv.memo)}</small>` : ''}</td><td class="right money">${Number(mv.qty) || '—'}</td><td>${esc(mv.documentNumber || '—')}</td></tr>`).join('')}</tbody></table></div></section>`;
        box.querySelector('#lotBlock')?.addEventListener('click', async () => { const answer = await actionDialog({ title: `Blokir lot ${lot.lotNumber}`, description: 'Lot terblokir dilewati pemilihan FIFO sampai dilepas kembali.', requireReason: true, confirmLabel: 'Blokir lot', danger: true }); if (!answer) return; try { await api(`/api/inventory/lots/${lotId}/block`, { method: 'POST', body: answer }); invalidate('inventory:lots'); toast('Lot diblokir', lot.lotNumber); this.render(main); } catch (error) { toast('Gagal memblokir', error.message, 'coral'); } });
        box.querySelector('#lotRelease')?.addEventListener('click', async () => { try { await api(`/api/inventory/lots/${lotId}/release`, { method: 'POST', body: {} }); invalidate('inventory:lots'); toast('Blokir dilepas', lot.lotNumber); this.render(main); } catch (error) { toast('Gagal melepas blokir', error.message, 'coral'); } });
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (error) { toast('Gagal memuat lot', error.message, 'coral'); }
    }
  };

  // Detail sesi stock opname: isi hasil hitung fisik, lalu ajukan lewat
  // dokumen (approval + SoD standar). Selisih diposting setelah APPROVED.
  const opnameDetail = {
    permission: 'stock_opname.view',
    onEvent() { /* status berubah via drawer → render ulang */ },
    async render(main, params) {
      const data = await api(`/api/inventory/opname/${params.id}/lines`);
      const doc = data.document;
      const editable = ['DRAFT', 'REVISION_REQUIRED'].includes(doc.status) && can('stock_opname.edit');
      const summary = doc.payload?.opname;
      main.innerHTML = pageHead({
        eyebrow: 'GUDANG · OPNAME', title: doc.documentNumber, sub: `${esc(doc.title)} · Gudang ${esc(doc.warehouseName || '—')} · ${data.items.length} baris`,
        actions: `${editable ? `<button class="btn primary" id="saveCounts">${ICONS.check} Simpan hasil hitung</button>` : ''}<button class="btn secondary" id="openDoc">Buka dokumen ${ICONS.arrow}</button>`
      }) + `
        <section class="metrics">
          ${kpiCard({ label: 'Status', value: doc.status, note: editable ? 'Isi hitung fisik lalu ajukan' : 'Menunggu proses berikutnya', orb: 'box', orbTone: 'blue' })}
          ${kpiCard({ label: 'Selisih lebih', value: fmtIDR(summary?.gain || 0), note: 'Diposting sebagai pendapatan selisih', orb: 'trend', orbTone: 'mint' })}
          ${kpiCard({ label: 'Selisih kurang', value: fmtIDR(summary?.loss || 0), note: 'Diposting sebagai beban selisih', orb: 'alert', orbTone: 'amber' })}
          ${kpiCard({ label: 'Belum dihitung', value: String(summary?.uncounted ?? data.items.filter(x => x.countedQty === null).length), note: 'Baris tanpa hasil hitung tidak disesuaikan', orb: 'ledger', orbTone: 'lavender' })}
        </section>
        <section class="panel"><header><div><p class="eyebrow">HASIL HITUNG FISIK</p><h2>Baris opname</h2></div>${chip(doc.status)}</header>
          <div class="table-wrap"><table><thead><tr><th>#</th><th>Produk</th><th>Lot / Heat</th><th class="right">Qty sistem</th><th class="right">Qty fisik</th><th class="right">Selisih</th><th>Catatan</th></tr></thead>
          <tbody>${data.items.map((r) => {
            const variance = r.variance === null ? null : Number(r.variance);
            return `<tr data-line="${r.id}"><td>${r.lineNo}</td>
              <td><b>${esc(r.productCode)}</b><small>${esc(r.productName)}</small></td>
              <td>${r.lotNumber ? `<b>${esc(r.lotNumber)}</b><small>${esc(r.heatNumber || '—')}</small>` : '<span class="muted">Tanpa lot</span>'}</td>
              <td class="right money">${Number(r.systemQty)} ${esc(r.uom || '')}</td>
              <td class="right">${editable ? `<input type="number" class="count-input" data-count="${r.id}" min="0" step="any" value="${r.countedQty ?? ''}" placeholder="—" style="width:90px;text-align:right">` : `<span class="money">${r.countedQty ?? '—'}</span>`}</td>
              <td class="right money">${variance === null ? '—' : `<span class="chip ${variance === 0 ? 'mint' : variance > 0 ? 'blue' : 'coral'}">${variance > 0 ? '+' : ''}${variance}</span>`}</td>
              <td>${editable ? `<input type="text" data-note="${r.id}" value="${esc(r.note || '')}" placeholder="Catatan" style="width:140px">` : esc(r.note || '—')}</td></tr>`;
          }).join('')}</tbody></table></div>
          <div class="panel-body"><p class="muted">Alur: isi qty fisik → simpan → ajukan lewat "Buka dokumen" → approver berbeda menyetujui (SoD) → selisih otomatis menyesuaikan saldo + lot dan dijurnal via posting profile OPNAME-DEFAULT.</p></div>
        </section>`;
      main.querySelector('#openDoc').addEventListener('click', () => openDrawer(doc.id, { onChange: () => this.render(main, params) }));
      main.querySelector('#saveCounts')?.addEventListener('click', async () => {
        const counts = [...main.querySelectorAll('[data-count]')].map((el) => ({ lineId: el.dataset.count, countedQty: el.value === '' ? null : Number(el.value), note: main.querySelector(`[data-note="${el.dataset.count}"]`)?.value || null })).filter((x) => x.countedQty !== null);
        if (!counts.length) { toast('Tidak ada hasil hitung', 'Isi minimal satu baris qty fisik.', 'coral'); return; }
        try {
          const result = await api(`/api/inventory/opname/${doc.id}/counts`, { method: 'POST', body: { counts } });
          toast('Hasil hitung disimpan', `${result.updated} baris · selisih lebih ${fmtIDR(result.gain)} · kurang ${fmtIDR(result.loss)}`);
          this.render(main, params);
        } catch (error) { toast('Gagal menyimpan', error.message, 'coral'); }
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

  // ── Produksi: cockpit WO, QC formal, MRP (Sprint 12 / R019) ───────────────
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
          <div class="table-wrap"><table><thead><tr><th>Komponen</th><th class="right">Kebutuhan</th><th class="right">Stok</th><th class="right">Reservasi</th><th class="right">PO terbuka</th><th class="right">Disarankan beli</th><th>Pemicu</th><th></th></tr></thead>
          <tbody>${data.items.map((r) => `<tr><td><b>${esc(r.productCode)}</b><small>${esc(r.productName)}</small></td>
            <td class="right">${Number(r.demandQty)}</td><td class="right">${Number(r.onHand)}</td><td class="right">${Number(r.reserved)}</td><td class="right">${Number(r.onOrder)}</td>
            <td class="right"><b class="money">${Number(r.suggestedQty)} ${esc(r.uom || '')}</b></td><td><small>${esc(r.source || '—')}</small></td>
            <td>${can('purchase_request.create') ? `<button class="btn primary sm" data-mrpconv="${r.id}">Buat PR</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="table-loading">Tidak ada saran — jalankan MRP untuk menghitung ulang.</td></tr>'}</tbody></table></div>
          <div class="panel-body"><p class="muted">Menjalankan MRP menutup saran lama (superseded) dan menghitung ulang dari kebutuhan terkini. Konversi membuat draft Purchase Request yang mengikuti alur approval normal.</p></div>
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

  const iamGovernance = {
    permission: 'iam.view',
    async render(main, _p, signal) {
      const [roles, assignments, users] = await Promise.all([
        api('/api/governance/roles', { signal }), api('/api/governance/assignments', { signal }), api('/api/system/users', { signal })
      ]);
      const pending=assignments.items.filter(x=>x.status==='PENDING');
      main.innerHTML=pageHead({eyebrow:'ENTERPRISE IAM',title:'IAM & role assignment',sub:'Role tidak dapat lagi diubah langsung. Setiap assignment memiliki scope, effective date, pengusul, approver, histori, dan session revocation.',actions:can('iam.create')?`<button class="btn primary" id="iamRequest">${ICONS.people} Usulkan role</button>`:''})+`
        <section class="metrics">
          ${kpiCard({label:'Role enterprise',value:String(roles.items.length),note:'Katalog terpisah platform, control, business, dan self-service',orb:'people',orbTone:'blue'})}
          ${kpiCard({label:'Menunggu approval',value:String(pending.length),note:'Maker dan checker wajib berbeda',orb:'approval',orbTone:pending.length?'amber':'mint'})}
          ${kpiCard({label:'Assignment aktif',value:String(assignments.items.filter(x=>x.status==='ACTIVE').length),note:'Effective-dated dan dapat direview',orb:'lock',orbTone:'lavender'})}
        </section>
        <section class="dashboard-grid"><article class="panel"><header><div><p class="eyebrow">ROLE CATALOG</p><h2>Pemisahan kewenangan</h2></div></header><div class="panel-body stack">${roles.items.map(r=>`<div class="stat-row"><span><b>${esc(r.name)}</b><small>${esc(r.description)}</small></span><span><span class="chip ${r.privileged?'coral':'blue'}">${esc(r.code)}</span><small>${r.assignedCount} aktif · ${r.permissions.length} izin</small></span></div>`).join('')}</div></article>
        <article class="panel"><header><div><p class="eyebrow">MAKER–CHECKER</p><h2>Assignment terbaru</h2></div></header><div class="panel-body stack">${assignments.items.slice(0,30).map(a=>`<div class="stat-row"><span><b>${esc(a.displayName)}</b><small>${esc(a.roleName)} · ${esc(a.scopeType)}</small></span><span>${chip(a.status)}${a.status==='PENDING'&&can('iam.approve')?`<span class="row-actions"><button class="btn primary sm" data-assignment="${a.id}" data-decision="approve">Setujui</button><button class="btn danger-outline sm" data-assignment="${a.id}" data-decision="reject">Tolak</button></span>`:''}</span></div>`).join('')||'<p class="muted">Belum ada assignment.</p>'}</div></article></section>`;
      main.querySelector('#iamRequest')?.addEventListener('click',async()=>{const value=await formDialog({title:'Usulkan role enterprise',description:'Usulan harus disetujui pengguna lain. Role/scope lama tetap aktif sampai approval.',fields:[{name:'targetUserId',label:'Pengguna',type:'select',options:users.items.map(x=>[x.id,`${x.displayName} · ${x.role}`]),required:true},{name:'roleCode',label:'Role',type:'select',options:roles.items.map(x=>[x.code,x.name]),required:true},{name:'scopeType',label:'Data scope',type:'select',options:['GLOBAL','BRANCH','OWN_RECORD'].map(x=>[x,x]),required:true},{name:'reason',label:'Alasan bisnis',type:'textarea',required:true}],submitLabel:'Kirim usulan'});if(!value)return;try{await api('/api/governance/assignments',{method:'POST',body:value});toast('Assignment diusulkan','Menunggu checker yang berbeda.');this.render(main);}catch(e){toast('Usulan gagal',e.message,'coral');}});
      main.querySelectorAll('[data-assignment]').forEach(btn=>btn.addEventListener('click',async()=>{const answer=await actionDialog({title:btn.dataset.decision==='approve'?'Setujui assignment':'Tolak assignment',description:'Keputusan tercatat permanen dan perubahan role akan mencabut seluruh sesi pengguna.',requireReason:true,requirePin:btn.dataset.decision==='approve'&&state.user.role==='owner',confirmLabel:btn.dataset.decision==='approve'?'Setujui':'Tolak'});if(!answer)return;try{await api(`/api/governance/assignments/${btn.dataset.assignment}/${btn.dataset.decision}`,{method:'POST',body:answer});toast('Keputusan tersimpan');this.render(main);}catch(e){toast('Keputusan gagal',e.message,'coral');}}));
    }
  };

  const sodCenter={permission:'sod.view',async render(main,_p,signal){const [sod,overrides]=await Promise.all([api('/api/governance/sod',{signal}),api('/api/governance/overrides',{signal})]);main.innerHTML=pageHead({eyebrow:'SEGREGATION OF DUTIES',title:'SoD conflict center',sub:'Konflik role dan transaksi sensitif diblokir sebelum perubahan state. Emergency access dibatasi maksimal 24 jam.',actions:''})+`<section class="metrics">${kpiCard({label:'Aturan aktif',value:String(sod.rules.length),note:'Role conflict dan transaction duty',orb:'shield',orbTone:'blue'})}${kpiCard({label:'Konflik tercatat',value:String(sod.conflicts.length),note:'Blocked, overridden, dan resolved',orb:'warning',orbTone:sod.conflicts.length?'coral':'mint'})}${kpiCard({label:'Emergency access aktif',value:String(overrides.items.filter(x=>x.status==='ACTIVE').length),note:'Owner PIN + expiry wajib',orb:'lock',orbTone:'amber'})}</section><section class="dashboard-grid"><article class="panel"><header><div><p class="eyebrow">CONTROL LIBRARY</p><h2>Aturan SoD</h2></div></header><div class="panel-body stack">${sod.rules.map(r=>`<div class="stat-row"><span><b>${esc(r.name)}</b><small>${esc(r.description)}</small></span><span class="chip ${r.severity==='CRITICAL'?'coral':'amber'}">${esc(r.severity)}</span></div>`).join('')}</div></article><article class="panel"><header><div><p class="eyebrow">EXCEPTIONS</p><h2>Override & konflik</h2></div></header><div class="panel-body stack">${[...overrides.items,...sod.conflicts].slice(0,30).map(x=>`<div class="stat-row"><span><b>${esc(x.permissionCode||x.ruleName||'Conflict')}</b><small>${esc(x.userName||'—')}</small></span>${chip(x.status)}</div>`).join('')||'<p class="muted">Tidak ada exception.</p>'}</div></article></section>`;}};

  const approvalPolicies={permission:'approval_policy.view',async render(main,_p,signal){const data=await api('/api/governance/approval-policies',{signal});main.innerHTML=pageHead({eyebrow:'APPROVAL GOVERNANCE',title:'Approval policy builder',sub:'Policy berbasis modul, nominal, cabang, versi, dan effective date. Snapshot terkunci saat dokumen diajukan.',actions:can('approval_policy.create')?`<button class="btn primary" id="policyCreate">${ICONS.approval} Versi baru</button>`:''})+`<section class="panel"><header><div><p class="eyebrow">POLICY VERSIONS</p><h2>Matrix aktif dan draft</h2></div></header><div class="table-wrap"><table><thead><tr><th>Policy</th><th>Dokumen</th><th>Rentang</th><th>Steps</th><th>Versi</th><th>Status</th><th></th></tr></thead><tbody>${data.items.map(p=>`<tr><td><b>${esc(p.policyKey)}</b><small>${esc(p.branchName||'Semua cabang')}</small></td><td>${esc(p.documentType)}</td><td>${fmtIDR(Number(p.minAmount))} – ${p.maxAmount===null?'∞':fmtIDR(Number(p.maxAmount))}</td><td>${(p.steps||[]).map(x=>`<span class="chip blue">${esc(x.level)}</span>`).join(' ')}</td><td>v${p.version}</td><td>${chip(p.status)}</td><td>${p.status==='DRAFT'&&can('approval_policy.approve')?`<button class="btn primary sm" data-policy="${p.id}">Aktifkan</button>`:''}</td></tr>`).join('')}</tbody></table></div></section>`;main.querySelector('#policyCreate')?.addEventListener('click',async()=>{const v=await formDialog({title:'Buat versi approval policy',fields:[{name:'policyKey',label:'Policy key',required:true},{name:'documentType',label:'Jenis dokumen',placeholder:'* untuk semua',required:true},{name:'minAmount',label:'Nominal minimum',type:'number',min:0,required:true},{name:'maxAmount',label:'Nominal maksimum (kosong = tanpa batas)',type:'number',min:0},{name:'steps',label:'Step dipisahkan koma',placeholder:'supervisor,finance,owner',required:true},{name:'changeReason',label:'Alasan versi',type:'textarea',required:true}],submitLabel:'Simpan draft'});if(!v)return;v.steps=String(v.steps).split(',').map(x=>x.trim()).filter(Boolean);v.maxAmount=v.maxAmount||null;try{await api('/api/governance/approval-policies',{method:'POST',body:v});toast('Draft policy dibuat');this.render(main);}catch(e){toast('Gagal membuat policy',e.message,'coral');}});main.querySelectorAll('[data-policy]').forEach(b=>b.addEventListener('click',async()=>{const a=await actionDialog({title:'Aktifkan policy',description:'Pembuat versi tidak boleh menjadi aktivator. Policy overlap akan ditolak.',requireReason:true,confirmLabel:'Aktifkan'});if(!a)return;try{await api(`/api/governance/approval-policies/${b.dataset.policy}/activate`,{method:'POST',body:a});toast('Policy diaktifkan');this.render(main);}catch(e){toast('Aktivasi gagal',e.message,'coral');}}));}};

  const accessReviews={
    permission:'access_review.view',
    async render(main,_p,signal){
      const data=await api('/api/governance/access-reviews',{signal});
      main.innerHTML=pageHead({eyebrow:'PERIODIC CONTROL',title:'Access review',sub:'Security Admin meninjau assignment aktif secara periodik. Keputusan retain/revoke memiliki approver, waktu, dan alasan.',actions:can('access_review.create')?`<button class="btn primary" id="reviewCreate">${ICONS.audit} Mulai review</button>`:''})+`<section class="report-grid">${data.items.map(r=>`<article class="panel report-card"><div class="clay-orb ${r.pendingItems?'amber':'mint'}">${ICONS.audit}</div><p class="eyebrow">${esc(r.scopeType)}</p><h2>${esc(r.title)}</h2><p>${r.pendingItems} dari ${r.totalItems} assignment menunggu keputusan.</p><div class="stat-row"><span>Jatuh tempo</span><b>${fmtDate(r.dueAt)}</b></div>${chip(r.status)} <a class="btn secondary" href="#/system/access-reviews/${r.id}">Tinjau assignment</a></article>`).join('')||'<article class="panel"><div class="empty-state"><h3>Belum ada access review</h3></div></article>'}</section>`;
      main.querySelector('#reviewCreate')?.addEventListener('click',async()=>{const v=await formDialog({title:'Mulai access review',fields:[{name:'title',label:'Judul review',required:true},{name:'scopeType',label:'Scope',type:'select',options:[['GLOBAL','Global'],['BRANCH','Branch']],required:true},{name:'dueAt',label:'Jatuh tempo',type:'date',required:true}],submitLabel:'Buat review'});if(!v)return;try{await api('/api/governance/access-reviews',{method:'POST',body:v});toast('Access review dibuat');this.render(main);}catch(e){toast('Gagal membuat review',e.message,'coral');}});
    }
  };

  const accessReviewDetail={
    permission:'access_review.view',
    async render(main,params,signal){
      const review=await api(`/api/governance/access-reviews/${params.id}`,{signal});
      const pending=review.items.filter(item=>item.decision==='PENDING').length;
      main.innerHTML=pageHead({eyebrow:'ACCESS REVIEW WORKBENCH',title:review.title,sub:`${review.scopeType} · jatuh tempo ${fmtDate(review.dueAt)} · ${pending} assignment belum diputuskan.`,actions:`<a class="btn secondary" href="#/system/access-reviews">Kembali</a>${can('access_review.approve')&&review.status==='OPEN'&&!pending?'<button class="btn primary" id="reviewComplete">Selesaikan review</button>':''}`})+`<section class="panel"><div class="table-wrap"><table><thead><tr><th>Pengguna</th><th>Role</th><th>Scope</th><th>Keputusan</th><th>Aksi</th></tr></thead><tbody>${review.items.map(item=>`<tr><td><b>${esc(item.userName)}</b></td><td>${esc(item.roleCode)}</td><td>${esc(item.scopeType)}${item.scopeId?` · ${esc(item.scopeId)}`:''}</td><td>${chip(item.decision)}</td><td>${can('access_review.approve')&&item.decision==='PENDING'?`<div class="row-actions"><button class="btn secondary small" data-review-decision="RETAIN" data-id="${item.id}">Retain</button><button class="btn danger small" data-review-decision="REVOKE" data-id="${item.id}">Revoke</button></div>`:`<small>${esc(item.reason||'Sudah diputuskan')}</small>`}</td></tr>`).join('')||'<tr><td colspan="5">Tidak ada assignment dalam scope ini.</td></tr>'}</tbody></table></div></section>`;
      main.querySelectorAll('[data-review-decision]').forEach(button=>button.addEventListener('click',async()=>{const decision=button.dataset.reviewDecision,confirm=await actionDialog({title:decision==='REVOKE'?'Cabut assignment':'Pertahankan assignment',description:decision==='REVOKE'?'Akses pengguna dan sesi aktifnya akan dicabut sesuai hasil review.':'Assignment tetap aktif dan keputusan dicatat permanen.',requireReason:true,confirmLabel:decision==='REVOKE'?'Revoke':'Retain'});if(!confirm)return;try{await api(`/api/governance/access-reviews/items/${button.dataset.id}/decide`,{method:'POST',body:{decision,reason:confirm.reason}});toast(`Assignment ${decision.toLowerCase()} berhasil dicatat`);router.render();}catch(error){toast('Keputusan gagal',error.message,'coral');}}));
      main.querySelector('#reviewComplete')?.addEventListener('click',async()=>{const confirm=await actionDialog({title:'Selesaikan access review',description:'Review yang selesai tidak dapat menerima keputusan baru.',confirmLabel:'Selesaikan'});if(!confirm)return;try{await api(`/api/governance/access-reviews/${params.id}/complete`,{method:'POST',body:{}});toast('Access review selesai');router.go('#/system/access-reviews');}catch(error){toast('Review belum dapat diselesaikan',error.message,'coral');}});
    }
  };

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

  const organizationPage = {
    permission: 'organization.view',
    async render(main, _p, signal) {
      const org = await api('/api/organization', { signal });
      const base = `/api/organization/${org.id}`;
      const [hierarchy, assets, signatories, tax, banks] = await Promise.all([
        api(`${base}/hierarchy`, { signal }), api(`${base}/assets`, { signal }), api(`${base}/signatories`, { signal }),
        api(`${base}/tax-identities`, { signal }), api(`${base}/bank-accounts`, { signal })
      ]);
      const count = (items) => (items || []).length;
      main.innerHTML = pageHead({
        eyebrow: 'ENTERPRISE ORGANIZATION', title: org.tradeName || org.legalName,
        sub: `${org.code} · ${org.lifecycleStatus} · versi master ${org.mdmVersion}`,
        actions: can('organization.edit') && state.user?.role === 'owner' ? `<button class="btn primary" id="orgEdit">${ICONS.gear} Edit identitas</button>` : ''
      }) + `
        <section class="kpi-grid">
          <article class="kpi"><span>Data lengkap</span><strong>${Number(org.completeness?.score || 0)}%</strong><small>${Number(org.completeness?.completed || 0)} dari ${Number(org.completeness?.total || 0)} atribut wajib</small></article>
          <article class="kpi"><span>Cabang & lokasi</span><strong>${count(hierarchy.branches) + count(hierarchy.workLocations)}</strong><small>${count(hierarchy.plants)} plant · ${count(hierarchy.warehouses)} gudang</small></article>
          <article class="kpi"><span>Struktur biaya</span><strong>${count(hierarchy.departments)}</strong><small>${count(hierarchy.costCenters)} cost center · ${count(hierarchy.profitCenters)} profit center</small></article>
          <article class="kpi"><span>Governance</span><strong>${count(assets) + count(signatories)}</strong><small>${count(tax)} identitas pajak · ${count(banks)} rekening</small></article>
        </section>
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">IDENTITAS RESMI</p><h2>Legal entity</h2></div>${chip(org.lifecycleStatus)}</header><div class="panel-body"><dl class="detail-dl">
            <div><dt>Nama legal</dt><dd>${esc(org.legalName || '—')}</dd></div><div><dt>Nama dagang</dt><dd>${esc(org.tradeName || '—')}</dd></div>
            <div><dt>Bidang usaha</dt><dd>${esc(org.businessField || '—')}</dd></div><div><dt>NPWP</dt><dd>${esc(org.npwp || '—')}</dd></div>
            <div><dt>Email</dt><dd>${esc(org.email || '—')}</dd></div><div><dt>Telepon / WhatsApp</dt><dd>${esc([org.phone, org.whatsapp].filter(Boolean).join(' · ') || '—')}</dd></div>
            <div><dt>Alamat legal</dt><dd>${esc(org.legalAddress || '—')}</dd></div><div><dt>Alamat operasional</dt><dd>${esc(org.operationalAddress || '—')}</dd></div>
          </dl></div></article>
          <article class="panel"><header><div><p class="eyebrow">HIERARKI</p><h2>Struktur terkendali</h2></div></header><div class="panel-body stack">
            ${[['Business unit',hierarchy.businessUnits],['Cabang',hierarchy.branches],['Departemen',hierarchy.departments],['Plant',hierarchy.plants],['Gudang',hierarchy.warehouses],['Work location',hierarchy.workLocations],['Ledger',hierarchy.ledgers],['Kalender fiskal',hierarchy.fiscalCalendars]].map(([label,items])=>`<div class="stat-row"><span>${esc(label)}</span><b>${count(items)} unit</b></div>`).join('')}
          </div></article>
        </section>
        <section class="panel table-panel"><header><div><p class="eyebrow">TREASURY CONTROL</p><h2>Rekening perusahaan</h2></div>${can('organization.edit') ? `<button class="btn primary sm" id="orgBankAdd">${ICONS.plus} Ajukan rekening</button>` : ''}</header>
          <div class="table-wrap"><table><thead><tr><th>Bank</th><th>Nomor rekening</th><th>Tujuan</th><th>Status</th><th>Efektif</th><th></th></tr></thead><tbody>${banks.length ? banks.map(b=>`<tr><td><b>${esc(b.bankName)}</b><small>${esc(b.accountHolder)}</small></td><td>${esc(b.accountNumber)}</td><td>${esc(b.currency)} · ${esc(b.usagePurpose)}</td><td>${chip(b.verificationStatus)}</td><td>${fmtDate(b.effectiveFrom)}</td><td class="right">${b.verificationStatus==='PENDING_VERIFICATION'&&can('organization.approve')?`<button class="btn secondary sm" data-org-bank="${esc(b.id)}">Periksa</button>`:''}</td></tr>`).join('') : '<tr><td colspan="6"><div class="empty-state"><h3>Belum ada rekening terverifikasi</h3><p>Ajukan rekening dan selesaikan maker–checker sebelum digunakan pada dokumen.</p></div></td></tr>'}</tbody></table></div>
        </section>
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">PAJAK & LEGAL</p><h2>Identitas resmi</h2></div>${can('organization.edit')?`<button class="btn secondary sm" id="orgTaxAdd">${ICONS.plus} Tambah</button>`:''}</header><div class="panel-body stack">${tax.map(x=>`<div class="stat-row"><span><b>${esc(x.identityType)}</b><small>${esc(x.registeredName || '')}</small></span><b>${esc(x.identityNumber)}</b></div>`).join('') || '<p class="muted">Belum ada identitas pajak.</p>'}</div></article>
          <article class="panel"><header><div><p class="eyebrow">BRAND & OTORISASI</p><h2>Aset dan penandatangan</h2></div></header><div class="panel-body stack"><div class="stat-row"><span>Logo, kop, stempel, tanda tangan</span><b>${assets.length} aset</b></div><div class="stat-row"><span>Authorized signatory</span><b>${signatories.length} orang</b></div><p class="muted">Versi aktif disimpan sebagai snapshot pada saat dokumen dibuat sehingga histori tidak berubah.</p></div></article>
        </section>`;

      main.querySelector('#orgEdit')?.addEventListener('click', async()=>{const value=await formDialog({title:'Edit identitas legal entity',description:'Gunakan sumber dokumen resmi. Perubahan menaikkan versi master.',initial:org,fields:[{name:'legalName',label:'Nama legal',required:true},{name:'tradeName',label:'Nama dagang'},{name:'businessField',label:'Bidang usaha'},{name:'tagline',label:'Tagline'},{name:'npwp',label:'NPWP'},{name:'phone',label:'Telepon'},{name:'whatsapp',label:'WhatsApp'},{name:'email',label:'Email',type:'email'},{name:'website',label:'Website'},{name:'legalAddress',label:'Alamat legal',type:'textarea'},{name:'operationalAddress',label:'Alamat operasional',type:'textarea'},{name:'documentFooter',label:'Footer dokumen',type:'textarea'}],submitLabel:'Lanjut verifikasi'});if(!value)return;const verify=await actionDialog({title:'Verifikasi perubahan identitas',description:'PIN Owner dan alasan wajib untuk audit trail.',requireReason:true,requirePin:true,confirmLabel:'Simpan versi baru'});if(!verify)return;try{await api(base,{method:'PATCH',body:{...value,...verify}});toast('Identitas organisasi diperbarui');this.render(main);}catch(error){toast('Pembaruan gagal',error.message,'coral');}});
      main.querySelector('#orgBankAdd')?.addEventListener('click',async()=>{const value=await formDialog({title:'Ajukan rekening perusahaan',description:'Usulan tidak dapat dipakai sebelum disetujui Owner yang berbeda melalui PIN + MFA.',fields:[{name:'bankName',label:'Nama bank',required:true},{name:'accountNumber',label:'Nomor rekening',required:true},{name:'accountHolder',label:'Nama pemilik',required:true},{name:'currency',label:'Mata uang',value:'IDR',required:true},{name:'usagePurpose',label:'Tujuan',type:'select',options:[['OPERATING','Operasional'],['PAYROLL','Payroll'],['TAX','Pajak'],['COLLECTION','Penerimaan']],required:true},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true},{name:'isPrimary',label:'Rekening utama',type:'checkbox'},{name:'changeReason',label:'Alasan pengajuan',type:'textarea',required:true}],submitLabel:'Kirim usulan'});if(!value)return;try{await api(`${base}/bank-accounts`,{method:'POST',body:value,idempotencyKey:newIdemKey()});toast('Rekening diajukan','Menunggu checker Owner yang berbeda.');this.render(main);}catch(error){toast('Pengajuan gagal',error.message,'coral');}});
      main.querySelector('#orgTaxAdd')?.addEventListener('click',async()=>{const value=await formDialog({title:'Tambah identitas pajak/legal',description:'Nomor harus bersumber dari dokumen resmi.',fields:[{name:'identityType',label:'Jenis',type:'select',options:[['NPWP','NPWP'],['NITKU','NITKU'],['PKP','PKP'],['NIB','NIB'],['OTHER','Lainnya']],required:true},{name:'identityNumber',label:'Nomor identitas',required:true},{name:'registeredName',label:'Nama terdaftar'},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true},{name:'isPrimary',label:'Identitas utama',type:'checkbox'}],submitLabel:'Simpan'});if(!value)return;try{await api(`${base}/tax-identities`,{method:'POST',body:value});toast('Identitas resmi ditambahkan');this.render(main);}catch(error){toast('Gagal',error.message,'coral');}});
      main.querySelectorAll('[data-org-bank]').forEach(btn=>btn.addEventListener('click',async()=>{const verify=await actionDialog({title:'Setujui rekening perusahaan',description:'Wajib login dengan MFA aktif dalam 10 menit terakhir. Maker dan checker harus berbeda.',requireReason:true,requirePin:true,confirmLabel:'Setujui rekening'});if(!verify)return;try{await api(`${base}/bank-accounts/${btn.dataset.orgBank}/approve`,{method:'POST',body:verify});toast('Rekening perusahaan terverifikasi');this.render(main);}catch(error){toast('Persetujuan gagal',error.message,'coral');}}));
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
      main.querySelector('#settingsEdit')?.addEventListener('click', async () => { const value = await formDialog({ title: 'Edit identitas & konfigurasi', description: 'Rekening perusahaan hanya dapat diubah melalui Organization Workbench dan workflow maker–checker.', initial: { name: c.name, npwp: c.npwp, address: c.address, numberingFormat: c.numberingFormat, fiscalYear: c.fiscalYear }, fields: [{ name: 'name', label: 'Nama perusahaan', required: true }, { name: 'npwp', label: 'NPWP' }, { name: 'address', label: 'Alamat', type: 'textarea' }, { name: 'numberingFormat', label: 'Format penomoran', required: true }, { name: 'fiscalYear', label: 'Tahun fiskal', type: 'number', min: 2000, max: 2200 }], submitLabel: 'Lanjut verifikasi' }); if (!value) return; const verify = await actionDialog({ title: 'Verifikasi perubahan', description: 'Perubahan sensitif memerlukan PIN Owner dan alasan tertulis untuk audit trail.', requireReason: true, requirePin: true, confirmLabel: 'Simpan perubahan' }); if (!verify) return; try { await api('/api/system/settings/company', { method: 'PATCH', body: { company: value, ...verify } }); invalidate('settings'); toast('Pengaturan diperbarui'); this.render(main); } catch (error) { toast('Pembaruan gagal', error.message, 'coral'); } });
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

  // Susunan final R014: tepat 10 tab employee, sementara sub-tabel tetap ternormalisasi.
  {
    const legacy = Object.fromEntries(MASTER_DETAIL.employees.tabs.map(t => [t.id, t]));
    const certification = { label:'Sertifikasi', sub:'certifications', cols:[['name','Sertifikasi'],['issuer','Penerbit'],['certificateNumber','Nomor'],['expiryDate','Kedaluwarsa','date']], form:[{name:'name',label:'Nama sertifikasi',required:true},{name:'issuer',label:'Penerbit'},{name:'certificateNumber',label:'Nomor'},{name:'issuedDate',label:'Terbit',type:'date'},{name:'expiryDate',label:'Kedaluwarsa',type:'date'}] };
    const claim = { label:'Riwayat klaim', sub:'insurance-claims', cols:[['claimNumber','No. Klaim'],['claimDate','Tanggal','date'],['claimType','Jenis'],['amount','Nilai','money'],['status','Status','chip']], form:[{name:'claimNumber',label:'Nomor klaim'},{name:'claimDate',label:'Tanggal klaim',type:'date',required:true},{name:'claimType',label:'Jenis klaim'},{name:'amount',label:'Nilai',type:'number',min:0},{name:'status',label:'Status',type:'select',options:[['SUBMITTED','Diajukan'],['IN_REVIEW','Ditinjau'],['APPROVED','Disetujui'],['REJECTED','Ditolak'],['PAID','Dibayar']]}] };
    const restricted = { label:'Restricted record', sub:'restricted-records', cols:[['recordType','Jenis'],['title','Judul'],['effectiveFrom','Berlaku','date']], form:[{name:'recordType',label:'Jenis',type:'select',options:[['MEDICAL','Medis'],['DISCIPLINARY','Disipliner'],['BACKGROUND_CHECK','Background check'],['LEGAL','Legal'],['OTHER','Lainnya']],required:true},{name:'title',label:'Judul',required:true},{name:'restrictedNotes',label:'Catatan terbatas',type:'textarea',required:true},{name:'effectiveFrom',label:'Berlaku',type:'date',required:true}] };
    legacy.compensation.label='Kompensasi (maker–checker)'; legacy.compensation.employeeApprove=true; legacy.compensation.statusKey='approvalStatus'; legacy.compensation.cols=[['baseSalary','Gaji pokok','money'],['fixedAllowance','Tunjangan','money'],['effectiveFrom','Berlaku','date'],['approvalStatus','Status','chip']];
    legacy['bank-accounts'].label='Payroll Bank'; legacy['bank-accounts'].employeeApprove=true; legacy['bank-accounts'].statusKey='verificationStatus'; legacy['bank-accounts'].cols=[['bankName','Bank'],['accountNumber','No. Rekening'],['verificationStatus','Status','chip'],['isPrimary','Utama','bool']];
    MASTER_DETAIL.employees.tabs = [
      legacy.overview,
      {id:'employment',label:'Employment & Position',groups:[legacy.positions,legacy['employment-history'],legacy.contracts,legacy.compensation]},
      {...legacy['tax-profiles'],label:'Pajak'}, legacy.bpjs,
      {id:'insurance-final',label:'Insurance',groups:[legacy.insurance,claim]},
      legacy['bank-accounts'],
      {id:'documents-final',label:'Documents & Certifications',groups:[legacy.documents,certification]},
      {id:'emergency-final',label:'Emergency & Restricted',perm:'employee.edit',groups:[legacy['emergency-contacts'],restricted]},
      {...legacy.access,label:'System Access & Role'},
      {id:'audit',label:'Audit & Change History',sub:'audit',noAdd:true,cols:[['occurredAt','Waktu','date'],['action','Aksi','chip'],['entityType','Objek'],['reason','Alasan'],['requestId','Request ID']]}
    ];
  }

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
          if (params.type === 'employees') {
            const s=overview.enterpriseSummary||{},pos=s.currentPosition||{},employment=s.employment||{},comp=s.compensation||{},tax=s.tax||{},bank=s.payrollBank||{},completeness=overview.completeness||{};
            body.innerHTML=`<section class="kpi-grid"><article class="kpi"><span>Kelengkapan profil</span><strong>${Number(completeness.score||0)}%</strong><small>${Number(completeness.completed||0)} dari ${Number(completeness.total||0)} kontrol utama</small></article><article class="kpi"><span>Status kerja</span><strong>${esc(employment.employmentStatus||'—')}</strong><small>${esc(employment.employmentType||'Belum dikonfigurasi')}</small></article><article class="kpi"><span>Dokumen segera kedaluwarsa</span><strong>${Number(s.expiringDocuments||0)}</strong><small>Dalam 90 hari</small></article><article class="kpi"><span>Akun sistem aktif</span><strong>${Number(s.activeUserAccounts||0)}</strong><small>Akses ditinjau melalui IAM</small></article></section>
              <section class="dashboard-grid"><article class="panel"><header><div><p class="eyebrow">EMPLOYMENT SNAPSHOT</p><h2>Posisi & kompensasi terkendali</h2></div>${chip(overview.lifecycleStatus||'ACTIVE')}</header><div class="panel-body"><dl class="detail-dl"><div><dt>NIK</dt><dd>${esc(overview.nik)}</dd></div><div><dt>Nama</dt><dd>${esc(overview.name)}</dd></div><div><dt>Jabatan</dt><dd>${esc(pos.positionTitle||overview.jobTitle||'—')}</dd></div><div><dt>Divisi / departemen</dt><dd>${esc(pos.division||overview.department||'—')}</dd></div><div><dt>Lokasi kerja</dt><dd>${esc(pos.workLocation||'—')}</dd></div><div><dt>Grade</dt><dd>${esc(pos.salaryGrade||comp.salaryGrade||'—')}</dd></div><div><dt>Gaji pokok</dt><dd>${typeof comp.baseSalary==='number'?fmtIDR(comp.baseSalary):esc(comp.baseSalary||overview.baseSalary||'—')}</dd></div><div><dt>Tunjangan tetap</dt><dd>${typeof comp.fixedAllowance==='number'?fmtIDR(comp.fixedAllowance):esc(comp.fixedAllowance||'—')}</dd></div></dl></div></article>
              <article class="panel"><header><div><p class="eyebrow">COMPLIANCE SNAPSHOT</p><h2>Pajak, benefit & risiko</h2></div></header><div class="panel-body stack"><div class="stat-row"><span>PTKP / TER</span><b>${esc([tax.ptkpStatus,tax.terCategory].filter(Boolean).join(' · ')||'—')}</b></div><div class="stat-row"><span>Program BPJS aktif</span><b>${Number(s.bpjsPrograms||0)}</b></div><div class="stat-row"><span>Polis asuransi aktif</span><b>${Number(s.insurancePolicies||0)}</b></div><div class="stat-row"><span>Rekening payroll</span><b>${esc(bank.bankName||'Belum ada')} · ${esc(bank.accountNumber||'—')}</b></div><div class="stat-row"><span>Kehadiran bulan ini</span><b>${Number(s.attendanceDays||0)} hari</b></div><div class="stat-row"><span>Sisa cuti</span><b>${Number(s.leaveBalance?.remaining||0)} hari</b></div></div></article></section>`;
            return;
          }
          const rows = cfg.tabs.filter((t) => t.sub).map((t) => `<div class="stat-row"><span>${esc(t.label)}</span><b>${(overview.subCounts && overview.subCounts[t.sub]) || 0} entri</b></div>`).join('');
          body.innerHTML = `<div class="dashboard-grid"><article class="panel"><header><div><p class="eyebrow">RINGKASAN</p><h2>Informasi utama</h2></div>${chip(overview.lifecycleStatus || 'ACTIVE')}</header><div class="panel-body"><dl class="detail-dl">${Object.entries(overview).filter(([k, v]) => !['subCounts','id'].includes(k) && typeof v !== 'object' && v !== null && v !== '').slice(0, 12).map(([k, v]) => `<div><dt>${esc(k.replace(/([A-Z])/g, ' $1'))}</dt><dd>${esc(String(v))}</dd></div>`).join('')}</dl></div></article><article class="panel"><header><div><p class="eyebrow">KELENGKAPAN</p><h2>Sub-data</h2></div></header><div class="panel-body stack">${rows}</div></article></div>`;
          return;
        }
        if (tab.perm && !can(tab.perm)) { body.innerHTML = `<div class="empty-state">${clayOrb('amber','lock')}<h3>Akses dibatasi</h3><p>Tab ini membutuhkan izin khusus.</p></div>`; return; }
        if (tab.groups) {
          body.innerHTML = `<div class="panel"><div class="panel-body"><span class="spinner"></span> Memuat kelompok data…</div></div>`;
          const groups = tab.groups.filter(g => !g.perm || can(g.perm));
          try {
            const datasets = await Promise.all(groups.map(g => api(`${cfg.base}/${params.id}/${g.sub}`)));
            body.innerHTML = groups.map((g, index) => {
              const items=datasets[index].items||[];
              return `<div class="panel table-panel"><header><div><p class="eyebrow">${esc(tab.label.toUpperCase())}</p><h2>${esc(g.label)}</h2></div>${can(`${cfg.module}.edit`)&&g.form?`<button class="btn primary sm" data-group-add="${index}">${ICONS.plus} Tambah</button>`:''}</header><div class="table-wrap"><table><thead><tr>${g.cols.map(c=>`<th>${esc(c[1])}</th>`).join('')}${g.employeeApprove?'<th></th>':''}</tr></thead><tbody>${items.length?items.map(row=>`<tr>${g.cols.map(c=>`<td>${fmtCell(row,c)}</td>`).join('')}${g.employeeApprove?`<td class="right">${['PENDING_APPROVAL','PENDING_VERIFICATION'].includes(row[g.statusKey])&&can('employee.approve')?`<button class="btn secondary sm" data-employee-approve="${esc(row.id)}" data-resource="${esc(g.sub)}">Setujui</button>`:''}</td>`:''}</tr>`).join(''):`<tr><td colspan="${g.cols.length+1}"><div class="empty-state"><h3>Belum ada data</h3><p>Tambahkan ${esc(g.label.toLowerCase())} pertama.</p></div></td></tr>`}</tbody></table></div></div>`;
            }).join('');
            body.querySelectorAll('[data-group-add]').forEach(btn=>btn.addEventListener('click',async()=>{const g=groups[Number(btn.dataset.groupAdd)],fields=typeof g.form==='function'?await g.form():g.form;const value=await formDialog({title:`Tambah ${g.label}`,description:'Data tercatat pada audit trail dan mengikuti effective date.',fields,submitLabel:'Simpan'});if(!value)return;try{await api(`${cfg.base}/${params.id}/${g.sub}`,{method:'POST',body:value,idempotencyKey:newIdemKey()});toast(`${g.label} ditambahkan`);renderTab(tabId);}catch(error){toast('Gagal menyimpan',error.message,'coral');}}));
            body.querySelectorAll('[data-employee-approve]').forEach(btn=>btn.addEventListener('click',async()=>{const answer=await actionDialog({title:'Setujui perubahan sensitif',description:'Maker dan checker harus pengguna berbeda. Keputusan dicatat permanen.',requireReason:true,confirmLabel:'Setujui'});if(!answer)return;try{await api(`${cfg.base}/${params.id}/${btn.dataset.resource}/${btn.dataset.employeeApprove}/approve`,{method:'POST',body:answer});toast('Perubahan disetujui');renderTab(tabId);}catch(error){toast('Persetujuan gagal',error.message,'coral');}}));
          } catch (error) { body.innerHTML=`<div class="panel"><div class="panel-body error-text">${esc(error.message)}</div></div>`; }
          return;
        }
        body.innerHTML = `<div class="panel"><div class="panel-body"><span class="spinner"></span> Memuat…</div></div>`;
        let data;
        try { data = await api(`${cfg.base}/${params.id}/${tab.sub}`); }
        catch (error) { body.innerHTML = `<div class="panel"><div class="panel-body error-text">${esc(error.message)}</div></div>`; return; }
        const canEdit = can(`${cfg.module}.edit`);
        const addBtn = canEdit && !tab.noAdd ? `<button class="btn primary sm" id="tabAdd">${ICONS.plus} Tambah</button>` : '';
        body.innerHTML = `<div class="panel table-panel"><header><div><p class="eyebrow">${esc(cfg.title.toUpperCase())}</p><h2>${esc(tab.label)}</h2></div><div class="panel-tools">${addBtn}</div></header>
          <div class="table-wrap"><table><thead><tr>${tab.cols.map((c) => `<th>${esc(c[1])}</th>`).join('')}${(tab.bankApprove || tab.costActivate || tab.employeeApprove) ? '<th></th>' : ''}</tr></thead>
          <tbody>${data.items.length ? data.items.map((row) => `<tr>${tab.cols.map((c) => `<td>${fmtCell(row, c)}</td>`).join('')}${tab.bankApprove ? `<td class="right">${row.verificationStatus !== 'VERIFIED' && can('supplier.approve') ? `<button class="btn secondary sm" data-approve-bank="${esc(row.id)}">Verifikasi</button>` : ''}</td>` : ''}${tab.employeeApprove ? `<td class="right">${['PENDING_APPROVAL','PENDING_VERIFICATION'].includes(row[tab.statusKey])&&can('employee.approve')?`<button class="btn secondary sm" data-employee-approve="${esc(row.id)}">Setujui</button>`:''}</td>`:''}${tab.costActivate ? `<td class="right">${['APPROVED','LOCKED'].includes(row.status) && can('product.approve') ? `<button class="btn secondary sm" data-activate-cost="${esc(row.id)}">Set Active HPP</button>` : ['DRAFT','REVIEW'].includes(row.status) && can('product.approve') ? `<button class="btn secondary sm" data-promote-cost="${esc(row.id)}" data-next="${row.status === 'DRAFT' ? 'review' : 'approve'}">${row.status === 'DRAFT' ? 'Ajukan review' : 'Setujui'}</button>` : ''}</td>` : ''}</tr>`).join('') : `<tr><td colspan="${tab.cols.length + 1}"><div class="empty-state">${clayOrb('blue','inbox')}<h3>Belum ada data</h3><p>Tambahkan entri pertama untuk ${esc(tab.label.toLowerCase())}.</p></div></td></tr>`}</tbody></table></div></div>`;

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
        body.querySelectorAll('[data-employee-approve]').forEach((b) => b.addEventListener('click', async () => {
          const answer=await actionDialog({title:'Setujui perubahan sensitif',description:'Maker dan checker harus berbeda. Keputusan tercatat pada audit trail.',requireReason:true,confirmLabel:'Setujui'});if(!answer)return;
          try { await api(`${cfg.base}/${params.id}/${tab.sub}/${b.dataset.employeeApprove}/approve`,{method:'POST',body:answer});toast('Perubahan disetujui');renderTab(tabId); }
          catch(error){toast('Persetujuan gagal',error.message,'coral');}
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

  // ── RFQ: perbandingan supplier + pilih + jadi PO (R017 §13.2) ─────────────
  const rfqCompare = {
    permission: 'rfq.view',
    async render(main, params, signal) {
      const [doc, quotesRes, suppliers] = await Promise.all([
        api(`/api/documents/${params.id}`, { signal }),
        api(`/api/rfq/${params.id}/quotes`, { signal }),
        can('rfq.edit') ? api('/api/suppliers?limit=200', { signal }) : Promise.resolve({ items: [] })
      ]);
      const quotes = quotesRes.items;
      const selected = quotes.find((q) => q.isSelected);
      main.innerHTML = pageHead({
        eyebrow: 'PENGADAAN · RFQ', title: doc.documentNumber, sub: esc(doc.title),
        actions: `<a class="btn secondary" href="#/procurement/rfq">${ICONS.arrow} Kembali</a>${selected && can('purchase_order.create') ? `<button class="btn primary" id="rfqToPo">${ICONS.cart} Jadikan PO</button>` : ''}${can('rfq.edit') ? `<button class="btn secondary" id="rfqAddQuote">${ICONS.plus} Tambah kuota</button>` : ''}`
      }) + `
        <section class="panel table-panel"><header><div><p class="eyebrow">PERBANDINGAN</p><h2>Kuota supplier</h2></div><span class="muted">Diurutkan dari landed cost terendah</span></header>
        <div class="table-wrap"><table>
          <thead><tr><th>Supplier</th><th class="right">Harga</th><th class="right">Pajak</th><th class="right">Ongkir</th><th class="right">Landed cost</th><th>Lead time</th><th>Skor</th><th></th></tr></thead>
          <tbody>${quotes.length ? quotes.map((q) => `<tr class="${q.isSelected ? 'row-selected' : ''}">
            <td><b>${esc(q.supplierName)}</b><small>${esc(q.supplierCode)}${q.recommended ? ' · <span class="chip mint">Rekomendasi</span>' : ''}${q.isSelected ? ' · <span class="chip blue">Terpilih</span>' : ''}</small></td>
            <td class="right money">${fmtIDR(q.priceTotal)}</td><td class="right">${fmtIDR(q.taxTotal)}</td><td class="right">${fmtIDR(q.freightTotal)}</td>
            <td class="right money">${fmtIDR(q.landedCost)}</td><td>${q.leadTimeDays ? q.leadTimeDays + ' hari' : '—'}</td>
            <td>${q.supplierScore ? '★ ' + Number(q.supplierScore).toFixed(0) : '—'}</td>
            <td class="right">${!q.isSelected && can('rfq.approve') ? `<button class="btn secondary sm" data-select-quote="${esc(q.id)}">Pilih</button>` : ''}</td></tr>`).join('')
            : `<tr><td colspan="8"><div class="empty-state">${clayOrb('blue','filter')}<h3>Belum ada kuota</h3><p>Tambahkan penawaran dari beberapa supplier untuk dibandingkan.</p></div></td></tr>`}</tbody>
        </table></div></section>`;

      main.querySelector('#rfqAddQuote')?.addEventListener('click', async () => {
        const value = await formDialog({ title: 'Tambah kuota supplier', description: 'Landed cost dihitung otomatis dari harga + pajak + ongkir.', fields: [
          { name: 'supplierId', label: 'Supplier', type: 'select', options: suppliers.items.map((s) => [s.id, `${s.code} · ${s.name}`]), required: true },
          { name: 'priceTotal', label: 'Total harga', type: 'number', min: 0, required: true },
          { name: 'taxTotal', label: 'Total pajak', type: 'number', min: 0 },
          { name: 'freightTotal', label: 'Ongkir', type: 'number', min: 0 },
          { name: 'leadTimeDays', label: 'Lead time (hari)', type: 'number', min: 0 },
          { name: 'paymentTerms', label: 'Termin pembayaran' },
          { name: 'qualityScore', label: 'Skor kualitas (1-5)', type: 'number', min: 1, max: 5 }
        ], submitLabel: 'Tambah kuota' });
        if (!value) return;
        try { await api(`/api/rfq/${params.id}/quotes`, { method: 'POST', body: value, idempotencyKey: newIdemKey() }); toast('Kuota ditambahkan'); this.render(main, params); }
        catch (error) { toast('Gagal menambah kuota', error.message, 'coral'); }
      });
      main.querySelectorAll('[data-select-quote]').forEach((b) => b.addEventListener('click', async () => {
        const answer = await actionDialog({ title: 'Pilih kuota supplier', description: 'Pemilihan dicatat pada audit trail beserta alasannya.', requireReason: true, confirmLabel: 'Pilih supplier ini' });
        if (!answer) return;
        try { await api(`/api/rfq/${params.id}/quotes/${b.dataset.selectQuote}/select`, { method: 'POST', body: { reason: answer.reason } }); toast('Supplier terpilih'); this.render(main, params); }
        catch (error) { toast('Gagal memilih', error.message, 'coral'); }
      }));
      main.querySelector('#rfqToPo')?.addEventListener('click', async () => {
        try { const res = await api(`/api/rfq/${params.id}/create-po`, { method: 'POST', body: {}, idempotencyKey: newIdemKey() }); toast(res.alreadyConverted ? 'PO sudah pernah dibuat' : 'PO dibuat', res.child.documentNumber); router.go(`#/doc/${res.child.id}`); }
        catch (error) { toast('Gagal membuat PO', error.message, 'coral'); }
      });
    }
  };

  // ── Payment proposal batch (R017 §13.6) ──────────────────────────────────
  const paymentProposalPage = {
    permission: 'payment_proposal.view',
    onEvent() { this._table?.reload(); },
    render(main) {
      main.innerHTML = pageHead({
        eyebrow: 'PENGADAAN · PEMBAYARAN', title: 'Usulan pembayaran', sub: 'Kumpulkan tagihan supplier disetujui yang jatuh tempo menjadi satu batch untuk persetujuan finance.',
        actions: can('payment_proposal.create') ? `<button class="btn primary" id="ppGenerate">${ICONS.plus} Buat usulan</button>` : ''
      }) + '<section id="ppTable"></section>';
      this._table = dataTable(main.querySelector('#ppTable'), {
        key: 'documents:PAYMENT_PROPOSAL', endpoint: '/api/documents', params: { type: 'PAYMENT_PROPOSAL' },
        title: 'Daftar usulan', eyebrow: 'BATCH', columns: [
          { label: 'Dokumen', render: docCell },
          { label: 'Total', right: true, render: (r) => `<span class="money">${fmtIDR(r.amount)}</span>` },
          { label: 'Tagihan', render: (r) => `${(r.payload && r.payload.count) || 0} item` },
          { label: 'Status', render: (r) => chip(r.status) },
          { label: 'Dibuat', render: (r) => relTime(r.createdAt) }
        ], onRow: (row, reload) => openDrawer(row.id, { onChange: reload }),
        empty: { icon: 'wallet', title: 'Belum ada usulan pembayaran' }
      });
      main.querySelector('#ppGenerate')?.addEventListener('click', async () => {
        const value = await formDialog({ title: 'Buat usulan pembayaran', description: 'Sistem mengumpulkan seluruh tagihan supplier berstatus disetujui yang jatuh tempo hingga tanggal berikut. Rekening belum terverifikasi otomatis ditahan.', fields: [{ name: 'dueBefore', label: 'Jatuh tempo hingga', type: 'date', required: true }], submitLabel: 'Buat usulan' });
        if (!value) return;
        try { const res = await api('/api/payment-proposals', { method: 'POST', body: value, idempotencyKey: newIdemKey() }); toast('Usulan dibuat', `${res.lineCount} tagihan, ${res.holdCount} ditahan`); invalidate('documents:PAYMENT_PROPOSAL'); this._table.reload(); }
        catch (error) { toast('Gagal membuat usulan', error.message, 'coral'); }
      });
    }
  };

  // ── Registrasi rute ───────────────────────────────────────────────────────
  const R = router.register.bind(router);
  R('/masters/:type/detail/:id', masterDetail);
  R('/dashboard', dashboard);
  R('/organization', organizationPage);
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
  R('/procurement/rfq', docListPage({ type: 'RFQ', module: 'rfq', title: 'RFQ & perbandingan supplier', eyebrow: 'PENGADAAN', createLabel: 'Buat RFQ',
    rowRoute: (row) => `#/procurement/rfq/${row.id}`,
    onCreate: async (reload) => {
      const value = await formDialog({ title: 'Buat RFQ', description: 'Setelah dibuat, tambahkan kuota dari beberapa supplier untuk dibandingkan.', fields: [{ name: 'title', label: 'Judul RFQ', required: true }], submitLabel: 'Buat RFQ' });
      if (!value) return;
      try { const doc = await api('/api/documents', { method: 'POST', body: { type: 'RFQ', title: value.title, amount: 0 }, idempotencyKey: newIdemKey() }); toast('RFQ dibuat', doc.documentNumber); router.go(`#/procurement/rfq/${doc.id}`); }
      catch (error) { toast('Gagal membuat RFQ', error.message, 'coral'); }
    } }));
  R('/procurement/rfq/:id', rfqCompare);
  R('/procurement/orders', docListPage({ type: 'PURCHASE_ORDER', module: 'purchase_order', title: 'Purchase order', eyebrow: 'PENGADAAN' }));
  R('/procurement/payment-proposals', paymentProposalPage);
  R('/warehouse/inventory', inventory);
  R('/warehouse/opname/:id', opnameDetail);
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
    ],
    rowRoute: (row) => `#/production/work-orders/${row.id}`
  }));
  R('/production/work-orders/:id', productionCockpit);
  R('/production/quality', docListPage({ type: 'QC_INSPECTION', module: 'quality', title: 'Quality control', eyebrow: 'PRODUKSI', rowRoute: (row) => `#/production/quality/${row.id}` }));
  R('/production/quality/:id', qcInspectionDetail);
  R('/production/mrp', mrpPage);

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
  R('/system/iam', iamGovernance);
  R('/system/sod', sodCenter);
  R('/system/approval-policies', approvalPolicies);
  R('/system/access-reviews', accessReviews);
  R('/system/access-reviews/:id', accessReviewDetail);
  R('/system/audit', auditPage);
  R('/system/monitoring', monitoring);
  R('/system/jobs', jobsPage);
  R('/system/selftest', selfTest);
  R('/system/settings', settings);
})();
