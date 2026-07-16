'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  const organizationPage = {
    permission: 'organization.view',
    async render(main, _p, signal) {
      const org = await api('/api/organization', { signal });
      const base = `/api/organization/${org.id}`;
      const [hierarchy, assets, signatories, tax, banks] = await Promise.all([
        api(`${base}/hierarchy`, { signal }), api(`${base}/assets`, { signal }), api(`${base}/signatories`, { signal }),
        api(`${base}/tax-identities`, { signal }), api(`${base}/bank-accounts`, { signal })
      ]);
      const count = (items) => (items || []).length;
      main.innerHTML = pageHead({
        eyebrow: 'ENTERPRISE ORGANIZATION', title: org.tradeName || org.legalName,
        sub: `${org.code} · ${org.lifecycleStatus} · versi master ${org.mdmVersion}`,
        actions: can('organization.edit') && state.user?.role === 'owner' ? `<button class="btn primary" id="orgEdit">${ICONS.gear} Edit identitas</button>` : ''
      }) + `
        <section class="kpi-grid">
          <article class="kpi"><span>Data lengkap</span><strong>${Number(org.completeness?.score || 0)}%</strong><small>${Number(org.completeness?.completed || 0)} dari ${Number(org.completeness?.total || 0)} atribut wajib</small></article>
          <article class="kpi"><span>Cabang & lokasi</span><strong>${count(hierarchy.branches) + count(hierarchy.workLocations)}</strong><small>${count(hierarchy.plants)} plant · ${count(hierarchy.warehouses)} gudang</small></article>
          <article class="kpi"><span>Struktur biaya</span><strong>${count(hierarchy.departments)}</strong><small>${count(hierarchy.costCenters)} cost center · ${count(hierarchy.profitCenters)} profit center</small></article>
          <article class="kpi"><span>Governance</span><strong>${count(assets) + count(signatories)}</strong><small>${count(tax)} identitas pajak · ${count(banks)} rekening</small></article>
        </section>
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">IDENTITAS RESMI</p><h2>Legal entity</h2></div>${chip(org.lifecycleStatus)}</header><div class="panel-body"><dl class="detail-dl">
            <div><dt>Nama legal</dt><dd>${esc(org.legalName || '—')}</dd></div><div><dt>Nama dagang</dt><dd>${esc(org.tradeName || '—')}</dd></div>
            <div><dt>Bidang usaha</dt><dd>${esc(org.businessField || '—')}</dd></div><div><dt>NPWP</dt><dd>${esc(org.npwp || '—')}</dd></div>
            <div><dt>Email</dt><dd>${esc(org.email || '—')}</dd></div><div><dt>Telepon / WhatsApp</dt><dd>${esc([org.phone, org.whatsapp].filter(Boolean).join(' · ') || '—')}</dd></div>
            <div><dt>Alamat legal</dt><dd>${esc(org.legalAddress || '—')}</dd></div><div><dt>Alamat operasional</dt><dd>${esc(org.operationalAddress || '—')}</dd></div>
          </dl></div></article>
          <article class="panel"><header><div><p class="eyebrow">HIERARKI</p><h2>Struktur terkendali</h2></div></header><div class="panel-body stack">
            ${[['Business unit',hierarchy.businessUnits],['Cabang',hierarchy.branches],['Departemen',hierarchy.departments],['Plant',hierarchy.plants],['Gudang',hierarchy.warehouses],['Work location',hierarchy.workLocations],['Ledger',hierarchy.ledgers],['Kalender fiskal',hierarchy.fiscalCalendars]].map(([label,items])=>`<div class="stat-row"><span>${esc(label)}</span><b>${count(items)} unit</b></div>`).join('')}
          </div></article>
        </section>
        <section class="panel table-panel"><header><div><p class="eyebrow">TREASURY CONTROL</p><h2>Rekening perusahaan</h2></div>${can('organization.edit') ? `<button class="btn primary sm" id="orgBankAdd">${ICONS.plus} Ajukan rekening</button>` : ''}</header>
          <div class="table-wrap"><table><thead><tr><th>Bank</th><th>Nomor rekening</th><th>Tujuan</th><th>Status</th><th>Efektif</th><th></th></tr></thead><tbody>${banks.length ? banks.map(b=>`<tr><td><b>${esc(b.bankName)}</b><small>${esc(b.accountHolder)}</small></td><td>${esc(b.accountNumber)}</td><td>${esc(b.currency)} · ${esc(b.usagePurpose)}</td><td>${chip(b.verificationStatus)}</td><td>${fmtDate(b.effectiveFrom)}</td><td class="right">${b.verificationStatus==='PENDING_VERIFICATION'&&can('organization.approve')?`<button class="btn secondary sm" data-org-bank="${esc(b.id)}">Periksa</button>`:''}</td></tr>`).join('') : '<tr><td colspan="6"><div class="empty-state"><h3>Belum ada rekening terverifikasi</h3><p>Ajukan rekening dan selesaikan maker–checker sebelum digunakan pada dokumen.</p></div></td></tr>'}</tbody></table></div>
        </section>
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">PAJAK & LEGAL</p><h2>Identitas resmi</h2></div>${can('organization.edit')?`<button class="btn secondary sm" id="orgTaxAdd">${ICONS.plus} Tambah</button>`:''}</header><div class="panel-body stack">${tax.map(x=>`<div class="stat-row"><span><b>${esc(x.identityType)}</b><small>${esc(x.registeredName || '')}</small></span><b>${esc(x.identityNumber)}</b></div>`).join('') || '<p class="muted">Belum ada identitas pajak.</p>'}</div></article>
          <article class="panel"><header><div><p class="eyebrow">BRAND & OTORISASI</p><h2>Aset dan penandatangan</h2></div></header><div class="panel-body stack"><div class="stat-row"><span>Logo, kop, stempel, tanda tangan</span><b>${assets.length} aset</b></div><div class="stat-row"><span>Authorized signatory</span><b>${signatories.length} orang</b></div><p class="muted">Versi aktif disimpan sebagai snapshot pada saat dokumen dibuat sehingga histori tidak berubah.</p></div></article>
        </section>`;

      main.querySelector('#orgEdit')?.addEventListener('click', async()=>{const value=await formDialog({title:'Edit identitas legal entity',description:'Gunakan sumber dokumen resmi. Perubahan menaikkan versi master.',initial:org,fields:[{name:'legalName',label:'Nama legal',required:true},{name:'tradeName',label:'Nama dagang'},{name:'businessField',label:'Bidang usaha'},{name:'tagline',label:'Tagline'},{name:'npwp',label:'NPWP'},{name:'phone',label:'Telepon'},{name:'whatsapp',label:'WhatsApp'},{name:'email',label:'Email',type:'email'},{name:'website',label:'Website'},{name:'legalAddress',label:'Alamat legal',type:'textarea'},{name:'operationalAddress',label:'Alamat operasional',type:'textarea'},{name:'documentFooter',label:'Footer dokumen',type:'textarea'}],submitLabel:'Lanjut verifikasi'});if(!value)return;const verify=await actionDialog({title:'Verifikasi perubahan identitas',description:'PIN Owner dan alasan wajib untuk audit trail.',requireReason:true,requirePin:true,confirmLabel:'Simpan versi baru'});if(!verify)return;try{await api(base,{method:'PATCH',body:{...value,...verify}});toast('Identitas organisasi diperbarui');this.render(main);}catch(error){toast('Pembaruan gagal',error.message,'coral');}});
      main.querySelector('#orgBankAdd')?.addEventListener('click',async()=>{const value=await formDialog({title:'Ajukan rekening perusahaan',description:'Usulan tidak dapat dipakai sebelum disetujui Owner yang berbeda melalui PIN + MFA.',fields:[{name:'bankName',label:'Nama bank',required:true},{name:'accountNumber',label:'Nomor rekening',required:true},{name:'accountHolder',label:'Nama pemilik',required:true},{name:'currency',label:'Mata uang',value:'IDR',required:true},{name:'usagePurpose',label:'Tujuan',type:'select',options:[['OPERATING','Operasional'],['PAYROLL','Payroll'],['TAX','Pajak'],['COLLECTION','Penerimaan']],required:true},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true},{name:'isPrimary',label:'Rekening utama',type:'checkbox'},{name:'changeReason',label:'Alasan pengajuan',type:'textarea',required:true}],submitLabel:'Kirim usulan'});if(!value)return;try{await api(`${base}/bank-accounts`,{method:'POST',body:value,idempotencyKey:newIdemKey()});toast('Rekening diajukan','Menunggu checker Owner yang berbeda.');this.render(main);}catch(error){toast('Pengajuan gagal',error.message,'coral');}});
      main.querySelector('#orgTaxAdd')?.addEventListener('click',async()=>{const value=await formDialog({title:'Tambah identitas pajak/legal',description:'Nomor harus bersumber dari dokumen resmi.',fields:[{name:'identityType',label:'Jenis',type:'select',options:[['NPWP','NPWP'],['NITKU','NITKU'],['PKP','PKP'],['NIB','NIB'],['OTHER','Lainnya']],required:true},{name:'identityNumber',label:'Nomor identitas',required:true},{name:'registeredName',label:'Nama terdaftar'},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true},{name:'isPrimary',label:'Identitas utama',type:'checkbox'}],submitLabel:'Simpan'});if(!value)return;try{await api(`${base}/tax-identities`,{method:'POST',body:value});toast('Identitas resmi ditambahkan');this.render(main);}catch(error){toast('Gagal',error.message,'coral');}});
      main.querySelectorAll('[data-org-bank]').forEach(btn=>btn.addEventListener('click',async()=>{const verify=await actionDialog({title:'Setujui rekening perusahaan',description:'Wajib login dengan MFA aktif dalam 10 menit terakhir. Maker dan checker harus berbeda.',requireReason:true,requirePin:true,confirmLabel:'Setujui rekening'});if(!verify)return;try{await api(`${base}/bank-accounts/${btn.dataset.orgBank}/approve`,{method:'POST',body:verify});toast('Rekening perusahaan terverifikasi');this.render(main);}catch(error){toast('Persetujuan gagal',error.message,'coral');}}));
    }
  };

  const settings = {
    permission: 'settings.view',
    async render(main, _p, signal) {
      const [s, devices] = await Promise.all([
        query('settings', () => api('/api/system/settings', { signal }), { staleMs: 1_800_000 }),
        api('/api/auth/devices', { signal })
      ]);
      const c = s.company;
      main.innerHTML = pageHead({ eyebrow: 'SISTEM', title: 'Pengaturan', sub: 'Perubahan identitas bank, pajak, dan penomoran membutuhkan PIN Owner + alasan tertulis.', actions: can('settings.edit') ? `<button class="btn primary" id="settingsEdit">${ICONS.gear} Edit profil</button>` : '' }) + `
        <section class="dashboard-grid">
          <article class="panel"><header><div><p class="eyebrow">ORGANISASI</p><h2>Profil perusahaan</h2></div></header>
            <div class="panel-body"><dl class="detail-dl">
              <div><dt>Nama</dt><dd>${esc(c.name)}</dd></div>
              <div><dt>NPWP</dt><dd>${esc(c.npwp)}</dd></div>
              <div><dt>Alamat</dt><dd>${esc(c.address)}</dd></div>
              <div><dt>Bank</dt><dd>${esc(c.bank.name)} · ${esc(c.bank.account)}</dd></div>
              <div><dt>Format penomoran</dt><dd><code>${esc(c.numberingFormat)}</code></dd></div>
              <div><dt>Tahun fiskal</dt><dd>${c.fiscalYear}</dd></div>
            </dl></div>
          </article>
          <article class="panel"><header><div><p class="eyebrow">TATA KELOLA</p><h2>Matriks persetujuan</h2></div></header>
            <div class="panel-body stack">
              ${s.approvalMatrix.map((t) => `<div class="stat-row"><span>${t.maxAmount ? `s.d. ${fmtIDRFull(t.maxAmount)}` : 'Di atas ambang sebelumnya'}</span><b>${t.levels.join(' → ')}</b></div>`).join('')}
              <p class="muted">Routing persetujuan terpusat — tidak di-hardcode pada halaman modul.</p>
            </div>
          </article>
        </section>
        <section class="panel"><header><div><p class="eyebrow">KEAMANAN</p><h2>Sesi & perangkat</h2></div>
          <button class="btn danger-outline" id="logoutAll">${ICONS.logout} Keluar dari semua perangkat</button></header>
          <div class="table-wrap"><table>
            <thead><tr><th>Perangkat</th><th>Masuk</th><th>Aktivitas terakhir</th><th>Status</th></tr></thead>
            <tbody>${devices.items.map((d) => `<tr><td><b>${esc((d.device || '').slice(0, 60))}</b></td><td>${fmtDateTime(d.createdAt)}</td><td>${relTime(d.lastSeenAt)}</td><td>${d.active ? '<span class="chip mint">Aktif</span>' : `<span class="chip gray">${esc(d.endReason || 'berakhir')}</span>`}</td></tr>`).join('')}</tbody>
          </table></div>
        </section>`;
      main.querySelector('#logoutAll').addEventListener('click', async () => {
        await api('/api/auth/logout-all', { method: 'POST' });
        window.MAT.sessionLost();
      });
      main.querySelector('#settingsEdit')?.addEventListener('click', async () => { const value = await formDialog({ title: 'Edit identitas & konfigurasi', description: 'Rekening perusahaan hanya dapat diubah melalui Organization Workbench dan workflow maker–checker.', initial: { name: c.name, npwp: c.npwp, address: c.address, numberingFormat: c.numberingFormat, fiscalYear: c.fiscalYear }, fields: [{ name: 'name', label: 'Nama perusahaan', required: true }, { name: 'npwp', label: 'NPWP' }, { name: 'address', label: 'Alamat', type: 'textarea' }, { name: 'numberingFormat', label: 'Format penomoran', required: true }, { name: 'fiscalYear', label: 'Tahun fiskal', type: 'number', min: 2000, max: 2200 }], submitLabel: 'Lanjut verifikasi' }); if (!value) return; const verify = await actionDialog({ title: 'Verifikasi perubahan', description: 'Perubahan sensitif memerlukan PIN Owner dan alasan tertulis untuk audit trail.', requireReason: true, requirePin: true, confirmLabel: 'Simpan perubahan' }); if (!verify) return; try { await api('/api/system/settings/company', { method: 'PATCH', body: { company: value, ...verify } }); invalidate('settings'); toast('Pengaturan diperbarui'); this.render(main); } catch (error) { toast('Pembaruan gagal', error.message, 'coral'); } });
    }
  };

  // ── Master detail enterprise (tab-based, R014/R015) ───────────────────────
  // Konfigurasi tab per master: judul, sub-resource endpoint, kolom, form.

  const R = router.register.bind(router);
  R('/organization', organizationPage);
  R('/system/settings', settings);
})();
