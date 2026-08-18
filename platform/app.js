// Singularity Control Plane — operator console (vanilla ESM, strict-CSP safe).
// Auth: same-origin session cookie (mat_session) + x-csrf-token from /api/auth/session.
const $ = (id) => document.getElementById(id);
const state = { csrf: null, user: null };
let plansCache = [];

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function fmtDate(s) { if (!s) return '—'; try { return new Date(s).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }); } catch { return s; } }
function fmtIDR(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
function toast(msg, kind) { const t = $('toast'); t.textContent = msg; t.className = 'toast' + (kind ? ' ' + kind : ''); t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 3400); }

async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && state.csrf) headers['x-csrf-token'] = state.csrf;
  const res = await fetch(path, { method, headers, credentials: 'include', body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data = {}; try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!res.ok) { const e = new Error(data.message || data.error || `HTTP ${res.status}`); e.status = res.status; e.code = data.code || data.error; throw e; }
  return data;
}
async function refreshSession() { const s = await api('/api/auth/session'); state.csrf = s.csrfToken; state.user = s.user; return s; }
async function apiMutate(path, body) {
  try { return await api(path, { method: 'POST', body }); }
  catch (e) { if (e.code === 'CSRF_REJECTED') { await refreshSession(); return api(path, { method: 'POST', body }); } throw e; }
}

function showGate(icon, title, msg, action) {
  $('console').hidden = true; $('gate').hidden = false;
  $('gateIcon').textContent = icon; $('gateTitle').textContent = title; $('gateMsg').textContent = msg;
  $('gateAction').hidden = !action;
}

async function boot() {
  showGate('🔗', 'Memeriksa akses…', 'Menghubungkan ke control plane.', false);
  try { await refreshSession(); }
  catch (e) {
    if (e.status === 401 || e.code === 'SESSION_EXPIRED') return showGate('🔒', 'Belum masuk', 'Masuk sebagai operator platform untuk membuka control plane.', true);
    return showGate('⚠️', 'Gangguan koneksi', e.message, false);
  }
  $('opName').textContent = state.user?.displayName || state.user?.username || 'Operator';
  await loadConsole();
}

async function loadConsole() {
  let tenants, plans;
  try { [tenants, plans] = await Promise.all([ api('/api/platform/tenants'), api('/api/platform/plans') ]); }
  catch (e) {
    if (e.code === 'PERMISSION_DENIED' || e.status === 403) return showGate('⛔', 'Bukan operator platform', `Akun "${state.user?.username || ''}" tidak punya akses control plane. Hubungi PT Singularity Teknofastindo.`, false);
    return showGate('⚠️', 'Gagal memuat', e.message, false);
  }
  plansCache = plans.items || [];
  $('gate').hidden = true; $('console').hidden = false;
  const items = tenants.items || [];
  renderStats(items); renderTenants(items); renderPlans(plansCache); fillPlanSelect(plansCache);
  loadAudit();
}

async function loadAudit() {
  const body = $('auditBody');
  try {
    const items = (await api('/api/platform/audit')).items || [];
    if (!items.length) { body.innerHTML = '<tr><td colspan="5" class="muted">Belum ada aktivitas.</td></tr>'; return; }
    body.innerHTML = items.map((a) => {
      const tenant = a.tenant_code ? esc(a.tenant_code) : (a.entity_id ? esc(String(a.entity_id).slice(0, 8)) : '—');
      const detail = a.new_value ? esc(JSON.stringify(a.new_value)).slice(0, 90) : '';
      return `<tr><td class="when">${fmtDateTime(a.occurred_at)}</td><td><span class="audit-act">${esc(a.action)}</span></td><td class="t-code">${tenant}</td><td>${esc(a.actor || '—')}</td><td class="audit-detail">${detail}</td></tr>`;
    }).join('');
  } catch (e) { body.innerHTML = `<tr><td colspan="5" class="muted">Gagal memuat audit: ${esc(e.message)}</td></tr>`; }
}

function renderStats(items) {
  const total = items.length;
  const active = items.filter(t => t.status === 'active').length;
  const suspended = items.filter(t => t.status === 'suspended').length;
  const other = total - active - suspended;
  $('statRow').innerHTML = [
    ['Total tenant', total, ''], ['Aktif', active, 'ok'], ['Suspended', suspended, 'warn'], ['Lainnya', other, 'accent']
  ].map(([k, v, c]) => `<div class="stat"><div class="k">${k}</div><div class="v ${c}">${v}</div></div>`).join('');
}

