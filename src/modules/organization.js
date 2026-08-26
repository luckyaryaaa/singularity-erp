'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey, asList } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  // P1-3 — workbench struktur organisasi. Sebelumnya halaman ini hanya
  // MENAMPILKAN jumlah unit; membuat cabang atau departemen baru sama sekali
  // tidak mungkin lewat aplikasi dan menuntut SQL langsung ke produksi.
  const STRUCTURE_TABS = [['branches','Cabang'],['business-units','Business unit'],['departments','Departemen'],
    ['cost-centers','Cost center'],['profit-centers','Profit center'],['plants','Plant'],['warehouses','Gudang']];
  // Kolom formulir per tipe. Induk diisi dari daftar yang sudah dimuat halaman
  // supaya pengguna tidak perlu menghafal UUID.
  const STRUCTURE_FORM = {
    'business-units': () => [],
    branches: (h) => [{ name:'businessUnitId', label:'Business unit', type:'select', options:[['','—'],...(h.businessUnits||[]).map(b=>[b.id,`${b.code} · ${b.name}`])] }],
    departments: (h) => [{ name:'parentId', label:'Induk departemen', type:'select', options:[['','—'],...(h.departments||[]).map(d=>[d.id,`${d.code} · ${d.name}`])] }],
    'cost-centers': (h) => [
      { name:'departmentId', label:'Departemen', type:'select', options:[['','—'],...(h.departments||[]).map(d=>[d.id,`${d.code} · ${d.name}`])] },
      { name:'branchId', label:'Cabang', type:'select', options:[['','—'],...(h.branches||[]).map(b=>[b.id,`${b.code} · ${b.name}`])] }],
    'profit-centers': () => [],
    plants: (h) => [
      { name:'branchId', label:'Cabang', type:'select', options:(h.branches||[]).map(b=>[b.id,`${b.code} · ${b.name}`]), required:true },
      { name:'plantType', label:'Tipe', type:'select', options:[['WORKSHOP','Workshop'],['FACTORY','Pabrik'],['SERVICE_CENTER','Service center']] },
      { name:'address', label:'Alamat' }],
    warehouses: (h) => [
      { name:'branchId', label:'Cabang', type:'select', options:(h.branches||[]).map(b=>[b.id,`${b.code} · ${b.name}`]), required:true },
      { name:'plantId', label:'Plant', type:'select', options:[['','—'],...(h.plants||[]).map(p=>[p.id,`${p.code} · ${p.name}`])] },
      { name:'warehouseType', label:'Tipe', type:'select', options:[['GENERAL','Umum'],['RAW_MATERIAL','Bahan baku'],['FINISHED_GOODS','Barang jadi'],['CONSIGNMENT','Konsinyasi']] }]
  };

  const organizationPage = {
    permission: 'organization.view',
    _node: 'branches',
    async render(main, _p, signal) {
      const org = await api('/api/organization', { signal });
      const base = `/api/organization/${org.id}`;
      // asList menormalkan sub-resource yang mengembalikan {items:[…]}.
      // hierarchy TIDAK boleh ikut: bentuknya {businessUnits, branches, …},
      // bukan {items}, sehingga asList mengubahnya menjadi array kosong dan
      // seluruh hitungan struktur tampil 0 walau datanya ada.
      const [hierarchy, assets, signatories, tax, banks] = await Promise.all([
        api(`${base}/hierarchy`, { signal }),
        api(`${base}/assets`, { signal }).then(asList), api(`${base}/signatories`, { signal }).then(asList),
        api(`${base}/tax-identities`, { signal }).then(asList), api(`${base}/bank-accounts`, { signal }).then(asList)
      ]);
      const count = (items) => (items || []).length;
      main.innerHTML = pageHead({
        eyebrow: 'ENTERPRISE ORGANIZATION', title: org.tradeName || org.legalName,
        sub: `${org.code} · ${org.lifecycleStatus} · versi master ${org.mdmVersion}`,
        actions: `<a class="btn secondary" href="#/organization/chart">${ICONS.grid} Bagan organisasi</a>${can('organization.edit') && state.user?.role === 'owner' ? `<button class="btn primary" id="orgEdit">${ICONS.gear} Edit identitas</button>` : ''}`
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
        <section class="panel table-panel" id="orgStructure">
          <header><div><p class="eyebrow">WORKBENCH STRUKTUR</p><h2>Kelola unit organisasi</h2></div>
            <nav class="chip-tabs" aria-label="Tipe struktur">${STRUCTURE_TABS.map(([id,label])=>`<button class="btn ${this._node===id?'primary':'secondary'} sm" data-orgnode="${id}">${esc(label)}</button>`).join('')}</nav>
            ${can('organization.create')?`<button class="btn primary sm" id="orgNodeAdd">${ICONS.plus} Tambah</button>`:''}
          </header>
          <div id="orgNodeBody" class="table-wrap"><p class="table-loading">Memuat…</p></div>
          <div class="panel-body"><p class="muted">Perubahan struktur menuntut alasan tertulis dan tercatat di audit trail. Kode tidak dapat diubah karena nomor dokumen yang sudah terbit memuatnya, dan unit yang masih dipakai tidak dapat dinonaktifkan.</p></div>
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
      // ── Workbench struktur ────────────────────────────────────────────────
      const structureBase = `${base}/structure`;
      const renderNodes = async () => {
        const body = main.querySelector('#orgNodeBody');
        if (!body) return;
        try {
          const { items } = await api(`${structureBase}/${this._node}`);
          const label = STRUCTURE_TABS.find(([id]) => id === this._node)?.[1] || this._node;
          body.innerHTML = items.length ? `<table><thead><tr><th>Kode</th><th>Nama</th><th>Status</th><th></th></tr></thead><tbody>${items.map((r) => `
            <tr><td><b>${esc(r.code)}</b></td><td>${esc(r.name)}</td>
              <td>${r.active === false ? '<span class="chip gray">Non-aktif</span>' : '<span class="chip mint">Aktif</span>'}</td>
              <td>${can('organization.edit') ? `<button class="btn secondary sm" data-orgedit="${r.id}" data-orgactive="${r.active === false ? '0' : '1'}" data-orgname="${esc(r.name)}">${r.active === false ? 'Aktifkan' : 'Nonaktifkan'}</button>` : ''}</td></tr>`).join('')}</tbody></table>`
            : `<p class="table-loading">Belum ada ${esc(label.toLowerCase())}.</p>`;
        } catch (error) { body.innerHTML = `<p class="error-text">${esc(error.message)}</p>`; }
      };
      main.querySelectorAll('[data-orgnode]').forEach((btn) => btn.addEventListener('click', () => {
        this._node = btn.dataset.orgnode; this.render(main);
      }));
      main.querySelector('#orgNodeAdd')?.addEventListener('click', async () => {
        const label = STRUCTURE_TABS.find(([id]) => id === this._node)?.[1] || this._node;
        const value = await formDialog({
          title: `Tambah ${label.toLowerCase()}`,
          description: 'Struktur organisasi menentukan penomoran dokumen, cakupan data, dan lokasi persediaan. Alasan wajib dan tercatat permanen di audit trail.',
          fields: [
            { name: 'code', label: 'Kode', required: true },
            { name: 'name', label: 'Nama', required: true },
            ...(STRUCTURE_FORM[this._node] ? STRUCTURE_FORM[this._node](hierarchy) : []),
            { name: 'reason', label: 'Alasan perubahan struktur', required: true }
          ],
          submitLabel: 'Simpan struktur'
        });
        if (!value) return;
        try { await api(`${structureBase}/${this._node}`, { method: 'POST', body: value }); toast('Struktur ditambahkan', `${value.code} · ${value.name}`); this.render(main); }
        catch (error) { toast('Gagal menambah struktur', error.message, 'coral'); }
      });
      main.addEventListener('click', async (event) => {
        const btn = event.target.closest('[data-orgedit]');
        if (!btn) return;
        const activating = btn.dataset.orgactive === '0';
        const verify = await actionDialog({
          title: `${activating ? 'Aktifkan' : 'Nonaktifkan'} ${btn.dataset.orgname}`,
          description: activating ? 'Unit akan kembali dapat dipilih pada dokumen baru.' : 'Unit yang masih dipakai dokumen, pengguna, atau turunannya tidak dapat dinonaktifkan.',
          requireReason: true, confirmLabel: activating ? 'Aktifkan' : 'Nonaktifkan', danger: !activating
        });
        if (!verify) return;
        try {
          await api(`${structureBase}/${this._node}/${btn.dataset.orgedit}`, { method: 'PATCH', body: { active: activating, reason: verify.reason } });
          toast('Struktur diperbarui', btn.dataset.orgname); this.render(main);
        } catch (error) { toast('Gagal memperbarui struktur', error.message, 'coral'); }
      });
      renderNodes();

      main.querySelectorAll('[data-org-bank]').forEach(btn=>btn.addEventListener('click',async()=>{const verify=await actionDialog({title:'Setujui rekening perusahaan',description:'Wajib login dengan MFA aktif dalam 10 menit terakhir. Maker dan checker harus berbeda.',requireReason:true,requirePin:true,confirmLabel:'Setujui rekening'});if(!verify)return;try{await api(`${base}/bank-accounts/${btn.dataset.orgBank}/approve`,{method:'POST',body:verify});toast('Rekening perusahaan terverifikasi');this.render(main);}catch(error){toast('Persetujuan gagal',error.message,'coral');}}));
    }
  };

  const settings = {
    permission: 'settings.view',
    async render(main, _p, signal) {
      const [s, devices, fin] = await Promise.all([
        query('settings', () => api('/api/system/settings', { signal }), { staleMs: 1_800_000 }),
        api('/api/auth/devices', { signal }),
        api('/api/finance-config', { signal })
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
        <section class="dashboard-grid">
          <article class="panel table-panel"><header><div><p class="eyebrow">KONFIGURASI KEUANGAN</p><h2>Peran akun</h2></div>${can('settings.edit') ? `<button class="btn secondary sm" id="roleMap">${ICONS.gear} Petakan</button>` : ''}</header>
            <div class="panel-body"><p class="muted">Laporan &amp; rekonsiliasi memakai peran ini — bukan kode akun yang ditulis di program. Mengubah pemetaan berlaku sejak tanggal efektif; periode lampau tetap memakai pemetaan lamanya.</p></div>
            <div class="table-wrap"><table><thead><tr><th>Peran</th><th>Akun</th><th>Berlaku</th></tr></thead>
            <tbody>${fin.accountRoles.map((r) => `<tr><td><b>${esc(r.roleKey)}</b></td><td>${esc(r.accountCode)}<small>${esc(r.accountName || '—')}</small></td><td>${fmtDate(r.effectiveFrom)}${r.effectiveUntil ? ` – ${fmtDate(r.effectiveUntil)}` : ''}</td></tr>`).join('')}</tbody></table></div>
          </article>
          <article class="panel table-panel"><header><div><p class="eyebrow">KONFIGURASI KEUANGAN</p><h2>Tarif pajak</h2></div>${can('settings.edit') ? `<button class="btn secondary sm" id="rateAdd">${ICONS.plus} Tarif baru</button>` : ''}</header>
            <div class="panel-body"><p class="muted">Tarif effective-dated. Perubahan regulasi dicatat sebagai tarif baru sehingga perhitungan periode lampau tidak ikut berubah.</p></div>
            <div class="table-wrap"><table><thead><tr><th>Pajak</th><th class="right">Tarif</th><th>Berlaku</th></tr></thead>
            <tbody>${fin.taxRates.map((r) => `<tr><td><b>${esc(r.taxKey)}</b><small>${esc(r.description || '')}</small></td><td class="right">${Number(r.ratePct)}%</td><td>${fmtDate(r.effectiveFrom)}${r.effectiveUntil ? ` – ${fmtDate(r.effectiveUntil)}` : ''}</td></tr>`).join('')}</tbody></table></div>
          </article>
        </section>
        <section class="panel"><header><div><p class="eyebrow">KEAMANAN</p><h2>Sesi & perangkat</h2></div>
          <button class="btn danger-outline" id="logoutAll">${ICONS.logout} Keluar dari semua perangkat</button></header>
          <div class="table-wrap"><table>
            <thead><tr><th>Perangkat</th><th>Masuk</th><th>Aktivitas terakhir</th><th>Status</th></tr></thead>
            <tbody>${devices.items.map((d) => `<tr><td><b>${esc((d.device || '').slice(0, 60))}</b></td><td>${fmtDateTime(d.createdAt)}</td><td>${relTime(d.lastSeenAt)}</td><td>${d.active ? '<span class="chip mint">Aktif</span>' : `<span class="chip gray">${esc(d.endReason || 'berakhir')}</span>`}</td></tr>`).join('')}</tbody>
          </table></div>
        </section>`;
      main.querySelector('#roleMap')?.addEventListener('click', async () => {
        const accounts = asList(await api('/api/accounting/accounts'));
        const v = await formDialog({ title: 'Petakan peran akun', description: 'Pemetaan lama otomatis ditutup sehari sebelum tanggal efektif baru sehingga laporan periode lampau tidak berubah.', fields: [
          { name: 'roleKey', label: 'Peran', type: 'select', options: [...new Set(fin.accountRoles.map((r) => r.roleKey))].map((k) => [k, k]), required: true },
          { name: 'accountCode', label: 'Akun', type: 'select', options: accounts.map((a) => [a.code, `${a.code} · ${a.name}`]), required: true },
          { name: 'effectiveFrom', label: 'Berlaku sejak', type: 'date', required: true }
        ], submitLabel: 'Simpan pemetaan' });
        if (!v) return;
        try { await api('/api/finance-config/account-roles', { method: 'POST', body: v }); toast('Peran akun diperbarui'); this.render(main); }
        catch (e) { toast('Gagal memetakan', e.detail || e.message, 'coral'); }
      });
      main.querySelector('#rateAdd')?.addEventListener('click', async () => {
        const v = await formDialog({ title: 'Tarif pajak baru', description: 'Tarif lama ditutup sehari sebelum tanggal berlaku baru — perhitungan periode lampau tetap memakai tarif lamanya.', fields: [
          { name: 'taxKey', label: 'Jenis pajak', required: true, value: 'PPN' },
          { name: 'ratePct', label: 'Tarif (%)', type: 'number', min: 0, required: true },
          { name: 'effectiveFrom', label: 'Berlaku sejak', type: 'date', required: true },
          { name: 'description', label: 'Dasar hukum / catatan' }
        ], submitLabel: 'Simpan tarif' });
        if (!v) return;
        try { await api('/api/finance-config/tax-rates', { method: 'POST', body: v }); toast('Tarif pajak disimpan'); this.render(main); }
        catch (e) { toast('Gagal menyimpan tarif', e.detail || e.message, 'coral'); }
      });
      main.querySelector('#logoutAll').addEventListener('click', async () => {
        await api('/api/auth/logout-all', { method: 'POST' });
        window.MAT.sessionLost();
      });
      main.querySelector('#settingsEdit')?.addEventListener('click', async () => { const value = await formDialog({ title: 'Edit identitas & konfigurasi', description: 'Rekening perusahaan hanya dapat diubah melalui Organization Workbench dan workflow maker–checker.', initial: { name: c.name, npwp: c.npwp, address: c.address, numberingFormat: c.numberingFormat, fiscalYear: c.fiscalYear }, fields: [{ name: 'name', label: 'Nama perusahaan', required: true }, { name: 'npwp', label: 'NPWP' }, { name: 'address', label: 'Alamat', type: 'textarea' }, { name: 'numberingFormat', label: 'Format penomoran', required: true }, { name: 'fiscalYear', label: 'Tahun fiskal', type: 'number', min: 2000, max: 2200 }], submitLabel: 'Lanjut verifikasi' }); if (!value) return; const verify = await actionDialog({ title: 'Verifikasi perubahan', description: 'Perubahan sensitif memerlukan PIN Owner dan alasan tertulis untuk audit trail.', requireReason: true, requirePin: true, confirmLabel: 'Simpan perubahan' }); if (!verify) return; try { await api('/api/system/settings/company', { method: 'PATCH', body: { company: value, ...verify } }); invalidate('settings'); toast('Pengaturan diperbarui'); this.render(main); } catch (error) { toast('Pembaruan gagal', error.message, 'coral'); } });
    }
  };

  // ── Master detail enterprise (tab-based, R014/R015) ───────────────────────
  // Konfigurasi tab per master: judul, sub-resource endpoint, kolom, form.

  const workforcePage={
    permission:'organization.view',
    async render(main,_params,signal){
      main.innerHTML=pageHead({eyebrow:'ORGANIZATION DESIGN',title:'Workforce Architecture',sub:'Hierarchy version, Job, Position, Assignment, dan delegation authority dalam satu control center.'})+`<div class="panel"><div class="panel-body"><span class="spinner"></span> Memuat struktur workforce…</div></div>`;
      const load=async()=>{const org=await api('/api/organization',{signal}),base=`/api/organization/${org.id}/workforce`;const [versions,jobs,positions,assignments,delegations,candidates]=await Promise.all([api(`${base}/hierarchy-versions`,{signal}),api(`${base}/jobs`,{signal}),api(`${base}/positions`,{signal}),api(`${base}/assignments`,{signal}),api('/api/organization/delegations',{signal}),api('/api/organization/delegation-candidates',{signal})]);
        const active=versions.items.find(x=>x.status==='ACTIVE'),pending=versions.items.filter(x=>['PENDING_APPROVAL','APPROVED'].includes(x.status));
        main.innerHTML=pageHead({eyebrow:'ORGANIZATION DESIGN',title:'Workforce Architecture',sub:'Struktur publishable dan assignment effective-dated dengan maker-checker.',actions:`${can('organization.edit')?`<button class="btn" id="delegationAdd">Delegasikan</button>${can('employee.view')?`<button class="btn" id="assignmentAdd">Assignment</button>`:''}<button class="btn" id="orgCapture">Capture hierarchy</button>`:''}${can('organization.create')?`<button class="btn" id="jobAdd">${ICONS.plus} Job</button><button class="btn primary" id="positionAdd">${ICONS.plus} Position</button>`:''}`})+
          `<section class="kpi-grid"><article class="kpi"><span>Active hierarchy</span><strong>${active?`v${active.versionNo}`:'—'}</strong><small>${active?`SHA ${String(active.snapshotSha256).slice(0,10)}…`:'Belum dipublikasikan'}</small></article><article class="kpi"><span>Job aktif</span><strong>${jobs.items.filter(x=>x.status==='ACTIVE').length}</strong><small>Katalog pekerjaan kanonis</small></article><article class="kpi"><span>Position capacity</span><strong>${positions.items.reduce((s,x)=>s+Number(x.headcount||0),0)}</strong><small>${positions.items.reduce((s,x)=>s+Number(x.occupied||0),0)} seat terisi</small></article><article class="kpi"><span>Delegation aktif</span><strong>${delegations.items.filter(x=>x.status==='ACTIVE').length}</strong><small>Time-bound dan scoped</small></article></section>
          <section class="dashboard-grid"><div class="panel table-panel"><header><div><p class="eyebrow">JOB & POSITION</p><h2>Position control</h2></div></header><div class="table-wrap"><table><thead><tr><th>Position</th><th>Job</th><th>Unit</th><th>Headcount</th><th>Status</th></tr></thead><tbody>${positions.items.map(x=>`<tr><td><b>${esc(x.name)}</b><small>${esc(x.code)}</small></td><td>${esc(x.jobTitle)}</td><td>${esc(x.departmentName||x.branchName||'—')}</td><td><b>${Number(x.occupied||0)}/${Number(x.headcount)}</b></td><td>${chip(x.status)}</td></tr>`).join('')||'<tr><td colspan="5"><div class="empty-state"><h3>Belum ada Position</h3></div></td></tr>'}</tbody></table></div></div>
          <div class="panel table-panel"><header><div><p class="eyebrow">MAKER-CHECKER</p><h2>Hierarchy & assignment queue</h2></div><span class="chip gray">${pending.length+assignments.items.filter(x=>x.status==='PENDING_APPROVAL').length}</span></header><div class="table-wrap"><table><thead><tr><th>Item</th><th>Efektif</th><th>Status</th><th></th></tr></thead><tbody>${pending.map(x=>`<tr><td><b>Hierarchy v${x.versionNo}</b><small>${String(x.snapshotSha256).slice(0,16)}…</small></td><td>${fmtDate(x.effectiveFrom)}</td><td>${chip(x.status)}</td><td>${can('organization.approve')?`<button class="btn sm hierarchyDecide" data-id="${x.id}" data-status="${x.status}">Proses</button>`:''}</td></tr>`).join('')}${assignments.items.filter(x=>x.status==='PENDING_APPROVAL').map(x=>`<tr><td><b>${esc(x.employeeName)}</b><small>${esc(x.positionName)}</small></td><td>${fmtDate(x.effectiveFrom)}</td><td>${chip(x.status)}</td><td>${can('organization.approve')?`<button class="btn sm assignmentDecide" data-id="${x.id}">Proses</button>`:''}</td></tr>`).join('')||(!pending.length?'<tr><td colspan="4"><div class="empty-state"><h3>Antrean bersih</h3></div></td></tr>':'')}</tbody></table></div></div></section>
          <section class="panel table-panel"><header><div><p class="eyebrow">AUTHORITY DELEGATION</p><h2>Delegasi kewenangan</h2></div></header><div class="table-wrap"><table><thead><tr><th>Delegator</th><th>Delegate</th><th>Permission</th><th>Scope</th><th>Berlaku</th><th>Status</th><th></th></tr></thead><tbody>${delegations.items.map(x=>`<tr><td>${esc(x.delegatorName)}</td><td><b>${esc(x.delegateName)}</b></td><td><code>${esc(x.permissionCode)}</code></td><td>${esc(x.scopeType)}</td><td>${fmtDateTime(x.effectiveUntil)}</td><td>${chip(x.status)}</td><td>${x.status==='PENDING_APPROVAL'&&can('organization.approve')?`<button class="btn sm delegationDecide" data-id="${x.id}">Proses</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7"><div class="empty-state"><h3>Belum ada delegasi</h3></div></td></tr>'}</tbody></table></div></section>`;
        main.querySelector('#orgCapture')?.addEventListener('click',async()=>{const v=await formDialog({title:'Capture hierarchy version',description:'Snapshot menyimpan seluruh node, Job, dan Position beserta SHA-256.',fields:[{name:'effectiveFrom',label:'Tanggal efektif',type:'date',required:true},{name:'reason',label:'Alasan perubahan',type:'textarea',required:true}],submitLabel:'Capture draft'});if(!v)return;try{const item=await api(`${base}/hierarchy-versions`,{method:'POST',body:v});await api(`${base}/hierarchy-versions/${item.id}/submit`,{method:'POST',body:{reason:v.reason}});toast('Hierarchy diajukan',`Version ${item.versionNo} menunggu approver.`);await load();}catch(e){toast('Capture gagal',e.message,'coral');}});
        main.querySelector('#jobAdd')?.addEventListener('click',async()=>{const v=await formDialog({title:'Job baru',fields:[{name:'code',label:'Kode',required:true},{name:'title',label:'Judul Job',required:true},{name:'jobFamily',label:'Job family'},{name:'grade',label:'Grade'},{name:'description',label:'Deskripsi',type:'textarea'}],submitLabel:'Buat Job'});if(!v)return;try{await api(`${base}/jobs`,{method:'POST',body:v});toast('Job dibuat','Katalog Job diperbarui.');await load();}catch(e){toast('Gagal',e.message,'coral');}});
        main.querySelector('#positionAdd')?.addEventListener('click',async()=>{const v=await formDialog({title:'Position baru',fields:[{name:'code',label:'Kode',required:true},{name:'name',label:'Nama Position',required:true},{name:'jobId',label:'Job',type:'select',options:jobs.items.map(x=>[x.id,`${x.code} · ${x.title}`]),required:true},{name:'headcount',label:'Headcount',type:'number',min:1,required:true},{name:'positionType',label:'Tipe',type:'select',options:[['PERMANENT','Permanent'],['TEMPORARY','Temporary'],['PROJECT','Project']]}],submitLabel:'Buat Position'});if(!v)return;try{await api(`${base}/positions`,{method:'POST',body:v});toast('Position dibuat','Capacity control aktif.');await load();}catch(e){toast('Gagal',e.message,'coral');}});
        main.querySelector('#assignmentAdd')?.addEventListener('click',async()=>{try{const employees=await api('/api/employees?limit=100');const v=await formDialog({title:'Ajukan Position Assignment',description:'Aktivasi membutuhkan approver berbeda dan tunduk pada headcount/overlap control.',fields:[{name:'positionId',label:'Position',type:'select',options:positions.items.filter(x=>x.status==='ACTIVE').map(x=>[x.id,`${x.code} · ${x.name}`]),required:true},{name:'employeeId',label:'Karyawan',type:'select',options:employees.items.map(x=>[x.id,`${x.nik} · ${x.name}`]),required:true},{name:'assignmentType',label:'Tipe',type:'select',options:[['PRIMARY','Primary'],['ACTING','Acting'],['SECONDARY','Secondary']],required:true},{name:'fte',label:'FTE',type:'number',min:0.1,max:1,value:1,required:true},{name:'effectiveFrom',label:'Mulai',type:'date',required:true},{name:'effectiveTo',label:'Berakhir',type:'date'},{name:'reason',label:'Alasan',type:'textarea',required:true}],submitLabel:'Ajukan assignment'});if(!v)return;await api(`${base}/assignments`,{method:'POST',body:v});toast('Assignment diajukan','Menunggu maker-checker.');await load();}catch(e){toast('Assignment gagal',e.message,'coral');}});
        main.querySelector('#delegationAdd')?.addEventListener('click',async()=>{const v=await formDialog({title:'Delegasikan kewenangan',description:'Maksimum 90 hari. Hak berisiko tinggi tidak dapat didelegasikan.',fields:[{name:'delegateUserId',label:'Penerima',type:'select',options:candidates.items.map(x=>[x.id,`${x.displayName} · ${x.role}`]),required:true},{name:'permissionCode',label:'Permission code',placeholder:'invoice.approve',required:true},{name:'scopeType',label:'Scope',type:'select',options:[['GLOBAL','Global'],['BRANCH','Branch']],required:true},{name:'scopeId',label:'Scope ID (kosong untuk Global)'},{name:'effectiveFrom',label:'Mulai',type:'datetime-local',required:true},{name:'effectiveUntil',label:'Berakhir',type:'datetime-local',required:true},{name:'reason',label:'Alasan',type:'textarea',required:true}],submitLabel:'Ajukan delegasi'});if(!v)return;try{await api('/api/organization/delegations',{method:'POST',body:v});toast('Delegasi diajukan','Menunggu approver yang berbeda.');await load();}catch(e){toast('Delegasi gagal',e.message,'coral');}});
        main.querySelectorAll('.hierarchyDecide').forEach(b=>b.addEventListener('click',async()=>{const value=b.dataset.status==='APPROVED'?await formDialog({title:'Aktifkan hierarchy',fields:[{name:'reason',label:'Alasan aktivasi',type:'textarea',required:true}],submitLabel:'Aktifkan'}):await formDialog({title:'Keputusan hierarchy',description:'Maker dan checker wajib berbeda.',fields:[{name:'decision',label:'Keputusan',type:'select',options:[['approve','Approve'],['reject','Reject']],required:true},{name:'reason',label:'Alasan',type:'textarea',required:true}],submitLabel:'Simpan keputusan'});if(!value)return;const action=b.dataset.status==='APPROVED'?'activate':value.decision;try{await api(`${base}/hierarchy-versions/${b.dataset.id}/${action}`,{method:'POST',body:{reason:value.reason}});toast('Hierarchy diproses',action.toUpperCase());await load();}catch(e){toast('Gagal',e.message,'coral');}}));
        main.querySelectorAll('.assignmentDecide').forEach(b=>b.addEventListener('click',async()=>{const value=await formDialog({title:'Keputusan assignment',fields:[{name:'decision',label:'Keputusan',type:'select',options:[['approve','Approve'],['reject','Reject']],required:true},{name:'reason',label:'Alasan',type:'textarea',required:true}],submitLabel:'Simpan keputusan'});if(!value)return;try{await api(`${base}/assignments/${b.dataset.id}/${value.decision}`,{method:'POST',body:{reason:value.reason}});toast('Assignment diproses',value.decision.toUpperCase());await load();}catch(e){toast('Gagal',e.message,'coral');}}));
        main.querySelectorAll('.delegationDecide').forEach(b=>b.addEventListener('click',async()=>{const value=await formDialog({title:'Keputusan delegasi',fields:[{name:'decision',label:'Keputusan',type:'select',options:[['approve','Approve'],['reject','Reject']],required:true},{name:'reason',label:'Alasan',type:'textarea',required:true}],submitLabel:'Simpan keputusan'});if(!value)return;try{await api(`/api/organization/delegations/${b.dataset.id}/${value.decision}`,{method:'POST',body:{reason:value.reason}});toast('Delegasi diproses',value.decision.toUpperCase());await load();}catch(e){toast('Gagal',e.message,'coral');}}));
      };try{await load();}catch(error){main.innerHTML=`<section class="error-state">${clayOrb('coral','alert')}<h1>Workforce Architecture gagal dimuat</h1><p>${esc(error.message)}</p></section>`;}
    }
  };

  // ── Bagan organisasi (enterprise structure chart) ────────────────────────
  // Visualisasi hierarki: Legal Entity → Business Unit → Departemen (nested via
  // parentId, dengan kepala) → Cost Center (via departmentId). Pure CSS/HTML —
  // CSP-safe, tanpa inline style. Expand/collapse per node.
  const orgChartPage = {
    permission: 'organization.view',
    async render(main, _params, signal) {
      main.innerHTML = pageHead({ eyebrow: 'ENTERPRISE STRUCTURE', title: 'Bagan organisasi', sub: 'Memuat hierarki struktur perusahaan…' }) + '<div class="panel"><div class="panel-body"><span class="spinner"></span> Memuat bagan…</div></div>';
      const org = await api('/api/organization', { signal });
      const h = await api(`/api/organization/${org.id}/hierarchy`, { signal });
      const emp = new Map();
      try { ((await api('/api/employees?limit=300', { signal })).items || []).forEach((e) => emp.set(e.id, e.name)); } catch { /* head names best-effort */ }
      const depts = h.departments || [], ccs = h.costCenters || [], bus = h.businessUnits || [];
      const byId = new Map(depts.map((d) => [d.id, { ...d, children: [], cc: [] }]));
      const roots = [];
      depts.forEach((d) => { const n = byId.get(d.id); if (d.parentId && byId.has(d.parentId)) byId.get(d.parentId).children.push(n); else roots.push(n); });
      ccs.forEach((c) => { if (c.departmentId && byId.has(c.departmentId)) byId.get(c.departmentId).cc.push(c); });

      const deptNode = (n) => {
        const head = n.headEmployeeId && emp.get(n.headEmployeeId);
        const kids = n.children.length + n.cc.length;
        return `<li><div class="oc-card oc-dept${kids ? ' has-kids' : ''}"${kids ? ' data-oc-toggle role="button" tabindex="0"' : ''}>
          <span class="oc-ic dept">${ICONS.people}</span>
          <span class="oc-main"><b>${esc(n.name)}</b><small>${esc(n.code)}${head ? ` · ${esc(head)}` : ''}</small></span>
          ${kids ? `<span class="oc-badge">${kids}</span>` : ''}
        </div>${kids ? `<ul>${n.children.map(deptNode).join('')}${n.cc.map((c) => `<li><div class="oc-card oc-cc"><span class="oc-ic cc">${ICONS.wallet}</span><span class="oc-main"><b>${esc(c.name)}</b><small>${esc(c.code)} · cost center</small></span></div></li>`).join('')}</ul>` : ''}</li>`;
      };

      main.innerHTML = pageHead({
        eyebrow: 'ENTERPRISE STRUCTURE', title: 'Bagan organisasi',
        sub: `${esc(org.tradeName || org.legalName)} · ${depts.length} departemen · ${ccs.length} cost center`,
        actions: `<button class="btn ghost sm" id="ocExpand">${ICONS.plus} Buka semua</button><button class="btn ghost sm" id="ocCollapse">Tutup semua</button><a class="btn secondary sm" href="#/organization">${ICONS.gear} Workbench struktur</a>`
      }) + `
        <section class="oc-legend">
          <span class="oc-leg legal">Legal entity</span><span class="oc-leg bu">Business unit</span><span class="oc-leg dept">Departemen</span><span class="oc-leg cc">Cost center</span>
          <span class="oc-count">Cabang ${(h.branches || []).length} · Plant ${(h.plants || []).length} · Gudang ${(h.warehouses || []).length} · Profit center ${(h.profitCenters || []).length}</span>
        </section>
        <section class="panel orgchart-panel"><div class="orgchart-wrap"><div class="orgchart"><ul class="oc-tree">
          <li>
            <div class="oc-card oc-legal">
              <span class="oc-ic legal">${ICONS.building}</span>
              <span class="oc-main"><b>${esc(org.tradeName || org.legalName)}</b><small>${esc(org.code)} · legal entity</small></span>
            </div>
            <ul>
              ${bus.map((b) => `<li><div class="oc-card oc-bu"><span class="oc-ic bu">${ICONS.grid}</span><span class="oc-main"><b>${esc(b.name)}</b><small>${esc(b.code)} · business unit</small></span></div></li>`).join('')}
              ${roots.map(deptNode).join('') || '<li><div class="oc-card oc-empty">Belum ada departemen</div></li>'}
            </ul>
          </li>
        </ul></div></div></section>`;

      const toggle = (el) => el.closest('li').classList.toggle('collapsed');
      main.querySelectorAll('[data-oc-toggle]').forEach((el) => {
        el.addEventListener('click', () => toggle(el));
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(el); } });
      });
      main.querySelector('#ocExpand')?.addEventListener('click', () => main.querySelectorAll('.oc-tree li.collapsed').forEach((li) => li.classList.remove('collapsed')));
      main.querySelector('#ocCollapse')?.addEventListener('click', () => main.querySelectorAll('.oc-card.has-kids').forEach((c) => c.closest('li').classList.add('collapsed')));
    }
  };

  const R = router.register.bind(router);
  R('/organization', organizationPage);
  R('/organization/chart', orgChartPage);
  R('/organization/workforce',workforcePage);
  R('/system/settings', settings);
})();
