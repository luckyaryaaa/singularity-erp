'use strict';
(() => {
  const { esc, fmtIDR, fmtIDRFull, fmtDate, fmtDateTime, relTime, api, uploadFile, query, invalidate, router, can, state, newIdemKey , asList } = window.MAT;
  const { ICONS, chip, toast, formDialog, actionDialog, openDrawer, dataTable, clayOrb, kpiCard, pageHead, runDocAction, runDocConversion, actionButtonsFor, conversionButtonFor, MODULE_OF_TYPE, TYPE_LABEL, AUDIT_LABEL, STATUS_META } = window.UI;
  const { progressBar, docCell, docListPage, masterPage } = window.PageKit;

  // Field master inti — satu sumber untuk form Tambah (list) DAN Edit/Revisi (360).
  const EDIT_FIELDS = {
    customers: [{name:'code',label:'Kode pelanggan',required:true},{name:'name',label:'Nama dagang',required:true},{name:'customerType',label:'Tipe',type:'select',options:[['COMPANY','Perusahaan'],['INDIVIDUAL','Perorangan']],required:true},{name:'legalName',label:'Nama legal',required:true},{name:'npwp',label:'NPWP'},{name:'ppnStatus',label:'Status PPN',type:'select',options:[['PKP','PKP'],['NON_PKP','Non-PKP']],required:true},{name:'businessCategory',label:'Kategori bisnis'},{name:'city',label:'Kota'},{name:'address',label:'Alamat',type:'textarea'},{name:'website',label:'Website'},{name:'paymentTermDays',label:'Termin pembayaran (hari)',type:'number',min:0,required:true},{name:'creditLimitAmount',label:'Batas kredit',type:'number',min:0},{name:'currency',label:'Mata uang',value:'IDR',required:true},{name:'riskRating',label:'Rating risiko',type:'select',options:[['LOW','Rendah'],['MEDIUM','Sedang'],['HIGH','Tinggi']],required:true},{name:'collectionStatus',label:'Status koleksi',type:'select',options:[['NORMAL','Normal'],['WATCH','Watch'],['DUNNING','Dunning'],['LEGAL','Legal']],required:true},{name:'active',label:'Pelanggan aktif',type:'checkbox'}],
    suppliers: [{name:'code',label:'Kode supplier',required:true},{name:'name',label:'Nama dagang',required:true},{name:'supplierType',label:'Tipe',type:'select',options:[['COMPANY','Perusahaan'],['INDIVIDUAL','Perorangan']],required:true},{name:'legalName',label:'Nama legal',required:true},{name:'npwp',label:'NPWP'},{name:'category',label:'Kategori',required:true},{name:'rating',label:'Rating',type:'number',min:1,max:5},{name:'ppnTreatment',label:'Perlakuan PPN',type:'select',options:[['NON_PPN','Non-PPN'],['INCLUDE','Include'],['EXCLUDE','Exclude'],['MIXED','Campuran']],required:true},{name:'pphTreatment',label:'Perlakuan PPh'},{name:'withholdingEligible',label:'Objek withholding',type:'checkbox'},{name:'onboardingStatus',label:'Status onboarding',type:'select',options:[['REGISTERED','Terdaftar'],['UNDER_REVIEW','Ditinjau'],['APPROVED','Disetujui'],['SUSPENDED','Suspended'],['BLOCKED','Diblokir']],required:true},{name:'riskLevel',label:'Level risiko',type:'select',options:[['LOW','Rendah'],['MEDIUM','Sedang'],['HIGH','Tinggi']],required:true},{name:'coiDeclared',label:'COI telah dideklarasikan',type:'checkbox'},{name:'active',label:'Supplier aktif',type:'checkbox'}],
    products: [{name:'code',label:'Kode produk',required:true},{name:'name',label:'Nama produk/jasa',required:true},{name:'productType',label:'Tipe',type:'select',options:[['PRODUCT','Produk'],['SERVICE','Jasa'],['RAW_MATERIAL','Bahan baku'],['CONSUMABLE','Consumable'],['SPARE_PART','Spare part'],['TOOLING','Tooling']],required:true},{name:'category',label:'Kategori',required:true},{name:'materialType',label:'Material'},{name:'grade',label:'Grade'},{name:'specification',label:'Spesifikasi',type:'textarea'},{name:'dimensions',label:'Dimensi'},{name:'weightKg',label:'Berat (kg)',type:'number',min:0},{name:'drawingNumber',label:'Nomor drawing'},{name:'drawingRevision',label:'Revisi drawing'},{name:'uom',label:'Satuan',required:true},{name:'hpp',label:'Harga pokok awal',type:'number',min:0,required:true},{name:'price',label:'Harga jual',type:'number',min:0,required:true},{name:'makeOrBuy',label:'Sourcing',type:'select',options:[['MAKE','Produksi'],['BUY','Beli'],['SUBCONTRACT','Subkontrak']],required:true},{name:'isStock',label:'Item persediaan',type:'checkbox'},{name:'serialRequired',label:'Wajib serial number',type:'checkbox'},{name:'lotRequired',label:'Wajib lot/batch',type:'checkbox'},{name:'inspectionRequired',label:'Wajib inspeksi',type:'checkbox'},{name:'active',label:'Produk aktif',type:'checkbox'}]
  };

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
  // Data-quality gauge — cincin skor + checklist gap yang dapat ditindaklanjuti.
  // stroke-dasharray dipasang sebagai ATRIBUT SVG (bukan inline style) → CSP-safe.
  const qualityRing = (score) => {
    const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
    const r = 30, circ = 2 * Math.PI * r, dash = (s / 100 * circ).toFixed(1);
    const tone = s >= 80 ? 'mint' : s >= 50 ? 'amber' : 'coral';
    return `<span class="quality-ring quality-ring-${tone}"><svg viewBox="0 0 72 72" aria-hidden="true"><circle class="qr-track" cx="36" cy="36" r="${r}"/><circle class="qr-arc" cx="36" cy="36" r="${r}" stroke-dasharray="${dash} ${circ.toFixed(1)}" transform="rotate(-90 36 36)"/></svg><b>${s}<i>%</i></b></span>`;
  };
  const qualitySection = (overview, canEdit) => {
    const flags = Array.isArray(overview.qualityFlags) ? overview.qualityFlags : [];
    const items = flags.length
      ? flags.map((f) => `<li class="quality-flag quality-${String(f.severity || 'WARNING').toLowerCase()}"><span class="quality-dot"></span><span>${esc(f.detail || f.code || 'Kolom belum lengkap')}</span></li>`).join('')
      : '<li class="quality-flag quality-ok"><span class="quality-dot"></span><span>Seluruh kontrol data inti sudah lengkap.</span></li>';
    const score = Math.round(Number(overview.dataQualityScore) || 0);
    const verdict = score >= 80 ? 'Golden record — siap dipakai lintas modul.' : score >= 50 ? 'Cukup, tapi masih ada gap yang perlu dilengkapi.' : 'Data belum lengkap — lengkapi agar akurat & audit-ready.';
    return `<section class="panel quality-panel"><header><div><p class="eyebrow">DATA QUALITY · GOVERNANCE</p><h2>Skor kelengkapan data</h2></div>${canEdit && flags.length ? `<button class="btn secondary sm" id="qualityFix">${ICONS.gear} Lengkapi data</button>` : chip(score >= 80 ? 'TERKENDALI' : 'PERLU DILENGKAPI')}</header><div class="panel-body quality-body">${qualityRing(overview.dataQualityScore)}<div class="quality-detail"><p class="quality-verdict">${verdict}</p><ul class="quality-list">${items}</ul></div></div></section>`;
  };
  // Panel kepatuhan dokumen: ringkasan kedaluwarsa + daftar dokumen yang
  // segera/sudah habis masa berlaku (pola vendor compliance SAP/Oracle).
  const compliancePanel = (overview) => {
    const dc = overview.documentCompliance;
    if (!dc || !Number(dc.total)) return '';
    const list = Array.isArray(overview.expiringDocumentList) ? overview.expiringDocumentList : [];
    const statusLabel = dc.expired ? 'ADA KEDALUWARSA' : dc.expiring ? 'SEGERA HABIS' : dc.requiredPending ? 'PERLU VERIFIKASI' : 'PATUH';
    const daysBadge = (d) => { const days = Math.round((new Date(d).getTime() - Date.now()) / 86400000); return days < 0 ? `<span class="doc-exp-badge coral">Kedaluwarsa ${-days} hari lalu</span>` : `<span class="doc-exp-badge amber">${days} hari lagi</span>`; };
    const rows = list.length
      ? list.map((d) => `<li class="doc-exp-row"><span class="doc-exp-name"><b>${esc(d.title || d.documentType || 'Dokumen')}</b><small>${esc(d.documentType || '')}${d.verificationStatus ? ' · ' + esc(d.verificationStatus) : ''}</small></span>${daysBadge(d.expiryDate)}</li>`).join('')
      : '<li class="doc-exp-row doc-exp-clean">Tidak ada dokumen yang segera kedaluwarsa.</li>';
    return `<article class="panel compliance-panel"><header><div><p class="eyebrow">DOCUMENT COMPLIANCE · EXPIRY</p><h2>Kepatuhan dokumen</h2></div>${chip(statusLabel)}</header><div class="panel-body"><div class="compliance-stats"><div><b>${Number(dc.total)}</b><span>Total</span></div><div class="${dc.expired ? 'stat-coral' : ''}"><b>${Number(dc.expired)}</b><span>Kedaluwarsa</span></div><div class="${dc.expiring ? 'stat-amber' : ''}"><b>${Number(dc.expiring)}</b><span>≤ 90 hari</span></div><div class="stat-mint"><b>${Number(dc.verified)}</b><span>Terverifikasi</span></div></div><ul class="doc-exp-list">${rows}</ul></div></article>`;
  };
  // Credit cockpit customer (SAP FSCM): batas kredit vs eksposur AR + aging.
  const creditCockpit = (overview) => {
    const cp = overview.creditProfile;
    if (!cp) return '';
    const limit = Number(cp.creditLimit) || 0, exposure = Number(cp.exposure) || 0, ag = cp.aging || {};
    const label = { OK: 'Sehat', WATCH: 'Perhatian', OVERDUE: 'Ada jatuh tempo', OVER_LIMIT: 'Lewat batas kredit' }[cp.status] || esc(cp.status || '—');
    const tone = { OK: 'mint', WATCH: 'amber', OVERDUE: 'coral', OVER_LIMIT: 'coral' }[cp.status] || 'gray';
    const cell = (l, v, cls) => `<div class="aging-cell ${cls}"><span>${l}</span><b>${fmtIDR(v || 0)}</b></div>`;
    const barPct = limit > 0 ? Math.min(100, Math.round(exposure / limit * 100)) : 0;
    return `<article class="panel credit-panel"><header><div><p class="eyebrow">CREDIT COCKPIT · PIUTANG (AR)</p><h2>Manajemen kredit &amp; piutang</h2></div>${chip(label)}</header><div class="panel-body"><div class="credit-stats"><div><span>Batas kredit</span><b>${limit > 0 ? fmtIDR(limit) : 'Tanpa batas'}</b></div><div class="${cp.status === 'OVER_LIMIT' ? 'stat-coral' : ''}"><span>Eksposur (AR terbuka)</span><b>${fmtIDR(exposure)}</b></div><div class="stat-mint"><span>Sisa kredit</span><b>${cp.available != null ? fmtIDR(cp.available) : '—'}</b></div><div class="${Number(cp.overdue) > 0 ? 'stat-coral' : ''}"><span>Jatuh tempo</span><b>${fmtIDR(cp.overdue || 0)}</b></div></div>${limit > 0 ? `<div class="credit-bar"><div class="credit-bar-track"><span class="credit-bar-fill credit-bar-${tone}" data-w="${barPct}"></span></div><small>Utilisasi ${cp.utilizationPct}% · ${Number(cp.openInvoices) || 0} faktur terbuka · penjualan 12 bln ${fmtIDR(cp.sales12m || 0)}</small></div>` : `<p class="credit-note">Belum ada batas kredit — tetapkan lewat Edit/Revisi untuk kontrol eksposur.</p>`}<div class="aging-grid"><p class="aging-title">Aging piutang</p>${cell('Belum jatuh tempo', ag.current, 'aging-ok')}${cell('1–30 hari', ag.d1_30, 'aging-warn')}${cell('31–60 hari', ag.d31_60, 'aging-warn')}${cell('61–90 hari', ag.d61_90, 'aging-bad')}${cell('> 90 hari', ag.over90, 'aging-bad')}</div></div></article>`;
  };
  // Vendor scorecard supplier (AVL): skor kinerja + kelayakan.
  const vendorScorecard = (overview) => {
    const s = Number(overview.lastPerformanceScore) || 0, hold = !!overview.performanceHold, has = overview.lastPerformanceScore != null;
    const label = hold ? 'Performance hold' : !has ? 'Belum dinilai' : s >= 80 ? 'Preferred vendor' : s >= 60 ? 'Approved' : 'Perlu review';
    return `<article class="panel vendor-panel"><header><div><p class="eyebrow">VENDOR SCORECARD · AVL</p><h2>Kinerja &amp; kelayakan vendor</h2></div>${chip(label)}</header><div class="panel-body vendor-body">${qualityRing(has ? s : 0)}<div class="quality-meta"><p class="quality-caption">${has ? `Skor kinerja periode ${esc(overview.lastPerformancePeriod || '—')}` : 'Belum ada evaluasi kinerja — hitung di tab Performance.'}${hold ? ` · HOLD: ${esc(overview.performanceHoldReason || '-')}` : ''}</p><ul class="vendor-facts"><li><span>Rating master</span><b>${overview.rating ? '★'.repeat(overview.rating) : '—'}</b></li><li><span>Onboarding</span><b>${esc(overview.onboardingStatus || '—')}</b></li><li><span>Level risiko</span><b>${esc(overview.riskLevel || '—')}</b></li></ul></div></div></article>`;
  };
  // Material master multi-view (SAP): satu produk dilihat per fungsi bisnis —
  // Sales, Purchasing, Costing, Quality, Warehouse, Engineering.
  const materialViews = (o) => {
    if (!o) return '';
    const yn = (b) => b ? '<span class="chip mint">Ya</span>' : '<span class="chip">Tidak</span>';
    const view = (title, icon, rows) => {
      const cells = rows.filter(([, v]) => v != null && v !== '' && v !== '—').map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('');
      return `<div class="mv-card"><p class="mv-title">${icon || ''} ${esc(title)}</p><dl class="detail-dl mv-dl">${cells || '<div><dt>—</dt><dd>Belum diisi</dd></div>'}</dl></div>`;
    };
    return `<article class="panel material-views"><header><div><p class="eyebrow">MATERIAL MASTER · MULTI-VIEW</p><h2>Tampilan per fungsi (SAP-style)</h2></div>${chip(esc(o.makeOrBuy || o.productType || '—'))}</header><div class="panel-body"><div class="mv-grid">${[
      view('Sales', ICONS.cart, [['Harga jual', o.price ? fmtIDR(o.price) : null], ['Satuan', esc(o.uom)], ['Tipe', esc(o.productType)]]),
      view('Purchasing', ICONS.truck, [['Sourcing', esc(o.makeOrBuy)], ['Kategori', esc(o.category)], ['Material', esc(o.materialType)]]),
      view('Costing', ICONS.wallet, [['HPP awal', o.hpp ? fmtIDR(o.hpp) : null], ['Grade', esc(o.grade)]]),
      view('Quality', ICONS.checkCircle, [['Wajib inspeksi', o.inspectionRequired ? yn(true) : null], ['Wajib serial', o.serialRequired ? yn(true) : null], ['Wajib lot/batch', o.lotRequired ? yn(true) : null], ['Spesifikasi', esc(o.specification)]]),
      view('Warehouse', ICONS.box, [['Item persediaan', yn(o.isStock)], ['Dimensi', esc(o.dimensions)], ['Berat', o.weightKg ? `${o.weightKg} kg` : null]]),
      view('Engineering', ICONS.doc, [['No. drawing', esc(o.drawingNumber)], ['Rev. drawing', esc(o.drawingRevision)], ['Garansi', o.warrantyMonths ? `${o.warrantyMonths} bln` : null]]),
    ].join('')}</div></div></article>`;
  };
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

  const partyInitials = (value) => String(value || 'MAT').trim().split(/\s+/).map((word) => word[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'MA';
  const partyQualityTone = (score) => Number(score || 0) >= 85 ? 'quality-high' : Number(score || 0) >= 60 ? 'quality-medium' : 'quality-low';
  const partyAvatar = (party, kind, large = false) => {
    const name = party.name || party.legalName || party.code || 'Business Partner';
    const photo = party.profileFileId ? `<img data-party-photo src="/api/files/${esc(party.profileFileId)}" width="${large ? 112 : 52}" height="${large ? 112 : 52}" alt="${large ? esc(`Foto profil ${name}`) : ''}" loading="lazy" decoding="async">` : '';
    return `<span class="party-avatar ${large ? 'party-avatar-lg' : ''} ${partyQualityTone(party.dataQualityScore)}" data-party-avatar="${esc(kind)}"><span class="party-avatar-fallback" aria-hidden="true">${esc(partyInitials(name))}</span>${photo}<i aria-hidden="true"></i></span>`;
  };
  const partyIdentityCell = (party, kind) => `<span class="party-table-identity">${partyAvatar(party, kind)}<span><b>${esc(party.name || 'Tanpa nama')}</b><small>${esc(party.legalName || (kind === 'customer' ? 'Nama legal belum dilengkapi' : 'Legal entity belum dilengkapi'))}</small><em>${esc(party.code || 'NO-CODE')}</em></span></span>`;
  const starRating = (rating) => `<span class="party-stars" aria-label="Rating ${Number(rating || 0)} dari 5">${Array.from({ length: 5 }, (_, index) => `<i class="${index < Number(rating || 0) ? 'filled' : ''}" aria-hidden="true">&#9733;</i>`).join('')}</span>`;
  const bindPartyPhotoFallback = (root) => root.querySelectorAll('[data-party-photo]').forEach((image) => image.addEventListener('error', () => { image.hidden = true; }, { once: true }));
  const partyIdentityHero = (party, type, editable) => {
    const customer = type === 'customers';
    const kind = customer ? 'customer' : 'supplier';
    const status = party.lifecycleStatus || (party.active ? 'ACTIVE' : 'INACTIVE');
    const facts = customer
      ? [[ICONS.building, 'Lokasi utama', party.city || 'Belum ditentukan'], [ICONS.wallet, 'Kebijakan kredit', `${party.paymentTermDays || 0} hari · ${fmtIDR(party.creditLimitAmount || 0)}`], [ICONS.shield, 'Risk & collection', `${party.riskRating || 'LOW'} · ${party.collectionStatus || 'NORMAL'}`]]
      : [[ICONS.box, 'Kategori pasokan', party.category || 'Belum diklasifikasi'], [ICONS.chart, 'Supplier score', `${Number(party.lastPerformanceScore || 0).toFixed(1)} · ${party.lastPerformancePeriod || 'belum dihitung'}`], [ICONS.shield, 'Risk & onboarding', `${party.riskLevel || 'LOW'} · ${party.onboardingStatus || 'REGISTERED'}`]];
    return `<section class="party-profile-hero" data-party-kind="${kind}"><div class="party-profile-identity">${partyAvatar(party, kind, true)}<div class="party-profile-name"><span class="party-directory-kicker"><i aria-hidden="true"></i>${customer ? 'CUSTOMER IDENTITY' : 'SUPPLIER IDENTITY'}</span><h2>${esc(party.name || party.code)}</h2><p>${esc(party.legalName || 'Nama legal belum dilengkapi')}</p><div class="party-profile-tags"><span>${esc(party.code || 'NO-CODE')}</span>${chip(status)}${customer ? riskChip(party.riskRating) : starRating(party.rating)}</div></div>${editable ? `<div class="party-photo-action"><button class="btn secondary sm" id="partyPhotoButton" type="button">${ICONS.people} Ganti foto</button><input id="partyPhotoInput" type="file" accept="image/png,image/jpeg,image/webp" hidden><small>PNG, JPG, atau WebP · maks. 5 MB</small></div>` : ''}</div><div class="party-profile-facts">${facts.map(([icon, label, value]) => `<div><span>${icon}</span><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('')}<div><span>${ICONS.audit}</span><small>Data governance</small><strong>${Number(party.dataQualityScore || 0)}% · v${Number(party.mdmVersion || 1)}</strong></div></div><span class="party-profile-orbit" aria-hidden="true"><i></i><i></i><i></i></span></section>`;
  };

  const productIdentityHero = (product, editable) => {
    const status = product.lifecycleStatus || (product.active ? 'ACTIVE' : 'INACTIVE');
    const facts = [
      [ICONS.box, 'Kategori', product.category || product.productType || 'Umum'],
      [ICONS.wallet, 'Harga & HPP', `${fmtIDR(product.price || 0)} · HPP ${fmtIDR(product.hpp || 0)}`],
      [ICONS.gear, 'Satuan & tipe', `${product.uom || '—'} · ${product.productType || 'PRODUCT'}`]
    ];
    return `<section class="party-profile-hero" data-party-kind="product"><div class="party-profile-identity">${partyAvatar(product, 'product', true)}<div class="party-profile-name"><span class="party-directory-kicker"><i aria-hidden="true"></i>PRODUCT IDENTITY</span><h2>${esc(product.name || product.code)}</h2><p>${esc(product.specification || product.materialType || 'Spesifikasi belum dilengkapi')}</p><div class="party-profile-tags"><span>${esc(product.code || 'NO-CODE')}</span>${chip(status)}${product.isStock ? '<span class="chip mint">Stok</span>' : '<span class="chip lavender">Jasa / Non-stok</span>'}</div></div>${editable ? `<div class="party-photo-action"><button class="btn secondary sm" id="partyPhotoButton" type="button">${ICONS.box} Ganti foto</button><input id="partyPhotoInput" type="file" accept="image/png,image/jpeg,image/webp" hidden><small>PNG, JPG, atau WebP · maks. 5 MB</small></div>` : ''}</div><div class="party-profile-facts">${facts.map(([icon, label, value]) => `<div><span>${icon}</span><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('')}<div><span>${ICONS.audit}</span><small>Data governance</small><strong>${Number(product.dataQualityScore || 0)}% · v${Number(product.mdmVersion || 1)}</strong></div></div><span class="party-profile-orbit" aria-hidden="true"><i></i><i></i><i></i></span></section>`;
  };


  const fmtCell = (row, col) => {
    const [key, , type] = col; const v = row[key];
    if (type === 'money') return `<span class="money">${fmtIDR(Number(v) || 0)}</span>`;
    if (type === 'date') return fmtDate(v);
    if (type === 'chip') return chip(v);
    if (type === 'bool') return v ? '<span class="chip mint">Ya</span>' : '<span class="chip gray">—</span>';
    return esc(v ?? '—');
  };

  // Masa kerja (service length) dari tanggal bergabung — gaya "length of service" HR.
  const serviceLength = (d) => {
    if (!d) return '—';
    const start = new Date(d), now = new Date();
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (now.getDate() < start.getDate()) months -= 1;
    if (!Number.isFinite(months) || months < 0) months = 0;
    const y = Math.floor(months / 12), m = months % 12;
    return y ? `${y} th${m ? ` ${m} bln` : ''}` : `${m} bln`;
  };

  const openIdentityUpdate = async (params, overview, rerender) => {
    let personal = {};
    try { const r = await api(`/api/masters/employees/${params.id}/personal`); personal = (r.items && r.items[0]) || (r && r.nikKtp !== undefined ? r : {}); } catch (_) { /* profil belum ada */ }
    const rawNik = personal.nikKtp && !String(personal.nikKtp).includes('•') ? personal.nikKtp : '';
    const value = await formDialog({
      title: `Pengkinian Identitas — ${overview.name || overview.nik}`,
      description: 'Perbarui data diri karyawan sesuai KTP & dokumen resmi. NIK KTP dienkripsi; seluruh perubahan tercatat pada audit trail.',
      fields: [
        { type: 'section', label: 'Data Pribadi', icon: ICONS.people, hint: 'Sesuai Kartu Tanda Penduduk.' },
        { name: 'nikKtp', label: 'NIK KTP', hint: rawNik ? 'Terenkripsi.' : 'Kosongkan bila tidak diubah.' },
        { name: 'birthPlace', label: 'Tempat lahir' },
        { name: 'birthDate', label: 'Tanggal lahir', type: 'date' },
        { name: 'gender', label: 'Jenis kelamin', type: 'select', options: [['', '—'], ['MALE', 'Laki-laki'], ['FEMALE', 'Perempuan']] },
        { name: 'maritalStatus', label: 'Status perkawinan', type: 'select', options: [['', '—'], ['BELUM KAWIN', 'Belum kawin'], ['KAWIN', 'Kawin'], ['CERAI HIDUP', 'Cerai hidup'], ['CERAI MATI', 'Cerai mati']] },
        { name: 'religion', label: 'Agama', type: 'select', options: [['', '—'], ['ISLAM', 'Islam'], ['KRISTEN', 'Kristen'], ['KATOLIK', 'Katolik'], ['HINDU', 'Hindu'], ['BUDDHA', 'Buddha'], ['KONGHUCU', 'Konghucu']] },
        { name: 'bloodType', label: 'Golongan darah', type: 'select', options: [['', '—'], ['A', 'A'], ['B', 'B'], ['AB', 'AB'], ['O', 'O']] },
        { type: 'section', label: 'Kontak & Alamat', icon: ICONS.building },
        { name: 'phone', label: 'Telepon / HP', type: 'tel' },
        { name: 'personalEmail', label: 'Email pribadi', type: 'email' },
        { name: 'address', label: 'Alamat domisili', type: 'textarea', rows: 2 }
      ],
      initial: { ...personal, nikKtp: rawNik },
      submitLabel: 'Simpan pengkinian'
    });
    if (!value) return;
    Object.keys(value).forEach((k) => { if (value[k] === '' || value[k] == null) delete value[k]; });
    if (!Object.keys(value).length) { toast('Tidak ada perubahan', 'Isi minimal satu field untuk menyimpan.', 'amber'); return; }
    try {
      await api(`/api/masters/employees/${params.id}/personal`, { method: 'POST', body: value, idempotencyKey: newIdemKey() });
      invalidate(`master:${params.id}`);
      toast('Identitas diperbarui', 'Data diri tersimpan & tercatat di audit trail.');
      rerender();
    } catch (error) { toast('Gagal menyimpan identitas', error.message, 'coral'); }
  };


  // ── Master Karyawan 360 · Claymorphism (port dari prototype HRIS) ─────────
  const MKI = {
    user: '<circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>',
    shieldCheck: '<path d="M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6z"/><path d="m9 12 2 2 4-4"/>',
    printer: '<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    scanText: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8h8M7 12h6M7 16h4"/>',
    gitPr: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M6 9v6"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="m16 8-3-2 3-2"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14v4M8 18h.01M12 18h.01"/>',
    shield: '<path d="M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6z"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3-2-2z"/>',
    fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    award: '<circle cx="12" cy="8" r="5"/><path d="M8.2 12 7 21l5-3 5 3-1.2-9"/>',
    calCheck: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/><path d="m9 16 2 2 4-4"/>',
    idCard: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M14 9h4M14 13h4M6.5 16a2.5 2.5 0 0 1 5 0"/>',
    sparkles: '<path d="M12 3l1.5 4L18 8.5 13.5 10 12 14l-1.5-4L6 8.5 10.5 7z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    mapPin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    heart: '<path d="M20.8 6.6a5 5 0 0 0-8.8-2 5 5 0 0 0-8.8 2c-1 3 1.5 6 8.8 11 7.3-5 9.8-8 8.8-11z"/><path d="M3.5 12h4l1.5-3 2 5 1.5-2h4.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  const MK = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${MKI[n] || ''}</svg>`;
  const mkInitials = (v) => String(v || '?').trim().split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  const mkAge = (d) => { if (!d) return null; const a = Math.floor((Date.now() - new Date(d).getTime()) / 31557600000); return Number.isFinite(a) ? a : null; };
  const mkField = (label, value, opts = {}) => `<div class="mk-inset mk-field"><div class="mk-field-top"><label>${esc(label)}</label>${opts.tag ? `<span class="mk-tag ${opts.tag[1]}">${esc(opts.tag[0])}</span>` : ''}</div><div class="mk-v ${opts.mono ? 'mono' : ''}">${opts.html || esc(value ?? '—')}${opts.copy ? `<button class="mk-copy" data-mk-copy="${esc(opts.copy)}" title="Salin">${MK('copy')}</button>` : ''}</div></div>`;
  const MK_TABS = [
    ['overview', 'Overview & Master', 'user', null], ['ocr', 'AI OCR KTP/NPWP', 'scanText', ['AI Engine', 'purple']],
    ['workflow', 'Workflow Approval', 'gitPr', ['Maker-Checker', 'amber']], ['employment', 'Employment & Position', 'briefcase', null],
    ['family', 'Keluarga & Tanggungan', 'user', ['PTKP', 'blue']],
    ['talent', 'Performance & Talent', 'award', ['9-Box', 'purple']],
    ['tax', 'Pajak', 'calc', ['PPh 21 TER', 'blue']], ['bpjs', 'BPJS', 'shield', ['Kesehatan & TK', 'emerald']],
    ['payroll', 'Payroll & Bank', 'card', null], ['services', 'Services & Tools', 'wrench', null],
    ['documents', 'Documents', 'fileText', null], ['audit', 'Audit Trail & Logs', 'history', null]
  ];

  // Tabel TER Bulanan PP 58/2023 (presisi) — [batas atas bruto, tarif]. Kategori A/B/C.
  const TER_TABLE = {
    A: [[5400000, 0], [5650000, 0.0025], [5950000, 0.005], [6300000, 0.0075], [6750000, 0.01], [7500000, 0.0125], [8550000, 0.015], [9650000, 0.0175], [10050000, 0.02], [10350000, 0.0225], [10700000, 0.025], [11050000, 0.03], [11600000, 0.035], [12500000, 0.04], [13750000, 0.05], [15100000, 0.06], [16950000, 0.07], [19750000, 0.08], [24150000, 0.09], [26450000, 0.1], [28000000, 0.11], [30050000, 0.12], [32400000, 0.13], [35400000, 0.14], [39100000, 0.15], [43850000, 0.16], [47800000, 0.17], [51400000, 0.18], [56300000, 0.19], [62200000, 0.2], [68600000, 0.21], [77500000, 0.22], [89000000, 0.23], [103000000, 0.24], [125000000, 0.25], [157000000, 0.26], [206000000, 0.27], [337000000, 0.28], [454000000, 0.29], [550000000, 0.3], [695000000, 0.31], [910000000, 0.32], [1400000000, 0.33], [Infinity, 0.34]],
    B: [[6200000, 0], [6500000, 0.0025], [6850000, 0.005], [7300000, 0.0075], [9200000, 0.01], [10750000, 0.015], [11250000, 0.02], [11600000, 0.025], [12600000, 0.03], [13600000, 0.04], [14950000, 0.05], [16400000, 0.06], [18450000, 0.07], [21850000, 0.08], [26000000, 0.09], [27700000, 0.1], [29350000, 0.11], [31450000, 0.12], [33950000, 0.13], [37100000, 0.14], [41100000, 0.15], [45800000, 0.16], [49500000, 0.17], [53800000, 0.18], [58500000, 0.19], [64000000, 0.2], [71000000, 0.21], [80000000, 0.22], [93000000, 0.23], [109000000, 0.24], [129000000, 0.25], [163000000, 0.26], [211000000, 0.27], [374000000, 0.28], [459000000, 0.29], [555000000, 0.3], [704000000, 0.31], [957000000, 0.32], [1405000000, 0.33], [Infinity, 0.34]],
    C: [[6600000, 0], [6950000, 0.0025], [7350000, 0.005], [7800000, 0.0075], [8850000, 0.01], [9800000, 0.0125], [10950000, 0.015], [11200000, 0.0175], [12050000, 0.02], [12950000, 0.03], [14150000, 0.04], [15550000, 0.05], [17050000, 0.06], [19500000, 0.07], [22700000, 0.08], [26600000, 0.09], [28100000, 0.1], [30100000, 0.11], [32600000, 0.12], [35400000, 0.13], [38900000, 0.14], [43000000, 0.15], [47400000, 0.16], [51200000, 0.17], [55800000, 0.18], [60400000, 0.19], [66700000, 0.2], [74500000, 0.21], [83200000, 0.22], [95600000, 0.23], [110000000, 0.24], [134000000, 0.25], [169000000, 0.26], [221000000, 0.27], [390000000, 0.28], [463000000, 0.29], [561000000, 0.3], [709000000, 0.31], [965000000, 0.32], [1419000000, 0.33], [Infinity, 0.34]]
  };
  const terRateOf = (cat, bruto) => { const t = TER_TABLE[cat] || TER_TABLE.A; for (const [cap, r] of t) if (bruto <= cap) return r; return 0.34; };
  const ptkpToCat = (p) => { p = String(p || '').toUpperCase(); if (['TK/0', 'TK/1', 'K/0'].includes(p)) return 'A'; if (['TK/2', 'TK/3', 'K/1', 'K/2'].includes(p)) return 'B'; if (p === 'K/3') return 'C'; return 'A'; };
  const PTKP_OPTS = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'];
  // BPJS — komponen per program (tarif regulasi) + tingkat risiko JKK. erPct =
  // porsi perusahaan, eePct = porsi karyawan, cap = batas atas dasar upah (0 = tanpa cap).
  const BPJS_JKK_RISK = [['0.0024', 'Tk I — Sangat rendah (0,24%)'], ['0.0054', 'Tk II — Rendah (0,54%)'], ['0.0089', 'Tk III — Sedang (0,89%)'], ['0.0127', 'Tk IV — Tinggi (1,27%)'], ['0.0174', 'Tk V — Sangat tinggi (1,74%)']];
  const BPJS_PROGRAMS = [
    { key: 'kesehatan', short: 'Kesehatan', label: 'BPJS Kesehatan (JKN-KIS)', branch: 'Kesehatan', erPct: 0.04, eePct: 0.01, cap: 12000000, tone: 'emerald' },
    { key: 'jht', short: 'JHT', label: 'Jaminan Hari Tua', branch: 'Ketenagakerjaan', erPct: 0.037, eePct: 0.02, cap: 0, tone: 'blue' },
    { key: 'jkk', short: 'JKK', label: 'Jaminan Kecelakaan Kerja', branch: 'Ketenagakerjaan', erPct: 0.0024, eePct: 0, cap: 0, tone: 'amber', risk: true },
    { key: 'jkm', short: 'JKM', label: 'Jaminan Kematian', branch: 'Ketenagakerjaan', erPct: 0.003, eePct: 0, cap: 0, tone: 'amber' },
    { key: 'jp', short: 'JP', label: 'Jaminan Pensiun', branch: 'Ketenagakerjaan', erPct: 0.02, eePct: 0.01, cap: 10042300, tone: 'blue' }
  ];

  const employeeClayDetail = {
    async render(main, params, signal) {
      if (!can('employee.view')) { main.innerHTML = `<section class="error-state">${clayOrb('amber', 'lock')}<h1>Akses dibatasi</h1></section>`; return; }
      let ov;
      try { ov = await api(`/api/masters/employees/${params.id}`, { signal }); }
      catch (error) { main.innerHTML = `<section class="error-state">${clayOrb('coral', 'alert')}<h1>Gagal memuat</h1><p>${esc(error.message)}</p></section>`; return; }
      let personal = {};
      try { const pr = await api(`/api/masters/employees/${params.id}/personal`); personal = (pr && pr.items && pr.items[0]) || {}; } catch (_) { /* opsional */ }
      const s = ov.enterpriseSummary || {}, pos = s.currentPosition || {}, comp = s.compensation || {}, tax = s.tax || {}, leave = s.leaveBalance || {}, emp = s.employment || {}, sup = s.supervisor || {};
      const editable = can('employee.edit');
      const compTotal = (Number(comp.baseSalary) || 0) + (Number(comp.fixedAllowance) || 0) + (Number(comp.variableAllowance) || 0);
      const dq = Math.round(Number(ov.dataQualityScore) || 0);
      const flags = Array.isArray(ov.qualityFlags) ? ov.qualityFlags : [];
      const photo = ov.profileFileId ? `<img data-party-photo src="/api/files/${esc(ov.profileFileId)}" alt="">` : '';
      const age = mkAge(personal.birthDate);

      const metrics = `<div class="mk-g mk-g4">
        <article class="mk-surface mk-metric"><div class="mk-m-copy"><span class="mk-m-k">Masa Kerja & Status</span><div class="mk-m-v">${esc(serviceLength(ov.joinDate))}</div><span class="mk-m-note mk-em">${MK('check')} ${esc(emp.employmentType || 'PKWTT')}</span></div><div class="mk-m-ic mk-ic-blue">${MK('award')}</div></article>
        <article class="mk-surface mk-metric"><div class="mk-m-copy"><span class="mk-m-k">Sisa Cuti & Kehadiran</span><div class="mk-m-v">${Number(leave.remaining || 0)} Hari <small>/ ${Number(leave.entitlement || 0)} Hari</small></div><span class="mk-m-note mk-bl">Kehadiran: ${Number(s.attendanceDays || 0)} hari/bln</span></div><div class="mk-m-ic mk-ic-emerald">${MK('calCheck')}</div></article>
        <article class="mk-surface mk-metric"><div class="mk-m-copy wide"><div class="mk-rowb"><span class="mk-m-k">Data Quality</span><span class="mk-dqpct ${dq >= 80 ? 'mk-em' : dq >= 50 ? 'mk-am' : 'mk-cor'}">${dq}%</span></div><progress class="mk-progress ${dq >= 80 ? 'ok' : dq < 50 ? 'bad' : ''}" value="${dq}" max="100"></progress><span class="mk-m-note mk-mu">${flags.length ? `${flags.length} isu perlu ditindak` : 'Golden record'}</span></div><div class="mk-m-ic mk-ic-amber">${MK('sparkles')}</div></article>
        <article class="mk-surface mk-metric"><div class="mk-m-copy wide"><span class="mk-m-k">Quick Actions</span><div class="mk-qa">
          <button class="mk-btn sm mk-bl" data-mk-tab="tax">${MK('calc')}<span>Pajak</span></button>
          <button class="mk-btn sm mk-em" data-mk-tab="bpjs">${MK('shield')}<span>BPJS</span></button>
          <button class="mk-btn sm" data-mk-export>${MK('printer')}<span>Export</span></button>
        </div></div></article></div>`;

      const dataPribadi = `<section class="mk-surface mk-ovh"><div class="mk-section-head"><h2>${MK('idCard')} Data Master Pribadi · Identitas Diri</h2><div class="mk-hdr-meta">${personal.nikKtp ? '<span class="mk-badge emerald">' + MK('check') + ' Terverifikasi</span>' : '<span class="mk-badge amber">Belum lengkap</span>'}${editable ? `<button class="mk-btn sm" data-mk-identity>${MK('edit')} Pengkinian</button>` : ''}</div></div>
        <div class="mk-section-body mk-g mk-g4">
          ${mkField('NIK KTP (16 Digit)', personal.nikKtp || '—', { mono: true, copy: personal.nikKtp && !String(personal.nikKtp).includes('•') ? personal.nikKtp : '' })}
          ${mkField('Tempat, Tanggal Lahir', null, { html: `${esc(personal.birthPlace || '—')}${personal.birthDate ? `, ${fmtDate(personal.birthDate)}` : ''}${age != null ? ` <span class="mk-mu">(${age} TH)</span>` : ''}` })}
          ${mkField('Jenis Kelamin', personal.gender === 'MALE' ? 'Laki-laki' : personal.gender === 'FEMALE' ? 'Perempuan' : '—')}
          ${mkField('Status Perkawinan', null, { html: `<span class="mk-badge slate">${esc(personal.maritalStatus || '—')}</span>` })}
          ${mkField('Agama', personal.religion || '—')}
          ${mkField('Golongan Darah', personal.bloodType || '—', { mono: true })}
          ${mkField('No. Telepon / Mobile', personal.phone || '—', { mono: true, copy: personal.phone || '' })}
          ${mkField('Email Pribadi', personal.personalEmail || '—', { mono: true, copy: personal.personalEmail || '' })}
          <div class="mk-inset mk-field mk-span2"><label>Alamat Domisili</label><div class="mk-v">${MK('mapPin')}<span class="mk-addr-v">${esc(personal.address || 'Belum dilengkapi')}</span></div></div>
        </div></section>`;

      const ptkpStatus = tax.ptkpStatus || 'TK/0';
      const terCat = tax.terCategory || (['TK/0', 'TK/1', 'K/0'].includes(ptkpStatus) ? 'A' : ['TK/2', 'TK/3', 'K/1', 'K/2'].includes(ptkpStatus) ? 'B' : ptkpStatus === 'K/3' ? 'C' : 'A');
      const taxTab = `<section class="mk-surface"><div class="mk-section-head"><div><div class="mk-section-title">${MK('calc')} PPh 21 TER Advanced Planner</div><div class="mk-section-desc">Gaji &amp; seluruh tunjangan otomatis dari data karyawan — sesuaikan Bonus/THR &amp; metode. PP 58/2023.</div></div><span class="mk-badge blue">Compliance v9.5</span></div><div class="mk-section-body"><div class="mk-io">
        <div class="mk-inset mk-io-panel">
          <div class="mk-g mk-g2"><div><label class="mk-field-lbl">Gaji Pokok <span class="mk-tag lock">auto · lock</span></label><input class="mk-input" type="number" id="mkTaxBase" value="${Number(comp.baseSalary) || 0}" readonly></div><div><label class="mk-field-lbl">Tunjangan Tetap <span class="mk-tag lock">lock</span></label><input class="mk-input" type="number" id="mkTaxFixed" value="${Number(comp.fixedAllowance) || 0}" readonly></div><div><label class="mk-field-lbl">Tunjangan Variabel <span class="mk-tag lock">lock</span></label><input class="mk-input" type="number" id="mkTaxVar" value="${Number(comp.variableAllowance) || 0}" readonly></div><div><label class="mk-field-lbl">Bonus / THR <span class="mk-tag emerald">adjust</span></label><input class="mk-input" type="number" id="mkTaxBonus" value="0"></div></div>
          <div><label class="mk-field-lbl">Metode Pemotongan Pajak</label><select class="mk-input" id="mkTaxMethod"><option value="GROSS"${(tax.taxMethod === 'GROSS' || !tax.taxMethod) ? ' selected' : ''}>Gross — dipotong dari gaji (ditanggung karyawan)</option><option value="NET"${tax.taxMethod === 'NET' ? ' selected' : ''}>Nett — ditanggung perusahaan</option><option value="GROSS_UP"${tax.taxMethod === 'GROSS_UP' ? ' selected' : ''}>Gross-up — tunjangan pajak</option></select></div>
          <div class="mk-g mk-g2"><div><label class="mk-field-lbl">Status PTKP <span class="mk-tag emerald">adjust</span></label><select class="mk-input" id="mkTaxPtkp">${PTKP_OPTS.map((p) => `<option value="${p}"${p === ptkpStatus ? ' selected' : ''}>${p}</option>`).join('')}</select></div><div><label class="mk-field-lbl">Kategori TER <span class="mk-tag lock">otomatis</span></label><input class="mk-input" id="mkTaxCat" value="${terCat}" readonly></div></div>
          <div class="mk-g mk-g2"><div><label class="mk-field-lbl">Status NPWP</label><select class="mk-input" id="mkTaxNpwp"><option value="1"${tax.npwp ? ' selected' : ''}>Ber-NPWP</option><option value="0"${!tax.npwp ? ' selected' : ''}>Tanpa NPWP (+20%)</option></select></div><div class="mk-annual-btn"><button class="mk-btn primary" id="mkTaxAnnual">${MK('calc')} Hitung Tahunan &amp; Desember</button></div></div>
        </div>
        <div class="mk-surface mk-io-out mk-io-panel">
          <div class="mk-rowb mk-o-caps bb">Hasil Kalkulator PPh 21 TER<span class="mk-badge emerald" id="mkTaxMethodBadge">Gross</span></div>
          <div class="mk-out-grid"><div class="mk-inset mk-out"><span>Total Bruto Sebulan</span><b id="mkOutBruto">—</b></div><div class="mk-inset mk-out"><span>Tarif TER · Kat. <span id="mkOutCat">${esc(terCat)}</span></span><b class="blue" id="mkOutRate">—</b></div><div class="mk-inset mk-out"><span>PPh 21 Bulanan</span><b class="emerald" id="mkOutTax">—</b></div><div class="mk-inset mk-out"><span>Take Home Pay</span><b class="indigo" id="mkOutThp">—</b></div><div class="mk-inset mk-out mk-span2"><span>Biaya Perusahaan (gaji + pajak ditanggung)</span><b id="mkOutCost">—</b></div></div>
          <div class="mk-note"><b>${MK('info')} Metode:</b> <span id="mkTaxRec">—</span></div>
          ${can('employee.edit') ? `<button class="mk-btn primary sm" id="mkTaxSave">${MK('save')} Simpan ke Profil Pajak</button>` : ''}
        </div></div><div id="mkTaxAnnualOut" class="mk-annual-out"></div></div></section>`;

      const bpjsUpah = (Number(comp.baseSalary) || 0) + (Number(comp.fixedAllowance) || 0) || 6500000;
      const bpjsTab = `<section class="mk-surface"><div class="mk-section-head"><div><div class="mk-section-title">${MK('shield')} BPJS Kesehatan & Ketenagakerjaan</div><div class="mk-section-desc">Konfigurasi program &amp; skema iuran — sesuaikan dengan kebutuhan/kemampuan perusahaan. Kalkulator otomatis.</div></div><span class="mk-badge emerald" id="mkBpjsCount">— program aktif</span></div><div class="mk-section-body mk-col">
        <div class="mk-inset mk-io-panel"><div class="mk-o-caps">Konfigurasi Kepesertaan &amp; Skema Iuran</div>
          <div class="mk-g mk-g3"><div class="mk-field"><label>Dasar Upah / Gaji (IDR) <span class="mk-tag lock">auto · lock</span></label><input class="mk-input" type="number" id="mkBpjsSalary" value="${bpjsUpah}" readonly></div>
          <div class="mk-field"><label>Skema Iuran</label><select class="mk-input" id="mkBpjsScheme"><option value="SPLIT">Iuran — karyawan + perusahaan</option><option value="FULL_COMPANY">Ditanggung penuh perusahaan</option></select></div>
          <div class="mk-field"><label>Tingkat Risiko JKK</label><select class="mk-input" id="mkBpjsRisk">${BPJS_JKK_RISK.map(([v, l], i) => `<option value="${v}"${i === 0 ? ' selected' : ''}>${l}</option>`).join('')}</select></div></div>
          <div class="mk-o-caps">Program BPJS Aktif — centang sesuai kebutuhan</div>
          <div class="mk-bpjs-progs">${BPJS_PROGRAMS.map((p) => `<label class="mk-bpjs-prog"><input type="checkbox" data-bpjs-prog="${p.key}" checked><span class="mk-bpjs-prog-b"><b>${esc(p.short)}</b><small>${esc(p.label)}</small></span></label>`).join('')}</div>
          <div class="mk-note emerald"><b>${MK('heart')} Skema:</b> "Iuran" = porsi karyawan dipotong dari gaji, sisanya perusahaan. "Ditanggung penuh perusahaan" = seluruh iuran (termasuk porsi karyawan) dibayar perusahaan, potongan karyawan Rp 0. JKK &amp; JKM selalu 100% perusahaan.</div>
        </div>
        <div class="mk-tl-wrap"><div class="mk-rowb mk-o-caps bb">Rincian Iuran per Program<span class="mk-bpjs-acts">${can('employee.edit') ? `<button class="mk-btn primary sm" id="mkBpjsSave">${MK('check')} Simpan ke Profil</button>` : ''}<button class="mk-btn sm" id="mkBpjsPrint">${MK('printer')} Cetak Rincian</button></span></div>
          <div class="mk-reg-wrap"><table class="mk-reg mk-reg-static"><thead><tr><th>Program</th><th class="r">Dasar Upah</th><th class="r">Perusahaan</th><th class="r">Karyawan</th><th class="r">Total / bln</th></tr></thead><tbody id="mkBpjsRows"></tbody><tfoot id="mkBpjsFoot"></tfoot></table></div>
        </div>
        <div class="mk-g mk-g3"><div class="mk-inset mk-out"><span>Total Iuran / bln</span><b class="blue" id="mkBpjsTotal">—</b></div><div class="mk-inset mk-out"><span>Ditanggung Perusahaan</span><b class="emerald" id="mkBpjsEr">—</b></div><div class="mk-inset mk-out"><span>Dipotong dari Karyawan</span><b class="indigo" id="mkBpjsEe">—</b></div></div>
        <div id="mkBpjsPrintOut"></div>
      </div></section>`;


      main.innerHTML = `<div class="mk360">
        <section class="mk-surface mk-banner"><div class="mk-banner-row">
          <div class="mk-id"><div class="mk-avatar${ov.profileFileId ? ' has-photo' : ''}">${photo || esc(mkInitials(ov.name))}<span class="mk-dot" title="Aktif"></span></div>
            <div><div class="mk-id-tags"><h1>${esc(ov.name || ov.nik)}</h1><span class="mk-badge emerald">${MK('shieldCheck')} ${esc(ov.lifecycleStatus || 'ACTIVE')}</span>${ov.department ? `<span class="mk-badge blue">ORG: ${esc(ov.department)}</span>` : ''}</div>
              <div class="mk-meta"><span>NIK: <b>${esc(ov.nik || '—')}</b></span><i>•</i><span>Posisi: <b>${esc(pos.positionTitle || ov.jobTitle || '—')}</b></span><i>•</i><span>Lokasi: <b>${esc(ov.branchName || '—')}</b></span><i>•</i><span>Atasan: <b>${esc(sup.supervisorName || '—')}</b></span></div>
            </div></div>
          <div class="mk-actions"><button class="mk-btn" data-mk-export>${MK('printer')} Export Summary</button>${editable ? `<button class="mk-btn primary" data-mk-identity>${MK('edit')} Pengkinian Data</button>` : ''}</div>
        </div></section>

        <div class="mk-surface mk-tabbar"><div class="mk-tabs" role="tablist">${MK_TABS.map((t, i) => `<button class="mk-tab${i === 0 ? ' active' : ''}" data-mk-tab="${t[0]}" role="tab">${MK(t[2])} ${esc(t[1])}${t[3] ? `<span class="mk-chip ${t[3][1]}">${esc(t[3][0])}</span>` : ''}</button>`).join('')}</div></div>

        <div class="mk-content" data-mk-content="overview">${metrics}${dataPribadi}</div>
        <div class="mk-content" data-mk-content="tax" hidden>${taxTab}</div>
        <div class="mk-content" data-mk-content="bpjs" hidden>${bpjsTab}</div>
        <div class="mk-content" data-mk-content="ocr" hidden></div>
        <div class="mk-content" data-mk-content="workflow" hidden></div>
        <div class="mk-content" data-mk-content="employment" hidden></div>
        <div class="mk-content" data-mk-content="family" hidden></div>
        <div class="mk-content" data-mk-content="talent" hidden></div>
        <div class="mk-content" data-mk-content="payroll" hidden></div>
        <div class="mk-content" data-mk-content="services" hidden></div>
        <div class="mk-content" data-mk-content="documents" hidden></div>
        <div class="mk-content" data-mk-content="audit" hidden></div>
      </div>`;

      main.querySelectorAll('[data-party-photo]').forEach((img) => img.addEventListener('error', () => { img.hidden = true; }, { once: true }));
      const rp = (v) => `Rp ${Math.round(v).toLocaleString('id-ID')}`;
      const canSalary = can('payroll.view') || can('*');
      const money = (v) => canSalary ? fmtIDR(Number(v) || 0) : '••••••';
      const B = `/api/masters/employees/${params.id}`;
      const TL_META = { HIRED: ['award', 'emerald'], POSITION: ['briefcase', 'blue'], EMPLOYMENT: ['user', 'amber'], CONTRACT: ['fileText', 'purple'], COMPENSATION: ['card', 'indigo'] };
      const mkTimeline = (items) => (items && items.length) ? `<ol class="mk-timeline">${items.map((e) => { const m = TL_META[e.type] || ['clock', 'slate']; return `<li class="mk-tl-item"><span class="mk-tl-dot t-${m[1]}">${MK(m[0])}</span><div class="mk-tl-body"><div class="mk-tl-top"><b>${esc(e.title)}</b><span class="mk-tl-date">${fmtDate(e.date)}</span></div>${(e.detail || e.amount != null) ? `<p>${esc(e.detail || '')}${e.amount != null ? `${e.detail ? ' · ' : ''}${money(e.amount)}` : ''}</p>` : ''}</div></li>`; }).join('')}</ol>` : `<div class="mk-empty">Belum ada riwayat.</div>`;
      const clayHead = (icon, title, desc, right) => `<div class="mk-section-head"><div><div class="mk-section-title">${MK(icon)} ${esc(title)}</div>${desc ? `<div class="mk-section-desc">${esc(desc)}</div>` : ''}</div>${right || ''}</div>`;
      const emptyBox = (msg) => `<div class="mk-empty">${clayOrb('blue', 'inbox')}<h3>Belum ada data</h3><p>${esc(msg)}</p></div>`;
      const REL_LABEL = { SPOUSE: 'Pasangan', CHILD: 'Anak', PARENT: 'Orang Tua', SIBLING: 'Saudara', OTHER: 'Lainnya' };
      const loaders = {
        family: async () => {
          const d = await api(`${B}/family`).catch(() => ({ items: [] }));
          const items = d.items || [], canEdit = can('employee.edit');
          const row = (m) => `<div class="mk-inset mk-fam-row"><span class="mk-fam-ic">${MK('user')}</span><div class="mk-flex1"><b>${esc(m.fullName)}</b><small>${esc(REL_LABEL[m.relationship] || m.relationship)}${m.birthDate ? ' · ' + fmtDate(m.birthDate) : ''}${m.occupation ? ' · ' + esc(m.occupation) : ''}</small></div><div class="mk-fam-tags">${m.isDependent ? '<span class="mk-badge blue">Tanggungan</span>' : ''}${m.bpjsCovered ? '<span class="mk-badge emerald">BPJS</span>' : ''}</div>${canEdit ? `<div class="mk-fam-act"><button class="mk-btn sm" data-fam-edit="${esc(m.id)}">Ubah</button><button class="mk-btn sm mk-cor" data-fam-del="${esc(m.id)}">Hapus</button></div>` : ''}</div>`;
          return `<section class="mk-surface">${clayHead('user', 'Keluarga & Tanggungan', 'Data keluarga, tanggungan (PTKP), dan kepesertaan BPJS Kesehatan keluarga.', canEdit ? `<button class="mk-btn primary sm" id="mkFamAdd">${MK('plus')} Tambah Anggota</button>` : '')}<div class="mk-section-body mk-col">
            <div class="mk-g mk-g3"><div class="mk-inset mk-out"><span>Status Perkawinan</span><b>${esc(d.maritalStatus || '—')}</b></div><div class="mk-inset mk-out"><span>Jumlah Tanggungan</span><b class="blue">${d.dependents || 0} / 3</b></div><div class="mk-inset mk-out"><span>Status PTKP (otomatis)</span><b class="emerald">${esc(d.derivedPtkp || 'TK/0')}</b></div></div>
            <div class="mk-note blue"><div class="mk-flex1"><b>${MK('calc')} PTKP otomatis:</b> diturunkan dari status perkawinan + ${d.dependents || 0} tanggungan → <b>${esc(d.derivedPtkp || 'TK/0')}</b>. Terapkan agar kalkulasi PPh 21 TER ikut menyesuaikan.</div>${canEdit ? `<button class="mk-btn sm" id="mkFamApplyPtkp">${MK('check')} Terapkan ke Profil Pajak</button>` : ''}</div>
            <div class="mk-tl-wrap"><div class="mk-o-caps">Anggota Keluarga (${items.length})</div>${items.length ? `<div class="mk-col">${items.map(row).join('')}</div>` : emptyBox('Belum ada data keluarga.')}</div>
          </div></section>`;
        },
        employment: async () => {
          const [tl, , conD] = await Promise.all([api(`${B}/timeline`), api(`${B}/positions`), api(`${B}/contracts`)]);
          const contracts = conD.items || [], canEdit = can('employee.edit');
          const cStatus = (c) => {
            if (!c.endDate) return { tone: 'emerald', label: 'Tanpa batas (tetap)' };
            const days = Math.ceil((new Date(c.endDate) - new Date()) / 86400000);
            if (days < 0) return { tone: 'coral', label: `Berakhir ${Math.abs(days)} hari lalu` };
            if (days <= 60) return { tone: 'amber', label: `Berakhir dalam ${days} hari` };
            return { tone: 'blue', label: `Aktif · sisa ${days} hari` };
          };
          const active = contracts.slice().sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
          const al = active ? cStatus(active) : null;
          const alertBox = al && (al.tone === 'coral' || al.tone === 'amber') ? `<div class="mk-note ${al.tone}"><div class="mk-flex1"><b>Perhatian kontrak:</b> ${esc(active.contractType || 'Kontrak')} ${esc(active.contractNumber || '')} — ${esc(al.label)}.${canEdit ? ' Segera proses perpanjangan atau pengangkatan tetap.' : ''}</div></div>` : '';
          return `<section class="mk-surface">${clayHead('briefcase', 'Employment & Career History', 'Riwayat jabatan, penempatan, kontrak, dan perjalanan karier.', `<span class="mk-badge blue">${(tl.items || []).length} peristiwa</span>`)}<div class="mk-section-body mk-col"><div class="mk-g mk-g3"><div class="mk-inset mk-field"><label>Jabatan Aktif</label><div class="mk-v">${esc(pos.positionTitle || ov.jobTitle || '—')}</div></div><div class="mk-inset mk-field"><label>Status Kepegawaian</label><div class="mk-v mk-em">${esc(emp.employmentStatus || ov.lifecycleStatus || 'ACTIVE')}</div></div><div class="mk-inset mk-field"><label>Bergabung</label><div class="mk-v">${ov.joinDate ? fmtDate(ov.joinDate) : '—'} · ${esc(serviceLength(ov.joinDate))}</div></div></div>${alertBox}<div class="mk-tl-wrap"><div class="mk-o-caps">Riwayat Karier (Timeline)</div>${mkTimeline(tl.items || [])}</div><div class="mk-tl-wrap"><div class="mk-rowb mk-o-caps bb">Kontrak Kerja${canEdit ? `<button class="mk-btn sm" id="mkContractAdd">${MK('plus')} Tambah / Perpanjang</button>` : ''}</div>${contracts.length ? `<div class="mk-g mk-g2">${contracts.map((c) => { const s = cStatus(c); return `<div class="mk-inset mk-contract"><div class="mk-rowb"><b>${esc(c.contractType || 'Kontrak')}</b><span class="mk-badge ${s.tone}">${esc(s.label)}</span></div><small class="mk-mu">${esc(c.contractNumber || '—')}</small><div class="mk-v">${fmtDate(c.startDate)} → ${c.endDate ? fmtDate(c.endDate) : 'tanpa batas'}</div>${c.probationEnd ? `<small class="mk-mu">Probation s.d. ${fmtDate(c.probationEnd)}</small>` : ''}</div>`; }).join('')}</div>` : emptyBox('Belum ada kontrak terdaftar.')}</div></div></section>`;
        },
        payroll: async () => {
          const [banksD, ca] = await Promise.all([api(`${B}/bank-accounts`), api(`${B}/compensation-analysis`).catch(() => null)]);
          const banks = banksD.items || [];
          const ST = { BELOW_RANGE: ['coral', 'Gaji di bawah minimum band — perlu penyesuaian ke minimum grade.'], ABOVE_RANGE: ['amber', 'Gaji di atas maksimum band (red-circle) — kenaikan ditahan.'], BELOW_MID: ['', 'Di bawah titik tengah band (compa < 90%) — masih ada ruang kenaikan.'], AT_MID: ['emerald', 'Kompetitif — di sekitar titik tengah band grade.'], ABOVE_MID: ['emerald', 'Di atas titik tengah band grade (compa > 110%).'], NO_BAND: ['', 'Grade belum dipetakan ke salary band.'] };
          let bandCard;
          if (ca && ca.band) {
            const posP = ((ca.positionInRange || 0) * 100).toFixed(1), st = ST[ca.status] || ST.NO_BAND;
            bandCard = `<div class="mk-tl-wrap"><div class="mk-o-caps">Grade &amp; Salary Band — ${esc(ca.grade)} · ${esc(ca.band.gradeName || '')}</div><div class="mk-inset mk-band-card">
              <div class="mk-band" role="img" aria-label="Posisi gaji dalam band grade ${posP}%"><div class="mk-band-track"><span class="mk-band-fill" data-w="${posP}"></span></div><span class="mk-band-mid"></span><span class="mk-band-dot" data-pos="${posP}"></span></div>
              <div class="mk-band-labels"><span>Min ${money(ca.band.minSalary)}</span><span>Mid ${money(ca.band.midSalary)}</span><span>Max ${money(ca.band.maxSalary)}</span></div>
              <div class="mk-g mk-g4"><div class="mk-inset mk-out"><span>Gaji Aktual</span><b>${money(ca.base)}</b></div><div class="mk-inset mk-out"><span>Compa-Ratio</span><b class="${ca.compaRatio != null && ca.compaRatio >= 0.9 && ca.compaRatio <= 1.1 ? 'emerald' : 'blue'}">${ca.compaRatio != null ? Math.round(ca.compaRatio * 100) + '%' : '—'}</b></div><div class="mk-inset mk-out"><span>Position in Range</span><b class="blue">${ca.positionInRange != null ? Math.round(ca.positionInRange * 100) + '%' : '—'}</b></div><div class="mk-inset mk-out"><span>Kuartil</span><b>${esc(ca.quartile || '—')}</b></div></div>
              <div class="mk-note ${st[0]}">${esc(st[1])}</div></div></div>`;
          } else { bandCard = `<div class="mk-tl-wrap"><div class="mk-o-caps">Grade &amp; Salary Band</div><div class="mk-note">${esc((ST[(ca && ca.status)] || ST.NO_BAND)[1])}</div></div>`; }
          return `<section class="mk-surface">${clayHead('card', 'Payroll, Kompensasi & Bank', 'Komponen gaji, analisis grade band (compa-ratio), dan rekening penggajian.', can('employee.edit') ? `<button class="mk-btn primary sm" id="mkCompEdit">${MK('edit')} Ubah / Revisi Gaji</button>` : '')}<div class="mk-section-body mk-col"><div class="mk-g mk-g4"><div class="mk-inset mk-field"><label>Gaji Pokok</label><div class="mk-v">${money(comp.baseSalary || 0)}</div></div><div class="mk-inset mk-field"><label>Tunjangan Tetap</label><div class="mk-v">${money(comp.fixedAllowance || 0)}</div></div><div class="mk-inset mk-field"><label>Tunjangan Variabel</label><div class="mk-v">${money(comp.variableAllowance || 0)}</div></div><div class="mk-inset mk-field"><label>Total / Bulan</label><div class="mk-v mk-bl">${money(compTotal)}</div></div></div>${bandCard}<div class="mk-tl-wrap"><div class="mk-o-caps">Slip Gaji / Payslip — Generator</div><div class="mk-inset mk-slip-gen"><div class="mk-g mk-g4"><div class="mk-field"><label>Periode</label><input type="month" class="mk-input" id="mkSlipPeriod" value="${new Date().toISOString().slice(0, 7)}"></div><div class="mk-field"><label>Bonus / THR</label><input type="number" class="mk-input" id="mkSlipBonus" value="0" min="0" step="100000"></div><div class="mk-field"><label>Status PTKP</label><select class="mk-input" id="mkSlipPtkp">${PTKP_OPTS.map((p) => `<option>${p}</option>`).join('')}</select></div><div class="mk-field"><label>Status NPWP</label><select class="mk-input" id="mkSlipNpwp"><option value="1">Ber-NPWP</option><option value="0">Tanpa NPWP (+20%)</option></select></div></div><button class="mk-btn primary" id="mkSlipGen">${MK('printer')} Generate Slip Gaji</button></div><div id="mkSlipOut"></div></div><div class="mk-tl-wrap"><div class="mk-rowb mk-o-caps bb">Rekening Penggajian${can('employee.edit') ? `<button class="mk-btn sm" id="mkBankAdd">${MK('plus')} Daftarkan Rekening</button>` : ''}</div>${banks.length ? `<div class="mk-g mk-g2">${banks.map((b) => `<div class="mk-bank"><div class="mk-bank-brand">${esc(b.bankName || '—')}</div><div class="mk-bank-no">${esc(b.accountNumber || '—')}</div><div class="mk-bank-foot"><span>${esc(b.accountHolder || ov.name || '')}</span>${chip(b.verificationStatus || 'PENDING')}</div></div>`).join('')}</div>` : emptyBox('Belum ada rekening payroll terdaftar.')}</div></div></section>`;
        },
        documents: async () => {
          const [docD, certD] = await Promise.all([api(`${B}/documents`), api(`${B}/certifications`).catch(() => ({ items: [] }))]);
          const docs = docD.items || [], certs = certD.items || [], canEdit = can('employee.edit');
          const DOC_TYPE = { KTP: 'KTP', NPWP: 'NPWP', KK: 'Kartu Keluarga', CONTRACT: 'Kontrak', CERTIFICATE: 'Sertifikat', TRAINING: 'Pelatihan', LICENSE: 'Lisensi/Izin', MEDICAL: 'Medis', OTHER: 'Lainnya' };
          const expStatus = (dt) => { if (!dt) return null; const days = Math.ceil((new Date(dt) - new Date()) / 86400000); if (days < 0) return { tone: 'coral', label: `Kadaluarsa ${Math.abs(days)} hari lalu` }; if (days <= 60) return { tone: 'amber', label: `Kadaluarsa ${days} hari lagi` }; return { tone: 'emerald', label: `Sisa ${days} hari` }; };
          const expiring = [...docs, ...certs].filter((x) => { const s = expStatus(x.expiryDate); return s && s.tone !== 'emerald'; }).length;
          const alertBox = expiring ? `<div class="mk-note amber"><div class="mk-flex1"><b>${expiring} dokumen/sertifikat</b> akan atau sudah kadaluarsa — periksa &amp; perbarui untuk menjaga kepatuhan.</div></div>` : '';
          const docCard = (d) => { const s = expStatus(d.expiryDate); return `<div class="mk-inset mk-doc"><span class="mk-doc-ic">${MK('fileText')}</span><div class="mk-flex1"><b>${esc(d.title || '—')}</b><small>${esc(DOC_TYPE[d.documentType] || d.documentType || '')}${d.expiryDate ? ' · exp ' + fmtDate(d.expiryDate) : ''}</small></div><div class="mk-fam-tags">${s ? `<span class="mk-badge ${s.tone}">${esc(s.label)}</span>` : ''}${d.verified ? `<span class="mk-badge emerald">${MK('check')}</span>` : '<span class="mk-badge slate">Belum verif</span>'}</div></div>`; };
          const certCard = (c) => { const s = expStatus(c.expiryDate); const tags = c.skillTags ? String(c.skillTags).split(',').map((t) => t.trim()).filter(Boolean) : []; return `<div class="mk-inset mk-doc"><span class="mk-doc-ic">${MK('award')}</span><div class="mk-flex1"><b>${esc(c.name || '—')}</b><small>${esc(c.issuer || '')}${c.certificateNumber ? ' · ' + esc(c.certificateNumber) : ''}${c.expiryDate ? ' · exp ' + fmtDate(c.expiryDate) : ''}</small>${tags.length ? `<div class="mk-cert-tags">${tags.map((t) => `<span class="mk-tag">${esc(t)}</span>`).join('')}</div>` : ''}</div>${s ? `<span class="mk-badge ${s.tone}">${esc(s.label)}</span>` : ''}</div>`; };
          return `<section class="mk-surface">${clayHead('fileText', 'Dokumen & Sertifikasi', 'Arsip dokumen kepegawaian, lisensi, dan sertifikasi dengan pelacakan masa berlaku.', `<span class="mk-badge slate">${docs.length + certs.length} berkas</span>`)}<div class="mk-section-body mk-col">
            <div class="mk-g mk-g3"><div class="mk-inset mk-out"><span>Dokumen</span><b>${docs.length}</b></div><div class="mk-inset mk-out"><span>Sertifikasi</span><b class="blue">${certs.length}</b></div><div class="mk-inset mk-out"><span>Akan Kadaluarsa</span><b class="${expiring ? 'amber' : 'emerald'}">${expiring}</b></div></div>
            ${alertBox}
            <div class="mk-tl-wrap"><div class="mk-rowb mk-o-caps bb">Dokumen Kepegawaian${canEdit ? `<button class="mk-btn sm" id="mkDocAdd">${MK('plus')} Tambah Dokumen</button>` : ''}</div>${docs.length ? `<div class="mk-g mk-g2">${docs.map(docCard).join('')}</div>` : emptyBox('Belum ada dokumen.')}</div>
            <div class="mk-tl-wrap"><div class="mk-rowb mk-o-caps bb">Sertifikasi &amp; Kompetensi${canEdit ? `<button class="mk-btn sm" id="mkCertAdd">${MK('plus')} Tambah Sertifikasi</button>` : ''}</div>${certs.length ? `<div class="mk-g mk-g2">${certs.map(certCard).join('')}</div>` : emptyBox('Belum ada sertifikasi.')}</div>
          </div></section>`;
        },
        audit: async () => { const rows = (await api(`${B}/audit`)).items || []; return `<section class="mk-surface">${clayHead('history', 'Audit Trail & Logs', 'Jejak perubahan data karyawan.', `<span class="mk-badge slate">${rows.length} entri</span>`)}<div class="mk-section-body">${rows.length ? `<ol class="mk-audit">${rows.map((r) => `<li class="mk-audit-row"><span class="mk-audit-ic">${MK('history')}</span><div class="mk-flex1"><div class="mk-rowb"><b>${esc(r.action || r.entityType || 'Perubahan')}</b><span class="mk-tl-date">${r.occurredAt ? fmtDate(r.occurredAt) : ''}</span></div><small>${esc(r.entityType || '')}${r.reason ? ` · ${esc(r.reason)}` : ''}</small></div></li>`).join('')}</ol>` : emptyBox('Belum ada aktivitas audit.')}</div></section>`; },
        workflow: async () => { const isHr = can('employee.edit'); let pending = []; if (isHr) { try { pending = (await api('/api/hr/self-updates?status=PENDING')).items || []; } catch (_) { pending = []; } } const canApprove = can('employee.approve'); return `<section class="mk-surface">${clayHead('gitPr', 'Maker-Checker Workflow Approval', 'Persetujuan berjenjang perubahan data master karyawan.', isHr ? '' : '<span class="mk-badge amber">HR only</span>')}<div class="mk-section-body mk-col"><div class="mk-g mk-g3"><div class="mk-inset mk-wf t-amber"><span class="mk-o-caps mk-am">Pending Checker</span><h4>${pending.length} menunggu</h4><p>Perlu review HR</p></div><div class="mk-inset mk-wf t-emerald"><span class="mk-o-caps mk-em">Segregation of Duties</span><h4>SoD Aktif</h4><p>Approver ≠ pengaju</p></div><div class="mk-inset mk-wf t-blue"><span class="mk-o-caps mk-bl">Auto-Sync</span><h4>PP 58/2023</h4><p>Pajak &amp; BPJS otomatis</p></div></div><div class="mk-tl-wrap"><div class="mk-o-caps">Antrean Persetujuan</div>${pending.length ? `<div class="mk-col">${pending.map((u) => `<div class="mk-inset mk-wf-row"><div class="mk-flex1"><b>${esc(u.employeeName)}</b><small>Maker: ${esc(u.requestedByName || '—')} · ${Object.keys(u.proposed || {}).length} field diusulkan</small></div><div class="mk-wf-act"><span class="mk-badge amber">PENDING</span>${canApprove ? `<button class="mk-btn sm" data-wf-approve="${esc(u.id)}">Setujui</button><button class="mk-btn sm mk-cor" data-wf-reject="${esc(u.id)}">Tolak</button>` : ''}</div></div>`).join('')}</div>` : emptyBox(isHr ? 'Tidak ada permintaan menunggu persetujuan.' : 'Persetujuan hanya untuk HR / manajer.')}</div></div></section>`; },
        ocr: async () => `<section class="mk-surface">${clayHead('scanText', 'AI-Powered Document OCR', 'Ekstraksi otomatis KTP/NPWP via AI Vision Engine (simulasi).', '<span class="mk-badge purple">OCR Engine v2.4</span>')}<div class="mk-section-body"><div class="mk-io"><div class="mk-inset mk-io-panel"><div class="mk-o-caps">1. Pilih &amp; Unggah Dokumen</div><select class="mk-input" id="mkOcrType"><option value="ktp">KTP (Kartu Tanda Penduduk)</option><option value="npwp">NPWP</option></select><div class="mk-drop" id="mkDrop">${MK('scanText')}<b>Klik untuk memuat sampel dokumen</b><small>JPG, PNG, PDF · maks 5 MB</small></div><button class="mk-btn primary" id="mkOcrRun">${MK('sparkles')} Jalankan AI OCR &amp; Auto-Extract</button></div><div class="mk-surface mk-io-out mk-io-panel"><div class="mk-rowb mk-o-caps bb">Hasil Ekstraksi AI<span class="mk-badge amber" id="mkOcrBadge">Menunggu</span></div><div class="mk-g mk-g2"><div><label class="mk-field-lbl">NIK Terdeteksi</label><input class="mk-input" id="mkOcrNik" placeholder="—"></div><div><label class="mk-field-lbl">Nama Lengkap</label><input class="mk-input" id="mkOcrName" placeholder="—"></div><div><label class="mk-field-lbl">Tempat/Tgl Lahir</label><input class="mk-input" id="mkOcrTtl" placeholder="—"></div><div><label class="mk-field-lbl">Alamat</label><input class="mk-input" id="mkOcrAddr" placeholder="—"></div></div><button class="mk-btn primary" id="mkOcrApply">${MK('edit')} Terapkan ke Pengkinian Identitas</button></div></div></div></section>`,
        services: async () => `<section class="mk-surface">${clayHead('wrench', 'Services & Tools', 'Layanan mandiri &amp; alat bantu karyawan.', '')}<div class="mk-section-body"><div class="mk-g mk-g3">${[['Data Saya', 'Portal self-service', 'user', '#/hr/my-profile'], ['Kalkulator Pajak', 'PPh 21 TER Planner', 'calc', 'tab:tax'], ['Simulasi BPJS', 'Iuran bulanan', 'shield', 'tab:bpjs'], ['Riwayat Karier', 'Timeline karier', 'history', 'tab:employment'], ['Pengkinian Identitas', 'Ajukan perubahan data', 'edit', 'identity'], ['Export Profil', 'Ringkasan PDF', 'printer', 'export']].map((t) => `<button class="mk-inset mk-tool" data-mk-tool="${t[3]}"><span class="mk-tool-ic">${MK(t[2])}</span><b>${esc(t[0])}</b><small>${esc(t[1])}</small></button>`).join('')}</div></div></section>`,
        talent: async () => {
          const tl = await api(`${B}/talent`).catch(() => ({}));
          const perfR = Number(tl.performanceRating) || 0;
          const goalsPct = Number(tl.goalsTotal) ? Math.round((Number(tl.goalsCompleted) / Number(tl.goalsTotal)) * 100) : 0;
          const LB = [['Underperformer', 'Inconsistent', 'Enigma'], ['Effective', 'Core Player', 'High Potential'], ['Trusted Pro', 'High Performer', 'Star']];
          const TN = [['coral', 'coral', 'amber'], ['amber', 'blue', 'emerald'], ['blue', 'emerald', 'emerald']];
          const SUCC = { READY_NOW: 'Siap sekarang', READY_1_2Y: '1–2 tahun', READY_3Y: '3 tahun', NOT_READY: 'Belum siap' };
          const grid = [2, 1, 0].map((r) => `<div class="mk-9row">${[0, 1, 2].map((c) => { const on = tl.box && tl.box.perf === r && tl.box.pot === c; return `<div class="mk-9cell t-${TN[r][c]}${on ? ' on' : ''}"><span class="mk-9lbl">${LB[r][c]}</span>${on ? `<span class="mk-9dot">${MK('user')}</span>` : ''}</div>`; }).join('')}</div>`).join('');
          const noteTone = tl.boxTone === 'emerald' ? 'emerald' : tl.boxTone === 'coral' ? 'coral' : tl.boxTone === 'amber' ? 'amber' : '';
          return `<section class="mk-surface">${clayHead('award', 'Performance & Talent (9-Box)', 'Kalibrasi kinerja, potensi, flight-risk, dan kesiapan suksesi.', can('employee.edit') ? `<button class="mk-btn primary sm" id="mkTalentEdit">${MK('edit')} Kalibrasi</button>` : '')}<div class="mk-section-body"><div class="mk-io">
            <div class="mk-inset mk-io-panel"><div class="mk-o-caps">9-Box Talent Grid</div><div class="mk-9box"><span class="mk-9yax">Kinerja →</span><div class="mk-9grid">${grid}</div></div><div class="mk-9xax"><span>Potensi rendah</span><span>Potensi tinggi</span></div>${tl.boxLabel ? `<div class="mk-note ${noteTone}"><b>Posisi:</b> ${esc(tl.boxLabel)}</div>` : `<div class="mk-note">Belum dikalibrasi — set kinerja &amp; potensi lewat tombol "Kalibrasi".</div>`}</div>
            <div class="mk-inset mk-io-panel"><div class="mk-o-caps">Ringkasan Talenta</div><div class="mk-g mk-g2"><div class="mk-inset mk-out"><span>Performance</span><b>${perfR ? perfR + ' / 5' : '—'}</b></div><div class="mk-inset mk-out"><span>Potensi</span><b class="blue">${esc(tl.potential || '—')}</b></div><div class="mk-inset mk-out"><span>Flight Risk</span><b class="${tl.flightRisk === 'HIGH' ? '' : ''}">${esc(tl.flightRisk || '—')}</b></div><div class="mk-inset mk-out"><span>Kesiapan Suksesi</span><b>${esc(SUCC[tl.successionReadiness] || tl.successionReadiness || '—')}</b></div></div><div class="mk-o-caps">Progres Goal${tl.goalsTotal ? ` — ${tl.goalsCompleted}/${tl.goalsTotal}` : ''}</div><div class="mk-band"><div class="mk-band-track"><span class="mk-band-fill" data-w="${goalsPct}"></span></div></div>${tl.notes ? `<div class="mk-note">${esc(tl.notes)}</div>` : ''}</div>
          </div></div></section>`;
        }
      };
      const wireCommon = (root) => {
        root.querySelectorAll('[data-mk-copy]').forEach((b) => b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(b.dataset.mkCopy); toast('Disalin', b.dataset.mkCopy); } catch (_) { toast('Gagal menyalin', '', 'coral'); } }));
        root.querySelectorAll('[data-mk-identity]').forEach((b) => b.addEventListener('click', () => openIdentityUpdate(params, ov, () => this.render(main, params))));
        root.querySelectorAll('[data-mk-export]').forEach((b) => b.addEventListener('click', () => toast('Menyiapkan ringkasan profil…', 'Export PDF akan tersedia.')));
      };
      const loaded = {};
      const wireTab = (key, panel) => {
        if (key === 'workflow') {
          panel.querySelectorAll('[data-wf-approve]').forEach((b) => b.addEventListener('click', async () => { const ans = await actionDialog({ title: 'Setujui pengkinian', description: 'Perubahan diterapkan ke data karyawan. Penyetuju harus berbeda dari pengaju (SoD).', confirmLabel: 'Setujui' }); if (ans === null) return; try { await api(`/api/hr/self-updates/${b.dataset.wfApprove}/approve`, { method: 'POST', body: ans || {}, idempotencyKey: newIdemKey() }); toast('Disetujui', 'Data karyawan diperbarui.'); loaded.workflow = false; show('workflow'); } catch (error) { toast('Gagal menyetujui', error.message, 'coral'); } }));
          panel.querySelectorAll('[data-wf-reject]').forEach((b) => b.addEventListener('click', async () => { const ans = await actionDialog({ title: 'Tolak pengkinian', description: 'Beri alasan penolakan.', requireReason: true, confirmLabel: 'Tolak', danger: true }); if (!ans) return; try { await api(`/api/hr/self-updates/${b.dataset.wfReject}/reject`, { method: 'POST', body: ans, idempotencyKey: newIdemKey() }); toast('Ditolak'); loaded.workflow = false; show('workflow'); } catch (error) { toast('Gagal menolak', error.message, 'coral'); } }));
        }
        if (key === 'ocr') {
          panel.querySelector('#mkDrop')?.addEventListener('click', () => toast('Sampel dimuat', 'Dokumen contoh siap diekstrak.'));
          panel.querySelector('#mkOcrRun')?.addEventListener('click', () => { const set = (id, v) => { const el = panel.querySelector(id); if (el) el.value = v; }; set('#mkOcrNik', personal.nikKtp && !String(personal.nikKtp).includes('•') ? personal.nikKtp : '3275011405900012'); set('#mkOcrName', ov.name || '—'); set('#mkOcrTtl', `${personal.birthPlace || 'Indonesia'}${personal.birthDate ? ', ' + fmtDate(personal.birthDate) : ''}`); set('#mkOcrAddr', personal.address || 'Kabupaten Bekasi, Jawa Barat'); const bd = panel.querySelector('#mkOcrBadge'); if (bd) { bd.textContent = 'Berhasil 99.4%'; bd.className = 'mk-badge emerald'; } toast('AI OCR selesai', 'Data terekstrak — akurasi 99.4%.'); });
          panel.querySelector('#mkOcrApply')?.addEventListener('click', () => openIdentityUpdate(params, ov, () => this.render(main, params)));
        }
        if (key === 'services') {
          panel.querySelectorAll('[data-mk-tool]').forEach((b) => b.addEventListener('click', () => { const a = b.dataset.mkTool; if (a.startsWith('tab:')) show(a.slice(4)); else if (a.startsWith('#/')) router.go(a); else if (a === 'export') toast('Menyiapkan ringkasan…', 'Export PDF akan tersedia.'); else if (a === 'identity') openIdentityUpdate(params, ov, () => this.render(main, params)); }));
        }
        if (key === 'payroll') {
          panel.querySelectorAll('.mk-band-fill[data-w]').forEach((el) => { el.style.width = `${el.dataset.w}%`; });
          panel.querySelectorAll('.mk-band-dot[data-pos]').forEach((el) => { el.style.left = `${el.dataset.pos}%`; });
          const genSlip = () => {
            const base = Number(comp.baseSalary) || 0, fixed = Number(comp.fixedAllowance) || 0, vari = Number(comp.variableAllowance) || 0;
            const bonus = Number(panel.querySelector('#mkSlipBonus').value) || 0;
            const ptkp = panel.querySelector('#mkSlipPtkp').value, npwp = panel.querySelector('#mkSlipNpwp').value !== '0';
            const gross = base + fixed + vari + bonus, cat = ptkpToCat(ptkp), upah = base + fixed;
            const kesEmp = Math.round(Math.min(upah, 12000000) * 0.01), jhtEmp = Math.round(upah * 0.02), jpEmp = Math.round(Math.min(upah, 10042300) * 0.01);
            const pph = Math.round(gross * terRateOf(cat, gross) * (npwp ? 1 : 1.2));
            const deductions = kesEmp + jhtEmp + jpEmp + pph, thp = gross - deductions;
            const kesEr = Math.min(upah, 12000000) * 0.04, jkk = upah * 0.0024, jkm = upah * 0.003, jhtEr = upah * 0.037, jpEr = Math.min(upah, 10042300) * 0.02;
            const bpjsEr = Math.round(kesEr + jkk + jkm + jhtEr + jpEr), ctc = gross + bpjsEr;
            const pv = panel.querySelector('#mkSlipPeriod').value || new Date().toISOString().slice(0, 7);
            const per = new Date(pv + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            const out = panel.querySelector('#mkSlipOut');
            out.innerHTML = `<div class="mk-slip"><div class="mk-slip-doc">
              <div class="mk-slip-head"><div class="mk-slip-brand"><div class="mk-slip-logo">S</div><div><b>PT Singularity Teknofastindo</b><span>${esc(ov.branchName || 'Head Office')}</span></div></div><div class="mk-slip-title"><h3>SLIP GAJI KARYAWAN</h3><span>Periode ${esc(per)}</span></div></div>
              <div class="mk-slip-meta"><div><label>Nama Karyawan</label><b>${esc(ov.name || '—')}</b></div><div><label>NIK / ID</label><b>${esc(ov.nik || '—')}</b></div><div><label>Jabatan</label><b>${esc(pos.positionTitle || ov.jobTitle || '—')}</b></div><div><label>Unit / Organisasi</label><b>${esc(ov.department || '—')}</b></div><div><label>Status PTKP</label><b>${esc(ptkp)} · TER ${esc(cat)}</b></div><div><label>NPWP</label><b>${npwp ? 'Ber-NPWP' : 'Tanpa NPWP'}</b></div></div>
              <div class="mk-slip-cols"><div class="mk-slip-col"><div class="mk-slip-ch">Penghasilan (A)</div><table class="mk-slip-t"><tbody><tr><td>Gaji Pokok</td><td>${money(base)}</td></tr><tr><td>Tunjangan Tetap</td><td>${money(fixed)}</td></tr><tr><td>Tunjangan Variabel</td><td>${money(vari)}</td></tr>${bonus > 0 ? `<tr><td>Bonus / THR</td><td>${money(bonus)}</td></tr>` : ''}<tr class="tot"><td>Total Bruto</td><td>${money(gross)}</td></tr></tbody></table></div>
              <div class="mk-slip-col"><div class="mk-slip-ch">Potongan (B)</div><table class="mk-slip-t"><tbody><tr><td>BPJS Kesehatan (1%)</td><td>${money(kesEmp)}</td></tr><tr><td>BPJS JHT (2%)</td><td>${money(jhtEmp)}</td></tr><tr><td>BPJS JP (1%)</td><td>${money(jpEmp)}</td></tr><tr><td>PPh 21 (TER ${esc(cat)}${npwp ? '' : ' +20%'})</td><td>${money(pph)}</td></tr><tr class="tot"><td>Total Potongan</td><td>${money(deductions)}</td></tr></tbody></table></div></div>
              <div class="mk-slip-net"><span>Gaji Bersih Diterima (A − B)</span><b>${money(thp)}</b></div>
              <div class="mk-slip-er"><span class="mk-o-caps">Kontribusi Perusahaan (di luar THP) — BPJS atas upah tetap</span><div class="mk-slip-erg"><span>BPJS Perusahaan (Kes 4% · JKK · JKM · JHT 3,7% · JP 2%)<b>${money(bpjsEr)}</b></span><span>Total Biaya Perusahaan (Cost to Company)<b>${money(ctc)}</b></span></div></div>
              <div class="mk-slip-foot"><span>Dokumen dihasilkan otomatis oleh Singularity HRIS · ${new Date().toISOString().slice(0, 10)} · Rahasia</span><div class="mk-slip-btns"><button class="mk-btn sm" id="mkSlipBack">Tutup</button><button class="mk-btn primary sm" id="mkSlipPrint">${MK('printer')} Cetak / PDF</button></div></div>
            </div></div>`;
            out.querySelector('#mkSlipPrint')?.addEventListener('click', () => window.print());
            out.querySelector('#mkSlipBack')?.addEventListener('click', () => { out.innerHTML = ''; });
          };
          panel.querySelector('#mkSlipGen')?.addEventListener('click', genSlip);
          panel.querySelector('#mkCompEdit')?.addEventListener('click', async () => {
            const v = await formDialog({ title: `Ubah / Revisi Gaji — ${ov.name || ''}`, description: 'Penyesuaian kompensasi diajukan sebagai revisi dan berlaku setelah DISETUJUI (maker-checker). Pajak PPh 21 & BPJS otomatis mengikuti.', fields: [
              { name: 'baseSalary', label: 'Gaji Pokok', type: 'number', min: 0, value: Number(comp.baseSalary) || 0, required: true },
              { name: 'fixedAllowance', label: 'Tunjangan Tetap', type: 'number', min: 0, value: Number(comp.fixedAllowance) || 0 },
              { name: 'variableAllowance', label: 'Tunjangan Variabel', type: 'number', min: 0, value: Number(comp.variableAllowance) || 0 },
              { name: 'effectiveFrom', label: 'Berlaku sejak', type: 'date', value: new Date().toISOString().slice(0, 10), required: true },
              { name: 'changeReason', label: 'Alasan penyesuaian', type: 'textarea', rows: 2, required: true }
            ], submitLabel: 'Ajukan revisi' });
            if (!v) return;
            try { await api(`${B}/compensation`, { method: 'POST', body: v, idempotencyKey: newIdemKey() }); invalidate(`master:${params.id}`); toast('Revisi gaji diajukan', 'Menunggu persetujuan (maker-checker).'); loaded.payroll = false; show('payroll'); }
            catch (error) { toast('Gagal mengajukan revisi', error.message, 'coral'); }
          });
          panel.querySelector('#mkBankAdd')?.addEventListener('click', async () => {
            const v = await formDialog({ title: `Daftarkan Rekening Penggajian — ${ov.name || ''}`, description: 'Rekening diverifikasi (maker-checker) dan payment-hold sampai disetujui sebelum dipakai untuk transfer gaji.', fields: [
              { name: 'bankName', label: 'Nama Bank', required: true },
              { name: 'accountNumber', label: 'Nomor Rekening', required: true },
              { name: 'accountHolder', label: 'Atas Nama', value: ov.name || '', required: true },
              { name: 'isPrimary', label: 'Jadikan rekening utama', type: 'checkbox', value: true },
              { name: 'changeReason', label: 'Catatan', type: 'textarea', rows: 2 }
            ], submitLabel: 'Daftarkan rekening' });
            if (!v) return;
            try { await api(`${B}/bank-accounts`, { method: 'POST', body: v, idempotencyKey: newIdemKey() }); invalidate(`master:${params.id}`); toast('Rekening didaftarkan', 'Menunggu verifikasi (payment-hold aktif).'); loaded.payroll = false; show('payroll'); }
            catch (error) { toast('Gagal mendaftarkan rekening', error.message, 'coral'); }
          });
        }
        if (key === 'family') {
          const reloadFam = () => { loaded.family = false; show('family'); };
          const famDialog = async (member) => {
            const v = await formDialog({ title: member ? 'Ubah Anggota Keluarga' : 'Tambah Anggota Keluarga', description: 'Tandai "Tanggungan" untuk memengaruhi status PTKP (maks 3).', fields: [
              { name: 'fullName', label: 'Nama Lengkap', value: member?.fullName || '', required: true },
              { name: 'relationship', label: 'Hubungan', type: 'select', options: [['SPOUSE', 'Pasangan'], ['CHILD', 'Anak'], ['PARENT', 'Orang Tua'], ['SIBLING', 'Saudara'], ['OTHER', 'Lainnya']], value: member?.relationship || 'CHILD' },
              { name: 'gender', label: 'Jenis Kelamin', type: 'select', options: [['', '—'], ['MALE', 'Laki-laki'], ['FEMALE', 'Perempuan']], value: member?.gender || '' },
              { name: 'birthDate', label: 'Tanggal Lahir', type: 'date', value: member?.birthDate ? String(member.birthDate).slice(0, 10) : '' },
              { name: 'occupation', label: 'Pekerjaan', value: member?.occupation || '' },
              { name: 'isDependent', label: 'Tanggungan (memengaruhi PTKP)', type: 'checkbox', value: member ? member.isDependent : true },
              { name: 'bpjsCovered', label: 'Ditanggung BPJS Kesehatan', type: 'checkbox', value: member ? member.bpjsCovered : false }
            ], submitLabel: member ? 'Simpan' : 'Tambah' });
            if (!v) return;
            if (member) v.id = member.id;
            try { await api(`${B}/family`, { method: 'POST', body: v, idempotencyKey: newIdemKey() }); toast('Data keluarga tersimpan', 'Status PTKP diperbarui otomatis.'); reloadFam(); }
            catch (error) { toast('Gagal menyimpan', error.message, 'coral'); }
          };
          panel.querySelector('#mkFamAdd')?.addEventListener('click', () => famDialog(null));
          panel.querySelectorAll('[data-fam-edit]').forEach((b) => b.addEventListener('click', async () => { const fam = ((await api(`${B}/family`).catch(() => ({ items: [] }))).items || []).find((x) => x.id === b.dataset.famEdit); if (fam) famDialog(fam); }));
          panel.querySelectorAll('[data-fam-del]').forEach((b) => b.addEventListener('click', async () => {
            const ans = await actionDialog({ title: 'Hapus anggota keluarga', description: 'Data anggota keluarga ini akan dihapus permanen.', confirmLabel: 'Hapus', danger: true });
            if (ans === null) return;
            try { await api(`${B}/family/${b.dataset.famDel}`, { method: 'DELETE', idempotencyKey: newIdemKey() }); toast('Dihapus'); reloadFam(); }
            catch (error) { toast('Gagal menghapus', error.message, 'coral'); }
          }));
          panel.querySelector('#mkFamApplyPtkp')?.addEventListener('click', async () => {
            const fam = await api(`${B}/family`).catch(() => ({}));
            const ptkp = fam.derivedPtkp || 'TK/0', cat = ptkpToCat(ptkp);
            try { await api(`${B}/tax-profiles`, { method: 'POST', body: { taxScheme: 'PPH21', ptkpStatus: ptkp, terCategory: cat, effectiveFrom: new Date().toISOString().slice(0, 10) }, idempotencyKey: newIdemKey() }); invalidate(`master:${params.id}`); toast('PTKP diterapkan', `Profil pajak → ${ptkp} (TER ${cat}). Kalkulasi PPh 21 menyesuaikan.`); }
            catch (error) { toast('Gagal menerapkan PTKP', error.message, 'coral'); }
          });
        }
        if (key === 'employment') {
          panel.querySelector('#mkContractAdd')?.addEventListener('click', async () => {
            const v = await formDialog({ title: `Tambah / Perpanjang Kontrak — ${ov.name || ''}`, description: 'Kontrak baru dicatat sebagai riwayat kepegawaian. Kosongkan tanggal berakhir untuk PKWTT (tetap).', fields: [
              { name: 'contractNumber', label: 'Nomor Kontrak', required: true },
              { name: 'contractType', label: 'Jenis', type: 'select', options: [['PKWT', 'PKWT (kontrak)'], ['PKWTT', 'PKWTT (tetap)'], ['MAGANG', 'Magang'], ['OUTSOURCE', 'Outsource']], value: 'PKWT' },
              { name: 'startDate', label: 'Mulai', type: 'date', value: new Date().toISOString().slice(0, 10), required: true },
              { name: 'endDate', label: 'Berakhir (kosongkan jika tetap)', type: 'date' },
              { name: 'probationEnd', label: 'Akhir masa percobaan (opsional)', type: 'date' }
            ], submitLabel: 'Simpan kontrak' });
            if (!v) return;
            try { await api(`${B}/contracts`, { method: 'POST', body: v, idempotencyKey: newIdemKey() }); invalidate(`master:${params.id}`); toast('Kontrak tersimpan', 'Riwayat kepegawaian diperbarui.'); loaded.employment = false; show('employment'); }
            catch (error) { toast('Gagal menyimpan kontrak', error.message, 'coral'); }
          });
        }
        if (key === 'documents') {
          panel.querySelector('#mkDocAdd')?.addEventListener('click', async () => {
            const v = await formDialog({ title: `Tambah Dokumen — ${ov.name || ''}`, description: 'Catat dokumen kepegawaian + masa berlaku untuk pelacakan kepatuhan.', fields: [
              { name: 'title', label: 'Judul Dokumen', required: true },
              { name: 'documentType', label: 'Jenis', type: 'select', options: [['KTP', 'KTP'], ['NPWP', 'NPWP'], ['KK', 'Kartu Keluarga'], ['CONTRACT', 'Kontrak'], ['CERTIFICATE', 'Sertifikat'], ['TRAINING', 'Pelatihan'], ['LICENSE', 'Lisensi/Izin'], ['MEDICAL', 'Medis'], ['OTHER', 'Lainnya']], value: 'OTHER' },
              { name: 'expiryDate', label: 'Masa berlaku s.d. (opsional)', type: 'date' }
            ], submitLabel: 'Simpan dokumen' });
            if (!v) return;
            try { await api(`${B}/documents`, { method: 'POST', body: v, idempotencyKey: newIdemKey() }); invalidate(`master:${params.id}`); toast('Dokumen tersimpan'); loaded.documents = false; show('documents'); }
            catch (error) { toast('Gagal menyimpan dokumen', error.message, 'coral'); }
          });
          panel.querySelector('#mkCertAdd')?.addEventListener('click', async () => {
            const v = await formDialog({ title: `Tambah Sertifikasi — ${ov.name || ''}`, description: 'Sertifikasi/lisensi dengan masa berlaku & kompetensi (matriks skill).', fields: [
              { name: 'name', label: 'Nama Sertifikasi', required: true },
              { name: 'issuer', label: 'Penerbit' },
              { name: 'certificateNumber', label: 'Nomor Sertifikat' },
              { name: 'issuedDate', label: 'Tanggal terbit', type: 'date' },
              { name: 'expiryDate', label: 'Masa berlaku s.d. (opsional)', type: 'date' },
              { name: 'skillTags', label: 'Kompetensi (pisahkan dengan koma)' }
            ], submitLabel: 'Simpan sertifikasi' });
            if (!v) return;
            try { await api(`${B}/certifications`, { method: 'POST', body: v, idempotencyKey: newIdemKey() }); invalidate(`master:${params.id}`); toast('Sertifikasi tersimpan'); loaded.documents = false; show('documents'); }
            catch (error) { toast('Gagal menyimpan sertifikasi', error.message, 'coral'); }
          });
        }
        if (key === 'talent') {
          panel.querySelectorAll('.mk-band-fill[data-w]').forEach((el) => { el.style.width = `${el.dataset.w}%`; });
          panel.querySelector('#mkTalentEdit')?.addEventListener('click', async () => {
            const cur = await api(`${B}/talent`).catch(() => ({}));
            const v = await formDialog({ title: `Kalibrasi Talent — ${ov.name || ''}`, description: 'Set penilaian kinerja & potensi (9-box), flight-risk, dan kesiapan suksesi.', fields: [
              { name: 'performanceRating', label: 'Performance Rating', type: 'select', options: [['', '—'], ['1', '1 · Jauh di bawah'], ['2', '2 · Di bawah'], ['3', '3 · Memenuhi'], ['4', '4 · Melebihi'], ['5', '5 · Luar biasa']], value: cur.performanceRating != null ? String(cur.performanceRating) : '' },
              { name: 'potential', label: 'Potensi', type: 'select', options: [['', '—'], ['LOW', 'Rendah'], ['MEDIUM', 'Sedang'], ['HIGH', 'Tinggi']], value: cur.potential || '' },
              { name: 'flightRisk', label: 'Flight Risk', type: 'select', options: [['', '—'], ['LOW', 'Rendah'], ['MEDIUM', 'Sedang'], ['HIGH', 'Tinggi']], value: cur.flightRisk || '' },
              { name: 'successionReadiness', label: 'Kesiapan Suksesi', type: 'select', options: [['', '—'], ['READY_NOW', 'Siap sekarang'], ['READY_1_2Y', '1–2 tahun'], ['READY_3Y', '3 tahun'], ['NOT_READY', 'Belum siap']], value: cur.successionReadiness || '' },
              { name: 'reviewPeriod', label: 'Periode Review', value: cur.reviewPeriod || '' },
              { name: 'goalsCompleted', label: 'Goal Selesai', type: 'number', min: 0, value: cur.goalsCompleted || 0 },
              { name: 'goalsTotal', label: 'Total Goal', type: 'number', min: 0, value: cur.goalsTotal || 0 },
              { name: 'notes', label: 'Catatan Kalibrasi', type: 'textarea', rows: 2, value: cur.notes || '' }
            ], submitLabel: 'Simpan kalibrasi' });
            if (!v) return;
            try { await api(`${B}/talent`, { method: 'POST', body: v, idempotencyKey: newIdemKey() }); toast('Talent tersimpan', 'Kalibrasi 9-box diperbarui.'); loaded.talent = false; show('talent'); }
            catch (error) { toast('Gagal menyimpan', error.message, 'coral'); }
          });
        }
      };
      const show = async (key) => {
        main.querySelectorAll('[data-mk-content]').forEach((el) => { el.hidden = el.dataset.mkContent !== key; });
        main.querySelectorAll('.mk-tab[data-mk-tab]').forEach((b) => b.classList.toggle('active', b.dataset.mkTab === key));
        const panel = main.querySelector(`[data-mk-content="${key}"]`);
        if (panel && loaders[key] && !loaded[key]) {
          loaded[key] = true;
          panel.innerHTML = `<section class="mk-surface"><div class="mk-section-body mk-empty"><span class="spinner"></span> Memuat…</div></section>`;
          try { panel.innerHTML = await loaders[key](); wireCommon(panel); wireTab(key, panel); }
          catch (error) { loaded[key] = false; panel.innerHTML = `<section class="mk-surface"><div class="mk-section-body mk-empty">Gagal memuat: ${esc(error.message)}</div></section>`; }
        }
      };
      main.querySelectorAll('[data-mk-tab]').forEach((b) => b.addEventListener('click', () => show(b.dataset.mkTab)));
      wireCommon(main);
      const calcTax = () => {
        const base = Number(main.querySelector('#mkTaxBase').value) || 0, fixed = Number(main.querySelector('#mkTaxFixed').value) || 0, vari = Number(main.querySelector('#mkTaxVar').value) || 0, bonus = Number(main.querySelector('#mkTaxBonus').value) || 0;
        const ptkp = main.querySelector('#mkTaxPtkp').value, cat = ptkpToCat(ptkp), method = main.querySelector('#mkTaxMethod').value, npwp = (main.querySelector('#mkTaxNpwp') || {}).value !== '0';
        main.querySelector('#mkTaxCat').value = cat;
        const bruto = base + fixed + vari + bonus;
        const rate = terRateOf(cat, bruto);
        const er = rate * (npwp ? 1 : 1.2);
        const pct = (x) => (x * 100).toFixed(3).replace(/\.?0+$/, '');
        let pph21, thp, cost, rec;
        if (method === 'NET') { pph21 = bruto * er; thp = bruto; cost = bruto + pph21; rec = 'Pajak ditanggung penuh perusahaan — THP karyawan = bruto; biaya perusahaan bertambah sebesar PPh 21.'; }
        else if (method === 'GROSS_UP') { const T = er < 1 ? bruto * er / (1 - er) : 0; pph21 = T; thp = bruto; cost = bruto + T; rec = 'Perusahaan memberi tunjangan pajak (gross-up) yang menambah dasar pajak; THP = bruto, biaya perusahaan = bruto + tunjangan pajak.'; }
        else { pph21 = bruto * er; thp = bruto - pph21; cost = bruto; rec = 'PPh 21 dipotong langsung dari gaji (ditanggung karyawan).'; }
        const ML = { GROSS: 'Gross', NET: 'Nett', GROSS_UP: 'Gross-up' };
        main.querySelector('#mkOutBruto').textContent = rp(bruto);
        main.querySelector('#mkOutRate').textContent = pct(er) + '%';
        main.querySelector('#mkOutTax').textContent = rp(pph21);
        main.querySelector('#mkOutThp').textContent = rp(thp);
        main.querySelector('#mkOutCost').textContent = rp(cost);
        main.querySelector('#mkOutCat').textContent = cat;
        main.querySelector('#mkTaxMethodBadge').textContent = ML[method] || 'Gross';
        main.querySelector('#mkTaxRec').textContent = (rate === 0 ? `Gaji di bawah PTKP kategori ${cat} — belum dikenakan PPh 21. ` : `Tarif TER ${pct(er)}%/bln${npwp ? '' : ' (termasuk +20% non-NPWP)'}. `) + rec;
      };
      const calcAnnual = async () => {
        const out = main.querySelector('#mkTaxAnnualOut');
        out.innerHTML = `<div class="mk-inset mk-annual-card"><div class="mk-empty"><span class="spinner"></span> Menghitung PPh 21 tahunan…</div></div>`;
        try {
          const r = await api(`${B}/pph21`, { method: 'POST', body: { base: Number(main.querySelector('#mkTaxBase').value) || 0, fixed: Number(main.querySelector('#mkTaxFixed').value) || 0, variable: Number(main.querySelector('#mkTaxVar').value) || 0, bonus: Number(main.querySelector('#mkTaxBonus').value) || 0, category: main.querySelector('#mkTaxCat').value, ptkp: main.querySelector('#mkTaxPtkp').value, npwp: main.querySelector('#mkTaxNpwp').value === '1', method: main.querySelector('#mkTaxMethod').value } });
          out.innerHTML = `<div class="mk-inset mk-annual-card"><div class="mk-rowb mk-o-caps bb">Rekonsiliasi PPh 21 Tahunan &amp; Desember (progresif UU HPP)<span class="mk-badge ${r.hasNpwp ? 'blue' : 'amber'}">${r.hasNpwp ? 'Ber-NPWP' : 'Non-NPWP +20%'}</span></div><div class="mk-g mk-g4"><div class="mk-inset mk-out"><span>Bruto Setahun</span><b>${money(r.grossAnnual)}</b></div><div class="mk-inset mk-out"><span>Biaya Jabatan</span><b>${money(r.biayaJabatan)}</b></div><div class="mk-inset mk-out"><span>Iuran BPJS (JHT+JP)</span><b>${money(r.bpjsDeduct)}</b></div><div class="mk-inset mk-out"><span>PTKP ${esc(r.ptkp)}</span><b>${money(r.ptkpAmt)}</b></div><div class="mk-inset mk-out"><span>PKP (neto − PTKP)</span><b class="blue">${money(r.pkp)}</b></div><div class="mk-inset mk-out"><span>PPh 21 Setahun</span><b class="emerald">${money(r.pphAnnual)}</b></div><div class="mk-inset mk-out"><span>TER Jan–Nov</span><b>${money(r.terJanNov)}</b></div><div class="mk-inset mk-out"><span>Koreksi Desember</span><b class="indigo">${money(r.december)}</b></div></div><div class="mk-note">Biaya jabatan 5% (maks Rp 6 jt/th) + iuran JHT 2% &amp; JP 1% karyawan mengurangi penghasilan neto; PPh Desember = PPh setahun − akumulasi TER Jan–Nov.</div><button class="mk-btn sm" id="mkTax1721">${MK('printer')} Cetak Bukti Potong 1721-A1</button></div>`;
          out.querySelector('#mkTax1721')?.addEventListener('click', () => render1721(r));
        } catch (error) { out.innerHTML = `<div class="mk-inset mk-annual-card"><div class="mk-empty">Gagal menghitung: ${esc(error.message)}</div></div>`; }
      };
      const render1721 = (r) => {
        const out = main.querySelector('#mkTaxAnnualOut');
        out.innerHTML = `<div class="mk-1721"><div class="mk-1721-doc">
          <div class="mk-1721-head"><div><h3>BUKTI PEMOTONGAN PPh PASAL 21</h3><span>FORMULIR 1721-A1 · Masa Jan–Des ${new Date().getFullYear()}</span></div><span class="mk-badge ${r.hasNpwp ? 'blue' : 'amber'}">${r.hasNpwp ? 'Ber-NPWP' : 'Non-NPWP'}</span></div>
          <div class="mk-1721-grid"><div><label>Pemotong</label><b>PT Singularity Teknofastindo</b></div><div><label>Penerima</label><b>${esc(ov.name || '—')}</b></div><div><label>NIK</label><b>${esc(ov.nik || '—')}</b></div><div><label>Jabatan</label><b>${esc(pos.positionTitle || ov.jobTitle || '—')}</b></div><div><label>Status PTKP</label><b>${esc(r.ptkp)}</b></div><div><label>Kategori TER</label><b>${esc(r.cat)}</b></div></div>
          <table class="mk-1721-table"><tbody><tr><td>Penghasilan Bruto Setahun</td><td>${money(r.grossAnnual)}</td></tr><tr><td>Pengurangan — Biaya Jabatan (5%, maks 6 jt)</td><td>(${money(r.biayaJabatan)})</td></tr><tr><td>Pengurangan — Iuran BPJS (JHT + JP)</td><td>(${money(r.bpjsDeduct)})</td></tr><tr><td>Penghasilan Tidak Kena Pajak (PTKP ${esc(r.ptkp)})</td><td>(${money(r.ptkpAmt)})</td></tr><tr class="hl"><td>Penghasilan Kena Pajak (PKP)</td><td>${money(r.pkp)}</td></tr><tr class="hl"><td>PPh 21 Terutang Setahun</td><td>${money(r.pphAnnual)}</td></tr><tr><td>PPh 21 Telah Dipotong (TER Jan–Nov)</td><td>${money(r.terJanNov)}</td></tr><tr class="hl"><td>PPh 21 Kurang Dipotong (Desember)</td><td>${money(r.december)}</td></tr></tbody></table>
          <div class="mk-1721-foot"><span>Dihasilkan otomatis oleh Singularity HRIS · ${new Date().toISOString().slice(0, 10)}</span><div class="mk-1721-btns"><button class="mk-btn sm" id="mkTax1721Back">Kembali</button><button class="mk-btn primary sm" id="mkTax1721Print">${MK('printer')} Cetak</button></div></div>
        </div></div>`;
        out.querySelector('#mkTax1721Print')?.addEventListener('click', () => window.print());
        out.querySelector('#mkTax1721Back')?.addEventListener('click', () => { out.innerHTML = ''; calcAnnual(); });
      };
      ['#mkTaxBonus', '#mkTaxMethod', '#mkTaxPtkp', '#mkTaxNpwp'].forEach((sel) => main.querySelector(sel)?.addEventListener('input', calcTax));
      main.querySelector('#mkTaxAnnual')?.addEventListener('click', calcAnnual);
      main.querySelector('#mkTaxSave')?.addEventListener('click', async () => {
        const cat = main.querySelector('#mkTaxCat').value, ptkp = main.querySelector('#mkTaxPtkp').value, method = main.querySelector('#mkTaxMethod').value;
        const bruto = (Number(main.querySelector('#mkTaxBase').value) || 0) + (Number(main.querySelector('#mkTaxFixed').value) || 0) + (Number(main.querySelector('#mkTaxVar').value) || 0);
        const rate = cat === 'A' ? (bruto > 10000000 ? 2 : bruto > 5400000 ? 0.25 : 0) : cat === 'B' ? (bruto > 11000000 ? 3 : bruto > 6200000 ? 1.5 : 0) : (bruto > 12000000 ? 4 : 2);
        try { await api(`${B}/tax-profiles`, { method: 'POST', body: { taxScheme: 'PPH21', ptkpStatus: ptkp, terCategory: cat, terRate: rate, taxMethod: method, effectiveFrom: new Date().toISOString().slice(0, 10) }, idempotencyKey: newIdemKey() }); invalidate(`master:${params.id}`); toast('Profil pajak disimpan', `Metode ${method} · Kategori ${cat} · PTKP ${ptkp} · TER ${rate}%.`); }
        catch (error) { toast('Gagal menyimpan profil pajak', error.message, 'coral'); }
      });
      main.querySelector('#mkTaxBase') && calcTax();
      const bpjsCompute = () => {
        const upah = Number(main.querySelector('#mkBpjsSalary').value) || 0;
        const scheme = main.querySelector('#mkBpjsScheme').value;
        const risk = Number(main.querySelector('#mkBpjsRisk').value) || 0.0024;
        const rows = BPJS_PROGRAMS.map((p) => {
          const on = main.querySelector(`[data-bpjs-prog="${p.key}"]`).checked;
          const erPct = p.risk ? risk : p.erPct;
          const capBase = p.cap ? Math.min(upah, p.cap) : upah;
          let er = Math.round(capBase * erPct), ee = Math.round(capBase * p.eePct);
          if (scheme === 'FULL_COMPANY') { er += ee; ee = 0; }
          return { p, on, capBase, er, ee, total: er + ee, ratePct: ((erPct + p.eePct) * 100).toFixed(2).replace(/\.?0+$/, '') };
        });
        return { upah, scheme, rows };
      };
      const calcBpjs = () => {
        const { rows } = bpjsCompute();
        let tEr = 0, tEe = 0, active = 0;
        const html = rows.map((r) => {
          if (r.on) { active += 1; tEr += r.er; tEe += r.ee; }
          const sub = `${esc(r.p.label)} · ${r.ratePct}%${r.p.cap ? ' · cap ' + rp(r.p.cap) : ''}`;
          return `<tr class="${r.on ? '' : 'mk-bpjs-off'}"><td><div class="mk-reg-emp"><b>${esc(r.p.short)}</b><small>${sub}</small></div></td><td class="r">${r.on ? rp(r.capBase) : '—'}</td><td class="r">${r.on ? rp(r.er) : '—'}</td><td class="r">${r.on ? (r.ee ? rp(r.ee) : 'Rp 0') : '—'}</td><td class="r b">${r.on ? rp(r.total) : '—'}</td></tr>`;
        }).join('');
        main.querySelector('#mkBpjsRows').innerHTML = html;
        main.querySelector('#mkBpjsFoot').innerHTML = `<tr><td>Total (${active} program)</td><td class="r"></td><td class="r">${rp(tEr)}</td><td class="r">${rp(tEe)}</td><td class="r b">${rp(tEr + tEe)}</td></tr>`;
        main.querySelector('#mkBpjsTotal').textContent = rp(tEr + tEe);
        main.querySelector('#mkBpjsEr').textContent = rp(tEr);
        main.querySelector('#mkBpjsEe').textContent = rp(tEe) + ' /bln';
        main.querySelector('#mkBpjsCount').textContent = `${active} program aktif`;
      };
      const printBpjs = () => {
        const { upah, scheme, rows } = bpjsCompute();
        const on = rows.filter((r) => r.on);
        const tEr = on.reduce((n, r) => n + r.er, 0), tEe = on.reduce((n, r) => n + r.ee, 0);
        const out = main.querySelector('#mkBpjsPrintOut');
        out.innerHTML = `<div class="mk-slip"><div class="mk-slip-doc">
          <div class="mk-slip-head"><div class="mk-slip-brand"><div class="mk-slip-logo">S</div><div><b>PT Singularity Teknofastindo</b><span>Rincian Iuran BPJS</span></div></div><div class="mk-slip-title"><h3>RINCIAN IURAN BPJS</h3><span>${scheme === 'FULL_COMPANY' ? 'Ditanggung penuh perusahaan' : 'Skema iuran'}</span></div></div>
          <div class="mk-slip-meta"><div><label>Karyawan</label><b>${esc(ov.name || '—')}</b></div><div><label>NIK / ID</label><b>${esc(ov.nik || '—')}</b></div><div><label>Dasar Upah</label><b>${rp(upah)}</b></div></div>
          <table class="mk-slip-t"><thead><tr><td>Program</td><td class="r">Perusahaan</td><td class="r">Karyawan</td></tr></thead><tbody>${on.map((r) => `<tr><td>${esc(r.p.short)} — ${esc(r.p.label)} (${r.ratePct}%)</td><td class="r">${rp(r.er)}</td><td class="r">${r.ee ? rp(r.ee) : 'Rp 0'}</td></tr>`).join('')}<tr class="tot"><td>Total / bln</td><td class="r">${rp(tEr)}</td><td class="r">${rp(tEe)}</td></tr></tbody></table>
          <div class="mk-slip-net"><span>Total Iuran BPJS / bln</span><b>${rp(tEr + tEe)}</b></div>
          <div class="mk-slip-foot"><span>Dihasilkan otomatis oleh Singularity HRIS · ${new Date().toISOString().slice(0, 10)}</span><div class="mk-slip-btns"><button class="mk-btn sm" id="mkBpjsPrintBack">Tutup</button><button class="mk-btn primary sm" id="mkBpjsPrintDo">${MK('printer')} Cetak / PDF</button></div></div>
        </div></div>`;
        out.querySelector('#mkBpjsPrintDo')?.addEventListener('click', () => window.print());
        out.querySelector('#mkBpjsPrintBack')?.addEventListener('click', () => { out.innerHTML = ''; });
        out.scrollIntoView({ block: 'nearest' });
      };
      ['#mkBpjsScheme', '#mkBpjsRisk'].forEach((sel) => main.querySelector(sel)?.addEventListener('change', calcBpjs));
      main.querySelector('#mkBpjsSalary')?.addEventListener('input', calcBpjs);
      main.querySelectorAll('[data-bpjs-prog]').forEach((c) => c.addEventListener('change', calcBpjs));
      main.querySelector('#mkBpjsPrint')?.addEventListener('click', printBpjs);
      main.querySelector('#mkBpjsSave')?.addEventListener('click', async () => {
        const programs = BPJS_PROGRAMS.filter((p) => main.querySelector(`[data-bpjs-prog="${p.key}"]`).checked).map((p) => p.key);
        if (!programs.length) { toast('Pilih minimal satu program', '', 'coral'); return; }
        const body = { scheme: main.querySelector('#mkBpjsScheme').value, wageBase: Number(main.querySelector('#mkBpjsSalary').value) || 0, jkkRisk: Number(main.querySelector('#mkBpjsRisk').value) || 0.0024, programs, effectiveFrom: new Date().toISOString().slice(0, 10) };
        try { const r = await api(`${B}/bpjs-config`, { method: 'POST', body, idempotencyKey: newIdemKey() }); invalidate(`master:${params.id}`); toast('Konfigurasi BPJS disimpan', `${r.programs.length} program · skema ${r.scheme === 'FULL_COMPANY' ? 'ditanggung perusahaan' : 'iuran'}.`); }
        catch (error) { toast('Gagal menyimpan konfigurasi BPJS', error.message, 'coral'); }
      });
      (async () => {
        try {
          const rows = ((await api(`${B}/bpjs`)).items || []).filter((r) => !r.activeTo);
          if (rows.length) {
            const activeSet = new Set(rows.map((r) => String(r.program || '').toLowerCase()));
            BPJS_PROGRAMS.forEach((p) => { const c = main.querySelector(`[data-bpjs-prog="${p.key}"]`); if (c) c.checked = activeSet.has(p.key); });
            // Dasar upah TIDAK dipulihkan dari snapshot lama — tetap terkunci ke
            // kompensasi terkini agar perubahan/penyesuaian gaji ikut otomatis.
            const splittable = rows.filter((r) => ['KESEHATAN', 'JHT', 'JP'].includes(String(r.program || '').toUpperCase()));
            if (splittable.length && splittable.every((r) => Number(r.employeePct) === 0)) main.querySelector('#mkBpjsScheme').value = 'FULL_COMPANY';
            const jkk = rows.find((r) => String(r.program || '').toUpperCase() === 'JKK');
            if (jkk && jkk.riskCategory != null) { const sel = main.querySelector('#mkBpjsRisk'), val = Number(jkk.riskCategory); const opt = Array.from(sel.options).find((o) => Math.abs(Number(o.value) - val) < 1e-9); if (opt) sel.value = opt.value; }
          }
        } catch (_) { /* pakai default */ }
        calcBpjs();
      })();
    }
  };

  const masterDetail = {
    async render(main, params, signal) {
      if (params.type === 'employees') return employeeClayDetail.render(main, params, signal);
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
      const isParty = ['customers', 'suppliers'].includes(params.type);
      const isProduct = params.type === 'products';
      const hasPhoto = isParty || isProduct;
      const editBtn = EDIT_FIELDS[params.type] && can(`${cfg.module}.edit`) ? `<button class="btn primary" id="masterEditBtn">${ICONS.gear} Edit / Revisi</button>` : '';

      main.innerHTML = pageHead({
        eyebrow: isParty ? `PARTY 360 · ${cfg.title.toUpperCase()}` : isProduct ? `PRODUCT 360 · ${cfg.title.toUpperCase()}` : `MASTER DATA · ${cfg.title.toUpperCase()}`, title: isParty ? `Profil ${cfg.title}` : (overview.name || overview.code || cfg.title),
        sub: isParty ? 'Identitas, commercial control, compliance, dan seluruh relasi operasional dalam satu workspace.' : isProduct ? 'Foto, spesifikasi, harga, dan riwayat dalam satu profil produk & jasa.' : `Status data: ${overview.lifecycleStatus || 'ACTIVE'} · versi ${overview.mdmVersion || 1}`,
        actions: `${editBtn}<a class="btn secondary" href="${cfg.listRoute}">${ICONS.arrow} Kembali</a>${lifeBtns}`
      }) + `
        ${isParty ? partyIdentityHero(overview, params.type, can(`${cfg.module}.edit`)) : isProduct ? productIdentityHero(overview, can(`${cfg.module}.edit`)) : ''}
        <div class="master-tabs" role="tablist">
          ${cfg.tabs.filter((t) => !t.perm || can(t.perm)).map((t) => `<button class="master-tab ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}" role="tab">${esc(t.label)}${overview.subCounts && overview.subCounts[t.sub] ? ` <span class="tab-count">${overview.subCounts[t.sub]}</span>` : ''}</button>`).join('')}
        </div>
        <section id="tabBody"></section>`;

      if (hasPhoto) {
        bindPartyPhotoFallback(main);
        const photoInput = main.querySelector('#partyPhotoInput');
        main.querySelector('#partyPhotoButton')?.addEventListener('click', () => photoInput.click());
        photoInput?.addEventListener('change', async () => {
          const file = photoInput.files[0];
          if (!file) return;
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
            toast('Foto tidak valid', 'Gunakan PNG, JPG, atau WebP maksimal 5 MB.', 'coral'); return;
          }
          try {
            const saved = await uploadFile(`/api/files?module=${encodeURIComponent(cfg.module)}`, file);
            const linked = await api(`${cfg.base}/${params.id}/profile-photo`, { method: 'POST', body: { fileId: saved.id } });
            invalidate(`master:${params.id}`);
            toast('Foto profil diperbarui', linked.profileScanStatus === 'CLEAN' ? 'Foto siap digunakan.' : 'Foto ditautkan dan sedang melewati pemeriksaan keamanan.');
            this.render(main, params);
            if (linked.profileScanStatus !== 'CLEAN') setTimeout(() => {
              if (state.route === `/masters/${params.type}/detail/${params.id}`) this.render(main, params);
            }, 2200);
          } catch (error) { toast('Unggah foto gagal', error.message, 'coral'); }
        });
      }

      main.querySelector('#masterEditBtn')?.addEventListener('click', async () => {
        const value = await formDialog({
          title: `Edit / Revisi — ${overview.name || overview.code || cfg.title}`,
          description: 'Perubahan data umum langsung dicatat pada audit trail. Field sensitif (harga, batas kredit, termin, pajak) menjadi usulan yang menunggu persetujuan (maker-checker).',
          fields: [...EDIT_FIELDS[params.type], { name: 'changeReason', label: 'Alasan revisi', type: 'textarea', rows: 2, hint: 'Wajib diisi bila mengubah field sensitif (harga, batas kredit, termin, pajak). Dicatat pada usulan maker-checker.' }],
          initial: overview, submitLabel: 'Simpan revisi'
        });
        if (!value) return;
        try {
          const result = await api(`/api/${params.type}/${params.id}`, { method: 'PATCH', body: value });
          invalidate(`master:${params.id}`); invalidate(params.type);
          const pending = result && result.pendingChanges && result.pendingChanges.fields;
          if (pending && pending.length) toast('Sebagian menunggu persetujuan', `${pending.length} field sensitif diajukan sebagai usulan (maker-checker).`, 'amber');
          else toast('Revisi tersimpan', 'Perubahan tercatat di audit trail.');
          this.render(main, params);
        } catch (error) { toast('Gagal menyimpan revisi', error.message, 'coral'); }
      });

      const renderTab = async (tabId) => {
        this._tab = tabId;
        main.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
        const body = main.querySelector('#tabBody');
        const tab = cfg.tabs.find((t) => t.id === tabId);
        if (tabId === 'overview') {
          const rows = cfg.tabs.filter((t) => t.sub).map((t) => `<div class="stat-row"><span>${esc(t.label)}</span><b>${(overview.subCounts && overview.subCounts[t.sub]) || 0} entri</b></div>`).join('');
          const ov = OVERVIEW[params.type];
          const detailRows = ov
            ? ov.detail(overview).filter(([, v]) => v != null && v !== '').map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')
            : Object.entries(overview).filter(([k, v]) => !['subCounts', 'id'].includes(k) && typeof v !== 'object' && v !== null && v !== '').slice(0, 12).map(([k, v]) => `<div><dt>${esc(k.replace(/([A-Z])/g, ' $1'))}</dt><dd>${esc(String(v))}</dd></div>`).join('');
          const partyClass = isParty ? ' party-profile-kpis' : '';
          const kpiHtml = ov ? `<section class="kpi-grid${partyClass}">${ov.kpis(overview).map(([label, val, note]) => `<article class="kpi"><span>${esc(label)}</span><strong>${val}</strong><small>${note || ''}</small></article>`).join('')}</section>` : '';
          body.innerHTML = kpiHtml + qualitySection(overview, can(`${cfg.module}.edit`)) + (params.type === 'customers' ? creditCockpit(overview) : '') + (params.type === 'suppliers' ? vendorScorecard(overview) : '') + (params.type === 'products' ? materialViews(overview) : '') + compliancePanel(overview) + `<div class="dashboard-grid${isParty ? ' party-overview-grid' : ''}"><article class="panel"><header><div><p class="eyebrow">${isParty ? 'IDENTITY & POLICY' : 'RINGKASAN'}</p><h2>${isParty ? 'Profil bisnis terkendali' : 'Informasi utama'}</h2></div>${chip(overview.lifecycleStatus || 'ACTIVE')}</header><div class="panel-body"><dl class="detail-dl">${detailRows}</dl></div></article><article class="panel"><header><div><p class="eyebrow">${isParty ? 'RELATIONSHIP COVERAGE' : 'KELENGKAPAN'}</p><h2>${isParty ? 'Data pendukung' : 'Sub-data'}</h2></div></header><div class="panel-body stack">${rows}</div></article></div>`;
          body.querySelector('#qualityFix')?.addEventListener('click', () => main.querySelector('#masterEditBtn')?.click());
          body.querySelectorAll('.credit-bar-fill[data-w]').forEach((el) => el.style.setProperty('width', `${el.dataset.w}%`));
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

  const businessPartnerPage={
    permission:'business_partner.view',
    async render(main,params,signal){
      main.innerHTML=pageHead({eyebrow:'ENTERPRISE MASTER DATA',title:'Business Partner Control Center',sub:'Satu identitas kanonis untuk pelanggan, supplier, kontak, alamat, dan relasi lintas proses.'})+`<div class="panel"><div class="panel-body"><span class="spinner"></span> Memuat golden record…</div></div>`;
      const load=async()=>{
        const q=new URLSearchParams({limit:'100'}),[partners,duplicates,rules]=await Promise.all([
          api(`/api/business-partners?${q}`,{signal}),api('/api/business-partners/duplicates?status=OPEN&limit=100',{signal}),api('/api/business-partners/quality-rules',{signal})
        ]);
        const canEdit=can('business_partner.edit'),canApprove=can('business_partner.approve'),canImport=can('business_partner.import');
        main.innerHTML=pageHead({eyebrow:'ENTERPRISE MASTER DATA',title:'Business Partner Control Center',sub:'Golden record, duplicate resolution, staged import, dan data-quality rules dalam satu workbench.',actions:`${canEdit?`<button class="btn" id="bpScan">${ICONS.refresh||''} Deteksi duplikat</button>`:''}${canImport?`<button class="btn" id="bpImport">Import staging</button>`:''}${can('business_partner.create')?`<button class="btn primary" id="bpAdd">${ICONS.plus} Business Partner</button>`:''}`})+
          `<section class="kpi-grid"><article class="kpi"><span>Golden record aktif</span><strong>${partners.total}</strong><small>Identitas kanonis dapat digunakan lintas modul</small></article><article class="kpi"><span>Kandidat duplikat</span><strong>${duplicates.total}</strong><small>Wajib diputuskan dengan maker-checker</small></article><article class="kpi"><span>Quality rules aktif</span><strong>${rules.items.length}</strong><small>Konfigurasi aman tanpa arbitrary SQL</small></article><article class="kpi"><span>Rata-rata kualitas</span><strong>${partners.items.length?Math.round(partners.items.reduce((s,x)=>s+Number(x.dataQualityScore||0),0)/partners.items.length):0}%</strong><small>Skor kelengkapan master</small></article></section>
          <section class="dashboard-grid"><div class="panel table-panel"><header><div><p class="eyebrow">GOLDEN RECORD</p><h2>Business Partner</h2></div><span class="chip gray">${partners.total} record</span></header><div class="table-wrap"><table><thead><tr><th>Nomor / nama</th><th>Peran</th><th>NPWP/NIK</th><th>Kualitas</th><th>Status</th></tr></thead><tbody>${partners.items.length?partners.items.map(x=>`<tr><td><b>${esc(x.displayName)}</b><small>${esc(x.partyNumber)} · ${esc(x.partyType)}</small></td><td>${(x.roles||[]).map(role=>`<span class="chip blue">${esc(role)}</span>`).join(' ')||'<span class="muted">Belum ada peran</span>'}</td><td>${esc(x.taxId||'—')}</td><td><b>${Number(x.dataQualityScore||0)}%</b></td><td>${chip(x.status)}</td></tr>`).join(''):`<tr><td colspan="5"><div class="empty-state"><h3>Belum ada Business Partner</h3><p>Buat record kanonis atau import melalui staging.</p></div></td></tr>`}</tbody></table></div></div>
          <div class="panel table-panel"><header><div><p class="eyebrow">DUPLICATE WORKBENCH</p><h2>Antrean resolusi</h2></div><span class="chip ${duplicates.total?'coral':'mint'}">${duplicates.total} open</span></header><div class="table-wrap"><table><thead><tr><th>Kandidat</th><th>Score</th><th>Kontrol</th></tr></thead><tbody>${duplicates.items.length?duplicates.items.map(x=>`<tr><td><b>${esc(x.leftName)}</b><small>${esc(x.leftNumber)} ↔ ${esc(x.rightNumber)}</small><br><b>${esc(x.rightName)}</b></td><td><b>${Number(x.matchScore)}%</b><small>${(x.matchSignals||[]).map(s=>s.type).join(', ')}</small></td><td>${canApprove?`<button class="btn small bpResolve" data-id="${x.id}" data-left="${x.leftPartnerId}" data-right="${x.rightPartnerId}" data-left-label="${esc(x.leftNumber)}" data-right-label="${esc(x.rightNumber)}">Putuskan</button>`:'<span class="muted">Butuh approver</span>'}</td></tr>`).join(''):`<tr><td colspan="3"><div class="empty-state"><h3>Antrean bersih</h3><p>Tidak ada kandidat duplikat terbuka.</p></div></td></tr>`}</tbody></table></div></div></section>`;

        main.querySelector('#bpAdd')?.addEventListener('click',async()=>{const value=await formDialog({title:'Business Partner baru',description:'Buat identitas kanonis. Peran Customer/Supplier dapat ditambahkan melalui master terkait.',fields:[{name:'partyType',label:'Tipe',type:'select',options:[['ORGANIZATION','Organisasi'],['PERSON','Perorangan']],required:true},{name:'displayName',label:'Nama tampilan',required:true},{name:'legalName',label:'Nama legal',required:true},{name:'taxId',label:'NPWP/NIK'}],submitLabel:'Buat Business Partner'});if(!value)return;try{await api('/api/business-partners',{method:'POST',body:value});toast('Business Partner dibuat','Golden record tersedia untuk proses lintas modul.');await load();}catch(error){toast('Gagal membuat Business Partner',error.message,'coral');}});
        main.querySelector('#bpScan')?.addEventListener('click',async()=>{try{const result=await api('/api/business-partners/duplicates/detect',{method:'POST'});toast('Pemindaian selesai',`${result.candidatesUpserted} kandidat diperbarui dari ${result.examinedPairs} pasangan.`);await load();}catch(error){toast('Pemindaian gagal',error.message,'coral');}});
        main.querySelector('#bpImport')?.addEventListener('click',async()=>{const value=await formDialog({title:'Import staging',description:'Tempel JSON array. Data tidak langsung menjadi master: validasi dan promosi dijalankan terpisah.',fields:[{name:'entityType',label:'Jenis master',type:'select',options:[['BUSINESS_PARTNER','Business Partner'],['CUSTOMER','Customer'],['SUPPLIER','Supplier']],required:true},{name:'sourceName',label:'Nama sumber',required:true},{name:'rowsJson',label:'JSON rows',type:'textarea',required:true}],submitLabel:'Stage & validasi'});if(!value)return;try{let rows;try{rows=JSON.parse(value.rowsJson);}catch{throw new Error('JSON rows tidak valid.');}const batch=await api('/api/business-partners/imports',{method:'POST',body:{entityType:value.entityType,sourceName:value.sourceName,rows}});const validation=await api(`/api/business-partners/imports/${batch.id}/validate`,{method:'POST'});toast('Import tervalidasi',`${validation.validCount} valid · ${validation.invalidCount} perlu koreksi.`);if(validation.validCount&&canApprove){const promote=confirm(`${validation.validCount} baris valid siap dipromosikan. Lanjutkan sekarang?`);if(promote){const result=await api(`/api/business-partners/imports/${batch.id}/promote`,{method:'POST'});toast('Promosi selesai',`${result.promotedCount} master berhasil dibuat.`);await load();}}}catch(error){toast('Import gagal',error.message,'coral');}});
        main.querySelectorAll('.bpResolve').forEach(button=>button.addEventListener('click',async()=>{const value=await formDialog({title:'Putuskan kandidat duplikat',description:'Merge mempertahankan ID legacy dan menyimpan lineage permanen. Petugas pemindai tidak boleh menjadi approver.',fields:[{name:'decision',label:'Keputusan',type:'select',options:[['MERGE','Gabungkan'],['IGNORE','Bukan duplikat']],required:true},{name:'survivorPartnerId',label:'Golden record survivor',type:'select',options:[[button.dataset.left,button.dataset.leftLabel],[button.dataset.right,button.dataset.rightLabel]],required:true},{name:'reason',label:'Alasan keputusan',type:'textarea',required:true}],submitLabel:'Simpan keputusan'});if(!value)return;try{await api(`/api/business-partners/duplicates/${button.dataset.id}/resolve`,{method:'POST',body:value});toast('Kandidat diputuskan','Lineage dan audit trail telah disimpan.');await load();}catch(error){toast('Keputusan gagal',error.message,'coral');}}));
      };
      try{await load();}catch(error){main.innerHTML=`<section class="error-state">${clayOrb('coral','alert')}<h1>Business Partner gagal dimuat</h1><p>${esc(error.message)}</p></section>`;}
    }
  };

  const R = router.register.bind(router);
  R('/masters/business-partners',businessPartnerPage);
  R('/masters/governance',governancePage);
  R('/masters/customers/link',customerLinkWizard);
  R('/masters/:type/detail/:id', masterDetail);
  R('/masters/customers', masterPage({
    endpoint: '/api/customers', key: 'customers', permission: 'customer.view', title: 'Pelanggan', eyebrow: 'MASTER DATA', detailType: 'customers',
    presentation:{party:'customer',pageTitle:'Master Customer',headline:'Customer portfolio yang siap ditindaklanjuti',description:'Identitas, kebijakan kredit, pajak, risiko, dan kualitas data dalam satu direktori enterprise.',tableEyebrow:'CUSTOMER INTELLIGENCE',tableTitle:'Customer portfolio'},
    fields: EDIT_FIELDS.customers,
    columns: [
      { label: 'Customer identity', key:'identity', render: (r) => partyIdentityCell(r, 'customer') },
      { label: 'Relasi bisnis', key:'relationship', render: (r) => `<span class="party-cell-stack"><b>${esc(r.businessCategory || 'Kategori umum')}</b><small>${esc(r.city || 'Lokasi belum diisi')} · ${esc(r.customerType === 'INDIVIDUAL' ? 'Perorangan' : 'Perusahaan')}</small></span>` },
      { label: 'Commercial policy', key:'commercial', render: (r) => `<span class="party-cell-stack"><b>${Number(r.paymentTermDays || 0)} hari</b><small>${Number(r.creditLimitAmount || 0) > 0 ? fmtIDR(r.creditLimitAmount) : 'Tanpa batas kredit'} · ${esc(r.currency || 'IDR')}</small></span>` },
      { label: 'Risk & trust', key:'risk', render: (r) => `<span class="party-cell-stack party-risk-cell"><span>${riskChip(r.riskRating)} <span class="party-quality ${partyQualityTone(r.dataQualityScore)}">${Number(r.dataQualityScore || 0)}%</span></span><small>Collection ${esc(r.collectionStatus || 'NORMAL')}</small></span>` },
      { label: 'Governance', key:'governance', render: (r) => `<span class="party-cell-stack"><span>${r.active ? '<span class="chip mint">Aktif</span>' : '<span class="chip gray">Nonaktif</span>'} <span class="chip blue">${esc(r.ppnStatus || 'Pajak —')}</span></span><small>MDM v${Number(r.mdmVersion || 1)}</small></span>` }
    ]
  }));
  R('/masters/suppliers', masterPage({
    endpoint: '/api/suppliers', key: 'suppliers', permission: 'supplier.view', title: 'Supplier', eyebrow: 'MASTER DATA', detailType: 'suppliers',
    presentation:{party:'supplier',pageTitle:'Master Supplier',headline:'Supplier network dengan kontrol menyeluruh',description:'Profil vendor, performa, onboarding, risiko, dan compliance disajikan dalam satu supplier cockpit.',tableEyebrow:'SUPPLIER INTELLIGENCE',tableTitle:'Supplier network'},
    fields: EDIT_FIELDS.suppliers,
    columns: [
      { label: 'Supplier identity', key:'identity', render: (r) => partyIdentityCell(r, 'supplier') },
      { label: 'Supply profile', key:'supply', render: (r) => `<span class="party-cell-stack"><b>${esc(r.category || 'Belum diklasifikasi')}</b><small>${esc(r.supplierType === 'INDIVIDUAL' ? 'Perorangan' : 'Perusahaan')} · ${esc(r.ppnTreatment || 'Pajak belum diatur')}</small></span>` },
      { label: 'Performance', key:'performance', render: (r) => `<span class="party-cell-stack">${starRating(r.rating)}<small>Score ${Number(r.lastPerformanceScore || 0).toFixed(1)} · ${esc(r.lastPerformancePeriod || 'belum dihitung')}</small></span>` },
      { label: 'Risk & onboarding', key:'risk', render: (r) => `<span class="party-cell-stack party-risk-cell"><span>${riskChip(r.riskLevel)} <span class="party-quality ${partyQualityTone(r.dataQualityScore)}">${Number(r.dataQualityScore || 0)}%</span></span><small>${esc(r.onboardingStatus || 'REGISTERED')}</small></span>` },
      { label: 'Governance', key:'governance', render: (r) => `<span class="party-cell-stack"><span>${r.active ? '<span class="chip mint">Aktif</span>' : '<span class="chip gray">Nonaktif</span>'} ${r.coiDeclared ? '<span class="chip blue">COI</span>' : '<span class="chip amber">COI pending</span>'}</span><small>MDM v${Number(r.mdmVersion || 1)}</small></span>` }
    ]
  }));
  R('/masters/products', masterPage({
    endpoint: '/api/products', key: 'products', permission: 'product.view', title: 'Produk & jasa', eyebrow: 'MASTER DATA', detailType: 'products',
    fields: EDIT_FIELDS.products,
    columns: [
      { label: 'Produk', render: (r) => `<b>${esc(r.name)}</b><small>${esc(r.code)}</small>` },
      { label: 'Satuan', render: (r) => esc(r.uom) },
      { label: 'HPP', right: true, render: (r) => can('payroll.view') || can('journal.view') || can('*') ? `<span class="money">${fmtIDRFull(r.hpp)}</span>` : '<span class="chip gray">Tersembunyi</span>' },
      { label: 'Harga jual', right: true, render: (r) => `<span class="money">${fmtIDRFull(r.price)}</span>` }
    ]
  }));
})();
