'use strict';
// Bootstrap aplikasi: verifikasi sesi → render shell → router → SSE.
// Tidak ada render halaman sebelum sesi terverifikasi (tanpa flash).
(() => {
  const { esc, api, state, router, can, startSse, refreshBadge, invalidate } = window.MAT;
  const { ICONS, toast, closeLayers } = window.UI;

  const loginLayer = document.getElementById('loginLayer');
  const appShell = document.getElementById('app');

  // ── Navigasi (visibilitas menu = kenyamanan; keamanan tetap di backend) ──
  const NAV = [
    ['RUANG KERJA', [
      ['#/dashboard', 'Dashboard', 'grid', 'dashboard.view'],
      ['#/approvals', 'Persetujuan saya', 'checkCircle', 'approval.view'],
      ['#/notifications', 'Notifikasi', 'bell', 'notification.view', true]
    ]],
    ['PENJUALAN', [
      ['#/sales/inquiries', 'Inquiry', 'help', 'inquiry.view'],
      ['#/sales/quotations', 'Penawaran', 'doc', 'quotation.view'],
      ['#/sales/customer-pos', 'PO pelanggan', 'inbox', 'customer_po.view'],
      ['#/sales/orders', 'Sales order', 'cart', 'sales_order.view'],
      ['#/sales/projects', 'Proyek', 'project', 'project.view']
    ]],
    ['OPERASIONAL', [
      ['#/production/work-orders', 'Work order', 'factory', 'work_order.view'],
      ['#/production/quality', 'Quality control', 'shield', 'quality.view'],
      ['#/procurement/requests', 'Purchase request', 'doc', 'purchase_request.view'],
      ['#/procurement/orders', 'Purchase order', 'cart', 'purchase_order.view'],
      ['#/warehouse/inventory', 'Persediaan', 'box', 'inventory.view'],
      ['#/warehouse/receipts', 'Penerimaan barang', 'truck', 'goods_receipt.view'],
      ['#/warehouse/movements', 'Mutasi stok', 'refresh', 'inventory.view'],
      ['#/warehouse/deliveries', 'Pengiriman', 'truck', 'delivery.view']
    ]],
    ['KEUANGAN', [
      ['#/finance/invoices', 'Invoice', 'wallet', 'invoice.view'],
      ['#/finance/payments', 'Pembayaran', 'check', 'payment.view'],
      ['#/finance/supplier-invoices', 'Tagihan supplier', 'doc', 'supplier_invoice.view'],
      ['#/finance/expenses', 'Pengeluaran', 'payslip', 'expense.view'],
      ['#/accounting', 'Akuntansi', 'ledger', 'journal.view'],
      ['#/tax', 'Perpajakan', 'tax', 'tax.view']
    ]],
    ['ORGANISASI', [
      ['#/hr/employees', 'Karyawan', 'people', 'employee.view'],
      ['#/hr/attendance', 'Kehadiran', 'clock', 'attendance.view'],
      ['#/hr/leave', 'Cuti', 'clock', 'leave.view'],
      ['#/payroll', 'Payroll', 'payslip', 'payroll.view|payroll.view_self'],
      ['#/reports', 'Laporan', 'chart', 'report.view']
    ]],
    ['MASTER DATA', [
      ['#/masters/customers', 'Pelanggan', 'building', 'customer.view'],
      ['#/masters/suppliers', 'Supplier', 'truck', 'supplier.view'],
      ['#/masters/products', 'Produk & jasa', 'box', 'product.view']
    ]],
    ['SISTEM', [
      ['#/system/users', 'Pengguna & peran', 'people', 'user.view'],
      ['#/system/audit', 'Log audit', 'audit', 'audit.view'],
      ['#/system/monitoring', 'Monitoring', 'monitor', 'monitoring.view'],
      ['#/system/jobs', 'Job latar belakang', 'job', 'job.view'],
      ['#/system/selftest', 'Self test', 'shield', 'selftest.view'],
      ['#/system/settings', 'Pengaturan', 'gear', 'settings.view']
    ]]
  ];

  function renderNav() {
    const nav = document.getElementById('nav');
    nav.innerHTML = NAV.map(([label, items]) => {
      const visible = items.filter(([, , , perm]) => can(perm));
      if (!visible.length) return '';
      return `<p class="nav-label">${esc(label)}</p>` + visible.map(([href, name, icon, , badge]) =>
        `<a class="nav-item" data-nav href="${href}">${ICONS[icon]}<span>${esc(name)}</span>${badge ? `<span class="count" id="navBadge" hidden>0</span>` : ''}</a>`
      ).join('');
    }).join('');
  }

  function markActiveNav(hash) {
    document.querySelectorAll('[data-nav]').forEach((a) => {
      const href = a.getAttribute('href').slice(1);
      a.classList.toggle('active', hash === href || (href !== '/dashboard' && hash.startsWith(href + '/')) || hash === href.replace('#', ''));
    });
  }

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
    for (const el of [document.getElementById('notifBadge'), document.getElementById('navBadge')]) {
      if (!el) continue;
      el.textContent = count > 9 ? '9+' : String(count);
      el.hidden = !count;
    }
    const notifBtn = document.getElementById('notifBtn');
    notifBtn.setAttribute('aria-label', count ? `Notifikasi, ${count} belum dibaca` : 'Notifikasi');
  }

  // ── Login form ────────────────────────────────────────────────────────────
  const DEMO_ACCOUNTS = [
    ['andi', 'Owner'], ['dewi', 'Finance'], ['rina', 'Accounting'], ['tono', 'Tax'],
    ['sari', 'HRD'], ['bima', 'Sales'], ['rudi', 'Procurement'], ['joko', 'Warehouse'], ['budi', 'Production']
  ];
  api('/api/runtime').then((runtime) => {
    if (!runtime.demoMode) return;
    document.getElementById('demoBlock').hidden = false;
    document.getElementById('demoChips').innerHTML = DEMO_ACCOUNTS.map(([u, role]) =>
      `<button type="button" class="demo-chip" data-demo="${u}"><b>${u}</b> ${role}</button>`).join('');
  }).catch(() => { /* login tetap dapat digunakan tanpa metadata runtime */ });

  const loginForm = document.getElementById('loginForm');
  const loginCredentials = document.getElementById('loginCredentials');
  const loginChallenge = document.getElementById('loginChallenge');
  let pendingChallenge = null;
  function resetLoginChallenge() { pendingChallenge = null; loginCredentials.hidden = false; loginChallenge.hidden = true; loginForm.challenge.value = ''; document.getElementById('loginBtn').textContent = 'Masuk'; }
  function showLoginChallenge(data) {
    pendingChallenge = data.passwordChangeRequired ? { type: 'password', token: data.changeToken } : { type: 'mfa', token: data.mfaToken };
    loginCredentials.hidden = true; loginChallenge.hidden = false;
    document.getElementById('challengeLabel').textContent = pendingChallenge.type === 'password' ? 'Kata sandi baru' : 'Kode autentikator';
    document.getElementById('challengeDescription').textContent = pendingChallenge.type === 'password' ? 'Buat kata sandi baru minimal 12 karakter dengan huruf besar, kecil, angka, dan simbol.' : 'Masukkan kode 6 digit dari aplikasi autentikator Anda.';
    loginForm.challenge.type = pendingChallenge.type === 'password' ? 'password' : 'text';
    loginForm.challenge.inputMode = pendingChallenge.type === 'password' ? 'text' : 'numeric';
    loginForm.challenge.autocomplete = pendingChallenge.type === 'password' ? 'new-password' : 'one-time-code';
    document.getElementById('loginBtn').textContent = pendingChallenge.type === 'password' ? 'Simpan & masuk' : 'Verifikasi kode';loginForm.challenge.focus();
  }
  document.getElementById('challengeBack').addEventListener('click', () => { resetLoginChallenge(); loginForm.username.focus(); });
  loginForm.addEventListener('click', (e) => {
    const chipBtn = e.target.closest('[data-demo]');
    if (!chipBtn) return;
    loginForm.username.value = chipBtn.dataset.demo;
    loginForm.password.value = 'materp2026';
    loginForm.querySelector('button[type=submit]').focus();
  });
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    errorEl.textContent = '';
    if (!pendingChallenge && !loginForm.username.value.trim()) { errorEl.textContent = 'Isi nama pengguna terlebih dahulu.'; loginForm.username.focus(); return; }
    if (!pendingChallenge && !loginForm.password.value) { errorEl.textContent = 'Isi kata sandi terlebih dahulu.'; loginForm.password.focus(); return; }
    if (pendingChallenge && !loginForm.challenge.value) { errorEl.textContent = pendingChallenge.type === 'password' ? 'Isi kata sandi baru.' : 'Isi kode autentikator.'; loginForm.challenge.focus(); return; }
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
  document.getElementById('menuBtn').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.add('open');
    document.getElementById('scrim').classList.add('open');
  });
  document.getElementById('scrim').addEventListener('click', closeLayers);
  document.getElementById('drawerClose').addEventListener('click', closeLayers);

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
    const q = term.toLowerCase();
    const items = [];
    for (const [group, entries] of NAV) {
      for (const [href, name, icon, perm] of entries) {
        if (!can(perm)) continue;
        if (q && !name.toLowerCase().includes(q) && !group.toLowerCase().includes(q)) continue;
        items.push({ href, name, icon, group });
      }
    }
    commandResults.innerHTML = `<p>MODUL</p>` + (items.slice(0, 9).map((item) =>
      `<button value="${esc(item.href)}">${ICONS[item.icon]}<span><b>${esc(item.name)}</b><small>${esc(item.group)}</small></span><kbd>↵</kbd></button>`
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

  // ── Boot ──────────────────────────────────────────────────────────────────
  (async () => {
    try {
      const data = await api('/api/auth/session');
      applySession(data);
    } catch {
      showLogin();
    }
  })();
})();
