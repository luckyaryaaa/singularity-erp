'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey , asList } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  const DASHBOARD_PREFS_KEY = 'mat.dashboard.preferences.v1';
  const dashboardPreferenceKey = () => `${DASHBOARD_PREFS_KEY}:${state.user?.id || state.user?.username || 'user'}`;
  const clampScore = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const dashboardPreferences = () => {
    try {
      return { insights: true, analytics: true, jobs: true, ...JSON.parse(localStorage.getItem(dashboardPreferenceKey()) || '{}') };
    } catch { return { insights: true, analytics: true, jobs: true }; }
  };
  const dashboardScores = (data) => {
    const k = data.kpi, h = data.health, attention = data.attention;
    const overduePressure = Number(h.arTotal || 0) > 0 ? Number(k.arOverdue || 0) / Number(h.arTotal) * 28 : 0;
    const target = Math.max(Number(k.utilizationTarget || 0), 1);
    return {
      sales: clampScore(76 + Math.max(-18, Math.min(18, Number(k.revenueGrowthPct || 0)))),
      finance: clampScore(88 - overduePressure - (h.cashPosition == null ? 8 : Number(h.cashPosition) < 0 ? 24 : 0)),
      operations: clampScore(Number(k.utilizationPct || 0) / target * 100),
      control: clampScore(100 - Number(attention.pendingApprovals || 0) * 2.5 - Number(h.criticalStock || 0) * 4)
    };
  };
  const dashboardInsights = (data, grant) => {
    const k = data.kpi, h = data.health, items = [];
    if (grant.revenue && k.revenueGrowthPct != null) items.push({
      tone: Number(k.revenueGrowthPct) >= 0 ? 'mint' : 'coral', icon: 'trend', label: Number(k.revenueGrowthPct) >= 0 ? 'Peluang' : 'Perlu perhatian',
      title: `Pendapatan ${Number(k.revenueGrowthPct) >= 0 ? 'bertumbuh' : 'menurun'} ${Math.abs(Number(k.revenueGrowthPct)).toLocaleString('id-ID')}%`,
      detail: Number(k.revenueGrowthPct) >= 0 ? 'Pertahankan momentum dan periksa kontribusi pelanggan terbesar.' : 'Tinjau pipeline serta quotation yang belum dikonversi.', href: '#/reports'
    });
    if (grant.revenue && Number(k.arOverdueCount || 0) > 0) items.push({ tone: 'amber', icon: 'wallet', label: 'Risiko kas', title: `${k.arOverdueCount} invoice melewati jatuh tempo`, detail: `Eksposur ${fmtIDR(k.arOverdue)} perlu diprioritaskan oleh tim penagihan.`, href: '#/finance/invoices' });
    if (grant.inventory && Number(h.criticalStock || 0) > 0) items.push({ tone: 'coral', icon: 'box', label: 'Risiko pasokan', title: `${h.criticalStock} stok berada pada level kritis`, detail: 'Periksa kebutuhan produksi dan rencana pengadaan sebelum terjadi kekurangan.', href: '#/warehouse/inventory' });
    const gap = Number(k.utilizationTarget || 0) - Number(k.utilizationPct || 0);
    if (gap > 0) items.push({ tone: gap > 15 ? 'coral' : 'lavender', icon: 'factory', label: 'Operasional', title: `Utilisasi ${gap.toLocaleString('id-ID')} poin di bawah target`, detail: 'Tinjau antrean work order, kapasitas, dan hambatan produksi aktif.', href: '#/production/work-orders' });
    return items.slice(0, 3);
  };
  const dashboardSkeleton = () => `<section class="decision-skeleton" aria-label="Memuat dashboard" aria-busy="true"><div class="skeleton decision-skeleton-bar"></div><div class="skeleton decision-skeleton-hero"></div><div class="decision-skeleton-grid">${Array.from({ length: 4 }, () => '<div class="skeleton"></div>').join('')}</div></section>`;

  const dashboard = {
    permission: 'dashboard.view',
    onEvent() { this.render(document.getElementById('main')); },
    // SATU dashboard — tanpa tab. Analitik eksekutif menyatu langsung di sini
    // agar pengguna tidak perlu memilih "ringkasan" vs "cockpit". Pengguna
    // tanpa izin report.view tetap mendapat ringkasan operasional sebagai
    // pengganti blok analitik.
    // Tanda tangan wajib (main, params, signal) — router memanggil dengan 3 argumen.
    async render(main, _params, signal) {
      return this.renderOverview(main, signal);
    },
    async renderOverview(main, signal) {
      main.innerHTML = dashboardSkeleton();
      const rich = can('report.view') && window.MAT_PAGES && window.MAT_PAGES.cockpit;
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

      // Hero eksekutif: satu angka utama + konteks, gaya cockpit enterprise.
      // Kartu hanya dirender bila server memberi entitlement-nya — data yang
      // tidak berhak memang TIDAK ADA di respons, jadi jangan pura-pura nol.
      const grant = data.entitlements || {};
      const prefs = dashboardPreferences();
      const scores = dashboardScores(data);
      const scoreEntries = [
        ['Sales', scores.sales, 'blue'], ['Keuangan', scores.finance, 'mint'],
        ['Operasi', scores.operations, 'lavender'], ['Kontrol', scores.control, 'amber']
      ];
      const overallScore = clampScore(scoreEntries.reduce((total, entry) => total + entry[1], 0) / scoreEntries.length);
      const insights = dashboardInsights(data, grant);
      const urgentCount = Number(data.attention.pendingApprovals || 0) + Number(k.arOverdueCount || 0) + Number(h.criticalStock || 0);
      const summary = urgentCount
        ? `Kinerja bisnis berada pada skor ${overallScore}%. Ada ${urgentCount} isu yang perlu diprioritaskan hari ini.`
        : `Kinerja bisnis berada pada skor ${overallScore}%. Seluruh indikator utama dalam kondisi terkendali.`;
      const priorities = [
        data.attention.pendingApprovals ? { tone: data.attention.slaRisk ? 'coral' : 'amber', label: 'Persetujuan', value: `${data.attention.pendingApprovals} keputusan`, detail: `${fmtIDR(data.attention.pendingAmount)} menunggu keputusan`, href: '#/approvals', action: 'Tinjau' } : null,
        grant.revenue && k.arOverdueCount ? { tone: 'amber', label: 'Piutang', value: `${k.arOverdueCount} invoice`, detail: `${fmtIDR(k.arOverdue)} melewati jatuh tempo`, href: '#/finance/invoices', action: 'Tagih' } : null,
        grant.inventory && h.criticalStock ? { tone: 'coral', label: 'Persediaan', value: `${h.criticalStock} stok kritis`, detail: 'Berpotensi menghambat pemenuhan order', href: '#/warehouse/inventory', action: 'Periksa' } : null,
        k.inProduction ? { tone: 'lavender', label: 'Produksi', value: `${k.inProduction} pekerjaan`, detail: `${k.utilizationPct}% utilisasi dari target ${k.utilizationTarget}%`, href: '#/production/work-orders', action: 'Pantau' } : null
      ].filter(Boolean).slice(0, 4);
      // Pertumbuhan null berarti bulan lalu nihil — tidak ada dasar pembanding.
      const growthNote = k.revenueGrowthPct == null ? 'Belum ada pembanding bulan lalu' : `${Number(k.revenueGrowthPct) >= 0 ? '↑' : '↓'} ${Math.abs(k.revenueGrowthPct)}% dari bulan lalu`;
      main.innerHTML = `
        <section class="decision-context" aria-label="Konteks dashboard">
          <div class="decision-context-copy"><span class="decision-live"><i></i> Data operasional aktif</span><b>${esc(state.user.branchName || 'Seluruh perusahaan')}</b><small>Diperbarui ${fmtDateTime(data.asOf)}</small></div>
          <div class="decision-context-actions">
            <button class="btn ghost sm" id="dashCustomize">${ICONS.settings || ICONS.monitor} Atur dashboard</button>
            <button class="icon-btn" id="dashRefresh" aria-label="Segarkan dashboard" title="Segarkan dashboard">${ICONS.refresh}</button>
            ${can('quotation.create') ? `<a class="btn primary sm" href="#/sales/quotations/new">${ICONS.plus} Buat penawaran</a>` : ''}
          </div>
        </section>
        <section class="hero-exec decision-hero">
          <div class="decision-aurora" aria-hidden="true"></div>
          <div class="decision-hero-copy">
            <div class="decision-kicker"><span>${today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</span><i></i><span>DECISION COCKPIT</span></div>
            <h1>${greet}, ${esc(firstName)}.</h1>
            <p class="decision-summary">${esc(summary)}</p>
            <div class="decision-hero-actions">
              <a class="btn light" href="${priorities[0]?.href || '#/reports'}">${priorities.length ? 'Lihat prioritas' : 'Lihat laporan'} ${ICONS.arrow}</a>
              <span class="decision-assurance">${ICONS.shield} Scope dan hak akses Anda aktif</span>
            </div>
          </div>
          <div class="business-pulse" role="img" title="Skor komposit operasional berbasis KPI pada scope aktif; bukan angka akuntansi." aria-label="Skor kesehatan bisnis ${overallScore} persen. Sales ${scores.sales}, keuangan ${scores.finance}, operasi ${scores.operations}, kontrol ${scores.control}.">
            <div class="pulse-orbit orbit-a" aria-hidden="true"></div><div class="pulse-orbit orbit-b" aria-hidden="true"></div>
            <div class="pulse-core"><span>Business pulse</span><strong>${overallScore}</strong><small>${overallScore >= 85 ? 'Sangat sehat' : overallScore >= 70 ? 'Stabil' : 'Perlu fokus'}</small></div>
            ${scoreEntries.map(([label, score, tone], index) => `<span class="pulse-node pulse-node-${index + 1} ${tone}" title="${esc(label)} ${score}%"><i></i><b>${esc(label)}</b><small>${score}%</small></span>`).join('')}
          </div>
        </section>
        <section class="decision-kpis" aria-label="Indikator utama">
          ${grant.revenue ? `<a class="decision-kpi blue" href="#/reports"><span>${ICONS.chart}</span><div><small>Pendapatan ${esc(monthName)}</small><strong>${fmtIDR(k.revenueMonth)}</strong><em class="${k.revenueGrowthPct != null && Number(k.revenueGrowthPct) < 0 ? 'down' : 'up'}">${growthNote}</em></div></a>` : ''}
          ${grant.cash ? `<a class="decision-kpi mint" href="#/accounting"><span>${ICONS.ledger}</span><div><small>Kas & bank</small><strong>${h.cashPosition == null ? 'Belum diatur' : fmtIDR(h.cashPosition)}</strong><em>${h.cashPosition == null ? 'Konfigurasi akun kas diperlukan' : 'Posisi terkini'}</em></div></a>` : ''}
          <a class="decision-kpi lavender" href="#/production/work-orders"><span>${ICONS.cart}</span><div><small>Order book</small><strong>${fmtIDR(h.orderBook)}</strong><em>${k.activeOrders} order aktif</em></div></a>
          <a class="decision-kpi amber" href="#/production/work-orders"><span>${ICONS.factory}</span><div><small>Delivery readiness</small><strong>${k.utilizationPct}%</strong><em>Target operasi ${k.utilizationTarget}%</em></div></a>
        </section>
        <section class="decision-priority-layout">
          <article class="panel decision-priority">
            <header><div><p class="eyebrow">PRIORITY INBOX</p><h2>Keputusan hari ini</h2><p>Diurutkan berdasarkan urgensi dan dampak bisnis.</p></div><span class="chip ${priorities.length ? 'amber' : 'mint'}">${priorities.length} prioritas</span></header>
            <div class="decision-priority-list">${priorities.map((item, index) => `<a href="${item.href}" class="decision-priority-item ${item.tone}"><span class="priority-rank">${String(index + 1).padStart(2, '0')}</span><span><small>${esc(item.label)}</small><b>${esc(item.value)}</b><em>${esc(item.detail)}</em></span><strong>${esc(item.action)} ${ICONS.arrow}</strong></a>`).join('') || `<div class="decision-clear">${clayOrb('mint', 'check')}<span><b>Semua indikator terkendali</b><small>Tidak ada tindakan prioritas pada scope Anda.</small></span></div>`}</div>
          </article>
          <article class="panel decision-snapshot">
            <header><div><p class="eyebrow">BUSINESS SNAPSHOT</p><h2>Posisi terkini</h2></div><a class="text-btn" href="#/reports">Detail ${ICONS.arrow}</a></header>
            <div class="decision-snapshot-grid">
              ${grant.revenue ? `<div><span class="health-icon blue">${ICONS.wallet}</span><small>Piutang</small><b>${fmtIDR(h.arTotal)}</b><em>${h.arCount} invoice terbuka</em></div>` : ''}
              ${grant.payable ? `<div><span class="health-icon amber">${ICONS.doc}</span><small>Utang</small><b>${fmtIDR(h.apTotal)}</b><em>${h.apCount} tagihan supplier</em></div>` : ''}
              ${grant.inventory ? `<div><span class="health-icon mint">${ICONS.box}</span><small>Persediaan</small><b>${fmtIDR(h.inventoryValue)}</b><em>${h.skuCount} SKU aktif</em></div>` : ''}
              <div><span class="health-icon lavender">${ICONS.project}</span><small>Pekerjaan</small><b>${h.orderCount}</b><em>Order aktif</em></div>
            </div>
          </article>
        </section>
        <section class="decision-insights ${prefs.insights ? '' : 'widget-hidden'}" data-dashboard-widget="insights">
          <div class="decision-section-heading"><div><p class="eyebrow">SMART SIGNALS</p><h2>Insight yang dapat ditindaklanjuti</h2></div><span>Berbasis KPI dan rule bisnis yang dapat ditelusuri</span></div>
          <div class="decision-insight-grid">${insights.map((item) => `<a class="decision-insight ${item.tone}" href="${item.href}"><span>${ICONS[item.icon] || ICONS.chart}</span><div><small>${esc(item.label)}</small><h3>${esc(item.title)}</h3><p>${esc(item.detail)}</p><b>Buka sumber ${ICONS.arrow}</b></div></a>`).join('') || `<div class="decision-insight mint"><span>${ICONS.check}</span><div><small>TERKENDALI</small><h3>Tidak ada anomali utama</h3><p>Indikator pada scope Anda berada dalam rentang operasional.</p></div></div>`}</div>
        </section>
        <div id="dashAnalytics" class="${prefs.analytics ? '' : 'widget-hidden'}" data-dashboard-widget="analytics"></div>
        ${rich ? '' : `
        <section class="decision-fallback-detail">
          ${!grant.revenue ? '' : `
          <article class="panel revenue-panel">
            <header><div><p class="eyebrow">KINERJA KEUANGAN</p><h2>Arus pendapatan</h2></div>
              <div class="legend"><span><i></i>Kumulatif ${monthName}</span></div></header>
            <div class="chart-summary"><div><span>Pendapatan bulan ini</span><strong>${fmtIDR(k.revenueMonth)}</strong>
              <small class="up">${ICONS.trend} ${growthNote}</small></div></div>
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
          </article>`}
        </section>`}
        <section class="panel work-panel decision-work ${prefs.jobs ? '' : 'widget-hidden'}" data-dashboard-widget="jobs">
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

      const shell = () => dashboard.render(document.getElementById('main'));
      main.querySelector('#dashRefresh').addEventListener('click', async (e) => {
        const btn = e.currentTarget; btn.disabled = true;
        invalidate('dashboard');
        await shell();
        toast('Data disegarkan', 'Ringkasan terbaru sudah ditampilkan.');
      });
      main.querySelector('#dashCustomize')?.addEventListener('click', async () => {
        const value = await formDialog({
          title: 'Atur dashboard', description: 'Pilih blok yang paling relevan untuk ruang kerja Anda.', submitLabel: 'Simpan tampilan', initial: prefs,
          fields: [
            { name: 'insights', label: 'Tampilkan smart signals', type: 'checkbox' },
            { name: 'analytics', label: 'Tampilkan analitik eksekutif', type: 'checkbox' },
            { name: 'jobs', label: 'Tampilkan pekerjaan aktif', type: 'checkbox' }
          ]
        });
        if (!value) return;
        localStorage.setItem(dashboardPreferenceKey(), JSON.stringify(value));
        toast('Dashboard diperbarui', 'Preferensi tampilan tersimpan pada perangkat ini.');
        shell();
      });
      main.querySelectorAll('[data-doc]').forEach((tr) => {
        const open = () => openDrawer(tr.dataset.doc, { onChange: () => { invalidate('dashboard'); shell(); } });
        tr.addEventListener('click', open);
        tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      });
      // Blok analitik eksekutif dirender in-place — satu layar, bukan tab
      // terpisah. Kegagalan analitik tidak boleh mematikan seluruh dashboard.
      const slot = main.querySelector('#dashAnalytics');
      if (rich && slot && prefs.analytics) {
        try { await window.MAT_PAGES.cockpit.render(slot, signal); }
        catch (error) {
          if (error?.name === 'AbortError') return;
          slot.innerHTML = `<section class="panel"><div class="panel-body error-text">Analitik eksekutif gagal dimuat: ${esc(error.message)}</div></section>`;
        }
      }
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
      const prefs = await query('notif-prefs', () => api('/api/notifications/preferences'), { staleMs: 60_000 });
      const catIcon = { ACTION_REQUIRED: 'bell', WARNING: 'alert', INFORMATION: 'doc', SUCCESS: 'check', SYSTEM_ALERT: 'monitor' };
      const catTone = { ACTION_REQUIRED: 'amber', WARNING: 'coral', INFORMATION: 'blue', SUCCESS: 'mint', SYSTEM_ALERT: 'coral' };
      const catLabel = { ACTION_REQUIRED: 'Perlu tindakan', WARNING: 'Peringatan', INFORMATION: 'Informasi', SUCCESS: 'Sukses', SYSTEM_ALERT: 'Peringatan sistem' };
      main.innerHTML = pageHead({
        eyebrow: 'PUSAT NOTIFIKASI', title: 'Notifikasi',
        sub: `${data.unread} belum dibaca dari ${data.items.length} notifikasi terakhir${data.actionRequired ? ` · ${data.actionRequired} menuntut tindakan Anda` : ''}.`,
        actions: data.unread ? `<button class="btn secondary" id="readAll">${ICONS.check} Tandai semua dibaca</button>` : ''
      }) + `
        <details class="panel notif-prefs">
          <summary><b>Preferensi notifikasi</b> — pilih kategori yang tampil di sini dan yang dikirim via email</summary>
          <div class="table-wrap"><table>
            <thead><tr><th>Kategori</th><th>Tampilkan in-app</th><th>Email</th></tr></thead>
            <tbody>${prefs.items.map((p) => `<tr>
              <td>${chip(p.category)} <small>${esc(catLabel[p.category] || p.category)}</small></td>
              <td><label class="switch"><input type="checkbox" data-show="${p.category}" ${p.muted ? '' : 'checked'} ${p.category === 'SYSTEM_ALERT' ? 'disabled' : ''}> <span>${p.category === 'SYSTEM_ALERT' ? 'Selalu' : (p.muted ? 'Disembunyikan' : 'Tampil')}</span></label></td>
              <td><label class="switch"><input type="checkbox" data-email="${p.category}" ${p.emailEnabled ? 'checked' : ''}> <span>${p.emailEnabled ? 'Aktif' : 'Nonaktif'}</span></label></td></tr>`).join('')}</tbody>
          </table></div>
        </details>
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
      main.querySelectorAll('[data-show],[data-email]').forEach((el) => el.addEventListener('change', async () => {
        const category = el.dataset.show || el.dataset.email;
        const showEl = main.querySelector(`[data-show="${category}"]`);
        const emailEl = main.querySelector(`[data-email="${category}"]`);
        try {
          await api('/api/notifications/preferences', { method: 'POST', body: {
            category, muted: showEl ? !showEl.checked : false, emailEnabled: emailEl ? emailEl.checked : false } });
          invalidate('notif-prefs'); invalidate('notifications'); window.MAT.refreshBadge(); this.render(main);
        } catch (error) { el.checked = !el.checked; window.UI.toast?.('Gagal menyimpan preferensi', error.message, 'coral'); }
      }));
    }
  };

  // ── Wizard penawaran (form kompleks bertahap) ─────────────────────────────

  const R = router.register.bind(router);
  R('/dashboard', dashboard);
  R('/approvals', approvals);
  R('/notifications', notifications);
})();