function renderTenants(items) {
  const body = $('tenantsBody');
  if (!items.length) { body.innerHTML = '<tr><td colspan="7" class="muted">Belum ada tenant.</td></tr>'; return; }
  body.innerHTML = items.map((t) => {
    const st = esc(t.status || 'unknown');
    const toggle = t.status === 'active'
      ? `<button class="btn btn-sm btn-ghost" data-act="suspend" data-id="${esc(t.id)}">Suspend</button>`
      : `<button class="btn btn-sm btn-primary" data-act="activate" data-id="${esc(t.id)}">Activate</button>`;
    return `<tr>
      <td class="t-code">${esc(t.code)}</td>
      <td class="t-name">${esc(t.name)}</td>
      <td><span class="badge ${st}">${st}</span></td>
      <td>${esc(t.isolation || 'pooled')}</td>
      <td>${esc(t.primary_domain || '—')}</td>
      <td>${fmtDate(t.created_at)}</td>
      <td class="col-act"><div class="row-act"><button class="btn btn-sm" data-detail data-id="${esc(t.id)}">Detail</button>${toggle}</div></td>
    </tr>`;
  }).join('');
}

function renderPlans(plans) {
  $('plansRow').innerHTML = plans.map((p) => {
    const price = p.price_monthly != null ? `${Number(p.price_monthly).toLocaleString('id-ID')} <small>${esc(p.currency || 'IDR')}/bln</small>` : '<small>custom</small>';
    const ent = p.entitlements || {};
    const mods = Array.isArray(ent.modules) ? ent.modules : [];
    const modText = mods.includes('*') ? 'Semua modul' : (mods.length ? mods.join(', ') : '—');
    const seats = ent.maxUsers != null ? `${ent.maxUsers} user` : '';
    return `<div class="plan-card">
      <h3>${esc(p.name)}</h3>
      <div class="price">${price}</div>
      <div class="ent"><span class="pill">${esc(modText)}</span>${seats ? `<span class="pill">${esc(seats)}</span>` : ''}${p.active ? '' : '<span class="pill">nonaktif</span>'}</div>
    </div>`;
  }).join('') || '<div class="muted">Tidak ada paket.</div>';
}

function fillPlanSelect(plans) {
  $('obPlan').innerHTML = plans.filter((p) => p.active).map((p) => `<option value="${esc(p.code)}">${esc(p.name)}</option>`).join('');
}

function fmtDateTime(x) { if (!x) return '—'; try { return new Date(x).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return x; } }

// ── Tenant detail drawer ────────────────────────────────────────────────────
let drawerTenantId = null;
async function openDrawer(id) {
  drawerTenantId = id;
  $('drawer').hidden = false; $('drawerBackdrop').hidden = false;
  $('drawerBody').innerHTML = '<div class="muted">Memuat…</div>';
  try { renderDrawer(await api(`/api/platform/tenants/${id}/summary`)); }
  catch (e) { $('drawerBody').innerHTML = `<div class="muted">Gagal memuat: ${esc(e.message)}</div>`; }
}
function closeDrawer() { $('drawer').hidden = true; $('drawerBackdrop').hidden = true; drawerTenantId = null; }

