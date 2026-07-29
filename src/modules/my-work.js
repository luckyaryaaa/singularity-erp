'use strict';
// My Work (§10.7) — file modul frontend PERTAMA hasil pemecahan pages.js:
// mendaftar ke router yang sama (tanpa renderer kedua), pola §4.1/§35.3.
(() => {
  const { esc, fmtIDR, fmtDate, relTime, api, query, invalidate, router , asList } = window.MAT;
  const { ICONS, chip, pageHead, clayOrb, openDrawer, TYPE_LABEL } = window.UI;
  const t = (k, f) => (window.MAT_I18N ? window.MAT_I18N.t(k, f) : f);

  const myWork = {
    permission: 'dashboard.view',
    onEvent() { invalidate('my-work'); this.render(document.getElementById('main')); },
    async render(main, _p, signal) {
      const w = await query('my-work', () => api('/api/my-work', { signal }), { staleMs: 15_000 });

      const docRow = (d) => `
        <div class="stat-row clickable" data-doc="${esc(d.id)}" tabindex="0" role="button">
          <span><b>${esc(d.documentNumber)}</b><small class="muted"> · ${esc(TYPE_LABEL[d.documentType] || d.documentType)} · ${esc(d.title)}</small></span>
          <span>${d.amount ? `<b class="money">${fmtIDR(d.amount)}</b> ` : ''}${chip(d.status)}</span>
        </div>`;
      const section = (key, icon, tone, titleText, body, link) => `
        <article class="panel">
          <header><div class="row-inline">${clayOrb(tone, icon).replace('clay-orb', 'clay-orb sm-orb')}
            <div><p class="eyebrow">${esc(titleText)}</p><h2>${w[key].total} item</h2></div></div>
            ${link ? `<a class="text-btn" href="${link}">${t('common.open', 'Buka')} ${ICONS.arrow}</a>` : ''}</header>
          <div class="panel-body stack">${body || `<p class="muted">${t('mywork.empty', 'Tidak ada — semuanya beres.')}</p>`}</div>
        </article>`;

      // Unified Work Item engine (migrasi 077) — pekerjaan bertipe dengan aksi
      // siklus hidup, bukan sekadar agregasi dokumen.
      const WI_TYPE = { APPROVAL: 'Approval', EXCEPTION: 'Exception', REVIEW: 'Review', CORRECTION: 'Koreksi', TASK: 'Tugas', FOLLOW_UP: 'Tindak lanjut' };
      const WI_PRIO = { URGENT: 'coral', HIGH: 'amber', NORMAL: 'blue', LOW: 'gray' };
      const wiActions = (it) => {
        const b = (act, label, cls) => `<button class="btn ${cls} sm" data-wi-act="${act}" data-wi-id="${esc(it.id)}" data-wi-ver="${it.version}">${label}</button>`;
        if (it.status === 'OPEN') return b('claim', t('mywork.wi.claim', 'Klaim'), 'secondary');
        if (it.status === 'CLAIMED') return b('start', t('mywork.wi.start', 'Mulai'), 'secondary') + b('complete', t('mywork.wi.done', 'Selesai'), 'primary');
        if (it.status === 'IN_PROGRESS') return b('complete', t('mywork.wi.done', 'Selesai'), 'primary') + b('return', t('mywork.wi.return', 'Kembalikan'), 'secondary');
        if (it.status === 'RETURNED') return b('start', t('mywork.wi.rework', 'Kerjakan lagi'), 'secondary');
        return '';
      };
      const wiRow = (it) => `
        <div class="stat-row">
          <span><b>${esc(it.title)}</b><small class="muted"> · ${esc(WI_TYPE[it.itemType] || it.itemType)}${it.dueAt ? ` · <span class="${it.overdue ? 'error-text' : 'muted'}">${t('mywork.due', 'jatuh tempo')} ${fmtDate(it.dueAt)}</span>` : ''}</small></span>
          <span class="row-inline"><span class="chip ${WI_PRIO[it.priority] || 'gray'}">${esc(it.priority)}</span>${wiActions(it)}</span>
        </div>`;
      const wiGroup = (label, items) => items && items.length ? `<p class="eyebrow">${esc(label)}</p>${items.map(wiRow).join('')}` : '';
      const wItems = w.workItems || { assignedToMe: [], claimedByMe: [], delegatedToMe: [], returnedToMe: [] };
      const wiTotal = ['assignedToMe', 'claimedByMe', 'delegatedToMe', 'returnedToMe'].reduce((n, k) => n + (wItems[k] || []).length, 0);

      main.innerHTML = pageHead({
        eyebrow: 'RUANG KERJA', title: t('mywork.title', 'My Work'),
        sub: t('mywork.sub', 'Semua yang membutuhkan perhatian Anda lintas modul, dalam satu kotak masuk.'),
        actions: `<button class="btn secondary" id="mwRefresh">${ICONS.refresh} ${t('common.refresh', 'Segarkan')}</button>`
      }) + `
        <section class="mywork-grid">
          ${section('waitingForMe', 'checkCircle', 'amber', t('mywork.waiting', 'Menunggu persetujuan saya'),
            w.waitingForMe.items.map(docRow).join(''), '#/approvals')}
          ${section('createdByMe', 'doc', 'blue', t('mywork.created', 'Dibuat saya (berjalan)'),
            w.createdByMe.items.map(docRow).join(''))}
          ${section('returnedForRevision', 'refresh', 'coral', t('mywork.revision', 'Dikembalikan untuk revisi'),
            w.returnedForRevision.items.map(docRow).join(''))}
          ${section('overdue', 'clock', 'coral', t('mywork.overdue', 'Dokumen jatuh tempo'),
            w.overdue.items.map((d) => docRow({ ...d, title: `${d.title} · jatuh tempo ${fmtDate(d.dueDate)}` })).join(''))}
          ${section('failedJobs', 'job', 'lavender', t('mywork.failedjobs', 'Job latar belakang gagal'),
            w.failedJobs.items.map((j) => `
              <div class="stat-row"><span><b>${esc(j.label || j.jobType)}</b><small class="muted"> · ${relTime(j.createdAt)}</small><br><small class="error-text">${esc((j.error || '').slice(0, 90))}</small></span>${chip(j.status)}</div>`).join(''), '#/system/jobs')}
          ${section('actionRequired', 'bell', 'mint', t('mywork.actions', 'Notifikasi perlu tindakan'),
            w.actionRequired.items.map((n) => `
              <div class="stat-row"><span><b>${esc(n.title)}</b><small class="muted"> · ${relTime(n.createdAt)}</small></span>${n.link ? `<a class="btn secondary sm" href="${esc(n.link)}">${t('common.open', 'Buka')}</a>` : ''}</div>`).join(''), '#/notifications')}
        </section>
        <section class="panel" id="workItemsPanel">
          <header><div class="row-inline">${clayOrb('mint', 'checkCircle').replace('clay-orb', 'clay-orb sm-orb')}
            <div><p class="eyebrow">${t('mywork.wi.eyebrow', 'WORK ITEM')}</p><h2>${wiTotal} ${t('mywork.wi.active', 'item aktif')}</h2></div></div></header>
          <div class="panel-body stack">
            ${wiGroup(t('mywork.wi.assigned', 'Ditugaskan ke saya'), wItems.assignedToMe)}
            ${wiGroup(t('mywork.wi.claimed', 'Sedang saya kerjakan'), wItems.claimedByMe)}
            ${wiGroup(t('mywork.wi.delegated', 'Didelegasikan ke saya'), wItems.delegatedToMe)}
            ${wiGroup(t('mywork.wi.returned', 'Dikembalikan untuk revisi'), wItems.returnedToMe)}
            ${wiTotal === 0 ? `<p class="muted">${t('mywork.empty', 'Tidak ada — semuanya beres.')}</p>` : ''}
          </div>
        </section>`;

      main.querySelector('#mwRefresh').addEventListener('click', () => { invalidate('my-work'); this.render(main); });
      main.querySelectorAll('[data-doc]').forEach((el) => {
        const open = () => openDrawer(el.dataset.doc, { onChange: () => { invalidate('my-work'); this.render(main); } });
        el.addEventListener('click', open);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
      });
      main.querySelectorAll('[data-wi-act]').forEach((el) => el.addEventListener('click', async () => {
        const id = el.dataset.wiId, version = Number(el.dataset.wiVer), act = el.dataset.wiAct;
        try {
          const opts = { method: 'POST', body: { version } };
          if (act === 'return') {
            const ans = await window.UI.actionDialog({ title: t('mywork.wi.return', 'Kembalikan'), description: t('mywork.wi.returnHint', 'Alasan minimal 10 karakter, tercatat di audit.'), requireReason: true, confirmLabel: t('mywork.wi.return', 'Kembalikan') });
            if (!ans) return;
            if (String(ans.reason || '').trim().length < 10) { window.UI.toast?.(t('common.reasonShort', 'Alasan terlalu singkat'), t('mywork.wi.min10', 'Isi minimal 10 karakter.'), 'coral'); return; }
            opts.body.reason = ans.reason;
          }
          if (act === 'complete') opts.idempotencyKey = window.MAT.newIdemKey();
          await api(`/api/work-items/${id}/${act}`, opts);
          invalidate('my-work'); this.render(main);
        } catch (error) { window.UI.toast?.(t('mywork.wi.failed', 'Gagal memperbarui work item'), error.message, 'coral'); }
      }));
    }
  };

  window.MAT.router.register('/my-work', myWork);
})();
