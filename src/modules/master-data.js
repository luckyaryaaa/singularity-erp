'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey , asList } = window.MAT;
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
        { id: 'performance', label: 'Performance Cockpit', custom: true, noAdd: true },
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
          form: [{name:'period',label:'Periode (YYYY-MM)',required:true},{name:'onTimeDeliveryPct',label:'On-time delivery (%)',type:'number',min:0,max:100},{name:'qualityAcceptancePct',label:'Quality acceptance (%)',type:'number',min:0,max:100},{name:'overallScore',label:'Skor keseluruhan',type:'number',min:0,max:100},{name:'riskLevel',label:'Level risiko',type:'select',options:[['LOW','Rendah'],['MEDIUM','Sedang'],['HIGH','Tinggi']]},{name:'approvedVendor',label:'Approved vendor',type:'checkbox'},{name:'notes',label:'Catatan',type:'textarea'}] },
        { id: 'documents', label: 'Dokumen & Expiry', sub: 'documents', documentApprove: true, cols: [['documentType','Jenis'],['title','Dokumen'],['documentNumber','Nomor'],['expiryDate','Kedaluwarsa','date'],['verificationStatus','Verifikasi','chip']],
          form: [{name:'documentType',label:'Jenis',type:'select',options:[['NIB','NIB'],['NPWP','NPWP'],['PKP','PKP'],['BANK_PROOF','Bukti bank'],['COI','Conflict of Interest'],['ISO','ISO'],['SNI','SNI'],['MILL_CERT','Mill certificate'],['INSURANCE','Asuransi'],['CONTRACT','Kontrak'],['OTHER','Lainnya']],required:true},{name:'documentNumber',label:'Nomor dokumen'},{name:'title',label:'Judul',required:true},{name:'issueDate',label:'Tanggal terbit',type:'date'},{name:'expiryDate',label:'Kedaluwarsa',type:'date'},{name:'required',label:'Dokumen wajib',type:'checkbox'},{name:'notes',label:'Catatan',type:'textarea'}] }
      ]
    },
    products: {
      module: 'product', title: 'Produk', base: '/api/masters/products', listRoute: '#/masters/products',
      head: (o) => `<b>${esc(o.name)}</b><small>${esc(o.code)} · ${esc(o.category || o.uom || '')}</small>`,
      tabs: [
        { id: 'overview', label: 'Overview' },
        { id: 'cost-trace', label: 'Cost Trace', custom: true, noAdd: true },
        { id: 'cost-revisions', label: 'BOM & HPP', sub: 'cost-revisions', costActivate: true, cols: [['revisionNo','Rev.'],['totalCost','Total HPP','money'],['status','Status','chip'],['createdAt','Dibuat','date']],
          form: [{name:'costRawMaterial',label:'Bahan baku',type:'number',min:0},{name:'costConsumable',label:'Consumable',type:'number',min:0},{name:'costSubcontract',label:'Subkontrak',type:'number',min:0},{name:'costLabor',label:'Tenaga kerja',type:'number',min:0},{name:'costMachine',label:'Mesin',type:'number',min:0},{name:'costOverhead',label:'Overhead',type:'number',min:0},{name:'costFreight',label:'Ongkir',type:'number',min:0},{name:'costOther',label:'Lainnya',type:'number',min:0},{name:'calculationNotes',label:'Catatan kalkulasi',type:'textarea'}] },
        { id: 'uom-conversions', label: 'Konversi Satuan', sub: 'uom-conversions', cols: [['fromUom','Dari'],['toUom','Ke'],['factor','Faktor']],
          form: [{name:'fromUom',label:'Dari satuan',required:true},{name:'toUom',label:'Ke satuan',required:true},{name:'factor',label:'Faktor konversi',type:'number',min:0,required:true}] },
        { id: 'files', label: 'File Produk', sub: 'files', cols: [['title','Judul'],['fileType','Jenis'],['revision','Rev.'],['confidentiality','Kerahasiaan']],
          form: [{name:'title',label:'Judul',required:true},{name:'fileType',label:'Jenis',type:'select',options:[['DRAWING','Gambar'],['CAD','CAD'],['SPECIFICATION','Spesifikasi'],['QC_STANDARD','Standar QC'],['WORK_INSTRUCTION','Instruksi kerja'],['PHOTO','Foto'],['CERTIFICATE','Sertifikat']],required:true},{name:'revision',label:'Revisi'},{name:'confidentiality',label:'Kerahasiaan',type:'select',options:[['PUBLIC','Publik'],['INTERNAL','Internal'],['CONFIDENTIAL','Rahasia']]},{name:'customerOwned',label:'Milik pelanggan',type:'checkbox'}] },
        { id: 'variants', label: 'Variant Matrix', sub: 'variants', cols: [['variantCode','Kode'],['variantName','Nama'],['uom','Satuan'],['price','Harga','money'],['status','Status','chip']],
          form: [{name:'variantCode',label:'Kode varian',required:true},{name:'variantName',label:'Nama varian',required:true},{name:'attributes',label:'Atribut JSON',type:'textarea',placeholder:'{"size":"M","finish":"Zinc"}'},{name:'uom',label:'Satuan'},{name:'price',label:'Harga',type:'number',min:0},{name:'status',label:'Status',type:'select',options:[['DRAFT','Draft'],['ACTIVE','Aktif'],['BLOCKED','Diblokir'],['OBSOLETE','Usang']],required:true},{name:'effectiveFrom',label:'Berlaku sejak',type:'date',required:true}] }
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
  // Overview enterprise per-master: KPI ringkas + panel informasi rapi (bukan
  // dump mentah). Nilai boleh HTML (chip); teks mentah wajib di-esc di sini.
  const riskChip = (v) => v ? `<span class="chip ${{ LOW: 'mint', MEDIUM: 'amber', HIGH: 'coral' }[v] || 'gray'}">${esc(v)}</span>` : '—';
  const OVERVIEW = {
    customers: {
      kpis: (o) => [
        ['Batas kredit', Number(o.creditLimitAmount) > 0 ? fmtIDR(o.creditLimitAmount) : 'Tanpa batas', `Termin ${o.paymentTermDays || 0} hari · ${esc(o.currency || 'IDR')}`],
        ['Rating risiko', riskChip(o.riskRating), `Koleksi: ${esc(o.collectionStatus || 'NORMAL')}`],
        ['Status PPN', esc(o.ppnStatus || '—'), o.npwp ? `NPWP ${esc(o.npwp)}` : 'NPWP belum diisi'],
        ['Tipe pelanggan', esc(o.customerType === 'INDIVIDUAL' ? 'Perorangan' : 'Perusahaan'), esc(o.businessCategory || 'Kategori umum')]
      ],
      detail: (o) => [['Kode', esc(o.code)], ['Nama legal', esc(o.legalName)], ['Kota', esc(o.city)], ['Website', esc(o.website)], ['Alamat', esc(o.address)]]
    },
    suppliers: {
      kpis: (o) => [
        ['Rating', o.rating ? '★'.repeat(o.rating) + `<span class="muted">${'★'.repeat(5 - o.rating)}</span>` : '—', esc(o.category || 'Kategori umum')],
        ['Level risiko', riskChip(o.riskLevel), `Onboarding: ${esc(o.onboardingStatus || '—')}`],
        ['Perlakuan PPN', esc(o.ppnTreatment || '—'), o.withholdingEligible ? 'Objek withholding' : 'Non-withholding'],
        ['COI', o.coiDeclared ? '<span class="chip mint">Dideklarasikan</span>' : '<span class="chip amber">Belum</span>', o.npwp ? `NPWP ${esc(o.npwp)}` : 'NPWP belum diisi']
      ],
      detail: (o) => [['Kode', esc(o.code)], ['Nama legal', esc(o.legalName)], ['Kategori', esc(o.category)], ['Tipe', esc(o.supplierType === 'INDIVIDUAL' ? 'Perorangan' : 'Perusahaan')], ['Perlakuan PPh', esc(o.pphTreatment)]]
    },
    products: {
      kpis: (o) => [
        ['Harga jual', fmtIDR(o.price || 0), `Satuan ${esc(o.uom || '—')}`],
        ['HPP', can('journal.view') || can('*') ? fmtIDR(o.hpp || 0) : '<span class="chip gray">Tersembunyi</span>', 'Harga pokok awal'],
        ['Sourcing', esc({ MAKE: 'Produksi', BUY: 'Beli', SUBCONTRACT: 'Subkontrak' }[o.makeOrBuy] || o.makeOrBuy || '—'), esc(o.productType || 'PRODUCT')],
        ['Kontrol mutu', o.inspectionRequired ? '<span class="chip amber">Wajib inspeksi</span>' : '<span class="chip mint">Standar</span>', [o.serialRequired && 'Serial', o.lotRequired && 'Lot'].filter(Boolean).join(' · ') || 'Tanpa tracking khusus']
      ],
      detail: (o) => [['Kode', esc(o.code)], ['Kategori', esc(o.category)], ['Material', esc(o.materialType)], ['Grade', esc(o.grade)], ['Dimensi', esc(o.dimensions)], ['No. drawing', esc([o.drawingNumber, o.drawingRevision].filter(Boolean).join(' rev '))], ['Spesifikasi', esc(o.specification)]]
    }
  };

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
          const ov = OVERVIEW[params.type];
          const detailRows = ov
            ? ov.detail(overview).filter(([, v]) => v != null && v !== '').map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')
            : Object.entries(overview).filter(([k, v]) => !['subCounts', 'id'].includes(k) && typeof v !== 'object' && v !== null && v !== '').slice(0, 12).map(([k, v]) => `<div><dt>${esc(k.replace(/([A-Z])/g, ' $1'))}</dt><dd>${esc(String(v))}</dd></div>`).join('');
          const kpiHtml = ov ? `<section class="kpi-grid">${ov.kpis(overview).map(([label, val, note]) => `<article class="kpi"><span>${esc(label)}</span><strong>${val}</strong><small>${note || ''}</small></article>`).join('')}</section>` : '';
          body.innerHTML = kpiHtml + `<div class="dashboard-grid"><article class="panel"><header><div><p class="eyebrow">RINGKASAN</p><h2>Informasi utama</h2></div>${chip(overview.lifecycleStatus || 'ACTIVE')}</header><div class="panel-body"><dl class="detail-dl">${detailRows}</dl></div></article><article class="panel"><header><div><p class="eyebrow">KELENGKAPAN</p><h2>Sub-data</h2></div></header><div class="panel-body stack">${rows}</div></article></div>`;
          return;
        }
        if (tabId === 'cost-trace') {
          body.innerHTML = `<div class="panel"><div class="panel-body"><span class="spinner"></span> Menghitung jejak biaya BOM…</div></div>`;
          try {
            const trace=await api(`/api/master-governance/products/${params.id}/cost-trace`);
            body.innerHTML=`<section class="kpi-grid"><article class="kpi"><span>Material cost</span><strong>${fmtIDR(trace.materialCost||0)}</strong><small>Berdasarkan BOM efektif dan Active HPP</small></article><article class="kpi"><span>Komponen</span><strong>${trace.lines.length}</strong><small>${trace.uncostedComponents||0} belum memiliki cost</small></article><article class="kpi"><span>Revisi BOM</span><strong>${esc(trace.bom?.revisionNo||'—')}</strong><small>${esc(trace.bom?.status||trace.message||'Belum efektif')}</small></article></section><div class="panel table-panel"><header><div><p class="eyebrow">TRACEABILITY</p><h2>Rincian sumber biaya</h2></div>${chip(trace.uncostedComponents?'PERLU DILENGKAPI':'TERKENDALI')}</header><div class="table-wrap"><table><thead><tr><th>Komponen</th><th>Qty + scrap</th><th>Sumber</th><th class="right">Unit cost</th><th class="right">Extended cost</th></tr></thead><tbody>${trace.lines.length?trace.lines.map(x=>`<tr><td><b>${esc(x.code)}</b><small>${esc(x.name)}</small></td><td>${esc(x.qty)} ${esc(x.uom)} · scrap ${esc(x.scrapPct)}%</td><td>${chip(x.costSource)}</td><td class="right money">${fmtIDR(x.unitCost)}</td><td class="right money">${fmtIDR(x.extendedCost)}</td></tr>`).join(''):`<tr><td colspan="5"><div class="empty-state"><h3>Belum ada BOM efektif</h3><p>Setujui dan efektifkan BOM untuk menghasilkan cost trace.</p></div></td></tr>`}</tbody></table></div></div>`;
          } catch(error){body.innerHTML=`<div class="panel"><div class="panel-body error-text">${esc(error.message)}</div></div>`;}
          return;
        }
        if (tabId === 'performance') {
          body.innerHTML=`<div class="panel"><div class="panel-body"><span class="spinner"></span> Menghitung supplier evidence…</div></div>`;
          try{
            const perf=await api(`/api/master-governance/suppliers/${params.id}/performance`),s=perf.supplier||{},latest=perf.evaluations[0],scores=latest?.scoreBreakdown?.scores||{},evidence=latest?.scoreBreakdown?.evidence||{};
            body.innerHTML=`<section class="kpi-grid"><article class="kpi"><span>Skor terakhir</span><strong>${Number(s.lastPerformanceScore||0).toFixed(1)}</strong><small>Periode ${esc(s.lastPerformancePeriod||'belum dihitung')}</small></article><article class="kpi"><span>Delivery</span><strong>${Number(scores.delivery||0).toFixed(1)}%</strong><small>${Number(evidence.receipts||0)} receipt / ${Number(evidence.orders||0)} PO</small></article><article class="kpi"><span>Quality</span><strong>${Number(scores.quality||0).toFixed(1)}%</strong><small>${Number(evidence.inspections||0)} inspeksi QC</small></article><article class="kpi"><span>Procurement control</span><strong>${s.performanceHold?'HOLD':'OPEN'}</strong><small>${esc(s.performanceHoldReason||s.riskLevel||'Terkendali')}</small></article></section><div class="panel table-panel"><header><div><p class="eyebrow">AUTOMATIC SCORECARD</p><h2>Riwayat evaluasi evidence-based</h2></div>${can('supplier.edit')?`<button class="btn primary sm" id="supplierScore">${ICONS.refresh} Hitung periode</button>`:''}</header><div class="table-wrap"><table><thead><tr><th>Periode</th><th>Skor</th><th>Delivery</th><th>Quality</th><th>Dokumen</th><th>Evidence</th><th>AVL</th></tr></thead><tbody>${perf.evaluations.length?perf.evaluations.map(x=>`<tr><td><b>${esc(x.period)}</b><small>${esc(x.calculationSource)}</small></td><td>${Number(x.overallScore||0).toFixed(1)}</td><td>${Number(x.onTimeDeliveryPct||0).toFixed(1)}%</td><td>${Number(x.qualityAcceptancePct||0).toFixed(1)}%</td><td>${Number(x.documentCompliance||0)}/5</td><td>${Number(x.orderCount||0)} PO · ${Number(x.receiptCount||0)} GR · ${Number(x.inspectionCount||0)} QC</td><td>${x.approvedVendor?chip('APPROVED'):chip('HOLD')}</td></tr>`).join(''):`<tr><td colspan="7"><div class="empty-state"><h3>Belum ada score</h3><p>Hitung periode untuk mengolah evidence PO, GR, QC, RFQ, dan dokumen.</p></div></td></tr>`}</tbody></table></div></div>`;
            body.querySelector('#supplierScore')?.addEventListener('click',async()=>{const value=await formDialog({title:'Hitung supplier performance',description:'Perhitungan memakai policy effective-dated dan dapat dijalankan ulang secara deterministik.',fields:[{name:'period',label:'Periode YYYY-MM',value:new Date().toISOString().slice(0,7),required:true}],submitLabel:'Hitung score'});if(!value)return;try{await api(`/api/master-governance/suppliers/${params.id}/performance`,{method:'POST',body:value});toast('Supplier score diperbarui');renderTab('performance');}catch(error){toast('Perhitungan gagal',error.message,'coral');}});
          }catch(error){body.innerHTML=`<div class="panel"><div class="panel-body error-text">${esc(error.message)}</div></div>`;}
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
          <div class="table-wrap"><table><thead><tr>${tab.cols.map((c) => `<th>${esc(c[1])}</th>`).join('')}${(tab.bankApprove || tab.costActivate || tab.employeeApprove || tab.documentApprove) ? '<th></th>' : ''}</tr></thead>
          <tbody>${data.items.length ? data.items.map((row) => `<tr>${tab.cols.map((c) => `<td>${fmtCell(row, c)}</td>`).join('')}${tab.bankApprove ? `<td class="right">${row.verificationStatus !== 'VERIFIED' && can('supplier.approve') ? `<button class="btn secondary sm" data-approve-bank="${esc(row.id)}">Verifikasi</button>` : ''}</td>` : ''}${tab.documentApprove?`<td class="right">${row.verificationStatus==='PENDING'&&can('supplier.approve')?`<button class="btn secondary sm" data-verify-document="${esc(row.id)}">Verifikasi</button>`:''}</td>`:''}${tab.employeeApprove ? `<td class="right">${['PENDING_APPROVAL','PENDING_VERIFICATION'].includes(row[tab.statusKey])&&can('employee.approve')?`<button class="btn secondary sm" data-employee-approve="${esc(row.id)}">Setujui</button>`:''}</td>`:''}${tab.costActivate ? `<td class="right">${['APPROVED','LOCKED'].includes(row.status) && can('product.approve') ? `<button class="btn secondary sm" data-activate-cost="${esc(row.id)}">Set Active HPP</button>` : ['DRAFT','REVIEW'].includes(row.status) && can('product.approve') ? `<button class="btn secondary sm" data-promote-cost="${esc(row.id)}" data-next="${row.status === 'DRAFT' ? 'review' : 'approve'}">${row.status === 'DRAFT' ? 'Ajukan review' : 'Setujui'}</button>` : ''}</td>` : ''}</tr>`).join('') : `<tr><td colspan="${tab.cols.length + 1}"><div class="empty-state">${clayOrb('blue','inbox')}<h3>Belum ada data</h3><p>Tambahkan entri pertama untuk ${esc(tab.label.toLowerCase())}.</p></div></td></tr>`}</tbody></table></div></div>`;

        main.querySelector('#tabAdd')?.addEventListener('click', async () => {
          const fields = typeof tab.form === 'function' ? await tab.form() : tab.form;
          const value = await formDialog({ title: `Tambah ${tab.label}`, description: tab.append ? 'Riwayat bersifat append-only: entri baru menjadi revisi terbaru.' : 'Data tercatat pada audit trail.', fields, submitLabel: 'Simpan' });
          if (!value) return;
          if(tab.sub==='variants'&&value.attributes){try{value.attributes=JSON.parse(value.attributes);}catch{toast('JSON atribut tidak valid','Gunakan format seperti {"size":"M"}.','coral');return;}}
          try { await api(`${cfg.base}/${params.id}/${tab.sub}`, { method: 'POST', body: value, idempotencyKey: newIdemKey() }); toast(`${tab.label} ditambahkan`); renderTab(tabId); invalidate(`master:${params.id}`); this.render(main, params); }
          catch (error) { toast('Gagal menyimpan', error.message, 'coral'); }
        });
        body.querySelectorAll('[data-approve-bank]').forEach((b) => b.addEventListener('click', async () => {
          try { await api(`${cfg.base}/${params.id}/bank-accounts/${b.dataset.approveBank}/approve`, { method: 'POST' }); toast('Rekening terverifikasi', 'Payment hold dilepas.'); renderTab(tabId); }
          catch (error) { toast('Verifikasi gagal', error.message, 'coral'); }
        }));
        body.querySelectorAll('[data-verify-document]').forEach((b)=>b.addEventListener('click',async()=>{try{await api(`${cfg.base}/${params.id}/documents/${b.dataset.verifyDocument}/verify`,{method:'POST',body:{}});toast('Dokumen supplier terverifikasi');renderTab(tabId);}catch(error){toast('Verifikasi gagal',error.message,'coral');}}));
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

  const customerLinkWizard={
    permission:'customer.create',
    async render(main,_params,signal){
      let [recovery,sources,candidates]=await Promise.all([api('/api/master-wizards/customer-link/recover',{signal}),api('/api/master-wizards/customer-link/sources',{signal}),api('/api/master-wizards/customer-link/candidates',{signal})]);
      let draft=recovery.draft,payload=draft?.payload||{},step=draft?.currentStep||0,dirty=false,autosaveTimer;
      const finalKey=newIdemKey(),steps=['Sumber','Pencocokan','Kontak & alamat','Komersial','Tinjau'];
      const unload=(event)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',unload,{signal});
      const fail=(message)=>{const el=main.querySelector('#linkError');if(el){el.textContent=message;el.focus();}};
      const save=async(nextStep=step)=>{if(!draft)return;draft=await api(`/api/master-wizards/customer-link/${draft.id}`,{method:'PATCH',body:{expectedVersion:draft.version,currentStep:nextStep,payload}});payload=draft.payload;step=draft.currentStep;dirty=false;};
      const startScreen=()=>{
        main.innerHTML=pageHead({eyebrow:'MASTER CUSTOMER · CONTROLLED WIZARD',title:'Customer Link',sub:'Hubungkan inquiry/dokumen penjualan ke pelanggan existing atau buat master baru tanpa kehilangan draft.'})+`<section class="panel wizard-panel"><div class="panel-body stack"><div class="callout"><b>Draft tersimpan di server</b><p>Recovery, optimistic locking, duplicate matching, audit, dan idempotent final submit aktif. Tidak ada data wizard di localStorage.</p></div><label class="field"><span>Dokumen sumber (opsional)</span><select id="linkSource" class="select block"><option value="">Tanpa dokumen sumber</option>${sources.items.map(x=>`<option value="${esc(x.id)}">${esc(x.documentNumber)} · ${esc(x.title)}${x.partyName?` · ${esc(x.partyName)}`:''}</option>`).join('')}</select><small>Dokumen yang sudah terhubung tetap dapat dipilih, tetapi tidak boleh dipindahkan ke pelanggan lain.</small></label><button class="btn primary" id="linkStart">Mulai Customer Link</button></div></section>`;
        main.querySelector('#linkStart').addEventListener('click',async()=>{try{draft=await api('/api/master-wizards/customer-link',{method:'POST',body:{sourceDocumentId:main.querySelector('#linkSource').value||null}});payload=draft.payload||{};step=0;view();}catch(error){toast('Wizard gagal dimulai',error.message,'coral');}});
      };
      const capture=()=>{
        const v=(id)=>main.querySelector(id)?.value?.trim(),checked=(id)=>!!main.querySelector(id)?.checked;
        if(step===1){payload.mode=main.querySelector('input[name="linkMode"]:checked')?.value||payload.mode||'EXISTING';if(payload.mode==='EXISTING')payload.customerId=v('#linkCustomer');else payload.customer={...(payload.customer||{}),code:v('#newCode'),name:v('#newName'),legalName:v('#newLegal'),customerType:v('#newType')||'COMPANY',npwp:v('#newNpwp'),ppnStatus:v('#newPpn')||'PKP'};}
        if(step===2&&payload.mode==='NEW'){payload.contact={name:v('#picName'),positionTitle:v('#picPosition'),phone:v('#picPhone'),email:v('#picEmail'),whatsapp:v('#picWhatsapp')};payload.address={addressType:v('#addressType')||'BILLING',address:v('#addressText'),city:v('#addressCity'),province:v('#addressProvince'),postalCode:v('#addressPostal')};}
        if(step===3&&payload.mode==='NEW'){payload.customer={...(payload.customer||{}),businessCategory:v('#commercialCategory'),paymentTermDays:Number(v('#commercialTerm'))||30,creditLimitAmount:Number(v('#commercialLimit'))||0,currency:(v('#commercialCurrency')||'IDR').toUpperCase(),riskRating:v('#commercialRisk')||'LOW',collectionStatus:'NORMAL',creditHold:checked('#commercialHold')};}
        dirty=true;
      };
      const validate=()=>{
        if(step===1&&payload.mode==='EXISTING'&&!payload.customerId)return'Pilih pelanggan existing.';
        if(step===1&&payload.mode==='NEW'&&(!payload.customer?.code||!payload.customer?.name||!payload.customer?.legalName))return'Kode, nama dagang, dan nama legal pelanggan wajib diisi.';
        if(step===2&&payload.mode==='NEW'&&(!payload.contact?.name||!payload.address?.address))return'PIC utama dan alamat wajib diisi.';
        return'';
      };
      const scheduleAutosave=()=>{dirty=true;clearTimeout(autosaveTimer);autosaveTimer=setTimeout(async()=>{capture();try{await save(step);const note=main.querySelector('#autosaveState');if(note)note.textContent='Tersimpan otomatis di server';}catch(error){fail(error.message);}},900);};
      const view=()=>{
        if(!draft)return startScreen();
        const source=payload.source||{},customer=candidates.items.find(x=>x.id===payload.customerId),c=payload.customer||{},contact=payload.contact||{},address=payload.address||{};
        let body='';
        if(step===0)body=`<div class="review-card"><div class="review-row"><span>Draft server</span><b>${esc(draft.id)}</b></div><div class="review-row"><span>Dokumen sumber</span><b>${esc(source.documentNumber||'Tanpa sumber')}</b></div><div class="review-row"><span>Status link saat ini</span><b>${esc(source.partyName||'Belum terhubung')}</b></div><div class="review-row"><span>Versi draft</span><b>${draft.version}</b></div></div><p class="muted">Lanjutkan untuk mencocokkan dengan master existing atau membuat pelanggan baru.</p>`;
        if(step===1)body=`<div class="segmented"><label><input type="radio" name="linkMode" value="EXISTING" ${(payload.mode||'EXISTING')==='EXISTING'?'checked':''}> Gunakan pelanggan existing</label><label><input type="radio" name="linkMode" value="NEW" ${payload.mode==='NEW'?'checked':''}> Buat master baru</label></div><div id="existingFields" ${payload.mode==='NEW'?'hidden':''}><label class="field"><span>Pelanggan existing</span><select id="linkCustomer" class="select block"><option value="">— Pilih hasil pencocokan —</option>${candidates.items.map(x=>`<option value="${esc(x.id)}" ${payload.customerId===x.id?'selected':''}>${esc(x.code)} · ${esc(x.name)} · ${esc(x.npwp||'tanpa NPWP')} · quality ${Number(x.dataQualityScore||0)}%</option>`).join('')}</select></label></div><div id="newFields" class="field-grid" ${payload.mode!=='NEW'?'hidden':''}><label class="field"><span>Kode *</span><input id="newCode" value="${esc(c.code||'')}"></label><label class="field"><span>Nama dagang *</span><input id="newName" value="${esc(c.name||'')}"></label><label class="field"><span>Nama legal *</span><input id="newLegal" value="${esc(c.legalName||'')}"></label><label class="field"><span>NPWP</span><input id="newNpwp" value="${esc(c.npwp||'')}"></label><label class="field"><span>Tipe</span><select id="newType"><option value="COMPANY">Perusahaan</option><option value="INDIVIDUAL">Perorangan</option></select></label><label class="field"><span>Status PPN</span><select id="newPpn"><option value="PKP">PKP</option><option value="NON_PKP">Non-PKP</option></select></label></div>`;
        if(step===2)body=payload.mode==='EXISTING'?`<div class="callout"><b>Master existing dipilih</b><p>Kontak dan alamat tidak ditimpa oleh wizard. Pemeliharaan dilakukan melalui detail pelanggan agar audit tetap jelas.</p></div>`:`<div class="dashboard-grid"><div><p class="eyebrow">PIC UTAMA</p><label class="field"><span>Nama *</span><input id="picName" value="${esc(contact.name||'')}"></label><label class="field"><span>Jabatan</span><input id="picPosition" value="${esc(contact.positionTitle||'')}"></label><label class="field"><span>Telepon</span><input id="picPhone" value="${esc(contact.phone||'')}"></label><label class="field"><span>Email</span><input id="picEmail" type="email" value="${esc(contact.email||'')}"></label><label class="field"><span>WhatsApp</span><input id="picWhatsapp" value="${esc(contact.whatsapp||'')}"></label></div><div><p class="eyebrow">ALAMAT DEFAULT</p><label class="field"><span>Jenis</span><select id="addressType"><option value="BILLING">Penagihan</option><option value="DELIVERY">Pengiriman</option><option value="SITE">Proyek</option></select></label><label class="field"><span>Alamat *</span><textarea id="addressText">${esc(address.address||'')}</textarea></label><label class="field"><span>Kota</span><input id="addressCity" value="${esc(address.city||'')}"></label><label class="field"><span>Provinsi</span><input id="addressProvince" value="${esc(address.province||'')}"></label><label class="field"><span>Kode pos</span><input id="addressPostal" value="${esc(address.postalCode||'')}"></label></div></div>`;
        if(step===3)body=payload.mode==='EXISTING'?`<div class="review-card"><div class="review-row"><span>Pelanggan</span><b>${esc(customer?.name||payload.customerId)}</b></div><div class="review-row"><span>Termin</span><b>${Number(customer?.paymentTermDays||0)} hari</b></div><div class="review-row"><span>Credit control</span><b>${customer?.creditHold?'HOLD':'Normal'}</b></div></div>`:`<div class="field-grid"><label class="field"><span>Kategori bisnis</span><input id="commercialCategory" value="${esc(c.businessCategory||'')}"></label><label class="field"><span>Termin (hari)</span><input id="commercialTerm" type="number" min="0" value="${Number(c.paymentTermDays||30)}"></label><label class="field"><span>Credit limit</span><input id="commercialLimit" type="number" min="0" value="${Number(c.creditLimit||0)}"></label><label class="field"><span>Mata uang</span><input id="commercialCurrency" maxlength="3" value="${esc(c.currency||'IDR')}"></label><label class="field"><span>Risiko</span><select id="commercialRisk"><option value="LOW">Rendah</option><option value="MEDIUM">Sedang</option><option value="HIGH">Tinggi</option></select></label><label class="field checkbox"><input id="commercialHold" type="checkbox" ${c.creditHold?'checked':''}><span>Aktifkan credit hold awal</span></label></div>`;
        if(step===4)body=`<div class="review-card"><div class="review-row"><span>Mode</span><b>${payload.mode==='NEW'?'Buat pelanggan baru':'Hubungkan existing'}</b></div><div class="review-row"><span>Pelanggan</span><b>${esc(payload.mode==='NEW'?c.legalName:(customer?.name||payload.customerId))}</b></div><div class="review-row"><span>Dokumen sumber</span><b>${esc(source.documentNumber||'Tanpa sumber')}</b></div><div class="review-row"><span>Kontrol final</span><b>Duplicate guard · audit · idempotency</b></div></div><p class="review-note">Finalisasi bersifat atomic. Bila gagal, master dan link tidak dibuat sebagian.</p>`;
        main.innerHTML=pageHead({eyebrow:'MASTER CUSTOMER · SERVER-SIDE WIZARD',title:'Customer Link',sub:`Draft ${draft.id.slice(0,8)} · versi ${draft.version} · tersimpan ${relTime(draft.updatedAt)}`})+`<section class="panel wizard-panel"><div class="wiz-steps">${steps.map((x,i)=>`<div class="wiz-step ${i===step?'active':i<step?'done':''}"><span>${i<step?ICONS.check:i+1}</span><b>${x}</b></div>`).join('<i class="wiz-line"></i>')}</div><div class="wiz-body">${body}<small id="autosaveState" class="muted">Perubahan disimpan otomatis ke server</small><p class="error-text" id="linkError" tabindex="-1" role="alert"></p></div><footer class="wiz-footer"><button class="btn secondary" id="linkExit">Simpan & keluar</button><button class="btn secondary" id="linkBack" ${step===0?'disabled':''}>Kembali</button><span class="wiz-progress">Langkah ${step+1} dari ${steps.length}</span><button class="btn primary" id="linkNext">${step===4?'Finalisasi Customer Link':'Simpan & lanjut'}</button></footer></section>`;
        main.querySelectorAll('input:not([name="linkMode"]),select,textarea').forEach(el=>el.addEventListener('input',scheduleAutosave));
        main.querySelectorAll('input[name="linkMode"]').forEach(el=>el.addEventListener('change',()=>{payload.mode=el.value;dirty=true;view();}));
        main.querySelector('#linkBack').addEventListener('click',async()=>{clearTimeout(autosaveTimer);capture();try{await save(Math.max(0,step-1));view();}catch(error){fail(error.message);}});
        main.querySelector('#linkExit').addEventListener('click',async()=>{clearTimeout(autosaveTimer);capture();try{await save(step);toast('Draft Customer Link tersimpan','Dapat dilanjutkan kembali dari menu Customer Link.');router.go('#/masters/customers');}catch(error){fail(error.message);}});
        main.querySelector('#linkNext').addEventListener('click',async()=>{clearTimeout(autosaveTimer);capture();const error=validate();if(error)return fail(error);const btn=main.querySelector('#linkNext');btn.disabled=true;try{if(step<4){await save(step+1);view();}else{const customer=await api(`/api/master-wizards/customer-link/${draft.id}/finalize`,{method:'POST',body:{expectedVersion:draft.version},idempotencyKey:finalKey});dirty=false;invalidate('customers');toast('Customer Link selesai',`${customer.code} · ${customer.name}`);router.go(`#/masters/customers/detail/${customer.id}`);}}catch(error2){btn.disabled=false;fail(error2.message);}});
      };
      view();
    }
  };

  // ── RFQ: perbandingan supplier + pilih + jadi PO (R017 §13.2) ─────────────

  const governancePage={
    permission:'settings.view',
    async render(main,params,signal){
      main.innerHTML=pageHead({eyebrow:'MASTER DATA GOVERNANCE',title:'Data Quality & FX Center',sub:'Kualitas master, duplikasi, kelengkapan, dan kurs efektif dalam satu control center.'})+`<div class="panel"><div class="panel-body"><span class="spinner"></span> Menjalankan quality scan…</div></div>`;
      try{
        const qualityRequest=can('settings.edit')?api('/api/master-governance/quality/scan',{method:'POST'}):api('/api/master-governance/quality',{signal});
        const [quality,rates]=await Promise.all([qualityRequest,api('/api/master-governance/exchange-rates?limit=50',{signal})]);
        const labels={customers:'Pelanggan',suppliers:'Supplier',products:'Produk',employees:'Karyawan'};
        main.innerHTML=pageHead({eyebrow:'MASTER DATA GOVERNANCE',title:'Data Quality & FX Center',sub:'Skor kelengkapan dan kontrol kritikal dihitung langsung dari master aktif.',actions:can('settings.edit')?`<button class="btn primary" id="fxAdd">${ICONS.plus} Tambah kurs</button>`:''})+
          `<section class="kpi-grid">${quality.summary.map(x=>`<article class="kpi"><span>${esc(labels[x.master]||x.master)}</span><strong>${Number(x.score||0)}%</strong><small>${Number(x.critical||0)} dari ${Number(x.total||0)} di bawah ambang 70</small></article>`).join('')}</section>
          <section class="dashboard-grid"><div class="panel table-panel"><header><div><p class="eyebrow">OPEN ISSUES</p><h2>Temuan kualitas prioritas</h2></div><span class="chip gray">${quality.issues.length} temuan</span></header><div class="table-wrap"><table><thead><tr><th>Master</th><th>Aturan</th><th>Temuan</th><th>Severity</th></tr></thead><tbody>${quality.issues.length?quality.issues.map(x=>`<tr><td><b>${esc(x.masterName||'—')}</b><small>${esc(labels[x.masterType]||x.masterType)}</small></td><td>${esc(x.ruleCode)}</td><td>${esc(x.detail)}</td><td>${chip(x.severity)}</td></tr>`).join(''):`<tr><td colspan="4"><div class="empty-state"><h3>Data master terkendali</h3><p>Tidak ada issue kualitas terbuka.</p></div></td></tr>`}</tbody></table></div></div>
          <div class="panel table-panel"><header><div><p class="eyebrow">MULTI-CURRENCY</p><h2>Kurs efektif</h2></div></header><div class="table-wrap"><table><thead><tr><th>Pair</th><th>Tipe</th><th>Kurs</th><th>Efektif</th><th>Sumber</th></tr></thead><tbody>${rates.items.map(x=>`<tr><td><b>${esc(x.fromCurrency)}/${esc(x.toCurrency)}</b></td><td>${chip(x.rateType)}</td><td class="money">${Number(x.rate).toLocaleString('id-ID',{maximumFractionDigits:10})}</td><td>${fmtDate(x.effectiveDate)}</td><td>${esc(x.source)}</td></tr>`).join('')}</tbody></table></div></div></section>`;
        main.querySelector('#fxAdd')?.addEventListener('click',async()=>{const value=await formDialog({title:'Tambah kurs efektif',description:'Kurs menjadi snapshot permanen pada transaksi sesuai tanggal efektif.',fields:[{name:'rateType',label:'Tipe kurs',type:'select',options:[['CORPORATE','Corporate'],['TAX','Pajak'],['BUY','Beli'],['SELL','Jual'],['CLOSING','Closing']],required:true},{name:'fromCurrency',label:'Dari mata uang',value:'USD',required:true},{name:'toCurrency',label:'Ke mata uang',value:'IDR',required:true},{name:'effectiveDate',label:'Tanggal efektif',type:'date',required:true},{name:'rate',label:'Kurs',type:'number',min:0,required:true},{name:'source',label:'Sumber',required:true},{name:'notes',label:'Catatan',type:'textarea'}],submitLabel:'Simpan kurs'});if(!value)return;try{await api('/api/master-governance/exchange-rates',{method:'POST',body:value});toast('Kurs disimpan','Transaksi baru mengambil kurs sesuai tanggal efektif.');this.render(main,params);}catch(error){toast('Kurs gagal disimpan',error.message,'coral');}});
      }catch(error){main.innerHTML=`<section class="error-state">${clayOrb('coral','alert')}<h1>Governance scan gagal</h1><p>${esc(error.message)}</p></section>`;}
    }
  };

  const R = router.register.bind(router);
  R('/masters/governance',governancePage);
  R('/masters/customers/link',customerLinkWizard);
  R('/masters/:type/detail/:id', masterDetail);
  R('/masters/customers', masterPage({
    endpoint: '/api/customers', key: 'customers', permission: 'customer.view', title: 'Pelanggan', eyebrow: 'MASTER DATA', detailType: 'customers',
    fields:[{name:'code',label:'Kode pelanggan',required:true},{name:'name',label:'Nama dagang',required:true},{name:'customerType',label:'Tipe',type:'select',options:[['COMPANY','Perusahaan'],['INDIVIDUAL','Perorangan']],required:true},{name:'legalName',label:'Nama legal',required:true},{name:'npwp',label:'NPWP'},{name:'ppnStatus',label:'Status PPN',type:'select',options:[['PKP','PKP'],['NON_PKP','Non-PKP']],required:true},{name:'businessCategory',label:'Kategori bisnis'},{name:'city',label:'Kota'},{name:'address',label:'Alamat',type:'textarea'},{name:'website',label:'Website'},{name:'paymentTermDays',label:'Termin pembayaran (hari)',type:'number',min:0,required:true},{name:'creditLimit',label:'Batas kredit',type:'number',min:0},{name:'currency',label:'Mata uang',value:'IDR',required:true},{name:'riskRating',label:'Rating risiko',type:'select',options:[['LOW','Rendah'],['MEDIUM','Sedang'],['HIGH','Tinggi']],required:true},{name:'collectionStatus',label:'Status koleksi',type:'select',options:[['NORMAL','Normal'],['WATCH','Watch'],['DUNNING','Dunning'],['LEGAL','Legal']],required:true},{name:'active',label:'Pelanggan aktif',type:'checkbox'}],
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
    fields:[{name:'code',label:'Kode supplier',required:true},{name:'name',label:'Nama dagang',required:true},{name:'supplierType',label:'Tipe',type:'select',options:[['COMPANY','Perusahaan'],['INDIVIDUAL','Perorangan']],required:true},{name:'legalName',label:'Nama legal',required:true},{name:'npwp',label:'NPWP'},{name:'category',label:'Kategori',required:true},{name:'rating',label:'Rating',type:'number',min:1,max:5},{name:'ppnTreatment',label:'Perlakuan PPN',type:'select',options:[['NON_PPN','Non-PPN'],['INCLUDE','Include'],['EXCLUDE','Exclude'],['MIXED','Campuran']],required:true},{name:'pphTreatment',label:'Perlakuan PPh'},{name:'withholdingEligible',label:'Objek withholding',type:'checkbox'},{name:'onboardingStatus',label:'Status onboarding',type:'select',options:[['REGISTERED','Terdaftar'],['UNDER_REVIEW','Ditinjau'],['APPROVED','Disetujui'],['SUSPENDED','Suspended'],['BLOCKED','Diblokir']],required:true},{name:'riskLevel',label:'Level risiko',type:'select',options:[['LOW','Rendah'],['MEDIUM','Sedang'],['HIGH','Tinggi']],required:true},{name:'coiDeclared',label:'COI telah dideklarasikan',type:'checkbox'},{name:'active',label:'Supplier aktif',type:'checkbox'}],
    columns: [
      { label: 'Supplier', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.code)}</small>` },
      { label: 'Kategori', render: (r) => esc(r.category) },
      { label: 'Rating', render: (r) => '★'.repeat(r.rating || 0) + '<span class="muted">' + '★'.repeat(5 - (r.rating || 0)) + '</span>' },
      { label: 'Status', render: (r) => r.active ? '<span class="chip mint">Aktif</span>' : '<span class="chip gray">Nonaktif</span>' }
    ]
  }));
  R('/masters/products', masterPage({
    endpoint: '/api/products', key: 'products', permission: 'product.view', title: 'Produk & jasa', eyebrow: 'MASTER DATA', detailType: 'products',
    fields:[{name:'code',label:'Kode produk',required:true},{name:'name',label:'Nama produk/jasa',required:true},{name:'productType',label:'Tipe',type:'select',options:[['PRODUCT','Produk'],['SERVICE','Jasa'],['RAW_MATERIAL','Bahan baku'],['CONSUMABLE','Consumable'],['SPARE_PART','Spare part'],['TOOLING','Tooling']],required:true},{name:'category',label:'Kategori',required:true},{name:'materialType',label:'Material'},{name:'grade',label:'Grade'},{name:'specification',label:'Spesifikasi',type:'textarea'},{name:'dimensions',label:'Dimensi'},{name:'weightKg',label:'Berat (kg)',type:'number',min:0},{name:'drawingNumber',label:'Nomor drawing'},{name:'drawingRevision',label:'Revisi drawing'},{name:'uom',label:'Satuan',required:true},{name:'hpp',label:'Harga pokok awal',type:'number',min:0,required:true},{name:'price',label:'Harga jual',type:'number',min:0,required:true},{name:'makeOrBuy',label:'Sourcing',type:'select',options:[['MAKE','Produksi'],['BUY','Beli'],['SUBCONTRACT','Subkontrak']],required:true},{name:'isStock',label:'Item persediaan',type:'checkbox'},{name:'serialRequired',label:'Wajib serial number',type:'checkbox'},{name:'lotRequired',label:'Wajib lot/batch',type:'checkbox'},{name:'inspectionRequired',label:'Wajib inspeksi',type:'checkbox'},{name:'active',label:'Produk aktif',type:'checkbox'}],
    columns: [
      { label: 'Produk', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.code)}</small>` },
      { label: 'Satuan', render: (r) => esc(r.uom) },
      { label: 'HPP', right: true, render: (r) => can('payroll.view') || can('journal.view') || can('*') ? `<span class="money">${fmtIDRFull(r.hpp)}</span>` : '<span class="chip gray">Tersembunyi</span>' },
      { label: 'Harga jual', right: true, render: (r) => `<span class="money">${fmtIDRFull(r.price)}</span>` }
    ]
  }));
})();
