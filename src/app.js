'use strict';
// Bootstrap aplikasi: verifikasi sesi → render shell → router → SSE.
// Tidak ada render halaman sebelum sesi terverifikasi (tanpa flash).
(() => {
  const { esc, api, state, router, can, startSse, refreshBadge, invalidate } = window.MAT;
  const { ICONS, toast, closeLayers, rememberLayerFocus } = window.UI;

  const loginLayer = document.getElementById('loginLayer');
  const appShell = document.getElementById('app');
  const mainOutlet = document.getElementById('main');

  // ── MAT Enterprise Spaces ────────────────────────────────────────────────
  // Satu registry menjadi sumber sidebar, command palette, permission, ikon,
  // favorites, recent, dan active-route. Keamanan tetap diputuskan backend.
  const route = (href, label, icon, permission, meta = {}) => ({ href, label, icon, permission, ...meta });
  const NAVIGATION = [
    {
      id: 'workspace', label: 'Ruang Kerja', shortLabel: 'Workspace', i18nKey: 'nav.group.workspace', icon: 'grid', tone: 'sky', archetype: 'overview',
      description: 'Fokus pribadi, keputusan, dan insight lintas fungsi.',
      sections: [
        { id: 'focus', label: 'Fokus Saya', items: [
          route('#/dashboard', 'Dashboard', 'grid', 'dashboard.view', { art: 'dashboard', i18nKey: 'nav.dashboard' }),
          route('#/account/security', 'Keamanan akun', 'shield', 'dashboard.view', { art: 'security', archetype: 'control' }),
          route('#/my-work', 'My Work', 'inbox', 'dashboard.view', { art: 'my-work', i18nKey: 'nav.mywork', archetype: 'workbench' }),
          route('#/approvals', 'Persetujuan saya', 'checkCircle', 'approval.view', { art: 'approvals', i18nKey: 'nav.approvals', archetype: 'workbench' })
        ] },
        { id: 'insight', label: 'Insight & Alert', items: [
          route('#/reports', 'Laporan', 'chart', 'report.view', { art: 'reports' }),
          route('#/notifications', 'Notifikasi', 'bell', 'notification.view', { art: 'notification', badge: 'notifications', i18nKey: 'nav.notifications', archetype: 'workbench' })
        ] }
      ]
    },
    {
      id: 'sales', label: 'Penjualan', shortLabel: 'Sales', i18nKey: 'nav.group.sales', icon: 'trend', tone: 'gold', archetype: 'workbench',
      description: 'Peluang, komersial, order, proyek, dan layanan pelanggan.',
      sections: [
        { id: 'presales', label: 'Pre-sales', items: [
          route('#/sales/inquiries', 'Inquiry', 'help', 'inquiry.view', { art: 'inquiry' }),
          route('#/sales/quotations', 'Penawaran', 'doc', 'quotation.view', { art: 'quotation' })
        ] },
        { id: 'order-control', label: 'Order Management', items: [
          route('#/sales/customer-pos', 'PO pelanggan', 'inbox', 'customer_po.view', { art: 'customer-po' }),
          route('#/sales/orders', 'Sales order', 'cart', 'sales_order.view', { art: 'sales-order' }),
          route('#/sales/commercial-control', 'Commercial control', 'chart', 'sales_order.view', { art: 'commercial-control' })
        ] },
        { id: 'relationship', label: 'Delivery & After-sales', items: [
          route('#/sales/projects', 'Proyek', 'project', 'project.view', { art: 'project' }),
          route('#/sales/rma', 'Retur & garansi', 'refresh', 'rma.view', { art: 'rma' })
        ] }
      ]
    },
    {
      id: 'operations', label: 'Operasional', shortLabel: 'Operations', i18nKey: 'nav.group.operations', icon: 'factory', tone: 'mint', archetype: 'workbench',
      description: 'Kendali produksi, pengadaan, dan aliran material.',
      sections: [
        { id: 'production', label: 'Production', items: [
          route('#/production/work-orders', 'Work order', 'factory', 'work_order.view', { art: 'work-order' }),
          route('#/production/capacity', 'Capacity & WIP', 'chart', 'production.view', { art: 'capacity-and-wip' }),
          route('#/production/quality', 'Quality control', 'shield', 'quality.view', { art: 'quality-control' }),
          route('#/production/quality-management', 'CAPA & kalibrasi', 'audit', 'quality.view', { art: 'quality-management' }),
          route('#/production/mrp', 'MRP & kebutuhan', 'chart', 'production.view', { art: 'mrp' })
        ] },
        { id: 'procurement', label: 'Procurement', items: [
          route('#/procurement/requests', 'Purchase request', 'doc', 'purchase_request.view', { art: 'purchase-request' }),
          route('#/procurement/rfq', 'RFQ & perbandingan', 'filter', 'rfq.view', { art: 'rfq' }),
          route('#/procurement/orders', 'Purchase order', 'cart', 'purchase_order.view'),
          route('#/procurement/contracts', 'Kontrak pembelian', 'doc', 'purchase_order.view'),
          route('#/procurement/payment-proposals', 'Usulan pembayaran', 'wallet', 'payment_proposal.view'),
          route('#/procurement/budgets', 'Anggaran pengadaan', 'ledger', 'budget.view')
        ] },
        { id: 'warehouse', label: 'Warehouse', items: [
          route('#/warehouse/inventory', 'Persediaan', 'box', 'inventory.view'),
          route('#/warehouse/receipts', 'Penerimaan barang', 'truck', 'goods_receipt.view'),
          route('#/warehouse/movements', 'Mutasi stok', 'refresh', 'inventory.view'),
          route('#/warehouse/deliveries', 'Pengiriman', 'truck', 'delivery.view', { art: 'delivery' })
        ] }
      ]
    },
    {
      id: 'finance', label: 'Keuangan', shortLabel: 'Finance', i18nKey: 'nav.group.finance', icon: 'wallet', tone: 'emerald', archetype: 'control',
      description: 'Arus kas, posting, kontrol periode, dan kepatuhan fiskal.',
      sections: [
        { id: 'receivables', label: 'Receivables', items: [
          route('#/finance/invoices', 'Invoice', 'wallet', 'invoice.view'),
          route('#/finance/collection', 'Collection & dunning', 'bell', 'invoice.view'),
          route('#/finance/payments', 'Pembayaran', 'check', 'payment.view')
        ] },
        { id: 'payables', label: 'Payables & Expense', items: [
          route('#/finance/supplier-invoices', 'Tagihan supplier', 'doc', 'supplier_invoice.view'),
          route('#/finance/expenses', 'Pengeluaran', 'payslip', 'expense.view')
        ] },
        { id: 'control', label: 'Accounting & Control', items: [
          route('#/finance/assets', 'Aset tetap', 'building', 'asset.view'),
          route('#/accounting', 'Akuntansi', 'ledger', 'journal.view'),
          route('#/accounting/statements', 'Laporan keuangan', 'chart', 'ledger.view'),
          route('#/accounting/closing', 'Closing cockpit', 'checkCircle', 'closing.view'),
          route('#/tax', 'Perpajakan', 'tax', 'tax.view')
        ] }
      ]
    },
    {
      id: 'organization', label: 'Organisasi', shortLabel: 'Organization', i18nKey: 'nav.group.organization', icon: 'people', tone: 'lavender', archetype: 'people',
      description: 'Struktur, tenaga kerja, waktu, dan administrasi SDM.',
      sections: [
        { id: 'org-design', label: 'Organization Design', items: [
          route('#/organization', 'Struktur perusahaan', 'building', 'organization.view'),
          route('#/organization/workforce', 'Job & Position', 'people', 'organization.view')
        ] },
        { id: 'workforce', label: 'Workforce & Time', items: [
          route('#/hr/employees', 'Karyawan', 'people', 'employee.view'),
          route('#/hr/attendance', 'Kehadiran', 'clock', 'attendance.view'),
          route('#/hr/workforce', 'Shift & kalender', 'gear', 'attendance.view'),
          route('#/hr/leave', 'Cuti', 'clock', 'leave.view')
        ] },
        { id: 'payroll', label: 'Payroll', items: [
          route('#/payroll', 'Payroll', 'payslip', 'payroll.view|payroll.view_self')
        ] }
      ]
    },
    {
      id: 'master-data', label: 'Master Data', shortLabel: 'Master', i18nKey: 'nav.group.masterdata', icon: 'box', tone: 'cyan', archetype: 'records',
      description: 'Golden record, kualitas data, partner, dan katalog.',
      sections: [
        { id: 'governance', label: 'Governance', items: [
          route('#/masters/business-partners', 'Business Partner', 'building', 'business_partner.view'),
          route('#/masters/governance', 'Data Quality & FX', 'shield', 'settings.view')
        ] },
        { id: 'partners', label: 'Business Partners', items: [
          route('#/masters/customers/link', 'Customer Link', 'project', 'customer.create'),
          route('#/masters/customers', 'Pelanggan', 'building', 'customer.view'),
          route('#/masters/suppliers', 'Supplier', 'truck', 'supplier.view')
        ] },
        { id: 'catalog', label: 'Catalog', items: [
          route('#/masters/products', 'Produk & jasa', 'box', 'product.view')
        ] }
      ]
    },
    {
      id: 'system', label: 'Sistem', shortLabel: 'System', i18nKey: 'nav.group.system', icon: 'gear', tone: 'graphite', archetype: 'control',
      description: 'Identity, governance, observability, dan konfigurasi platform.',
      sections: [
        { id: 'identity', label: 'Identity & Access', items: [
          route('#/system/users', 'Pengguna & peran', 'people', 'user.view'),
          route('#/system/iam', 'IAM & role assignment', 'lock', 'iam.view'),
          route('#/system/sod', 'SoD conflict center', 'shield', 'sod.view'),
          route('#/system/approval-policies', 'Approval policy', 'approval', 'approval_policy.view'),
          route('#/system/access-reviews', 'Access review', 'audit', 'access_review.view')
        ] },
        { id: 'governance', label: 'Governance', items: [
          route('#/system/retention', 'Data retention', 'shield', 'retention.view'),
          route('#/system/audit', 'Log audit', 'audit', 'audit.view')
        ] },
        { id: 'operations', label: 'Platform Operations', items: [
          route('#/system/monitoring', 'Monitoring', 'monitor', 'monitoring.view'),
          route('#/system/jobs', 'Job latar belakang', 'job', 'job.view'),
          route('#/system/selftest', 'Self test', 'shield', 'selftest.view')
        ] },
        { id: 'configuration', label: 'Configuration', items: [
          route('#/system/document-templates', 'Template dokumen', 'doc', 'settings.view'),
          route('#/system/settings', 'Pengaturan', 'gear', 'settings.view')
        ] }
      ]
    }
  ];
  const NAV_ENTRIES = NAVIGATION.flatMap((space) => space.sections.flatMap((section) => section.items.map((item) => ({ ...item, archetype: item.archetype || section.archetype || space.archetype || 'workbench', space, section }))));
  const STORAGE = { space: 'mat.nav.space', view: 'mat.nav.view', pinned: 'mat.nav.pinned', recent: 'mat.nav.recent', sections: 'mat.nav.sections', density: 'mat.workbench.density' };
  const pinGlyph = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/></svg>';
  const chevronGlyph = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>';
  const ti = (key, fallback) => (window.MAT_I18N && key) ? window.MAT_I18N.t(key, fallback) : fallback;
  const readStorage = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };
  const writeStorage = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* preferensi non-kritis */ } };
  const routePath = (value) => String(value || '').replace(/^#/, '').split('?')[0];
  const routeMatches = (hash, href) => {
    const current = routePath(hash); const target = routePath(href);
    return current === target || (target !== '/dashboard' && current.startsWith(`${target}/`));
  };
  const visibleItems = (space) => space.sections.flatMap((section) => section.items).filter((item) => can(item.permission));
  const visibleSpaces = () => NAVIGATION.filter((space) => visibleItems(space).length);
  const entryForHash = (hash) => NAV_ENTRIES.find((entry) => routeMatches(hash, entry.href));
  const navIcon = (item) => item.art
    ? `<img class="nav-art" src="assets/icons/navigation/${item.art}.png" width="96" height="96" loading="lazy" decoding="async" alt="">`
    : `<span class="nav-glyph" aria-hidden="true">${ICONS[item.icon] || ICONS.grid}</span>`;

  let preferenceScope = 'anonymous';
  let activeSpaceId = 'workspace';
  let activeNavView = 'modules';
  let pinnedRoutes = [];
  let recentRoutes = [];
  let openSections = {};
  let workbenchDensity = 'comfortable';
  const preferenceKey = (key) => `${key}.${preferenceScope}`;
  const persistPreference = (key, value) => writeStorage(preferenceKey(key), value);
  function applyWorkbenchDensity() {
    appShell.classList.toggle('workbench-compact', workbenchDensity === 'compact');
    const button = mainOutlet.querySelector('[data-workbench-density]');
    if (!button) return;
    const compact = workbenchDensity === 'compact';
    button.setAttribute('aria-pressed', String(compact));
    button.setAttribute('aria-label', compact ? 'Gunakan kepadatan nyaman' : 'Gunakan kepadatan ringkas');
    button.title = compact ? 'Ubah ke tampilan nyaman' : 'Ubah ke tampilan ringkas';
    button.querySelector('span:last-child').textContent = compact ? 'Ringkas' : 'Nyaman';
  }
  function hydrateNavPreferences(user) {
    preferenceScope = String(user?.id || user?.username || 'anonymous').replace(/[^a-z0-9_-]/gi, '_');
    activeSpaceId = readStorage(preferenceKey(STORAGE.space), 'workspace');
    activeNavView = readStorage(preferenceKey(STORAGE.view), 'modules');
    if (!['modules', 'favorites', 'recent'].includes(activeNavView)) activeNavView = 'modules';
    const storedPinned = readStorage(preferenceKey(STORAGE.pinned), []);
    const storedRecent = readStorage(preferenceKey(STORAGE.recent), []);
    const storedSections = readStorage(preferenceKey(STORAGE.sections), {});
    pinnedRoutes = Array.isArray(storedPinned) ? storedPinned.slice(0, 12) : [];
    recentRoutes = Array.isArray(storedRecent) ? storedRecent.slice(0, 8) : [];
    openSections = storedSections && typeof storedSections === 'object' && !Array.isArray(storedSections) ? storedSections : {};
    workbenchDensity = readStorage(preferenceKey(STORAGE.density), 'comfortable');
    if (!['comfortable', 'compact'].includes(workbenchDensity)) workbenchDensity = 'comfortable';
    applyWorkbenchDensity();
  }

  function renderSpaceRail() {
    const spaces = visibleSpaces();
    if (!spaces.some((space) => space.id === activeSpaceId)) activeSpaceId = spaces[0]?.id || 'workspace';
    document.getElementById('spaceRail').innerHTML = spaces.map((space) => {
      const active = space.id === activeSpaceId;
      const count = visibleItems(space).length;
      return `<button class="space-button ${active ? 'active' : ''}" type="button" data-space="${esc(space.id)}" data-tone="${esc(space.tone)}" aria-pressed="${active}" aria-label="${esc(`${space.label}, ${count} menu`)}" title="${esc(space.label)}" tabindex="${active ? '0' : '-1'}"><span class="space-orb">${ICONS[space.icon]}</span><span>${esc(space.shortLabel)}</span></button>`;
    }).join('');
  }

  function navRow(item) {
    const label = esc(ti(item.i18nKey, item.label));
    const pinned = pinnedRoutes.includes(item.href);
    const badge = item.badge ? `<span class="count" data-badge="${esc(item.badge)}" hidden>0</span>` : '';
    return `<div class="nav-row"><a class="nav-item" data-nav href="${esc(item.href)}" aria-label="${label}" title="${label}"><span class="nav-ico">${navIcon(item)}</span><span class="nav-text">${label}</span>${badge}</a><button class="nav-pin ${pinned ? 'active' : ''}" type="button" data-pin="${esc(item.href)}" aria-label="${esc(pinned ? `Lepas ${item.label} dari favorit` : `Tambahkan ${item.label} ke favorit`)}" aria-pressed="${pinned}" title="${pinned ? 'Lepas dari favorit' : 'Tambahkan ke favorit'}">${pinGlyph}</button></div>`;
  }

  function renderUtilityList(routes, emptyTitle, emptyDetail) {
    const items = routes.map((href) => NAV_ENTRIES.find((entry) => entry.href === href)).filter((item) => item && can(item.permission));
    if (!items.length) return `<div class="nav-empty"><span>${ICONS.inbox}</span><b>${esc(emptyTitle)}</b><small>${esc(emptyDetail)}</small></div>`;
    return `<div class="nav-utility-list">${items.map((item) => `<p class="nav-label"><span>${esc(item.space.label)}</span></p>${navRow(item)}`).join('')}</div>`;
  }

  function renderContextNav() {
    const spaces = visibleSpaces();
    const space = spaces.find((candidate) => candidate.id === activeSpaceId) || spaces[0];
    if (!space) return;
    const sidebar = document.getElementById('sidebar');
    sidebar.dataset.space = space.id;
    sidebar.dataset.tone = space.tone;
    appShell.dataset.space = space.id;
    appShell.dataset.tone = space.tone;
    document.getElementById('spaceTitle').textContent = ti(space.i18nKey, space.label);
    document.getElementById('spaceDescription').textContent = space.description;
    document.getElementById('spaceMenuCount').textContent = `${visibleItems(space).length} menu`;
    document.querySelectorAll('[data-nav-view]').forEach((button) => {
      const active = button.dataset.navView === activeNavView;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const nav = document.getElementById('nav');
    if (activeNavView === 'favorites') {
      nav.innerHTML = renderUtilityList(pinnedRoutes, 'Belum ada favorit', 'Gunakan ikon bintang untuk menyimpan menu penting.');
      updateBadge(state.unread || 0);
      return;
    }
    if (activeNavView === 'recent') {
      nav.innerHTML = renderUtilityList(recentRoutes, 'Belum ada riwayat', 'Menu yang Anda buka akan tampil di sini.');
      updateBadge(state.unread || 0);
      return;
    }
    nav.innerHTML = space.sections.map((section) => {
      const items = section.items.filter((item) => can(item.permission));
      if (!items.length) return '';
      const key = `${space.id}.${section.id}`;
      const contentId = `nav-section-${space.id}-${section.id}`;
      const hasActive = items.some((item) => routeMatches(location.hash, item.href));
      const open = openSections[key] !== false || hasActive;
      return `<section class="nav-section ${open ? 'open' : ''}" data-section="${esc(key)}"><button class="nav-section-toggle" type="button" data-section-toggle="${esc(key)}" aria-expanded="${open}" aria-controls="${esc(contentId)}"><span>${esc(section.label)}</span><small>${items.length}</small>${chevronGlyph}</button><div class="nav-section-items" id="${esc(contentId)}">${items.map(navRow).join('')}</div></section>`;
    }).join('');
    updateBadge(state.unread || 0);
  }

  function renderNav() {
    const activeEntry = entryForHash(location.hash);
    if (activeEntry && can(activeEntry.permission)) activeSpaceId = activeEntry.space.id;
    renderSpaceRail();
    renderContextNav();
  }

  function rememberRecent(hash) {
    const entry = entryForHash(hash);
    if (!entry || !can(entry.permission)) return;
    recentRoutes = [entry.href, ...recentRoutes.filter((href) => href !== entry.href)].slice(0, 8);
    persistPreference(STORAGE.recent, recentRoutes);
  }

  function markActiveNav(hash) {
    const entry = entryForHash(hash);
    if (entry && can(entry.permission) && entry.space.id !== activeSpaceId) {
      activeSpaceId = entry.space.id;
      persistPreference(STORAGE.space, activeSpaceId);
      renderSpaceRail();
      renderContextNav();
    }
    rememberRecent(hash);
    document.querySelectorAll('[data-nav]').forEach((anchor) => {
      const active = routeMatches(hash, anchor.getAttribute('href'));
      anchor.classList.toggle('active', active);
      if (active) anchor.setAttribute('aria-current', 'page'); else anchor.removeAttribute('aria-current');
    });
  }

  // MAT Workbench Horizon: setiap route menerima frame, konteks proses, dan
  // densitas yang sama. Observer juga menangani halaman yang merender ulang
  // dirinya sendiri setelah filter, tab, atau mutasi transaksi dijalankan.
  const WORKBENCH_LABELS = {
    overview: 'Executive Overview',
    workbench: 'Transaction Workbench',
    control: 'Control Center',
    people: 'People Workspace',
    records: 'Master Records'
  };
  let decoratingWorkbench = false;
  function decorateWorkbench() {
    const entry = entryForHash(location.hash);
    if (!state.user || !entry || mainOutlet.querySelector(':scope > .error-state')) return;
    const currentFrame = mainOutlet.querySelector(':scope > .workbench-frame');
    if (currentFrame) {
      const currentCanvas = currentFrame.querySelector(':scope > .workbench-canvas');
      const extras = [...mainOutlet.children].filter((child) => child !== currentFrame);
      if (currentCanvas && extras.length) {
        decoratingWorkbench = true;
        extras.forEach((child) => currentCanvas.appendChild(child));
        decoratingWorkbench = false;
      }
      return;
    }
    const children = [...mainOutlet.children];
    if (!children.length) return;
    decoratingWorkbench = true;
    const archetype = WORKBENCH_LABELS[entry.archetype] ? entry.archetype : 'workbench';
    const home = visibleItems(entry.space)[0]?.href || entry.href;
    const frame = document.createElement('div');
    frame.className = `workbench-frame workbench-${archetype}`;
    const context = document.createElement('section');
    context.className = 'workbench-context';
    context.setAttribute('aria-label', 'Konteks area kerja');
    context.innerHTML = `<div class="workbench-context-main"><span class="workbench-live"><i aria-hidden="true"></i>Live workspace</span><nav class="workbench-breadcrumb" aria-label="Breadcrumb"><a href="${esc(home)}">${esc(entry.space.label)}</a><span aria-hidden="true">/</span><span>${esc(entry.section.label)}</span><span aria-hidden="true">/</span><strong aria-current="page">${esc(entry.label)}</strong></nav></div><div class="workbench-tools"><span class="workbench-mode">${esc(WORKBENCH_LABELS[archetype])}</span><button class="workbench-density" type="button" data-workbench-density aria-pressed="false"><span aria-hidden="true">&#9783;</span><span>Nyaman</span></button></div><span class="workbench-horizon" aria-hidden="true"><i></i><i></i><i></i></span>`;
    const canvas = document.createElement('div');
    canvas.className = 'workbench-canvas';
    children.forEach((child) => canvas.appendChild(child));
    frame.append(context, canvas);
    mainOutlet.appendChild(frame);
    mainOutlet.dataset.workbench = archetype;
    mainOutlet.dataset.space = entry.space.id;
    applyWorkbenchDensity();
    decoratingWorkbench = false;
  }
  const workbenchObserver = new MutationObserver(() => {
    if (!decoratingWorkbench) queueMicrotask(decorateWorkbench);
  });
  workbenchObserver.observe(mainOutlet, { childList: true });

  // ── Sesi ──────────────────────────────────────────────────────────────────
  function applySession(data) {
    state.user = data.user;
    state.permissions = data.permissions;
    state.csrfToken = data.csrfToken;
    state.unread = data.unreadNotifications || 0;
    loginLayer.hidden = true;
    appShell.hidden = false;
    document.getElementById('profileName').textContent = data.user.displayName;
    document.getElementById('profileRole').textContent = `${data.user.jobTitle || data.user.role} · ${data.user.role}`;
    document.getElementById('profileAvatar').textContent = data.user.displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    document.getElementById('branchLabel').textContent = data.user.branchName || 'Head Office';
    document.getElementById('topBranch').textContent = data.user.branchName || 'Head Office';
    hydrateNavPreferences(data.user);
    renderNav();
    updateBadge(state.unread);
    startSse();
    refreshBadge();
    // Satu render: set hash memicu hashchange; bila hash sudah ada, render langsung.
    if (!location.hash) location.hash = '#/dashboard';
    else router.render();
    markActiveNav(location.hash.slice(1));
  }

  function showLogin() {
    appShell.hidden = true;
    loginLayer.hidden = false;
    const input = document.querySelector('#loginForm input[name=username]');
    if (input) setTimeout(() => input.focus(), 60);
  }

  function updateBadge(count) {
    for (const el of [document.getElementById('notifBadge'), ...document.querySelectorAll('[data-badge="notifications"]')]) {
      if (!el) continue;
      el.textContent = count > 9 ? '9+' : String(count);
      el.hidden = !count;
    }
    const notifBtn = document.getElementById('notifBtn');
    notifBtn.setAttribute('aria-label', count ? `Notifikasi, ${count} belum dibaca` : 'Notifikasi');
  }

  // ── Login form ────────────────────────────────────────────────────────────
  // Tidak ada kredensial demo di klien: akun dikelola administrator via seed
  // UAT/produksi, dan reset sandi berjalan lewat tautan sekali pakai.
  const loginForm = document.getElementById('loginForm');
  const loginCredentials = document.getElementById('loginCredentials');
  const loginChallenge = document.getElementById('loginChallenge');
  let pendingChallenge = null;
  function resetLoginChallenge() { pendingChallenge = null; loginCredentials.hidden = false; loginChallenge.hidden = true; loginForm.challenge.value = ''; document.getElementById('loginBtn').textContent = 'Masuk'; }
  function showLoginChallenge(data) {
    pendingChallenge = data.passwordChangeRequired ? { type: 'password', token: data.changeToken } : { type: 'mfa', token: data.mfaToken };
    loginCredentials.hidden = true; loginChallenge.hidden = false;
    document.getElementById('challengeLabel').textContent = pendingChallenge.type === 'password' ? 'Kata sandi baru' : 'Kode autentikator atau recovery code';
    document.getElementById('challengeDescription').textContent = pendingChallenge.type === 'password' ? 'Buat kata sandi baru minimal 12 karakter dengan huruf besar, kecil, angka, dan simbol.' : 'Masukkan kode 6 digit dari authenticator atau satu recovery code sekali pakai.';
    loginForm.challenge.type = pendingChallenge.type === 'password' ? 'password' : 'text';
    loginForm.challenge.inputMode = 'text';
    loginForm.challenge.autocomplete = pendingChallenge.type === 'password' ? 'new-password' : 'one-time-code';
    document.getElementById('loginBtn').textContent = pendingChallenge.type === 'password' ? 'Simpan & masuk' : 'Verifikasi kode';loginForm.challenge.focus();
  }
  document.getElementById('challengeBack').addEventListener('click', () => { resetLoginChallenge(); loginForm.username.focus(); });
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    errorEl.textContent = '';
    if (!pendingChallenge && !loginForm.username.value.trim()) { errorEl.textContent = 'Isi nama pengguna terlebih dahulu.'; loginForm.username.focus(); return; }
    if (!pendingChallenge && !loginForm.password.value) { errorEl.textContent = 'Isi kata sandi terlebih dahulu.'; loginForm.password.focus(); return; }
    if (pendingChallenge && !loginForm.challenge.value) { errorEl.textContent = pendingChallenge.type === 'password' ? 'Isi kata sandi baru.' : 'Isi kode autentikator atau recovery code.'; loginForm.challenge.focus(); return; }
    btn.disabled = true; btn.textContent = 'Memverifikasi…';
    try {
      const data = pendingChallenge
        ? await api(pendingChallenge.type === 'password' ? '/api/auth/change-password-required' : '/api/auth/mfa', { method: 'POST', body: pendingChallenge.type === 'password' ? { changeToken: pendingChallenge.token, newPassword: loginForm.challenge.value } : { mfaToken: pendingChallenge.token, code: loginForm.challenge.value } })
        : await api('/api/auth/login', { method: 'POST', body: { username: loginForm.username.value.trim(), password: loginForm.password.value } });
      if (data.passwordChangeRequired || data.mfaRequired) { showLoginChallenge(data); return; }
      loginForm.reset(); resetLoginChallenge();
      applySession({ ...data, unreadNotifications: 0 });
    } catch (error) {
      errorEl.textContent = error.message + (error.data && error.data.retryAfterSeconds ? ` Coba lagi dalam ${error.data.retryAfterSeconds} detik.` : '');
      (pendingChallenge ? loginForm.challenge : loginForm.password).focus();
    } finally {
      btn.disabled = false; if (!pendingChallenge) btn.textContent = 'Masuk';
    }
  });

  // ── Topbar & lapisan global ───────────────────────────────────────────────
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* sesi mungkin sudah habis */ }
    window.MAT.sessionLost();
  });
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menuBtn');
  const desktopRail = window.matchMedia('(min-width:1101px)');
  let railCollapsed = false;
  try { railCollapsed = localStorage.getItem('mat.sidebar.collapsed') === 'true'; } catch { /* storage dapat diblokir browser */ }
  function paintRailControl() {
    const desktop = desktopRail.matches;
    if (desktop) {
      appShell.classList.toggle('sidebar-collapsed', railCollapsed);
      sidebar.classList.remove('open');
      document.getElementById('scrim').classList.remove('open');
      menuBtn.setAttribute('aria-expanded', String(!railCollapsed));
      menuBtn.setAttribute('aria-label', railCollapsed ? 'Bentangkan navigasi' : 'Ciutkan navigasi');
      menuBtn.title = railCollapsed ? 'Bentangkan navigasi' : 'Ciutkan navigasi';
    } else {
      appShell.classList.remove('sidebar-collapsed');
      menuBtn.setAttribute('aria-expanded', String(sidebar.classList.contains('open')));
      menuBtn.setAttribute('aria-label', 'Buka menu navigasi');
      menuBtn.title = 'Buka menu navigasi';
    }
  }
  menuBtn.addEventListener('click', () => {
    if (desktopRail.matches) {
      railCollapsed = !railCollapsed;
      try { localStorage.setItem('mat.sidebar.collapsed', String(railCollapsed)); } catch { /* preferensi non-kritis */ }
      paintRailControl();
      return;
    }
    rememberLayerFocus();
    sidebar.classList.add('open');
    sidebar.setAttribute('role', 'dialog');
    sidebar.setAttribute('aria-modal', 'true');
    document.querySelector('.shell').inert = true;
    document.getElementById('scrim').classList.add('open');
    menuBtn.setAttribute('aria-expanded', 'true');
    sidebar.querySelector('a, button')?.focus({ preventScroll: true });
  });
  desktopRail.addEventListener?.('change', paintRailControl);
  paintRailControl();
  document.getElementById('spaceRail').addEventListener('click', (event) => {
    const button = event.target.closest('[data-space]');
    if (!button) return;
    activeSpaceId = button.dataset.space;
    activeNavView = 'modules';
    persistPreference(STORAGE.space, activeSpaceId);
    persistPreference(STORAGE.view, activeNavView);
    if (desktopRail.matches && railCollapsed) {
      railCollapsed = false;
      try { localStorage.setItem('mat.sidebar.collapsed', 'false'); } catch { /* preferensi non-kritis */ }
      paintRailControl();
    }
    renderSpaceRail();
    renderContextNav();
    document.querySelector(`[data-space="${CSS.escape(activeSpaceId)}"]`)?.focus({ preventScroll: true });
  });
  document.getElementById('spaceRail').addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...document.querySelectorAll('[data-space]')];
    if (!buttons.length) return;
    event.preventDefault();
    const current = Math.max(0, buttons.indexOf(document.activeElement));
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[index].focus();
  });
  document.getElementById('navViews').addEventListener('click', (event) => {
    const button = event.target.closest('[data-nav-view]');
    if (!button) return;
    activeNavView = button.dataset.navView;
    persistPreference(STORAGE.view, activeNavView);
    renderContextNav();
    markActiveNav(location.hash);
  });
  document.getElementById('nav').addEventListener('click', (event) => {
    const pin = event.target.closest('[data-pin]');
    if (pin) {
      event.preventDefault();
      const href = pin.dataset.pin;
      pinnedRoutes = pinnedRoutes.includes(href) ? pinnedRoutes.filter((routeHref) => routeHref !== href) : [href, ...pinnedRoutes].slice(0, 12);
      persistPreference(STORAGE.pinned, pinnedRoutes);
      renderContextNav();
      markActiveNav(location.hash);
      return;
    }
    const toggle = event.target.closest('[data-section-toggle]');
    if (!toggle) return;
    const key = toggle.dataset.sectionToggle;
    openSections[key] = toggle.getAttribute('aria-expanded') !== 'true';
    persistPreference(STORAGE.sections, openSections);
    renderContextNav();
    markActiveNav(location.hash);
  });
  document.getElementById('scrim').addEventListener('click', closeLayers);
  document.getElementById('drawerClose').addEventListener('click', closeLayers);
  mainOutlet.addEventListener('click', (event) => {
    const density = event.target.closest('[data-workbench-density]');
    if (!density) return;
    workbenchDensity = workbenchDensity === 'compact' ? 'comfortable' : 'compact';
    persistPreference(STORAGE.density, workbenchDensity);
    applyWorkbenchDensity();
  });

  // Command palette — akses cepat modul sesuai izin.
  const commandDialog = document.getElementById('commandDialog');
  const commandInput = document.getElementById('commandInput');
  const commandResults = document.getElementById('commandResults');
  function openCommand() {
    renderCommand('');
    commandDialog.showModal();
    commandInput.value = '';
    commandInput.focus();
  }
  function renderCommand(term) {
    const q = term.trim().toLocaleLowerCase('id-ID');
    const items = NAV_ENTRIES.filter((item) => can(item.permission)).filter((item) => {
      if (!q) return true;
      return [item.label, item.space.label, item.section.label].some((value) => value.toLocaleLowerCase('id-ID').includes(q));
    }).sort((a, b) => {
      if (q) return a.label.localeCompare(b.label, 'id-ID');
      return (pinnedRoutes.indexOf(a.href) >= 0 ? -20 : 0) + (recentRoutes.indexOf(a.href) >= 0 ? -10 : 0) - ((pinnedRoutes.indexOf(b.href) >= 0 ? -20 : 0) + (recentRoutes.indexOf(b.href) >= 0 ? -10 : 0));
    });
    commandResults.innerHTML = `<p>MODUL & TINDAKAN</p>` + (items.slice(0, 12).map((item) =>
      `<button value="${esc(item.href)}"><span class="command-ico">${navIcon(item)}</span><span><b>${esc(item.label)}</b><small>${esc(item.space.label)} · ${esc(item.section.label)}</small></span><kbd>↵</kbd></button>`
    ).join('') || '<p class="command-empty">Tidak ada modul yang cocok.</p>');
  }
  commandInput.addEventListener('input', () => renderCommand(commandInput.value));
  commandDialog.addEventListener('close', () => {
    if (commandDialog.returnValue && commandDialog.returnValue.startsWith('#/')) {
      location.hash = commandDialog.returnValue;
    }
    commandDialog.returnValue = '';
  });
  document.getElementById('commandBtn').addEventListener('click', openCommand);

  // Satu listener keyboard global (tidak ada listener ganda).
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (state.user) openCommand(); }
    if (e.key === 'Tab' && sidebar.classList.contains('open')) {
      const focusable = [...sidebar.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter((element) => element.getBoundingClientRect().width > 0);
      if (focusable.length) {
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    if (e.key === 'Escape') closeLayers();
  });

  // Event internal.
  document.addEventListener('mat:badge', (e) => updateBadge(e.detail));
  document.addEventListener('mat:logout', () => { showLogin(); toast('Sesi berakhir', 'Silakan masuk kembali untuk melanjutkan.'); });
  document.addEventListener('mat:navigate', (e) => { markActiveNav(e.detail); closeLayers(); });

  // Refresh saat tab kembali fokus (pengganti polling agresif).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.user) {
      invalidate('dashboard'); invalidate('approvals'); invalidate('notifications');
      refreshBadge();
      const page = router.current();
      if (page && page.onEvent) page.onEvent('focus');
    }
  });

  // Pengalih bahasa (§10.15) — pilihan tersimpan lokal, bukan data sensitif.
  const langBtn = document.createElement('button');
  langBtn.className = 'icon-btn';
  langBtn.id = 'langBtn';
  langBtn.setAttribute('aria-label', 'Ganti bahasa / Change language');
  langBtn.classList.add('lang-toggle');
  document.querySelector('.top-actions').prepend(langBtn);
  function paintLang() { langBtn.textContent = (window.MAT_I18N && window.MAT_I18N.locale === 'en-US') ? 'EN' : 'ID'; }
  langBtn.addEventListener('click', () => {
    if (!window.MAT_I18N) return;
    window.MAT_I18N.setLocale(window.MAT_I18N.locale === 'en-US' ? 'id-ID' : 'en-US');
  });

  // Parallax 3D terkuantisasi: tanpa inline style, ringan, dan menghormati reduced motion.
  const canParallax = window.matchMedia('(prefers-reduced-motion: no-preference) and (pointer: fine)');
  loginLayer.addEventListener('pointermove', (event) => {
    if (!canParallax.matches || loginLayer.hidden) return;
    const box = loginLayer.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    loginLayer.dataset.parallaxX = x < .38 ? 'left' : x > .62 ? 'right' : 'center';
    loginLayer.dataset.parallaxY = y < .38 ? 'up' : y > .62 ? 'down' : 'center';
  });
  loginLayer.addEventListener('pointerleave', () => {
    loginLayer.dataset.parallaxX = 'center';
    loginLayer.dataset.parallaxY = 'center';
  });

  // ── Boot ──────────────────────────────────────────────────────────────────
  (async () => {
    if (window.MAT_I18N) { await window.MAT_I18N.load(); window.MAT_I18N.applyStatic(); }
    paintLang();
    try {
      const data = await api('/api/auth/session');
      applySession(data);
    } catch {
      showLogin();
      const resetMatch=location.hash.match(/^#\/reset-password\?(.+)$/);
      const resetToken=resetMatch?new URLSearchParams(resetMatch[1]).get('token'):null;
      if(resetToken){
        // Token dipindahkan ke memori lalu segera dihapus dari address bar agar
        // tidak tertinggal pada screenshot, copy URL berikutnya, atau referrer.
        history.replaceState(null,'',`${location.pathname}${location.search}#/dashboard`);
        showLoginChallenge({passwordChangeRequired:true,changeToken:resetToken});
      }
    }
  })();
})();
