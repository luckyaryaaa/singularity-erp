'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  const MASTER_DETAIL = {
    employees: {
      module: 'employee', title: 'Karyawan', base: '/api/masters/employees', listRoute: '#/hr/employees',
      head: (o) => `<b>${esc(o.name)}</b><small>${esc(o.nik)} · ${esc(o.department || '')}</small>`,
      tabs: [
        { id: 'overview', label: 'Overview' },
        { id: 'positions', label: 'Jabatan & Posisi', sub: 'positions', cols: [['positionTitle','Jabatan'],['division','Divisi'],['workLocation','Lokasi'],['payrollFrequency','Frekuensi gaji'],['effectiveFrom','Berlaku','date']],
          form: [{name:'positionTitle',label:'Jabatan',required:true},{name:'division',label:'Divisi'},{name:'workLocation',label:'Lokasi kerja'},{name:'shiftGroup',label:'Grup shift'},{name:'salaryGrade',label:'Grade gaji'},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true}] },
        { id: 'employment-history', label: 'Riwayat Kerja', sub: 'employment-history', cols: [['employmentType','Tipe'],['employmentStatus','Status'],['eventDate','Tanggal','date'],['eventReason','Keterangan']],
          form: [{name:'employmentType',label:'Tipe',type:'select',options:[['PERMANENT','Tetap'],['CONTRACT','Kontrak'],['PROBATION','Percobaan'],['INTERN','Magang'],['OUTSOURCE','Outsource']],required:true},{name:'employmentStatus',label:'Status',type:'select',options:[['ACTIVE','Aktif'],['ON_LEAVE','Cuti'],['SUSPENDED','Diberhentikan sementara'],['TERMINATED','Diberhentikan'],['RESIGNED','Mengundurkan diri'],['RETIRED','Pensiun']],required:true},{name:'eventDate',label:'Tanggal',type:'date',required:true},{name:'eventReason',label:'Keterangan',type:'textarea'}] },
        { id: 'contracts', label: 'Kontrak', sub: 'contracts', cols: [['contractNumber','No. Kontrak'],['contractType','Jenis'],['startDate','Mulai','date'],['endDate','Berakhir','date'],['status','Status','chip']],
          form: [{name:'contractNumber',label:'Nomor kontrak'},{name:'contractType',label:'Jenis',type:'select',options:[['PKWT','PKWT'],['PKWTT','PKWTT'],['MAGANG','Magang'],['OUTSOURCE','Outsource']],required:true},{name:'startDate',label:'Mulai',type:'date',required:true},{name:'endDate',label:'Berakhir',type:'date'},{name:'probationEnd',label:'Akhir percobaan',type:'date'}] },
        { id: 'compensation', label: 'Kompensasi', sub: 'compensation', perm: 'payroll.view', reason: true, cols: [['baseSalary','Gaji pokok','money'],['fixedAllowance','Tunjangan tetap','money'],['effectiveFrom','Berlaku','date'],['approvalReason','Alasan']],
          form: [{name:'baseSalary',label:'Gaji pokok',type:'number',min:0,required:true},{name:'fixedAllowance',label:'Tunjangan tetap',type:'number',min:0},{name:'variableAllowance',label:'Tunjangan variabel',type:'number',min:0},{name:'salaryGrade',label:'Grade'},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true},{name:'changeReason',label:'Alasan perubahan',type:'textarea',required:true}] },
        { id: 'tax-profiles', label: 'Pajak', sub: 'tax-profiles', cols: [['npwp','NPWP'],['taxScheme','Skema'],['ptkpStatus','PTKP'],['terCategory','TER'],['effectiveFrom','Berlaku','date']],
          form: [{name:'npwp',label:'NPWP'},{name:'taxScheme',label:'Skema pajak',type:'select',options:[['PPH21','PPh 21'],['PPH26','PPh 26'],['NONE','Tidak dihitung']],required:true},{name:'ptkpStatus',label:'Status PTKP',type:'select',options:[['TK/0','TK/0'],['TK/1','TK/1'],['K/0','K/0'],['K/1','K/1'],['K/2','K/2'],['K/3','K/3']],required:true},{name:'terCategory',label:'Kategori TER',type:'select',options:[['A','A'],['B','B'],['C','C']]},{name:'taxMethod',label:'Metode',type:'select',options:[['GROSS','Gross'],['NET','Net'],['GROSS_UP','Gross-up']]},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true}] },
        { id: 'bpjs', label: 'BPJS', sub: 'bpjs', cols: [['program','Program'],['membershipNumber','No. Kepesertaan'],['employerPct','% Perusahaan'],['employeePct','% Karyawan'],['activeFrom','Aktif','date']],
          form: [{name:'program',label:'Program',type:'select',options:[['KESEHATAN','Kesehatan'],['JHT','JHT'],['JKK','JKK'],['JKM','JKM'],['JP','JP']],required:true},{name:'membershipNumber',label:'Nomor kepesertaan'},{name:'wageBase',label:'Upah dasar',type:'number',min:0},{name:'employerPct',label:'% Perusahaan',type:'number',min:0},{name:'employeePct',label:'% Karyawan',type:'number',min:0},{name:'activeFrom',label:'Aktif sejak',type:'date',required:true}] },
        { id: 'insurance', label: 'Asuransi', sub: 'insurance', cols: [['insurer','Penyedia'],['policyNumber','No. Polis'],['coverageType','Cakupan'],['premium','Premi','money'],['expiryDate','Kedaluwarsa','date']],
          form: [{name:'insurer',label:'Penyedia asuransi',required:true},{name:'policyNumber',label:'Nomor polis'},{name:'coverageType',label:'Jenis cakupan'},{name:'familyCovered',label:'Termasuk keluarga',type:'checkbox'},{name:'premium',label:'Premi',type:'number',min:0},{name:'effectiveFrom',label:'Berlaku',type:'date'},{name:'expiryDate',label:'Kedaluwarsa',type:'date'}] },
        { id: 'bank-accounts', label: 'Rekening Gaji', sub: 'bank-accounts', reason: true, cols: [['bankName','Bank'],['accountNumber','No. Rekening'],['accountHolder','Pemilik'],['isPrimary','Utama','bool']],
          form: [{name:'bankName',label:'Nama bank',required:true},{name:'accountNumber',label:'Nomor rekening',required:true},{name:'accountHolder',label:'Nama pemilik',required:true},{name:'effectiveFrom',label:'Berlaku',type:'date'},{name:'isPrimary',label:'Jadikan rekening utama',type:'checkbox'},{name:'changeReason',label:'Alasan',type:'textarea',required:true}] },
        { id: 'documents', label: 'Dokumen & Sertifikat', sub: 'documents', cols: [['documentType','Jenis'],['title','Judul'],['expiryDate','Kedaluwarsa','date'],['verified','Terverifikasi','bool']],
          form: [{name:'documentType',label:'Jenis',type:'select',options:[['KTP','KTP'],['NPWP','NPWP'],['KK','KK'],['CONTRACT','Kontrak'],['CERTIFICATE','Sertifikat'],['TRAINING','Pelatihan'],['LICENSE','Lisensi'],['MEDICAL','Medis'],['OTHER','Lainnya']],required:true},{name:'title',label:'Judul dokumen',required:true},{name:'expiryDate',label:'Kedaluwarsa',type:'date'}] },
        { id: 'emergency-contacts', label: 'Kontak Darurat', sub: 'emergency-contacts', perm: 'employee.edit', cols: [['name','Nama'],['relationship','Hubungan'],['phone','Telepon']],
          form: [{name:'name',label:'Nama',required:true},{name:'relationship',label:'Hubungan'},{name:'phone',label:'Telepon'},{name:'address',label:'Alamat',type:'textarea'}] },
        { id: 'access', label: 'Akses & Peran', sub: 'access', cols: [['role','Peran'],['orgScope','Cakupan'],['accessStart','Mulai','date'],['accessEnd','Berakhir','date']],
          form: [{name:'role',label:'Peran'},{name:'orgScope',label:'Cakupan organisasi'},{name:'accessStart',label:'Mulai',type:'date'},{name:'accessEnd',label:'Berakhir',type:'date'}] }
      ]
    },
    customers: {
      module: 'customer', title: 'Pelanggan', base: '/api/masters/customers', listRoute: '#/masters/customers',
      head: (o) => `<b>${esc(o.name)}</b><small>${esc(o.code)} · ${esc(o.city || '')}</small>`,
      tabs: [
        { id: 'overview', label: 'Overview' },
        { id: 'contacts', label: 'Kontak (PIC)', sub: 'contacts', cols: [['name','Nama'],['positionTitle','Jabatan'],['phone','Telepon'],['email','Email'],['isPrimary','Utama','bool']],
          form: [{name:'name',label:'Nama PIC',required:true},{name:'positionTitle',label:'Jabatan'},{name:'department',label:'Departemen'},{name:'phone',label:'Telepon'},{name:'email',label:'Email'},{name:'whatsapp',label:'WhatsApp'},{name:'isPrimary',label:'Kontak utama',type:'checkbox'}] },
        { id: 'addresses', label: 'Alamat', sub: 'addresses', cols: [['addressType','Jenis'],['label','Label'],['city','Kota'],['isDefault','Default','bool']],
          form: [{name:'addressType',label:'Jenis',type:'select',options:[['BILLING','Penagihan'],['DELIVERY','Pengiriman'],['SITE','Lokasi proyek']],required:true},{name:'label',label:'Label'},{name:'address',label:'Alamat',type:'textarea',required:true},{name:'city',label:'Kota'},{name:'province',label:'Provinsi'},{name:'postalCode',label:'Kode pos'},{name:'isDefault',label:'Jadikan default',type:'checkbox'}] },
        { id: 'prices', label: 'Harga Khusus', sub: 'prices', cols: [['productId','Produk'],['price','Harga','money'],['effectiveFrom','Berlaku','date'],['status','Status','chip']],
          form: async () => { const products = await api('/api/products?limit=200'); return [{name:'productId',label:'Produk',type:'select',options:products.items.map(x=>[x.id,`${x.code} · ${x.name}`]),required:true},{name:'price',label:'Harga khusus',type:'number',min:0,required:true},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true},{name:'expiryDate',label:'Kedaluwarsa',type:'date'}]; } }
      ]
    },
    suppliers: {
      module: 'supplier', title: 'Supplier', base: '/api/masters/suppliers', listRoute: '#/masters/suppliers',
      head: (o) => `<b>${esc(o.name)}</b><small>${esc(o.code)} · ${esc(o.category || '')}</small>`,
      tabs: [
        { id: 'overview', label: 'Overview' },
        { id: 'contacts', label: 'Kontak', sub: 'contacts', cols: [['name','Nama'],['positionTitle','Jabatan'],['phone','Telepon'],['email','Email'],['isPrimary','Utama','bool']],
          form: [{name:'name',label:'Nama PIC',required:true},{name:'positionTitle',label:'Jabatan'},{name:'phone',label:'Telepon'},{name:'email',label:'Email'},{name:'whatsapp',label:'WhatsApp'},{name:'isPrimary',label:'Kontak utama',type:'checkbox'}] },
        { id: 'addresses', label: 'Alamat', sub: 'addresses', cols: [['addressType','Jenis'],['city','Kota'],['isDefault','Default','bool']],
          form: [{name:'addressType',label:'Jenis',type:'select',options:[['OFFICE','Kantor'],['FACTORY','Pabrik'],['WAREHOUSE','Gudang']],required:true},{name:'address',label:'Alamat',type:'textarea',required:true},{name:'city',label:'Kota'},{name:'province',label:'Provinsi'}] },
        { id: 'bank-accounts', label: 'Rekening (Maker-Checker)', sub: 'bank-accounts', reason: true, bankApprove: true, cols: [['bankName','Bank'],['accountNumber','No. Rekening'],['accountHolder','Pemilik'],['verificationStatus','Verifikasi','chip']],
          form: [{name:'bankName',label:'Nama bank',required:true},{name:'accountNumber',label:'Nomor rekening',required:true},{name:'accountHolder',label:'Nama pemilik',required:true},{name:'changeReason',label:'Alasan perubahan',type:'textarea',required:true}] },
        { id: 'materials', label: 'Material Disetujui', sub: 'materials', cols: [['category','Kategori'],['gradeSpec','Grade/Spec'],['brand','Merek'],['leadTimeDays','Lead time'],['approvedStatus','Status','chip']],
          form: [{name:'category',label:'Kategori',required:true},{name:'gradeSpec',label:'Grade/Spesifikasi'},{name:'brand',label:'Merek'},{name:'supplierPartNumber',label:'Part number supplier'},{name:'uom',label:'Satuan'},{name:'moq',label:'MOQ',type:'number',min:0},{name:'leadTimeDays',label:'Lead time (hari)',type:'number',min:0}] },
        { id: 'price-history', label: 'Riwayat Harga', sub: 'price-history', append: true, cols: [['materialDesc','Material'],['grade','Grade'],['price','Harga','money'],['revisionNo','Rev.'],['effectiveFrom','Berlaku','date'],['status','Status','chip']],
          form: [{name:'materialDesc',label:'Deskripsi material',required:true},{name:'grade',label:'Grade'},{name:'specification',label:'Spesifikasi'},{name:'uom',label:'Satuan',required:true},{name:'price',label:'Harga',type:'number',min:0,required:true},{name:'taxIncluded',label:'Termasuk pajak',type:'checkbox'},{name:'freightIncluded',label:'Termasuk ongkir',type:'checkbox'},{name:'leadTimeDays',label:'Lead time (hari)',type:'number',min:0},{name:'moq',label:'MOQ',type:'number',min:0},{name:'sourceQuotation',label:'Sumber penawaran'},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true}] },
        { id: 'evaluations', label: 'Evaluasi Kinerja', sub: 'evaluations', cols: [['period','Periode'],['overallScore','Skor'],['riskLevel','Risiko'],['approvedVendor','AVL','bool']],
          form: [{name:'period',label:'Periode (YYYY-MM)',required:true},{name:'onTimeDeliveryPct',label:'On-time delivery (%)',type:'number',min:0,max:100},{name:'qualityAcceptancePct',label:'Quality acceptance (%)',type:'number',min:0,max:100},{name:'overallScore',label:'Skor keseluruhan',type:'number',min:0,max:100},{name:'riskLevel',label:'Level risiko',type:'select',options:[['LOW','Rendah'],['MEDIUM','Sedang'],['HIGH','Tinggi']]},{name:'approvedVendor',label:'Approved vendor',type:'checkbox'},{name:'notes',label:'Catatan',type:'textarea'}] }
      ]
    },
    products: {
      module: 'product', title: 'Produk', base: '/api/masters/products', listRoute: '#/masters/products',
      head: (o) => `<b>${esc(o.name)}</b><small>${esc(o.code)} · ${esc(o.category || o.uom || '')}</small>`,
      tabs: [
        { id: 'overview', label: 'Overview' },
        { id: 'cost-revisions', label: 'BOM & HPP', sub: 'cost-revisions', costActivate: true, cols: [['revisionNo','Rev.'],['totalCost','Total HPP','money'],['status','Status','chip'],['createdAt','Dibuat','date']],
          form: [{name:'costRawMaterial',label:'Bahan baku',type:'number',min:0},{name:'costConsumable',label:'Consumable',type:'number',min:0},{name:'costSubcontract',label:'Subkontrak',type:'number',min:0},{name:'costLabor',label:'Tenaga kerja',type:'number',min:0},{name:'costMachine',label:'Mesin',type:'number',min:0},{name:'costOverhead',label:'Overhead',type:'number',min:0},{name:'costFreight',label:'Ongkir',type:'number',min:0},{name:'costOther',label:'Lainnya',type:'number',min:0},{name:'calculationNotes',label:'Catatan kalkulasi',type:'textarea'}] },
        { id: 'uom-conversions', label: 'Konversi Satuan', sub: 'uom-conversions', cols: [['fromUom','Dari'],['toUom','Ke'],['factor','Faktor']],
          form: [{name:'fromUom',label:'Dari satuan',required:true},{name:'toUom',label:'Ke satuan',required:true},{name:'factor',label:'Faktor konversi',type:'number',min:0,required:true}] },
        { id: 'files', label: 'File Produk', sub: 'files', cols: [['title','Judul'],['fileType','Jenis'],['revision','Rev.'],['confidentiality','Kerahasiaan']],
          form: [{name:'title',label:'Judul',required:true},{name:'fileType',label:'Jenis',type:'select',options:[['DRAWING','Gambar'],['CAD','CAD'],['SPECIFICATION','Spesifikasi'],['QC_STANDARD','Standar QC'],['WORK_INSTRUCTION','Instruksi kerja'],['PHOTO','Foto'],['CERTIFICATE','Sertifikat']],required:true},{name:'revision',label:'Revisi'},{name:'confidentiality',label:'Kerahasiaan',type:'select',options:[['PUBLIC','Publik'],['INTERNAL','Internal'],['CONFIDENTIAL','Rahasia']]},{name:'customerOwned',label:'Milik pelanggan',type:'checkbox'}] }
      ]
    }
  };

  // Susunan final R014: tepat 10 tab employee, sementara sub-tabel tetap ternormalisasi.
  {
    const legacy = Object.fromEntries(MASTER_DETAIL.employees.tabs.map(t => [t.id, t]));
    const certification = { label:'Sertifikasi', sub:'certifications', cols:[['name','Sertifikasi'],['issuer','Penerbit'],['certificateNumber','Nomor'],['expiryDate','Kedaluwarsa','date']], form:[{name:'name',label:'Nama sertifikasi',required:true},{name:'issuer',label:'Penerbit'},{name:'certificateNumber',label:'Nomor'},{name:'issuedDate',label:'Terbit',type:'date'},{name:'expiryDate',label:'Kedaluwarsa',type:'date'}] };
    const claim = { label:'Riwayat klaim', sub:'insurance-claims', cols:[['claimNumber','No. Klaim'],['claimDate','Tanggal','date'],['claimType','Jenis'],['amount','Nilai','money'],['status','Status','chip']], form:[{name:'claimNumber',label:'Nomor klaim'},{name:'claimDate',label:'Tanggal klaim',type:'date',required:true},{name:'claimType',label:'Jenis klaim'},{name:'amount',label:'Nilai',type:'number',min:0},{name:'status',label:'Status',type:'select',options:[['SUBMITTED','Diajukan'],['IN_REVIEW','Ditinjau'],['APPROVED','Disetujui'],['REJECTED','Ditolak'],['PAID','Dibayar']]}] };
    const restricted = { label:'Restricted record', sub:'restricted-records', cols:[['recordType','Jenis'],['title','Judul'],['effectiveFrom','Berlaku','date']], form:[{name:'recordType',label:'Jenis',type:'select',options:[['MEDICAL','Medis'],['DISCIPLINARY','Disipliner'],['BACKGROUND_CHECK','Background check'],['LEGAL','Legal'],['OTHER','Lainnya']],required:true},{name:'title',label:'Judul',required:true},{name:'restrictedNotes',label:'Catatan terbatas',type:'textarea',required:true},{name:'effectiveFrom',label:'Berlaku',type:'date',required:true}] };
    legacy.compensation.label='Kompensasi (maker–checker)'; legacy.compensation.employeeApprove=true; legacy.compensation.statusKey='approvalStatus'; legacy.compensation.cols=[['baseSalary','Gaji pokok','money'],['fixedAllowance','Tunjangan','money'],['effectiveFrom','Berlaku','date'],['approvalStatus','Status','chip']];
    legacy['bank-accounts'].label='Payroll Bank'; legacy['bank-accounts'].employeeApprove=true; legacy['bank-accounts'].statusKey='verificationStatus'; legacy['bank-accounts'].cols=[['bankName','Bank'],['accountNumber','No. Rekening'],['verificationStatus','Status','chip'],['isPrimary','Utama','bool']];
    MASTER_DETAIL.employees.tabs = [
      legacy.overview,
      {id:'employment',label:'Employment & Position',groups:[legacy.positions,legacy['employment-history'],legacy.contracts,legacy.compensation]},
      {...legacy['tax-profiles'],label:'Pajak'}, legacy.bpjs,
      {id:'insurance-final',label:'Insurance',groups:[legacy.insurance,claim]},
      legacy['bank-accounts'],
      {id:'documents-final',label:'Documents & Certifications',groups:[legacy.documents,certification]},
      {id:'emergency-final',label:'Emergency & Restricted',perm:'employee.edit',groups:[legacy['emergency-contacts'],restricted]},
      {...legacy.access,label:'System Access & Role'},
      {id:'audit',label:'Audit & Change History',sub:'audit',noAdd:true,cols:[['occurredAt','Waktu','date'],['action','Aksi','chip'],['entityType','Objek'],['reason','Alasan'],['requestId','Request ID']]}
    ];
  }

  const LIFECYCLE_BTN = { DRAFT: [['submit','Ajukan review']], PENDING_REVIEW: [['approve','Setujui']], APPROVED: [['activate','Aktifkan']], ACTIVE: [['suspend','Suspend']], SUSPENDED: [['activate','Aktifkan'],['block','Blokir']], BLOCKED: [['obsolete','Usangkan']], OBSOLETE: [['archive','Arsipkan']] };
  const fmtCell = (row, col) => {
    const [key, , type] = col; const v = row[key];
    if (type === 'money') return `<span class="money">${fmtIDR(Number(v) || 0)}</span>`;
    if (type === 'date') return fmtDate(v);
    if (type === 'chip') return chip(v);
    if (type === 'bool') return v ? '<span class="chip mint">Ya</span>' : '<span class="chip gray">—</span>';
    return esc(v ?? '—');
  };

  const masterDetail = {
    async render(main, params, signal) {
      const cfg = MASTER_DETAIL[params.type];
      if (!cfg) { main.innerHTML = `<section class="error-state">${clayOrb('coral','alert')}<h1>Master tidak dikenal</h1></section>`; return; }
      if (!can(`${cfg.module}.view`)) { main.innerHTML = `<section class="error-state">${clayOrb('amber','lock')}<h1>Akses dibatasi</h1></section>`; return; }
      const activeTab = this._tab && this._tabFor === params.id ? this._tab : 'overview';
      this._tabFor = params.id;
      let overview;
      try { overview = await api(`${cfg.base}/${params.id}`, { signal }); }
      catch (error) { main.innerHTML = `<section class="error-state">${clayOrb('coral','alert')}<h1>Gagal memuat</h1><p>${esc(error.message)}</p></section>`; return; }

      const lifeBtns = (LIFECYCLE_BTN[overview.lifecycleStatus] || []).filter(() => can(`${cfg.module}.edit`) || can(`${cfg.module}.approve`))
        .map(([a, label]) => `<button class="btn secondary sm" data-life="${a}">${esc(label)}</button>`).join('');

      main.innerHTML = pageHead({
        eyebrow: `MASTER DATA · ${cfg.title.toUpperCase()}`, title: overview.name || overview.code || cfg.title,
        sub: `Status data: ${overview.lifecycleStatus || 'ACTIVE'} · versi ${overview.mdmVersion || 1}`,
        actions: `<a class="btn secondary" href="${cfg.listRoute}">${ICONS.arrow} Kembali</a>${lifeBtns}`
      }) + `
        <div class="master-tabs" role="tablist">
          ${cfg.tabs.filter((t) => !t.perm || can(t.perm)).map((t) => `<button class="master-tab ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}" role="tab">${esc(t.label)}${overview.subCounts && overview.subCounts[t.sub] ? ` <span class="tab-count">${overview.subCounts[t.sub]}</span>` : ''}</button>`).join('')}
        </div>
        <section id="tabBody"></section>`;

      const renderTab = async (tabId) => {
        this._tab = tabId;
        main.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
        const body = main.querySelector('#tabBody');
        const tab = cfg.tabs.find((t) => t.id === tabId);
        if (tabId === 'overview') {
          if (params.type === 'employees') {
            const s=overview.enterpriseSummary||{},pos=s.currentPosition||{},employment=s.employment||{},comp=s.compensation||{},tax=s.tax||{},bank=s.payrollBank||{},completeness=overview.completeness||{};
            body.innerHTML=`<section class="kpi-grid"><article class="kpi"><span>Kelengkapan profil</span><strong>${Number(completeness.score||0)}%</strong><small>${Number(completeness.completed||0)} dari ${Number(completeness.total||0)} kontrol utama</small></article><article class="kpi"><span>Status kerja</span><strong>${esc(employment.employmentStatus||'—')}</strong><small>${esc(employment.employmentType||'Belum dikonfigurasi')}</small></article><article class="kpi"><span>Dokumen segera kedaluwarsa</span><strong>${Number(s.expiringDocuments||0)}</strong><small>Dalam 90 hari</small></article><article class="kpi"><span>Akun sistem aktif</span><strong>${Number(s.activeUserAccounts||0)}</strong><small>Akses ditinjau melalui IAM</small></article></section>
              <section class="dashboard-grid"><article class="panel"><header><div><p class="eyebrow">EMPLOYMENT SNAPSHOT</p><h2>Posisi & kompensasi terkendali</h2></div>${chip(overview.lifecycleStatus||'ACTIVE')}</header><div class="panel-body"><dl class="detail-dl"><div><dt>NIK</dt><dd>${esc(overview.nik)}</dd></div><div><dt>Nama</dt><dd>${esc(overview.name)}</dd></div><div><dt>Jabatan</dt><dd>${esc(pos.positionTitle||overview.jobTitle||'—')}</dd></div><div><dt>Divisi / departemen</dt><dd>${esc(pos.division||overview.department||'—')}</dd></div><div><dt>Lokasi kerja</dt><dd>${esc(pos.workLocation||'—')}</dd></div><div><dt>Grade</dt><dd>${esc(pos.salaryGrade||comp.salaryGrade||'—')}</dd></div><div><dt>Gaji pokok</dt><dd>${typeof comp.baseSalary==='number'?fmtIDR(comp.baseSalary):esc(comp.baseSalary||overview.baseSalary||'—')}</dd></div><div><dt>Tunjangan tetap</dt><dd>${typeof comp.fixedAllowance==='number'?fmtIDR(comp.fixedAllowance):esc(comp.fixedAllowance||'—')}</dd></div></dl></div></article>
              <article class="panel"><header><div><p class="eyebrow">COMPLIANCE SNAPSHOT</p><h2>Pajak, benefit & risiko</h2></div></header><div class="panel-body stack"><div class="stat-row"><span>PTKP / TER</span><b>${esc([tax.ptkpStatus,tax.terCategory].filter(Boolean).join(' · ')||'—')}</b></div><div class="stat-row"><span>Program BPJS aktif</span><b>${Number(s.bpjsPrograms||0)}</b></div><div class="stat-row"><span>Polis asuransi aktif</span><b>${Number(s.insurancePolicies||0)}</b></div><div class="stat-row"><span>Rekening payroll</span><b>${esc(bank.bankName||'Belum ada')} · ${esc(bank.accountNumber||'—')}</b></div><div class="stat-row"><span>Kehadiran bulan ini</span><b>${Number(s.attendanceDays||0)} hari</b></div><div class="stat-row"><span>Sisa cuti</span><b>${Number(s.leaveBalance?.remaining||0)} hari</b></div></div></article></section>`;
            return;
          }
          const rows = cfg.tabs.filter((t) => t.sub).map((t) => `<div class="stat-row"><span>${esc(t.label)}</span><b>${(overview.subCounts && overview.subCounts[t.sub]) || 0} entri</b></div>`).join('');
          body.innerHTML = `<div class="dashboard-grid"><article class="panel"><header><div><p class="eyebrow">RINGKASAN</p><h2>Informasi utama</h2></div>${chip(overview.lifecycleStatus || 'ACTIVE')}</header><div class="panel-body"><dl class="detail-dl">${Object.entries(overview).filter(([k, v]) => !['subCounts','id'].includes(k) && typeof v !== 'object' && v !== null && v !== '').slice(0, 12).map(([k, v]) => `<div><dt>${esc(k.replace(/([A-Z])/g, ' $1'))}</dt><dd>${esc(String(v))}</dd></div>`).join('')}</dl></div></article><article class="panel"><header><div><p class="eyebrow">KELENGKAPAN</p><h2>Sub-data</h2></div></header><div class="panel-body stack">${rows}</div></article></div>`;
          return;
        }
        if (tab.perm && !can(tab.perm)) { body.innerHTML = `<div class="empty-state">${clayOrb('amber','lock')}<h3>Akses dibatasi</h3><p>Tab ini membutuhkan izin khusus.</p></div>`; return; }
        if (tab.groups) {
          body.innerHTML = `<div class="panel"><div class="panel-body"><span class="spinner"></span> Memuat kelompok data…</div></div>`;
          const groups = tab.groups.filter(g => !g.perm || can(g.perm));
          try {
            const datasets = await Promise.all(groups.map(g => api(`${cfg.base}/${params.id}/${g.sub}`)));
            body.innerHTML = groups.map((g, index) => {
              const items=datasets[index].items||[];
              return `<div class="panel table-panel"><header><div><p class="eyebrow">${esc(tab.label.toUpperCase())}</p><h2>${esc(g.label)}</h2></div>${can(`${cfg.module}.edit`)&&g.form?`<button class="btn primary sm" data-group-add="${index}">${ICONS.plus} Tambah</button>`:''}</header><div class="table-wrap"><table><thead><tr>${g.cols.map(c=>`<th>${esc(c[1])}</th>`).join('')}${g.employeeApprove?'<th></th>':''}</tr></thead><tbody>${items.length?items.map(row=>`<tr>${g.cols.map(c=>`<td>${fmtCell(row,c)}</td>`).join('')}${g.employeeApprove?`<td class="right">${['PENDING_APPROVAL','PENDING_VERIFICATION'].includes(row[g.statusKey])&&can('employee.approve')?`<button class="btn secondary sm" data-employee-approve="${esc(row.id)}" data-resource="${esc(g.sub)}">Setujui</button>`:''}</td>`:''}</tr>`).join(''):`<tr><td colspan="${g.cols.length+1}"><div class="empty-state"><h3>Belum ada data</h3><p>Tambahkan ${esc(g.label.toLowerCase())} pertama.</p></div></td></tr>`}</tbody></table></div></div>`;
            }).join('');
            body.querySelectorAll('[data-group-add]').forEach(btn=>btn.addEventListener('click',async()=>{const g=groups[Number(btn.dataset.groupAdd)],fields=typeof g.form==='function'?await g.form():g.form;const value=await formDialog({title:`Tambah ${g.label}`,description:'Data tercatat pada audit trail dan mengikuti effective date.',fields,submitLabel:'Simpan'});if(!value)return;try{await api(`${cfg.base}/${params.id}/${g.sub}`,{method:'POST',body:value,idempotencyKey:newIdemKey()});toast(`${g.label} ditambahkan`);renderTab(tabId);}catch(error){toast('Gagal menyimpan',error.message,'coral');}}));
            body.querySelectorAll('[data-employee-approve]').forEach(btn=>btn.addEventListener('click',async()=>{const answer=await actionDialog({title:'Setujui perubahan sensitif',description:'Maker dan checker harus pengguna berbeda. Keputusan dicatat permanen.',requireReason:true,confirmLabel:'Setujui'});if(!answer)return;try{await api(`${cfg.base}/${params.id}/${btn.dataset.resource}/${btn.dataset.employeeApprove}/approve`,{method:'POST',body:answer});toast('Perubahan disetujui');renderTab(tabId);}catch(error){toast('Persetujuan gagal',error.message,'coral');}}));
          } catch (error) { body.innerHTML=`<div class="panel"><div class="panel-body error-text">${esc(error.message)}</div></div>`; }
          return;
        }
        body.innerHTML = `<div class="panel"><div class="panel-body"><span class="spinner"></span> Memuat…</div></div>`;
        let data;
        try { data = await api(`${cfg.base}/${params.id}/${tab.sub}`); }
        catch (error) { body.innerHTML = `<div class="panel"><div class="panel-body error-text">${esc(error.message)}</div></div>`; return; }
        const canEdit = can(`${cfg.module}.edit`);
        const addBtn = canEdit && !tab.noAdd ? `<button class="btn primary sm" id="tabAdd">${ICONS.plus} Tambah</button>` : '';
        body.innerHTML = `<div class="panel table-panel"><header><div><p class="eyebrow">${esc(cfg.title.toUpperCase())}</p><h2>${esc(tab.label)}</h2></div><div class="panel-tools">${addBtn}</div></header>
          <div class="table-wrap"><table><thead><tr>${tab.cols.map((c) => `<th>${esc(c[1])}</th>`).join('')}${(tab.bankApprove || tab.costActivate || tab.employeeApprove) ? '<th></th>' : ''}</tr></thead>
          <tbody>${data.items.length ? data.items.map((row) => `<tr>${tab.cols.map((c) => `<td>${fmtCell(row, c)}</td>`).join('')}${tab.bankApprove ? `<td class="right">${row.verificationStatus !== 'VERIFIED' && can('supplier.approve') ? `<button class="btn secondary sm" data-approve-bank="${esc(row.id)}">Verifikasi</button>` : ''}</td>` : ''}${tab.employeeApprove ? `<td class="right">${['PENDING_APPROVAL','PENDING_VERIFICATION'].includes(row[tab.statusKey])&&can('employee.approve')?`<button class="btn secondary sm" data-employee-approve="${esc(row.id)}">Setujui</button>`:''}</td>`:''}${tab.costActivate ? `<td class="right">${['APPROVED','LOCKED'].includes(row.status) && can('product.approve') ? `<button class="btn secondary sm" data-activate-cost="${esc(row.id)}">Set Active HPP</button>` : ['DRAFT','REVIEW'].includes(row.status) && can('product.approve') ? `<button class="btn secondary sm" data-promote-cost="${esc(row.id)}" data-next="${row.status === 'DRAFT' ? 'review' : 'approve'}">${row.status === 'DRAFT' ? 'Ajukan review' : 'Setujui'}</button>` : ''}</td>` : ''}</tr>`).join('') : `<tr><td colspan="${tab.cols.length + 1}"><div class="empty-state">${clayOrb('blue','inbox')}<h3>Belum ada data</h3><p>Tambahkan entri pertama untuk ${esc(tab.label.toLowerCase())}.</p></div></td></tr>`}</tbody></table></div></div>`;

        main.querySelector('#tabAdd')?.addEventListener('click', async () => {
          const fields = typeof tab.form === 'function' ? await tab.form() : tab.form;
          const value = await formDialog({ title: `Tambah ${tab.label}`, description: tab.append ? 'Riwayat bersifat append-only: entri baru menjadi revisi terbaru.' : 'Data tercatat pada audit trail.', fields, submitLabel: 'Simpan' });
          if (!value) return;
          try { await api(`${cfg.base}/${params.id}/${tab.sub}`, { method: 'POST', body: value, idempotencyKey: newIdemKey() }); toast(`${tab.label} ditambahkan`); renderTab(tabId); invalidate(`master:${params.id}`); this.render(main, params); }
          catch (error) { toast('Gagal menyimpan', error.message, 'coral'); }
        });
        body.querySelectorAll('[data-approve-bank]').forEach((b) => b.addEventListener('click', async () => {
          try { await api(`${cfg.base}/${params.id}/bank-accounts/${b.dataset.approveBank}/approve`, { method: 'POST' }); toast('Rekening terverifikasi', 'Payment hold dilepas.'); renderTab(tabId); }
          catch (error) { toast('Verifikasi gagal', error.message, 'coral'); }
        }));
        body.querySelectorAll('[data-employee-approve]').forEach((b) => b.addEventListener('click', async () => {
          const answer=await actionDialog({title:'Setujui perubahan sensitif',description:'Maker dan checker harus berbeda. Keputusan tercatat pada audit trail.',requireReason:true,confirmLabel:'Setujui'});if(!answer)return;
          try { await api(`${cfg.base}/${params.id}/${tab.sub}/${b.dataset.employeeApprove}/approve`,{method:'POST',body:answer});toast('Perubahan disetujui');renderTab(tabId); }
          catch(error){toast('Persetujuan gagal',error.message,'coral');}
        }));
        body.querySelectorAll('[data-activate-cost]').forEach((b) => b.addEventListener('click', async () => {
          try { await api(`${cfg.base}/${params.id}/cost-revisions/${b.dataset.activateCost}/activate`, { method: 'POST' }); toast('Active HPP diperbarui', 'Revisi ini kini menjadi HPP aktif.'); renderTab(tabId); }
          catch (error) { toast('Aktivasi gagal', error.message, 'coral'); }
        }));
        body.querySelectorAll('[data-promote-cost]').forEach((b) => b.addEventListener('click', async () => {
          try { await api(`${cfg.base}/${params.id}/cost-revisions/${b.dataset.promoteCost}/${b.dataset.next}`, { method: 'POST' }); toast('Revisi diperbarui'); renderTab(tabId); }
          catch (error) { toast('Gagal', error.message, 'coral'); }
        }));
      };

      main.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => renderTab(b.dataset.tab)));
      main.querySelectorAll('[data-life]').forEach((b) => b.addEventListener('click', async () => {
        const action = b.dataset.life;
        const needReason = ['suspend','block','obsolete','archive'].includes(action);
        const answer = needReason ? await actionDialog({ title: `${b.textContent.trim()} ${cfg.title}`, description: 'Perubahan status master tercatat pada audit trail.', requireReason: true, confirmLabel: b.textContent.trim() }) : {};
        if (answer === null) return;
        try { await api(`${cfg.base}/${params.id}/lifecycle`, { method: 'POST', body: { action, reason: answer.reason } }); toast('Status master diperbarui'); this.render(main, params); }
        catch (error) { toast('Gagal', error.message, 'coral'); }
      }));
      renderTab(activeTab);
    }
  };

  // ── RFQ: perbandingan supplier + pilih + jadi PO (R017 §13.2) ─────────────

  const R = router.register.bind(router);
  R('/masters/:type/detail/:id', masterDetail);
  R('/masters/customers', masterPage({
    endpoint: '/api/customers', key: 'customers', permission: 'customer.view', title: 'Pelanggan', eyebrow: 'MASTER DATA', detailType: 'customers',
    fields:[{name:'code',label:'Kode pelanggan',required:true},{name:'name',label:'Nama pelanggan',required:true},{name:'npwp',label:'NPWP'},{name:'city',label:'Kota'},{name:'address',label:'Alamat',type:'textarea'},{name:'paymentTermDays',label:'Termin pembayaran (hari)',type:'number',min:0,required:true},{name:'creditLimit',label:'Batas kredit',type:'number',min:0},{name:'active',label:'Pelanggan aktif',type:'checkbox'}],
    columns: [
      { label: 'Pelanggan', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.code)}</small>` },
      { label: 'Kota', render: (r) => esc(r.city) },
      { label: 'NPWP', render: (r) => esc(r.npwp) },
      { label: 'Termin', render: (r) => `${r.paymentTermDays} hari` },
      { label: 'Status', render: (r) => r.active ? '<span class="chip mint">Aktif</span>' : '<span class="chip gray">Nonaktif</span>' }
    ]
  }));
  R('/masters/suppliers', masterPage({
    endpoint: '/api/suppliers', key: 'suppliers', permission: 'supplier.view', title: 'Supplier', eyebrow: 'MASTER DATA', detailType: 'suppliers',
    fields:[{name:'code',label:'Kode supplier',required:true},{name:'name',label:'Nama supplier',required:true},{name:'npwp',label:'NPWP'},{name:'category',label:'Kategori'},{name:'rating',label:'Rating',type:'number',min:1,max:5},{name:'bankName',label:'Nama bank'},{name:'bankAccount',label:'Nomor rekening'},{name:'bankHolder',label:'Nama pemilik rekening'},{name:'active',label:'Supplier aktif',type:'checkbox'}],
    columns: [
      { label: 'Supplier', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.code)}</small>` },
      { label: 'Kategori', render: (r) => esc(r.category) },
      { label: 'Rating', render: (r) => '★'.repeat(r.rating || 0) + '<span class="muted">' + '★'.repeat(5 - (r.rating || 0)) + '</span>' },
      { label: 'Status', render: (r) => r.active ? '<span class="chip mint">Aktif</span>' : '<span class="chip gray">Nonaktif</span>' }
    ]
  }));
  R('/masters/products', masterPage({
    endpoint: '/api/products', key: 'products', permission: 'product.view', title: 'Produk & jasa', eyebrow: 'MASTER DATA', detailType: 'products',
    fields:[{name:'code',label:'Kode produk',required:true},{name:'name',label:'Nama produk/jasa',required:true},{name:'uom',label:'Satuan',required:true},{name:'hpp',label:'Harga pokok',type:'number',min:0,required:true},{name:'price',label:'Harga jual',type:'number',min:0,required:true},{name:'active',label:'Produk aktif',type:'checkbox'}],
    columns: [
      { label: 'Produk', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.code)}</small>` },
      { label: 'Satuan', render: (r) => esc(r.uom) },
      { label: 'HPP', right: true, render: (r) => can('payroll.view') || can('journal.view') || can('*') ? `<span class="money">${fmtIDRFull(r.hpp)}</span>` : '<span class="chip gray">Tersembunyi</span>' },
      { label: 'Harga jual', right: true, render: (r) => `<span class="money">${fmtIDRFull(r.price)}</span>` }
    ]
  }));
})();
