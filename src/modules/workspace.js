'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

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

  const R = router.register.bind(router);
  R('/dashboard', dashboard);
  R('/approvals', approvals);
  R('/notifications', notifications);
})();
