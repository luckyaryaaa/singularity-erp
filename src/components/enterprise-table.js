'use strict';
// Enterprise View Console: server pagination, URL-synced state, saved views,
// column chooser, density, sorting, accessible row actions, and empty states.
(() => {
  const { esc, api, query, debounce, state } = window.MAT;
  const { ICONS, STATUS_META, formDialog, toast } = window.UI;

  const json = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
  const keyOf = (column, index) => column.key || column.sort || String(column.label || `column-${index}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const storageKey = (key) => `mat.erp.table.views.${key}`;
  const loadViews = (key) => { try { const value = json(localStorage.getItem(storageKey(key)), []); return Array.isArray(value) ? value : []; } catch { return []; } };
  const saveViews = (key, views) => { try { localStorage.setItem(storageKey(key), JSON.stringify(views.slice(-12))); } catch { /* private mode */ } };

  function dataTable(container, config) {
    const uid = `tbl${Math.random().toString(36).slice(2, 8)}`;
    const columns = config.columns.map((column, index) => ({ ...column, key: keyOf(column, index) }));
    const route = state.route || (location.hash.slice(1).split('?')[0] || '/dashboard');
    const routeQuery = new URLSearchParams(state.routeQuery || '');
    const requestedColumns = (routeQuery.get('columns') || '').split(',').filter(Boolean);
    let visible = new Set(requestedColumns.length ? requestedColumns.filter((key) => columns.some((c) => c.key === key)) : columns.map((c) => c.key));
    if (!visible.size) visible = new Set(columns.map((c) => c.key));
    let queryState = {
      page: Math.max(1, Number(routeQuery.get('page')) || 1),
      limit: Math.min(50, Math.max(10, Number(routeQuery.get('limit')) || config.limit || 25)),
      q: routeQuery.get('q') || '', status: routeQuery.get('status') || '',
      sort: routeQuery.get('sort') || config.sort || 'updatedAt:desc',
      density: ['comfortable', 'compact'].includes(routeQuery.get('density')) ? routeQuery.get('density') : 'comfortable'
    };
    let abort = null; let views = loadViews(config.key);

    const visibleColumns = () => columns.filter((column) => visible.has(column.key));
    const syncUrl = () => {
      const params = new URLSearchParams(state.routeQuery || '');
      ['page', 'limit', 'q', 'status', 'sort', 'density', 'columns'].forEach((key) => params.delete(key));
      if (queryState.page > 1) params.set('page', queryState.page);
      if (queryState.limit !== (config.limit || 25)) params.set('limit', queryState.limit);
      if (queryState.q) params.set('q', queryState.q);
      if (queryState.status) params.set('status', queryState.status);
      if (queryState.sort !== (config.sort || 'updatedAt:desc')) params.set('sort', queryState.sort);
      if (queryState.density !== 'comfortable') params.set('density', queryState.density);
      if (visible.size !== columns.length) params.set('columns', [...visible].join(','));
      state.routeQuery = params;
      history.replaceState(null, '', `#${route}${params.size ? `?${params}` : ''}`);
    };

    const extraClass = String(config.className || '').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
    container.innerHTML = `
      <div class="panel table-panel enterprise-table ${queryState.density === 'compact' ? 'density-compact' : ''} ${extraClass}" data-enterprise-table>
        <header>
          <div><p class="eyebrow">${esc(config.eyebrow || 'DAFTAR')}</p><h2>${esc(config.title)}</h2></div>
          <div class="panel-tools">
            ${config.searchable !== false ? `<label class="mini-search">${ICONS.search}<span class="sr-only">Cari ${esc(config.title)}</span><input id="${uid}-q" name="tableSearch" value="${esc(queryState.q)}" placeholder="Cari…" autocomplete="off"></label>` : ''}
            ${config.statusFilter ? `<select id="${uid}-status" class="select" aria-label="Filter status"><option value="">Semua status</option>${config.statusFilter.map((status) => `<option value="${esc(status)}" ${queryState.status === status ? 'selected' : ''}>${esc((STATUS_META[status] || [status])[0])}</option>`).join('')}</select>` : ''}
            <details class="view-console">
              <summary class="btn secondary sm">${ICONS.filter} Tampilan</summary>
              <div class="view-console-popover" role="group" aria-label="Pengaturan tampilan tabel">
                <label><span>Saved view</span><select data-view aria-label="Pilih saved view"><option value="">Tampilan saat ini</option></select></label>
                <div class="view-console-actions"><button class="btn secondary sm" type="button" data-save-view>Simpan</button><button class="btn ghost sm" type="button" data-delete-view disabled>Hapus</button></div>
                <label><span>Kepadatan</span><select data-density aria-label="Kepadatan baris"><option value="comfortable" ${queryState.density === 'comfortable' ? 'selected' : ''}>Nyaman</option><option value="compact" ${queryState.density === 'compact' ? 'selected' : ''}>Ringkas</option></select></label>
                <fieldset><legend>Kolom</legend>${columns.map((column) => `<label class="view-column"><input type="checkbox" data-column="${esc(column.key)}" ${visible.has(column.key) ? 'checked' : ''}><span>${esc(column.label || 'Kolom')}</span></label>`).join('')}</fieldset>
              </div>
            </details>
            ${config.toolbar || ''}
          </div>
        </header>
        <div class="table-wrap"><table><thead id="${uid}-head"></thead><tbody id="${uid}-body"></tbody></table></div>
        <footer><span id="${uid}-info" aria-live="polite"></span><div id="${uid}-pager" class="pager" aria-label="Navigasi halaman"></div></footer>
      </div>`;

    const panel = container.querySelector('[data-enterprise-table]');
    const head = container.querySelector(`#${uid}-head`), body = container.querySelector(`#${uid}-body`);
    const info = container.querySelector(`#${uid}-info`), pager = container.querySelector(`#${uid}-pager`);
    const viewSelect = container.querySelector('[data-view]'), deleteView = container.querySelector('[data-delete-view]');

    const renderViewOptions = () => { viewSelect.innerHTML = '<option value="">Tampilan saat ini</option>' + views.map((view) => `<option value="${esc(view.id)}">${esc(view.name)}</option>`).join(''); };
    const renderHeader = () => {
      const active = visibleColumns();
      head.innerHTML = `<tr>${active.map((column) => {
        const [sortKey, direction] = queryState.sort.split(':');
        const aria = column.sort && sortKey === column.sort ? ` aria-sort="${direction === 'asc' ? 'ascending' : 'descending'}"` : '';
        return `<th${column.right ? ' class="right"' : ''}${aria}>${column.sort ? `<button type="button" class="sort-button" data-sort="${esc(column.sort)}">${esc(column.label)}${sortKey === column.sort ? `<span aria-hidden="true">${direction === 'asc' ? '↑' : '↓'}</span>` : ''}</button>` : esc(column.label)}</th>`;
      }).join('')}</tr>`;
      head.querySelectorAll('[data-sort]').forEach((button) => button.addEventListener('click', () => {
        const [current, direction] = queryState.sort.split(':');
        queryState.sort = `${button.dataset.sort}:${current === button.dataset.sort && direction === 'asc' ? 'desc' : 'asc'}`;
        queryState.page = 1; syncUrl(); load();
      }));
      body.innerHTML = `<tr><td colspan="${active.length}" class="table-loading"><span class="spinner"></span> Memuat data…</td></tr>`;
    };

    async function load(force = false) {
      if (abort) abort.abort(); abort = new AbortController();
      const params = new URLSearchParams({ ...config.params, page: queryState.page, limit: queryState.limit, sort: queryState.sort });
      if (queryState.q) params.set('q', queryState.q); if (queryState.status) params.set('status', queryState.status);
      try {
        const data = await query(`${config.key}:${params}`, () => api(`${config.endpoint}?${params}`, { signal: abort.signal }), { staleMs: config.staleMs || 30_000, force });
        if (data) render(data);
      } catch (error) {
        if (error.name !== 'AbortError') body.innerHTML = `<tr><td colspan="${visibleColumns().length}" class="table-loading error-text">${esc(error.message)} Coba muat ulang halaman.</td></tr>`;
      }
    }

    function render(data) {
      const active = visibleColumns(); renderHeader();
      if (!data.items.length) {
        const empty = config.empty || {};
        body.innerHTML = `<tr><td colspan="${active.length}"><div class="empty-state"><div class="clay-orb blue">${ICONS[empty.icon || 'inbox']}</div><h3>${esc(empty.title || 'Belum ada data')}</h3><p>${esc(empty.hint || (queryState.q ? 'Tidak ada hasil. Ubah kata kunci atau filter status.' : 'Data akan tampil di sini setelah dibuat.'))}</p></div></td></tr>`;
      } else {
        body.innerHTML = data.items.map((row) => `<tr data-row-id="${esc(row.id)}">${active.map((column, index) => {
          const value = column.render(row);
          return `<td${column.right ? ' class="right"' : ''}>${config.onRow && index === 0 ? `<button type="button" class="table-row-action" data-open-row="${esc(row.id)}">${value}</button>` : value}</td>`;
        }).join('')}</tr>`).join('');
        if (config.onRow) {
          const open = (id) => config.onRow(data.items.find((row) => String(row.id) === String(id)), () => load(true));
          body.querySelectorAll('[data-open-row]').forEach((button) => button.addEventListener('click', () => open(button.dataset.openRow)));
          body.querySelectorAll('tr[data-row-id]').forEach((row) => row.addEventListener('click', (event) => { if (!event.target.closest('button,a,input,select')) open(row.dataset.rowId); }));
        }
      }
      info.textContent = data.total ? `Baris ${(data.page - 1) * data.limit + 1}–${Math.min(data.page * data.limit, data.total)} dari ${data.total}` : '0 baris';
      const buttons = [`<button ${data.page <= 1 ? 'disabled' : ''} data-page="${data.page - 1}" aria-label="Halaman sebelumnya">‹</button>`];
      const pages = new Set([1, data.page - 1, data.page, data.page + 1, data.totalPages].filter((page) => page >= 1 && page <= data.totalPages)); let previous = 0;
      for (const page of [...pages].sort((a, b) => a - b)) { if (page - previous > 1) buttons.push('<span class="pager-gap">…</span>'); buttons.push(`<button class="${page === data.page ? 'active' : ''}" data-page="${page}" ${page === data.page ? 'aria-current="page"' : ''}>${page}</button>`); previous = page; }
      buttons.push(`<button ${data.page >= data.totalPages ? 'disabled' : ''} data-page="${data.page + 1}" aria-label="Halaman berikutnya">›</button>`); pager.innerHTML = buttons.join('');
      if (typeof config.afterRender === 'function') config.afterRender({ container, panel, body, data });
      pager.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => { queryState.page = Number(button.dataset.page); syncUrl(); load(); }));
    }

    renderViewOptions(); renderHeader(); load();
    const search = container.querySelector(`#${uid}-q`); if (search) search.addEventListener('input', debounce(() => { queryState.q = search.value.trim(); queryState.page = 1; syncUrl(); load(); }, 400));
    const status = container.querySelector(`#${uid}-status`); if (status) status.addEventListener('change', () => { queryState.status = status.value; queryState.page = 1; syncUrl(); load(); });
    container.querySelector('[data-density]').addEventListener('change', (event) => { queryState.density = event.target.value; panel.classList.toggle('density-compact', queryState.density === 'compact'); syncUrl(); });
    container.querySelectorAll('[data-column]').forEach((checkbox) => checkbox.addEventListener('change', () => {
      if (checkbox.checked) visible.add(checkbox.dataset.column); else if (visible.size > 1) visible.delete(checkbox.dataset.column); else checkbox.checked = true;
      syncUrl(); renderHeader(); load();
    }));
    viewSelect.addEventListener('change', () => { const selected = views.find((view) => view.id === viewSelect.value); deleteView.disabled = !selected; if (!selected) return; queryState = { ...queryState, ...selected.state }; visible = new Set(selected.columns.filter((key) => columns.some((column) => column.key === key))); if (!visible.size) visible = new Set(columns.map((column) => column.key)); panel.classList.toggle('density-compact', queryState.density === 'compact'); syncUrl(); renderHeader(); load(); });
    container.querySelector('[data-save-view]').addEventListener('click', async () => { const value = await formDialog({ title: 'Simpan tampilan tabel', description: 'Filter, urutan, kolom, dan kepadatan dapat dipakai kembali pada perangkat ini.', fields: [{ name: 'name', label: 'Nama tampilan', required: true }], submitLabel: 'Simpan tampilan' }); if (!value) return; const view = { id: `view-${Date.now()}`, name: String(value.name).slice(0, 60), state: { ...queryState, page: 1 }, columns: [...visible] }; views.push(view); saveViews(config.key, views); renderViewOptions(); viewSelect.value = view.id; deleteView.disabled = false; toast('Tampilan disimpan', view.name); });
    deleteView.addEventListener('click', () => { if (!viewSelect.value) return; views = views.filter((view) => view.id !== viewSelect.value); saveViews(config.key, views); renderViewOptions(); deleteView.disabled = true; toast('Tampilan dihapus'); });
    return { reload: () => load(true), state: () => ({ ...queryState, columns: [...visible] }) };
  }

  window.UI.dataTable = dataTable;
})();
