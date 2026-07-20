'use strict';
// MAT ERP V2 — inti frontend: API client + cache stale-while-revalidate,
// pembatalan request, SSE invalidation, router hash tunggal, util format.
window.MAT = (() => {
  const state = {
    user: null, permissions: [], csrfToken: null, unread: 0,
    route: '', routeParams: {}, routeQuery: new URLSearchParams(), sse: null
  };

  // ── Keamanan output: semua data dinamis wajib lewat esc() ────────────────
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ── Format Indonesia ──────────────────────────────────────────────────────
  const fmtIDR = (n) => {
    if (n == null) return '—';
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
    if (abs >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
    return `Rp ${n.toLocaleString('id-ID')}`;
  };
  const fmtIDRFull = (n) => n == null ? '—' : `Rp ${Number(n).toLocaleString('id-ID')}`;
  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const fmtDateTime = (iso) => !iso ? '—' : `${fmtDate(iso)} ${new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  const relTime = (iso) => {
    if (!iso) return '—';
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'baru saja';
    if (mins < 60) return `${mins} mnt lalu`;
    if (mins < 1440) return `${Math.round(mins / 60)} jam lalu`;
    return `${Math.round(mins / 1440)} hari lalu`;
  };

  const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };
  const newIdemKey = () => `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  // ── API client ────────────────────────────────────────────────────────────
  async function api(path, { method = 'GET', body, signal, idempotencyKey } = {}) {
    const headers = { 'Accept': 'application/json' };
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      headers['X-CSRF-Token'] = state.csrfToken || '';
      if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal, credentials: 'same-origin' });
    let data = {};
    try { data = await res.json(); } catch { /* body kosong */ }
    if (res.status === 401 && state.user) { sessionLost(); }
    if (!res.ok) {
      const error = new Error(data.message || `Kesalahan ${res.status}`);
      error.code = data.code || 'INTERNAL'; error.status = res.status; error.data = data;
      throw error;
    }
    return data;
  }
  async function uploadFile(path,file,{signal}={}){const res=await fetch(path,{method:'POST',headers:{'Accept':'application/json','Content-Type':file.type||'application/octet-stream','X-File-Name':encodeURIComponent(file.name),'X-CSRF-Token':state.csrfToken||''},body:file,signal,credentials:'same-origin'});let data={};try{data=await res.json();}catch{}if(res.status===401&&state.user)sessionLost();if(!res.ok){const error=new Error(data.message||`Kesalahan ${res.status}`);error.code=data.code||'INTERNAL';error.status=res.status;throw error;}return data;}

  // ── Cache query: stale-while-revalidate + dedup + invalidasi berawalan ───
  const cache = new Map(); // key → {data, fetchedAt, staleMs, promise}
  async function query(key, fetcher, { staleMs = 30_000, force = false } = {}) {
    const entry = cache.get(key);
    const fresh = entry && !force && entry.data !== undefined && (Date.now() - entry.fetchedAt) < entry.staleMs;
    if (fresh) return entry.data;
    if (entry && entry.promise) return entry.data !== undefined ? entry.data : entry.promise; // dedup paralel
    const promise = fetcher().then((data) => {
      cache.set(key, { data, fetchedAt: Date.now(), staleMs });
      return data;
    }, (error) => {
      // Jangan racuni cache dengan promise gagal/dibatalkan.
      const e = cache.get(key);
      if (e && e.data === undefined) cache.delete(key); else if (e) delete e.promise;
      throw error;
    });
    if (entry) { entry.promise = promise; return entry.data !== undefined ? entry.data : promise; }
    cache.set(key, { fetchedAt: 0, staleMs, promise, data: undefined });
    return promise;
  }
  function invalidate(prefix) {
    for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
  }

  // ── SSE: event kecil → invalidasi cache terarah → refresh halaman relevan ─
  const EVENT_PREFIXES = {
    'approval.created': ['approvals', 'documents', 'dashboard'],
    'approval.updated': ['approvals', 'documents', 'doc:', 'dashboard'],
    'quotation.updated': ['documents:QUOTATION', 'doc:'],
    'purchase_order.updated': ['documents:PURCHASE_ORDER', 'doc:'],
    'goods_receipt.created': ['documents:GOODS_RECEIPT', 'inventory'],
    'inventory.updated': ['inventory', 'dashboard'],
    'work_order.updated': ['documents:WORK_ORDER', 'doc:', 'dashboard'],
    'quality_control.updated': ['documents:QC_INSPECTION', 'doc:'],
    'delivery.updated': ['documents:DELIVERY', 'doc:'],
    'invoice.updated': ['documents:INVOICE', 'doc:', 'dashboard'],
    'payment.posted': ['documents:CUSTOMER_PAYMENT', 'documents:INVOICE', 'dashboard'],
    'payroll.updated': ['documents:PAYROLL_RUN', 'doc:'],
    'notification.created': ['notifications'],
    'job.updated': ['jobs'],
    'document.updated': ['documents', 'doc:'],
    'system.alert': ['monitoring']
  };
  let refreshTimer = null;
  function startSse() {
    if (state.sse) state.sse.close();
    const source = new EventSource('/api/events');
    state.sse = source;
    for (const type of Object.keys(EVENT_PREFIXES)) {
      source.addEventListener(type, () => {
        EVENT_PREFIXES[type].forEach(invalidate);
        if (type === 'notification.created') refreshBadge();
        // Refresh halaman aktif dengan debounce ringan — hanya data terdampak.
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
          const page = router.current();
          if (page && page.onEvent) page.onEvent(type);
        }, 250);
      });
    }
  }
  async function refreshBadge() {
    try {
      const data = await api('/api/notifications');
      state.unread = data.unread;
      document.dispatchEvent(new CustomEvent('mat:badge', { detail: data.unread }));
    } catch { /* nonkritis */ }
  }

  // ── Router hash tunggal ───────────────────────────────────────────────────
  const routes = [];
  let currentPage = null;
  let currentAbort = null;
  const router = {
    register(pattern, page) {
      const keys = [];
      const regex = new RegExp('^' + pattern.replace(/:[a-zA-Z]+/g, (m) => { keys.push(m.slice(1)); return '([^/]+)'; }) + '$');
      routes.push({ pattern, regex, keys, page });
    },
    current() { return currentPage; },
    abortSignal() { return currentAbort ? currentAbort.signal : undefined; },
    async go(hash) { location.hash = hash; },
    async render() {
      const rawHash = (location.hash || '#/dashboard').slice(1);
      const queryAt = rawHash.indexOf('?');
      const hash = queryAt >= 0 ? rawHash.slice(0, queryAt) : rawHash;
      const routeQuery = new URLSearchParams(queryAt >= 0 ? rawHash.slice(queryAt + 1) : '');
      if (currentAbort) currentAbort.abort(); // batalkan permintaan rute sebelumnya
      currentAbort = new AbortController();
      const match = routes.find((r) => r.regex.test(hash));
      const main = document.getElementById('main');
      document.dispatchEvent(new CustomEvent('mat:navigate', { detail: hash }));
      if (!match) {
        currentPage = null;
        main.innerHTML = `<section class="error-state"><div class="clay-orb coral">${window.ICONS.alert}</div><h1>Halaman tidak ditemukan</h1><p>Rute <code>${esc(hash)}</code> tidak terdaftar. Gunakan navigasi di samping.</p><a class="btn primary" href="#/dashboard">Kembali ke dashboard</a></section>`;
        return;
      }
      const params = {};
      hash.match(match.regex).slice(1).forEach((v, i) => { params[match.keys[i]] = decodeURIComponent(v); });
      state.route = hash; state.routeParams = params; state.routeQuery = routeQuery;
      const page = match.page;
      currentPage = page;
      if (page.permission && !can(page.permission)) {
        main.innerHTML = `<section class="error-state"><div class="clay-orb amber">${window.ICONS.lock}</div><h1>Akses dibatasi</h1><p>Peran <b>${esc(state.user.role)}</b> tidak memiliki izin <code>${esc(page.permission)}</code>. Hubungi administrator bila Anda membutuhkan akses ini.</p></section>`;
        return;
      }
      main.scrollTop = 0;
      try { await page.render(main, params, currentAbort.signal); main.focus({ preventScroll: true }); }
      catch (error) {
        if (error.name === 'AbortError') return;
        main.innerHTML = `<section class="error-state"><div class="clay-orb coral">${window.ICONS.alert}</div><h1>Gagal memuat halaman</h1><p>${esc(error.message)}</p><button class="btn secondary" id="retryPage">Coba lagi</button></section>`;
        main.querySelector('#retryPage').addEventListener('click', () => router.render());
      }
    }
  };
  window.addEventListener('hashchange', () => router.render());

  function can(code) {
    if (String(code).includes('|')) return String(code).split('|').some(can);
    if (!state.user) return false;
    if (state.permissions.includes('*')) return true;
    return state.permissions.includes(code);
  }

  function sessionLost() {
    state.user = null;
    if (state.sse) { state.sse.close(); state.sse = null; }
    cache.clear();
    document.dispatchEvent(new CustomEvent('mat:logout'));
  }

  // Normalisasi respons daftar: API boleh mengembalikan array telanjang atau
  // pembungkus {items:[…]}. Satu helper ini mencegah "x.map is not a function"
  // saat kontrak endpoint berubah — halaman tetap tampil, bukan blank error.
  const asList = (value) => Array.isArray(value) ? value
    : value && Array.isArray(value.items) ? value.items
    : value && Array.isArray(value.rows) ? value.rows
    : [];

  return { state, esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, debounce, newIdemKey, api, uploadFile, query, invalidate, startSse, refreshBadge, router, can, sessionLost, asList };
})();
