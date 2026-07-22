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
        </section>`;

      main.querySelector('#mwRefresh').addEventListener('click', () => { invalidate('my-work'); this.render(main); });
      main.querySelectorAll('[data-doc]').forEach((el) => {
        const open = () => openDrawer(el.dataset.doc, { onChange: () => { invalidate('my-work'); this.render(main); } });
        el.addEventListener('click', open);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
      });
    }
  };

  window.MAT.router.register('/my-work', myWork);
})();