function renderDrawer(s) {
  const t = s.tenant || {}, sub = s.subscription, u = s.users || {}, ids = s.identities || {};
  $('drawerCode').textContent = t.code || '—';
  $('drawerName').textContent = t.name || 'Tenant';
  const f = (k, v) => `<div class="d-field"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  const st = esc(t.status || 'unknown');
  const ent = (sub && sub.entitlements) || {};
  const mods = Array.isArray(ent.modules) ? ent.modules : [];
  const modText = mods.includes('*') ? '<span class="d-pill">Semua modul</span>' : (mods.length ? mods.map((m) => `<span class="d-pill">${esc(m)}</span>`).join('') : '—');
  const owners = (s.owners || []).map((o) => `<div class="d-owner"><span><strong>${esc(o.username)}</strong></span><span class="em">${esc(o.email || '—')}</span></div>`).join('') || '<div class="muted">—</div>';
  const activity = (s.activity || []).map((a) => `<li><span>${esc(a.action)}</span><span class="when">${fmtDateTime(a.created_at)}</span></li>`).join('') || '<li class="muted">Belum ada aktivitas.</li>';
  const planOpts = plansCache.map((p) => `<option value="${esc(p.code)}"${sub && sub.plan_code === p.code ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  $('drawerBody').innerHTML = `
    <div class="d-sec"><h3>Info</h3><div class="d-grid">
      ${f('Status', `<span class="badge ${st}">${st}</span>`)}${f('Isolasi', esc(t.isolation || 'pooled'))}
      ${f('Residency', esc(t.residency || 'ID'))}${f('Domain', esc(t.primary_domain || '—'))}
      ${f('Workspace', esc((t.code || '') + '.singularity.id'))}${f('Dibuat', fmtDate(t.created_at))}
    </div></div>
    <div class="d-sec"><h3>Langganan</h3><div class="d-grid">
      ${f('Paket', esc(sub ? (sub.plan_name || sub.plan_code) : '—'))}${f('Status', esc(sub ? sub.status : '—'))}
      ${f('Trial s/d', sub && sub.trial_ends_at ? fmtDate(sub.trial_ends_at) : '—')}${f('Periode s/d', sub && sub.current_period_end ? fmtDate(sub.current_period_end) : '—')}
    </div><div class="plan-change"><select id="drawerPlan">${planOpts}</select><button class="btn btn-primary btn-sm" id="drawerPlanBtn" type="button">Ubah paket</button></div></div>
    <div class="d-sec"><h3>Entitlement</h3><div>${modText}${ent.maxUsers != null ? `<span class="d-pill">${ent.maxUsers} user</span>` : ''}</div></div>
    <div class="d-sec"><h3>Penagihan &amp; pemakaian</h3><div id="drawerBilling" class="d-bill"><div class="bill-empty">Memuat…</div></div></div>
    <div class="d-sec"><h3>Pengguna — ${u.total || 0} total · ${u.owners || 0} owner · ${u.active || 0} aktif</h3>${owners}</div>
    <div class="d-sec"><h3>Login sosial</h3><div>${ids.total || 0} identitas tertaut · ${ids.providers || 0} provider</div></div>
    <div class="d-sec"><h3>Aktivitas</h3><ul class="d-act">${activity}</ul></div>`;
  $('drawerPlanBtn')?.addEventListener('click', async () => {
    const planCode = $('drawerPlan').value, btn = $('drawerPlanBtn'); btn.disabled = true;
    try { await apiMutate(`/api/platform/tenants/${drawerTenantId}/subscription`, { planCode, status: sub ? sub.status : 'trial' }); toast('Paket diperbarui.', 'ok'); await openDrawer(drawerTenantId); await loadConsole(); }
    catch (e) { toast(e.message || 'Gagal mengubah paket.', 'err'); btn.disabled = false; }
  });
  loadBilling(drawerTenantId);
}

// Billing & usage — lazy-loaded into the drawer's #drawerBilling slot.
async function loadBilling(id) {
  const slot = $('drawerBilling'); if (!slot || drawerTenantId !== id) return;
  try {
    const [usage, inv] = await Promise.all([
      api(`/api/platform/tenants/${id}/usage`),
      api(`/api/platform/tenants/${id}/invoices`)
    ]);
    if (drawerTenantId !== id) return; // drawer changed while loading
    slot.innerHTML = renderBilling(usage, inv.items || []);
  } catch (e) { slot.innerHTML = `<div class="bill-empty">Gagal memuat penagihan: ${esc(e.message)}</div>`; }
}

function renderBilling(usage, invoices) {
  const u = usage.usage || {}, meters = usage.meters || [], period = usage.period || '';
  const usageHtml = meters.length ? `<div class="bill-meters">${meters.map((m) => {
    const used = Number(u[m.metric] || 0), inc = Number(m.included_qty), over = Math.max(0, used - inc);
    const pct = inc > 0 ? Math.min(100, Math.round(used / inc * 100)) : (used > 0 ? 100 : 0);
    return `<div class="mtr${over > 0 ? ' over' : ''}"><div class="mtr-top"><b>${esc(m.label)}</b><span>${used} / ${inc} ${esc(m.unit)}${over > 0 ? ` · +${over} overage` : ''}</span></div><progress class="mtr-bar" max="100" value="${pct}"></progress></div>`;
  }).join('')}</div>` : '<div class="bill-empty">Kontrak kustom — tanpa meter overage.</div>';
  const invHtml = invoices.length ? `<div class="inv-list">${invoices.map((iv) => {
    const st = esc(iv.status);
    const act = iv.status === 'issued'
      ? `<div class="inv-act"><button class="btn btn-sm btn-primary" data-inv-pay="${esc(iv.id)}">Tandai lunas</button><button class="btn btn-sm btn-ghost" data-inv-void="${esc(iv.id)}">Void</button></div>`
      : '';
    return `<div class="inv-card"><div class="inv-main"><div class="inv-no">${esc(iv.invoice_number)}</div><div class="inv-per">Periode ${fmtDate(iv.period_start)}${iv.paid_at ? ` · lunas ${fmtDate(iv.paid_at)}` : ''}</div></div><div class="inv-side"><div class="inv-amt">${fmtIDR(iv.total)}</div><span class="badge inv-${st}">${st}</span></div>${act}</div>`;
  }).join('')}</div>` : '<div class="bill-empty">Belum ada invoice.</div>';
  return `<div class="bill-usage-head">Pemakaian ${esc(period)}</div>${usageHtml}
    <div class="bill-gen"><button class="btn btn-primary btn-sm" data-inv-gen>Terbitkan invoice ${esc(period)}</button></div>
    ${invHtml}`;
}

// Status toggle + detail (event delegation).
document.addEventListener('click', async (e) => {
  const detail = e.target.closest('[data-detail]');
  if (detail) { openDrawer(detail.dataset.id); return; }

  // Billing actions (drawer) — buttons carry data-inv-* (not data-act).
  const gen = e.target.closest('[data-inv-gen]');
  if (gen && drawerTenantId) {
    gen.disabled = true;
    try { const iv = await apiMutate(`/api/platform/tenants/${drawerTenantId}/invoices`, {}); toast(iv.reused ? `Invoice ${iv.invoice_number} sudah ada untuk periode ini.` : `Invoice ${iv.invoice_number} diterbitkan.`, 'ok'); await loadBilling(drawerTenantId); loadAudit(); }
    catch (err) { toast(err.message || 'Gagal menerbitkan invoice.', 'err'); gen.disabled = false; }
    return;
  }
  const payBtn = e.target.closest('[data-inv-pay]');
  if (payBtn && drawerTenantId) {
    payBtn.disabled = true;
    try { await apiMutate(`/api/platform/invoices/${payBtn.dataset.invPay}/pay`, {}); toast('Invoice ditandai lunas.', 'ok'); await loadBilling(drawerTenantId); loadAudit(); }
    catch (err) { toast(err.message || 'Gagal menandai lunas.', 'err'); payBtn.disabled = false; }
    return;
  }
  const voidBtn = e.target.closest('[data-inv-void]');
  if (voidBtn && drawerTenantId) {
    voidBtn.disabled = true;
    try { await apiMutate(`/api/platform/invoices/${voidBtn.dataset.invVoid}/void`, {}); toast('Invoice di-void.', 'ok'); await loadBilling(drawerTenantId); loadAudit(); }
    catch (err) { toast(err.message || 'Gagal void invoice.', 'err'); voidBtn.disabled = false; }
    return;
  }

  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.dataset.id, act = btn.dataset.act;
  const status = act === 'suspend' ? 'suspended' : 'active';
  btn.disabled = true;
  try { await apiMutate(`/api/platform/tenants/${id}/status`, { status }); toast(`Tenant di-${act === 'suspend' ? 'suspend' : 'aktifkan'}.`, 'ok'); await loadConsole(); }
  catch (err) { toast(err.message || 'Gagal mengubah status.', 'err'); btn.disabled = false; }
});

$('btnRefresh').addEventListener('click', loadConsole);
$('btnRefreshAudit').addEventListener('click', loadAudit);
$('drawerClose').addEventListener('click', closeDrawer);
$('drawerBackdrop').addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('drawer').hidden) closeDrawer(); });
$('btnToggleOnboard').addEventListener('click', () => { $('onboardForm').hidden = !$('onboardForm').hidden; if (!$('onboardForm').hidden) $('obCompany').focus(); });
$('btnCancelOnboard').addEventListener('click', () => { $('onboardForm').hidden = true; });

$('onboardForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submit = e.target.querySelector('button[type=submit]');
  // provisionTenant reads { code, name, isolation }; onboard also takes owner* + planCode.
  const payload = {
    name: $('obCompany').value.trim(),
    code: $('obCode').value.trim(),
    ownerUsername: $('obUser').value.trim(),
    ownerDisplayName: $('obDisplay').value.trim(),
    ownerPassword: $('obPass').value,
    planCode: $('obPlan').value
  };
  if (payload.name.length < 2) return toast('Nama perusahaan minimal 2 karakter.', 'err');
  if (!/^[A-Za-z0-9-]+$/.test(payload.code)) return toast('Kode organisasi hanya huruf, angka, tanda hubung.', 'err');
  if (payload.ownerPassword.length < 12) return toast('Kata sandi owner minimal 12 karakter.', 'err');
  submit.disabled = true;
  try {
    const r = await apiMutate('/api/platform/onboard', payload);
    toast(`Tenant "${r.tenant?.code || payload.code}" berhasil dibuat.`, 'ok');
    e.target.reset(); $('onboardForm').hidden = true;
    await loadConsole();
  } catch (err) { toast(err.message || 'Gagal onboard tenant.', 'err'); }
  finally { submit.disabled = false; }
});

boot();
