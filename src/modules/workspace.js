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
      return { jobs: true, ...JSON.parse(localStorage.getItem(dashboardPreferenceKey()) || '{}') };
    } catch { return { jobs: true }; }
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
  // ── Aktivitas terbaru (jejak audit) — verba + tone + avatar inisial ──────────
  const ACT_VERB = { CREATE: 'Membuat', UPDATE: 'Memperbarui', DELETE: 'Menghapus', APPROVE: 'Menyetujui', REJECT: 'Menolak', SUBMIT: 'Mengajukan', CANCEL: 'Membatalkan', VOID: 'Membatalkan', POST: 'Memposting', CONVERT: 'Mengonversi', LOGIN: 'Masuk', LOGOUT: 'Keluar', ONBOARD_TENANT: 'Onboarding', TENANT_STATUS: 'Ubah status' };
  const ACT_TONE = { CREATE: 'mint', APPROVE: 'mint', POST: 'mint', SUBMIT: 'blue', UPDATE: 'blue', CONVERT: 'blue', DELETE: 'coral', REJECT: 'coral', VOID: 'coral', CANCEL: 'coral' };
  const ENTITY_LABEL = { USER_PROFILE: 'profil pengguna', TENANT: 'tenant', INVOICE: 'invoice', SALES_ORDER: 'sales order', WORK_ORDER: 'work order', QUOTATION: 'penawaran', SUPPLIER_INVOICE: 'tagihan supplier', PAYMENT: 'pembayaran', RECEIPT: 'penerimaan', DELIVERY_ORDER: 'surat jalan', PURCHASE_ORDER: 'purchase order' };
  const dxInitials = (name) => String(name || '?').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const dxActText = (a) => {
    const verb = ACT_VERB[a.action] || (a.action ? a.action.charAt(0) + a.action.slice(1).toLowerCase().replace(/_/g, ' ') : 'Aktivitas');
    const ent = ENTITY_LABEL[a.entityType] || String(a.entityType || '').toLowerCase().replace(/_/g, ' ');
    return `${verb} ${ent}${a.documentNumber ? ` ${a.documentNumber}` : ''}`.trim();
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
      const data = await query('dashboard', () => api('/api/dashboard', { signal }), { staleMs: 30_000 });
      const hour = new Date().getHours();
      const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 19 ? 'Selamat sore' : 'Selamat malam';
      const firstName = state.user.displayName.split(' ')[0];
      const k = data.kpi; const h = data.health;

      // Grafik pendapatan kumulatif bulan berjalan.
      const series = data.revenueSeries;
      const hasRevenue = series.some((p) => Number(p.value) > 0);
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
      // ── Prototype-style KPI helpers (sparkline + trend badge), data ERP nyata ──
      const dxSpark = (vals, tone = 'blue') => {
        let a = (Array.isArray(vals) && vals.length > 1) ? vals.map((v) => Number(v) || 0) : [4, 6, 5, 8, 7, 9, 8, 11];
        const mx = Math.max(...a), mn = Math.min(...a), W = 92, H = 30, R = (mx - mn) || 1;
        const pts = a.map((v, i) => [i * (W / (a.length - 1)), H - 3 - ((v - mn) / R) * (H - 8)]);
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
        return `<svg class="dx-spark ${tone}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="dx-spark-a" d="${d} L${W},${H} L0,${H}Z"/><path class="dx-spark-l" d="${d}"/></svg>`;
      };
      const dxTrend = (pct) => pct == null ? '' : `<em class="dx-trend ${Number(pct) >= 0 ? 'up' : 'down'}">${Number(pct) >= 0 ? '▲' : '▼'} ${Math.abs(Number(pct)).toLocaleString('id-ID')}%</em>`;
      // Gauge ring modern — CSP-safe (atribut presentasi SVG, bukan inline style).
      const dxGauge = (pct, tone, center, sub) => {
        const v = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
        const R = 42, C = 2 * Math.PI * R, off = (C * (1 - v / 100)).toFixed(1);
        return `<svg class="dx-gauge ${tone}" viewBox="0 0 110 110" role="img" aria-label="${esc(center)}"><circle class="dx-gauge-track" cx="55" cy="55" r="${R}"/><circle class="dx-gauge-arc" cx="55" cy="55" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off}" transform="rotate(-90 55 55)"/><text class="dx-gauge-c" x="55" y="52">${esc(center)}</text><text class="dx-gauge-s" x="55" y="72">${esc(sub)}</text></svg>`;
      };
      const sparkVals = (series && series.length) ? series.map((p) => Number(p.value) || 0) : null;
      const kpiCards = [
        grant.revenue && { t: 'blue', ic: ICONS.chart, l: `Pendapatan ${monthName}`, v: fmtIDR(k.revenueMonth), tr: k.revenueGrowthPct, sp: sparkVals, href: '#/reports' },
        grant.revenue && { t: 'violet', ic: ICONS.wallet, l: 'Piutang usaha', v: fmtIDR(h.arTotal), s: `${h.arCount || 0} invoice · ${k.arOverdueCount || 0} lewat tempo`, href: '#/finance/invoices' },
        grant.payable && { t: 'amber', ic: ICONS.doc, l: 'Utang usaha', v: fmtIDR(h.apTotal), s: `${h.apCount || 0} tagihan supplier`, href: '#/finance' },
        { t: 'indigo', ic: ICONS.cart, l: 'Order book', v: fmtIDR(h.orderBook), s: `${h.orderCount || k.activeOrders || 0} order aktif`, href: '#/production/work-orders' },
        { t: 'emerald', ic: ICONS.factory, l: 'Efisiensi produksi', v: `${k.utilizationPct || 0}%`, s: `Target ${k.utilizationTarget || 0}%`, href: '#/production/work-orders' },
        grant.cash ? { t: 'sky', ic: ICONS.ledger, l: 'Kas & bank', v: h.cashPosition == null ? '—' : fmtIDR(h.cashPosition), s: h.cashPosition == null ? 'Perlu konfigurasi' : 'Posisi terkini', href: '#/accounting' }
          : (grant.inventory && { t: 'rose', ic: ICONS.box, l: 'Nilai persediaan', v: fmtIDR(h.inventoryValue), s: `${h.skuCount || 0} SKU aktif`, href: '#/warehouse/inventory' })
      ].filter(Boolean).slice(0, 6);
      main.innerHTML = `
        <section class="decision-context" aria-label="Konteks dashboard">
          <div class="decision-context-copy"><span class="decision-live"><i></i> Data operasional aktif</span><b>${esc(state.user.branchName || 'Seluruh perusahaan')}</b><small>Diperbarui ${fmtDateTime(data.asOf)}</small></div>
          <div class="decision-context-actions">
            <button class="btn ghost sm" id="dashCustomize">${ICONS.settings || ICONS.monitor} Atur dashboard</button>
            <button class="icon-btn" id="dashRefresh" aria-label="Segarkan dashboard" title="Segarkan dashboard">${ICONS.refresh}</button>
            ${can('quotation.create') ? `<a class="btn primary sm" href="#/sales/quotations/new">${ICONS.plus} Buat penawaran</a>` : ''}
          </div>
        </section>
        <section class="cmd-hero">
          <div class="cmd-hero-main">
            <div class="cmd-eyebrow"><i class="live-dot"></i> EXECUTIVE COMMAND CENTER · ${esc(monthName).toUpperCase()} ${today.getFullYear()}</div>
            <h1>Sekilas bisnis Anda.</h1>
            <p>Pantau kesehatan finansial, eksekusi operasional, dan kinerja organisasi dalam satu layar.</p>
            <div class="ai-strip"><span class="ai-badge">${ICONS.chart}</span><div><strong>Singularity Intelligence</strong> <span>${esc(summary)}</span></div></div>
            <div class="cmd-actions">
              <a class="cmd-btn primary" href="#/reports">${ICONS.chart} Command center</a>
              <a class="cmd-btn" href="#/reports">${ICONS.doc} Laporan</a>
              ${can('quotation.create') ? `<a class="cmd-btn" href="#/sales/quotations/new">${ICONS.plus} Penawaran</a>` : ''}
            </div>
          </div>
          <div class="hero-metrics">
            <div class="hero-metric"><span>Skor bisnis</span><strong>${overallScore}%</strong><small class="${overallScore >= 70 ? 'up' : 'warn'}">${overallScore >= 85 ? 'Sangat sehat' : overallScore >= 70 ? 'Stabil' : 'Perlu fokus'}</small></div>
            <div class="hero-metric"><span>Kas &amp; bank</span><strong>${!grant.cash || h.cashPosition == null ? '—' : fmtIDR(h.cashPosition)}</strong><small>Posisi terkini</small></div>
            <div class="hero-metric"><span>Pendapatan</span><strong>${grant.revenue ? fmtIDR(k.revenueMonth) : '—'}</strong><small class="${k.revenueGrowthPct != null && Number(k.revenueGrowthPct) < 0 ? 'down' : 'up'}">${k.revenueGrowthPct != null ? `${Number(k.revenueGrowthPct) >= 0 ? '↑' : '↓'} ${Math.abs(k.revenueGrowthPct)}%` : '—'}</small></div>
          </div>
        </section>
        <section class="dx-greet"><div><h2>${greet}, ${esc(firstName)} 👋</h2><p>Ringkasan yang terjadi di organisasi Anda hari ini.</p></div><span class="date-chip">${today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}&nbsp;&nbsp;·&nbsp;&nbsp;Bulan ini</span></section>
        <section class="dx-kpis" aria-label="Indikator utama">
          ${kpiCards.map((c) => `<a class="dx-kpi ${c.t}" href="${c.href}"><div class="dx-kpi-top"><span class="dx-kpi-ic">${c.ic}</span>${dxSpark(c.sp, c.t)}</div><small>${esc(c.l)}</small><b>${c.v}</b>${c.tr != null ? dxTrend(c.tr) : `<em class="dx-kpi-sub">${esc(c.s || '')}</em>`}</a>`).join('')}
        </section>
        <section class="dx-panels">
          <article class="panel dx-panel dx-chart-panel">
            <header><div><p class="eyebrow">KINERJA KEUANGAN</p><h2>Arus pendapatan ${esc(monthName)}</h2></div><div class="dx-chart-tag"><b>${fmtIDR(k.revenueMonth)}</b>${dxTrend(k.revenueGrowthPct)}</div></header>
            <div class="dx-chart" role="img" aria-label="Grafik pendapatan kumulatif bulan berjalan.">
              ${hasRevenue ? `<svg viewBox="0 0 ${w} ${hgt}" preserveAspectRatio="none">
                <defs><linearGradient id="dxarea" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#2563eb" stop-opacity=".16"/><stop offset="1" stop-color="#2563eb" stop-opacity="0"/></linearGradient></defs>
                ${[30, 60, 90, 120].map((y) => `<path class="dx-grid" d="M${pad} ${y}H${w - pad}"/>`).join('')}
                <path class="dx-area" d="${line} L${coords.at(-1)[0]},${hgt - 12} L${pad},${hgt - 12}Z"/>
                <path class="dx-line" d="${line}"/>
                <circle class="dx-dot" cx="${coords.at(-1)[0]}" cy="${coords.at(-1)[1]}" r="4"/>
              </svg>` : `<div class="dx-chart-empty">${clayOrb('blue', 'chart')}<span>Belum ada pendapatan tercatat untuk ${esc(monthName)}. Grafik muncul begitu invoice pertama diposting.</span></div>`}
            </div>
          </article>
          <article class="panel dx-panel dx-attn-panel">
            <header><div><p class="eyebrow">PERHATIAN OPERASIONAL</p><h2>Perlu tindakan</h2></div><span class="chip ${priorities.length ? 'amber' : 'mint'}">${priorities.length} item</span></header>
            <div class="dx-attn-list">${priorities.map((item) => `<a href="${item.href}" class="dx-attn-row ${item.tone}"><span class="dx-attn-dot"></span><span class="dx-attn-main"><b>${esc(item.value)}</b><small>${esc(item.label)} · ${esc(item.detail)}</small></span><span class="dx-attn-go">${esc(item.action)} ${ICONS.arrow}</span></a>`).join('') || `<div class="dx-clear">${clayOrb('mint', 'check')}<span><b>Semua terkendali</b><small>Tidak ada tindakan prioritas pada scope Anda.</small></span></div>`}</div>
          </article>
        </section>
        <section class="dx-sec">
          <div class="dx-sec-title"><h2>Pipeline transaksi</h2><span>Alur bisnis end-to-end</span></div>
          <article class="panel dx-panel"><div class="dx-pipeline">${(data.pipeline || []).map((s, i) => `${i ? '<div class="dx-pipe"></div>' : ''}<div class="dx-stage"><div class="dx-stage-num ${Number(s.count) > 0 ? 'has' : ''}">${s.count}</div><div class="dx-stage-name">${esc(s.label)}</div></div>`).join('')}</div></article>
        </section>
        <section class="dx-sec3">
          <article class="panel dx-panel">
            <header><div><p class="eyebrow">BUSINESS HEALTH</p><h2>Sinyal operasi eksekutif</h2></div><span class="chip ${overallScore >= 70 ? 'mint' : 'amber'}">${overallScore >= 85 ? 'Sangat sehat' : overallScore >= 70 ? 'Stabil' : 'Perlu fokus'}</span></header>
            <div class="dx-metric-body">
              ${dxGauge(overallScore, overallScore >= 70 ? 'mint' : 'amber', String(overallScore), 'Komposit')}
              <div class="dx-health-bars">${[['Keuangan', scores.finance], ['Operasi', scores.operations], ['Penjualan', scores.sales], ['Kontrol', scores.control]].map(([l, v]) => `<div class="dx-hb"><div class="dx-hb-top"><b>${esc(l)}</b><span>${v}%</span></div>${progressBar(v)}</div>`).join('')}</div>
            </div>
          </article>
          <article class="panel dx-panel">
            <header><div><p class="eyebrow">PRODUCTION OVERVIEW</p><h2>Kapasitas operasional</h2></div><span class="chip blue">${k.utilizationPct || 0}%</span></header>
            <div class="dx-metric-body">
              ${dxGauge(k.utilizationPct || 0, 'blue', `${k.utilizationPct || 0}%`, 'Utilisasi')}
              <div class="dx-prod">${[['Utilisasi produksi', k.utilizationPct || 0], ['Capaian vs target', Math.min(100, Math.round((k.utilizationPct || 0) / (k.utilizationTarget || 82) * 100))], ['Pekerjaan aktif (relatif)', Math.min(100, (k.inProduction || 0) * 12)], ['Tenaga kerja aktif', data.workforce && data.workforce.total ? Math.round(data.workforce.active / data.workforce.total * 100) : 0]].map(([l, v]) => `<div class="dx-hb"><div class="dx-hb-top"><b>${esc(l)}</b><span>${v}%</span></div>${progressBar(v)}</div>`).join('')}</div>
            </div>
          </article>
        </section>
        <section class="dx-sec">
          <div class="dx-sec-title"><h2>Aksi cepat</h2><span>Pintasan kerja Anda</span></div>
          <div class="dx-quick">${can('quotation.create') ? `<a class="dx-quick-btn" href="#/sales/quotations/new"><span class="dx-quick-ic">${ICONS.plus}</span>Buat penawaran</a>` : ''}<a class="dx-quick-btn" href="#/approvals"><span class="dx-quick-ic">${ICONS.check}</span>Persetujuan</a><a class="dx-quick-btn" href="#/finance/invoices"><span class="dx-quick-ic">${ICONS.wallet}</span>Invoice</a><a class="dx-quick-btn" href="#/production/work-orders"><span class="dx-quick-ic">${ICONS.factory}</span>Work order</a><a class="dx-quick-btn" href="#/reports"><span class="dx-quick-ic">${ICONS.chart}</span>Laporan</a><a class="dx-quick-btn" href="#/warehouse/inventory"><span class="dx-quick-ic">${ICONS.box}</span>Inventory</a></div>
        </section>
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
        </section>
        <section class="dx-sec">
          <div class="dx-sec-title"><h2>Aktivitas terbaru</h2><span>Jejak audit organisasi</span></div>
          <article class="panel dx-panel">
            <ul class="dx-activity">${(data.recentActivity || []).map((a) => `<li class="dx-act"><span class="dx-act-av ${ACT_TONE[a.action] || 'violet'}">${esc(dxInitials(a.actor))}</span><div class="dx-act-main"><b>${esc(a.actor)}</b><small>${esc(dxActText(a))}</small></div><time class="dx-act-time">${esc(relTime(a.at))}</time></li>`).join('') || `<li class="dx-act-empty">${clayOrb('mint', 'check')}<span>Belum ada aktivitas tercatat pada scope Anda.</span></li>`}</ul>
          </article>
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

  // ── Self-service billing (tenant lihat langganan + pemakaian + tagihan sendiri)
  const billingPage = {
    permission: 'settings.view',
    async render(main, _params, signal) {
      const data = await query('billing', () => api('/api/billing/summary', { signal }), { staleMs: 30_000 });
      const sub = data.subscription, usage = data.usage || {}, invoices = data.invoices || [];
      const u = usage.usage || {}, meters = usage.meters || [];
      const invChip = (s) => `<span class="chip ${s === 'paid' ? 'mint' : s === 'void' ? 'gray' : 'amber'}">${esc(s)}</span>`;
      const metersHtml = meters.length ? meters.map((m) => {
        const used = Number(u[m.metric] || 0), inc = Number(m.included_qty), over = Math.max(0, used - inc);
        const pct = inc > 0 ? Math.min(100, Math.round(used / inc * 100)) : (used > 0 ? 100 : 0);
        return `<div class="bill-mtr"><div class="bill-mtr-top"><b>${esc(m.label)}</b><span class="${over > 0 ? 'over' : ''}">${used} / ${inc} ${esc(m.unit)}${over > 0 ? ` · +${over} overage` : ''}</span></div>${progressBar(pct)}</div>`;
      }).join('') : '<p class="bill-note">Paket Anda tanpa metering overage (kontrak enterprise).</p>';
      const invRows = invoices.length ? invoices.map((iv) => `<tr>
        <td><b>${esc(iv.invoice_number)}</b></td>
        <td>${fmtDate(iv.period_start)} – ${fmtDate(iv.period_end)}</td>
        <td class="right"><span class="money">${fmtIDR(iv.total)}</span></td>
        <td>${invChip(iv.status)}</td>
        <td>${iv.paid_at ? `Lunas ${fmtDate(iv.paid_at)}` : '<span class="muted">—</span>'}</td></tr>`).join('')
        : `<tr><td colspan="5"><div class="empty-state">${clayOrb('mint', 'check')}<h3>Belum ada tagihan</h3><p>Tagihan platform akan tampil di sini tiap periode.</p></div></td></tr>`;
      const planName = sub ? esc(sub.plan_name || sub.plan_code) : '—';
      const price = sub && sub.price_monthly != null ? `${fmtIDR(sub.price_monthly)} / bln` : 'Kontrak kustom';
      main.innerHTML = pageHead({ eyebrow: 'LANGGANAN & TAGIHAN', title: 'Langganan Singularity', sub: 'Paket, pemakaian bulan berjalan, dan riwayat tagihan platform Anda.' }) + `
        <section class="bill-grid">
          <article class="panel bill-plan">
            <p class="eyebrow">PAKET AKTIF</p><h2>${planName}</h2>
            <div class="bill-price">${price}</div>
            <div class="bill-meta">${sub ? `${invChip(sub.status)} <span class="muted">Periode s/d ${sub.current_period_end ? fmtDate(sub.current_period_end) : '—'}</span>` : '<span class="muted">Belum berlangganan</span>'}</div>
          </article>
          <article class="panel bill-usage">
            <header><div><p class="eyebrow">PEMAKAIAN ${esc(usage.period || '')}</p><h2>Kuota & pemakaian</h2></div></header>
            <div class="bill-meters">${metersHtml}</div>
          </article>
        </section>
        <section class="panel">
          <header><div><p class="eyebrow">RIWAYAT TAGIHAN</p><h2>Invoice platform</h2></div></header>
          <div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Periode</th><th class="right">Total</th><th>Status</th><th>Pembayaran</th></tr></thead><tbody>${invRows}</tbody></table></div>
          <p class="bill-note">Pembayaran diproses oleh PT Singularity Teknofastindo. Hubungi tim billing untuk instruksi pembayaran.</p>
        </section>`;
    }
  };

  const R = router.register.bind(router);
  R('/dashboard', dashboard);
  R('/approvals', approvals);
  R('/notifications', notifications);
  R('/billing', billingPage);
})();
