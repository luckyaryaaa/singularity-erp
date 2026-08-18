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

  // Cincin skor data-quality (SVG, CSP-safe — atribut presentasi, bukan inline style).
  const dqRing = (pct) => {
    const v = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    const R = 26, C = 2 * Math.PI * R, off = (C * (1 - v / 100)).toFixed(1);
    const tone = v >= 80 ? 'mint' : v >= 50 ? 'amber' : 'coral';
    return `<svg class="dq-ring ${tone}" viewBox="0 0 64 64" role="img" aria-label="Data quality ${v} persen"><circle class="dq-track" cx="32" cy="32" r="${R}"/><circle class="dq-arc" cx="32" cy="32" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off}" transform="rotate(-90 32 32)"/><text class="dq-val" x="32" y="33">${v}</text></svg>`;
  };

  // Employee 360 identity hero — memakai kerangka .party-profile-hero (modern),
  // konten HCM: penempatan, kompensasi, PPh21, cuti + gauge data-quality.
  const employeeIdentityHero = (emp, editable) => {
    const status = emp.lifecycleStatus || (emp.active ? 'ACTIVE' : 'INACTIVE');
    const s = emp.enterpriseSummary || {}, comp = s.compensation || {}, tax = s.tax || {}, leave = s.leaveBalance || {};
    const compTotal = (Number(comp.baseSalary) || 0) + (Number(comp.fixedAllowance) || 0) + (Number(comp.variableAllowance) || 0);
    const initials = String(emp.name || '?').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
    const flags = Array.isArray(emp.qualityFlags) ? emp.qualityFlags : [];
    const facts = [
      [ICONS.wallet, 'Kompensasi / bln', fmtIDR(compTotal)],
      [ICONS.doc, 'Pajak PPh21', tax.ptkpStatus ? `PTKP ${tax.ptkpStatus} · TER ${tax.terCategory || '—'}` : 'Belum dihitung'],
      [ICONS.clock, 'Cuti tahunan', leave.entitlement != null ? `${leave.remaining}/${leave.entitlement} hari` : '—'],
      [ICONS.audit, 'Masa kerja', serviceLength(emp.joinDate)]
    ];
    const photo = emp.profileFileId ? `<img data-party-photo src="/api/files/${esc(emp.profileFileId)}" width="56" height="56" alt="" loading="lazy" decoding="async">` : '';
    return `<section class="party-profile-hero emp-hero" data-party-kind="employee"><div class="party-profile-identity">
      <div class="emp-avatar${emp.profileFileId ? ' has-photo' : ''}"><span class="emp-avatar-fallback" aria-hidden="true">${esc(initials)}</span>${photo}${editable ? `<button class="emp-photo-btn" id="partyPhotoButton" type="button" title="Ganti foto profil">${ICONS.camera || ICONS.people}</button>` : ''}</div>${editable ? '<input id="partyPhotoInput" type="file" accept="image/png,image/jpeg,image/webp" hidden>' : ''}
      <div class="party-profile-name"><span class="party-directory-kicker"><i aria-hidden="true"></i>EMPLOYEE 360 · IDENTITY</span><h2>${esc(emp.name || emp.nik)}</h2><p>${esc(emp.jobTitle || '—')} · ${esc(emp.department || '—')}</p>
        <div class="party-profile-tags"><span>NIK ${esc(emp.nik || '—')}</span>${chip(status)}${emp.bpjs ? '<span class="chip mint">BPJS aktif</span>' : ''}${flags.length ? `<span class="chip coral">${flags.length} isu data</span>` : ''}</div></div>
      <div class="emp-quality">${dqRing(emp.dataQualityScore)}<small>Data quality</small></div></div>
      <div class="party-profile-facts">${facts.map(([icon, label, value]) => `<div><span>${icon}</span><small>${esc(label)}</small><strong>${esc(value)}</strong></div>`).join('')}</div>
      <span class="party-profile-orbit" aria-hidden="true"><i></i><i></i><i></i></span></section>`;
  };

  // Employee 360 — "infotype" heroes: kartu ringkasan keadaan-terkini di atas tabel riwayat,
  // gaya SAP HCM infotype / Oracle HR. CSP-safe (SVG presentation attrs, tanpa inline style).
  const empMask = (v, keep = 4) => { const t = String(v ?? '').replace(/\s+/g, ''); if (!t) return '—'; return t.length <= keep ? t : `••••${t.slice(-keep)}`; };
  const daysUntil = (d) => { if (!d) return null; const ms = new Date(d).getTime() - Date.now(); return Number.isFinite(ms) ? Math.round(ms / 86400000) : null; };
  const segBar = (parts) => {
    const shown = parts.filter((p) => Number(p[0]) > 0);
    const total = shown.reduce((a, p) => a + Number(p[0]), 0) || 1;
    let x = 0; const W = 100, H = 12;
    const rects = shown.map((p) => { const w = (Number(p[0]) / total) * W; const r = `<rect class="seg-${p[1]}" x="${x.toFixed(2)}" y="0" width="${w.toFixed(2)}" height="${H}" rx="2.5"/>`; x += w; return r; }).join('');
    return `<svg class="seg-bar" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-hidden="true">${rects || `<rect class="seg-empty" x="0" y="0" width="${W}" height="${H}" rx="2.5"/>`}</svg>`;
  };
  const employeeTabHero = (tabId, items, overview) => {
    const list = Array.isArray(items) ? items : [];
    const s = (overview && overview.enterpriseSummary) || {};
    const shell = (eyebrow, title, right, body, tone) => `<article class="panel emp-infotype${tone ? ` it-${tone}` : ''}"><header><div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2></div>${right || ''}</header><div class="panel-body">${body}</div></article>`;
    const facts = (rows) => `<dl class="detail-dl eth-dl">${rows.filter(Boolean).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
    const mini = (cells) => `<div class="eth-mini-grid">${cells.filter(Boolean).map(([k, v, cls]) => `<div class="eth-mini${cls ? ` ${cls}` : ''}"><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</div>`;

    if (tabId === 'compensation') {
      const c = list[0]; if (!c) return '';
      const base = Number(c.baseSalary) || 0, fixed = Number(c.fixedAllowance) || 0, variable = Number(c.variableAllowance) || 0;
      const monthly = base + fixed + variable, annual = monthly * 12, status = c.approvalStatus || c.status;
      return shell('KOMPENSASI · IT-0008 BASIC PAY', 'Struktur remunerasi aktif', status ? chip(status) : '',
        `<div class="eth-lead"><div class="eth-headline"><span>Total kompensasi / bulan</span><strong class="num-xl">${fmtIDR(monthly)}</strong><small>≈ ${fmtIDR(annual)} / tahun · THR ± ${fmtIDR(base)}</small></div>
          <div class="eth-breakdown">${segBar([[base, 'base'], [fixed, 'fixed'], [variable, 'variable']])}<div class="seg-legend"><span class="lg base">Pokok · ${fmtIDR(base)}</span><span class="lg fixed">Tunj. tetap · ${fmtIDR(fixed)}</span><span class="lg variable">Tunj. variabel · ${fmtIDR(variable)}</span></div></div></div>
        ${facts([
          ['Gaji pokok', `<span class="money">${fmtIDR(base)}</span>`], ['Tunjangan tetap', `<span class="money">${fmtIDR(fixed)}</span>`],
          ['Tunjangan variabel', `<span class="money">${fmtIDR(variable)}</span>`], ['Grade', esc(c.salaryGrade || (s.compensation && s.compensation.salaryGrade) || '—')],
          ['Berlaku sejak', fmtDate(c.effectiveFrom)], ['Revisi kompensasi', `${list.length} entri`]
        ])}`, 'mint');
    }
    if (tabId === 'tax-profiles') {
      const t = list[0] || {}, tax = s.tax || {};
      const ter = t.terCategory || tax.terCategory, rate = (t.terRate != null && t.terRate !== '') ? t.terRate : tax.terRate;
      const ptkp = t.ptkpStatus || tax.ptkpStatus, scheme = t.taxScheme || tax.taxScheme || 'PPH21';
      if (!list.length && !tax.ptkpStatus) return shell('PAJAK · PPh 21 TER (PP 58/2023)', 'Profil pajak belum dikonfigurasi', chip('PERLU DILENGKAPI'), `<div class="empty-inline">Belum ada profil pajak. Gunakan <b>Hitung otomatis</b> di tab Overview, atau tambah manual di bawah.</div>`, 'amber');
      return shell('PAJAK · PPh 21 TER (PP 58/2023)', 'Profil perpajakan aktif', scheme ? chip(scheme) : '',
        `<div class="eth-lead"><div class="eth-headline"><span>Kategori TER</span><strong class="badge-xl">${esc(ter || '—')}</strong><small>${(rate != null && rate !== '') ? `Tarif ${Number(rate)}% / bulan` : 'Tarif belum ditetapkan'}${tax.monthlyPph21 ? ` · PPh21 ± ${fmtIDR(tax.monthlyPph21)}/bln` : ''}</small></div>
          ${mini([['PTKP', esc(ptkp || '—')], ['Skema', esc(scheme || '—')], ['Metode', esc(t.taxMethod || tax.taxMethod || '—')], ['NPWP', t.npwp ? 'Terdaftar' : 'Belum']])}</div>
        ${facts([
          ['NPWP', esc(t.npwp ? empMask(t.npwp, 6) : '—')], ['Status PTKP', esc(ptkp || '—')], ['Kategori TER', esc(ter || '—')],
          ['Tarif TER', (rate != null && rate !== '') ? `${Number(rate)}%` : '—'], ['Metode potong', esc(t.taxMethod || tax.taxMethod || '—')], ['Berlaku sejak', fmtDate(t.effectiveFrom)]
        ])}`, 'blue');
    }
    if (tabId === 'bpjs') {
      const PROG = [['KESEHATAN', 'Kesehatan', 'JKN · KIS'], ['JHT', 'JHT', 'Hari Tua'], ['JKK', 'JKK', 'Kecelakaan Kerja'], ['JKM', 'JKM', 'Jaminan Kematian'], ['JP', 'JP', 'Jaminan Pensiun']];
      const byProg = {}; list.forEach((p) => { if (!byProg[p.program]) byProg[p.program] = p; });
      const activeCount = PROG.filter(([code]) => byProg[code]).length;
      const totEmployer = list.reduce((a, p) => a + (Number(p.employerPct) || 0), 0), totEmployee = list.reduce((a, p) => a + (Number(p.employeePct) || 0), 0);
      const tiles = PROG.map(([code, name, desc]) => { const p = byProg[code];
        return `<div class="bpjs-tile ${p ? 'on' : 'off'}"><header><b>${esc(name)}</b>${p ? '<span class="chip mint sm">Aktif</span>' : '<span class="chip gray sm">—</span>'}</header><small>${esc(desc)}</small>${p ? `<div class="bpjs-pct"><span>Perusahaan <b>${Number(p.employerPct) || 0}%</b></span><span>Karyawan <b>${Number(p.employeePct) || 0}%</b></span></div><small class="bpjs-no">No. ${esc(empMask(p.membershipNumber, 4))}</small>` : '<div class="bpjs-pct off">Belum terdaftar</div>'}</div>`; }).join('');
      return shell('BPJS · JAMINAN SOSIAL', 'Cakupan kepesertaan', `<span class="chip ${activeCount >= 4 ? 'mint' : activeCount ? 'amber' : 'coral'}">${activeCount}/5 program</span>`,
        `<div class="bpjs-grid">${tiles}</div>${mini([['Total iuran perusahaan', `${totEmployer.toFixed(1)}%`], ['Total iuran karyawan', `${totEmployee.toFixed(1)}%`]])}`, 'mint');
    }
    if (tabId === 'bank-accounts') {
      const primary = list.find((b) => b.isPrimary) || list[0]; if (!primary) return '';
      const vs = primary.verificationStatus || (primary.verified ? 'VERIFIED' : 'PENDING');
      return shell('PAYROLL BANK · IT-0009', 'Rekening penggajian utama', chip(vs),
        `<div class="bank-card"><div class="bank-face"><span class="bank-brand">${esc(primary.bankName || '—')}</span><span class="bank-chip" aria-hidden="true"></span><span class="bank-no">${esc(empMask(primary.accountNumber, 4))}</span><span class="bank-holder">${esc(primary.accountHolder || overview.name || '—')}</span></div></div>
        ${facts([
          ['Bank', esc(primary.bankName || '—')], ['No. rekening', esc(empMask(primary.accountNumber, 4))], ['Atas nama', esc(primary.accountHolder || '—')],
          ['Status verifikasi', chip(vs)], ['Total rekening', `${list.length}`], ['Berlaku sejak', fmtDate(primary.effectiveFrom)]
        ])}`, 'blue');
    }
    if (tabId === 'positions') {
      const cur = list[0] || s.currentPosition || {};
      const title = cur.positionTitle || overview.jobTitle, division = cur.division || overview.department, location = cur.workLocation || overview.branchName;
      const grade = cur.salaryGrade || (s.compensation && s.compensation.salaryGrade);
      if (!title && !division && !location) return '';
      return shell('PENEMPATAN · IT-0001 ORG ASSIGNMENT', 'Posisi & penempatan aktif', chip(overview.lifecycleStatus || 'ACTIVE'),
        `<div class="eth-lead"><div class="eth-headline"><span>Jabatan</span><strong class="title-xl">${esc(title || '—')}</strong><small>${esc(division || '—')}${location ? ` · ${esc(location)}` : ''}</small></div></div>
        ${facts([
          ['Divisi / Departemen', esc(division || '—')], ['Lokasi kerja', esc(location || '—')], ['Grup shift', esc(cur.shiftGroup || '—')],
          ['Grade gaji', esc(grade || '—')], ['Frekuensi gaji', esc(cur.payrollFrequency || 'Bulanan')], ['Berlaku sejak', cur.effectiveFrom ? fmtDate(cur.effectiveFrom) : esc(overview.joinDate ? fmtDate(overview.joinDate) : '—')]
        ])}`, 'lav');
    }
    if (tabId === 'contracts') {
      const active = list.find((c) => ['ACTIVE', 'SIGNED', 'RUNNING'].includes(String(c.status || '').toUpperCase())) || list[0]; if (!active) return '';
      const dleft = daysUntil(active.endDate), tone = dleft == null ? 'gray' : dleft < 0 ? 'coral' : dleft <= 60 ? 'amber' : 'mint';
      const note = dleft == null ? 'Tanpa tanggal berakhir (PKWTT)' : dleft < 0 ? `Kedaluwarsa ${Math.abs(dleft)} hari lalu` : `${dleft} hari menuju berakhir`;
      return shell('KONTRAK · IT-0016 CONTRACT', 'Kontrak kerja aktif', chip(active.status || 'ACTIVE'),
        `<div class="eth-lead"><div class="eth-headline"><span>${esc(active.contractType || 'Kontrak')} · ${esc(active.contractNumber || '—')}</span><strong class="title-xl">${fmtDate(active.startDate)} → ${active.endDate ? fmtDate(active.endDate) : 'Tanpa batas'}</strong><small class="tone-${tone}">${esc(note)}</small></div></div>
        ${facts([
          ['Nomor kontrak', esc(active.contractNumber || '—')], ['Jenis', esc(active.contractType || '—')], ['Mulai', fmtDate(active.startDate)],
          ['Berakhir', active.endDate ? fmtDate(active.endDate) : '—'], ['Akhir percobaan', active.probationEnd ? fmtDate(active.probationEnd) : '—'], ['Total kontrak', `${list.length}`]
        ])}`, tone === 'coral' ? 'coral' : 'amber');
    }
    if (tabId === 'documents') {
      if (!list.length) return '';
      const verified = list.filter((d) => d.verified || d.verificationStatus === 'VERIFIED').length;
      const expiring = list.filter((d) => { const dl = daysUntil(d.expiryDate); return dl != null && dl >= 0 && dl <= 90; }).length;
      const expired = list.filter((d) => { const dl = daysUntil(d.expiryDate); return dl != null && dl < 0; }).length;
      const pct = list.length ? Math.round((verified / list.length) * 100) : 0;
      return shell('DOKUMEN & SERTIFIKAT · IT-0022', 'Kepatuhan dokumen', chip(expired ? 'PERLU TINDAKAN' : expiring ? 'PANTAU' : 'TERKENDALI'),
        `<div class="eth-lead"><div class="eth-ringwrap">${dqRing(pct)}<small>Terverifikasi</small></div>${mini([['Total dokumen', `${list.length}`], ['Terverifikasi', `${verified}`], ['Segera kedaluwarsa', `${expiring}`, expiring ? 'warn' : ''], ['Kedaluwarsa', `${expired}`, expired ? 'bad' : '']])}</div>`, expired ? 'coral' : 'blue');
    }
    if (tabId === 'insurance') {
      if (!list.length) return '';
      const active = list.filter((i) => { const dl = daysUntil(i.expiryDate); return dl == null || dl >= 0; });
      const premium = active.reduce((a, i) => a + (Number(i.premium) || 0), 0);
      return shell('ASURANSI · BENEFIT', 'Perlindungan asuransi', chip(active.length ? 'AKTIF' : 'TIDAK AKTIF'),
        mini([['Polis aktif', `${active.length}`], ['Total premi / bln', fmtIDR(premium)], ['Penyedia', esc(active.map((i) => i.insurer).filter(Boolean).slice(0, 2).join(', ') || '—')]]), 'lav');
    }
    if (tabId === 'emergency-contacts') {
      const primary = list[0]; if (!primary) return '';
      return shell('KONTAK DARURAT · IT-0021', 'Kontak darurat utama', `<span class="chip ${list.length ? 'mint' : 'coral'}">${list.length} kontak</span>`,
        facts([['Nama', esc(primary.name || '—')], ['Hubungan', esc(primary.relationship || '—')], ['Telepon', esc(primary.phone || '—')], ['Alamat', esc(primary.address || '—')]]), 'amber');
    }
    if (tabId === 'access') {
      const activeRoles = list.filter((a) => { const dl = daysUntil(a.accessEnd); return dl == null || dl >= 0; });
      return shell('AKSES & PERAN · IAM', 'Hak akses sistem', `<span class="chip ${activeRoles.length ? 'mint' : 'gray'}">${activeRoles.length} aktif</span>`,
        mini([['Peran aktif', `${activeRoles.length}`], ['Total penetapan', `${list.length}`], ['Akun sistem', `${Number(s.activeUserAccounts || 0)}`]]), 'blue');
    }
    if (tabId === 'employment-history') {
      const latest = list[0], emp = s.employment || {};
      return shell('RIWAYAT KERJA · IT-0000 ACTIONS', 'Status kepegawaian', chip((latest && latest.employmentStatus) || emp.employmentStatus || overview.lifecycleStatus || 'ACTIVE'),
        `${mini([['Status saat ini', esc((latest && latest.employmentStatus) || emp.employmentStatus || '—')], ['Tipe', esc((latest && latest.employmentType) || emp.employmentType || '—')], ['Peristiwa terakhir', latest ? fmtDate(latest.eventDate) : '—']])}${(latest && latest.eventReason) ? `<p class="eth-note">${esc(latest.eventReason)}</p>` : ''}`, 'mint');
    }
    return '';
  };
  // Tab hasil grouping → infotype hero mana yang tampil di atas tabel riwayat.
  const EMP_GROUP_HERO = { employment: ['positions', 'compensation', 'contracts'], 'insurance-final': ['insurance'], 'documents-final': ['documents'], 'emergency-final': ['emergency-contacts'] };

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

  // ── Pengkinian Identitas (IT-0002 Personal Data) ─────────────────────────
  const GENDER_LABEL = { MALE: 'Laki-laki', FEMALE: 'Perempuan' };
  const personalDataCard = (p, overview, canEdit) => {
    p = p || {};
    const has = ['nikKtp', 'birthDate', 'birthPlace', 'gender', 'maritalStatus', 'religion', 'bloodType', 'phone', 'personalEmail', 'address'].some((k) => p[k]);
    const age = p.birthDate ? Math.floor((Date.now() - new Date(p.birthDate).getTime()) / 31557600000) : null;
    const btn = canEdit ? `<button class="btn clay-action sm" data-identity-edit><span class="clay-ic" aria-hidden="true">${ICONS.people}</span> Pengkinian identitas</button>` : chip(has ? 'TERISI' : 'BELUM LENGKAP');
    if (!has) {
      return `<article class="panel emp-infotype it-lav"><header><div><p class="eyebrow">DATA PRIBADI · IT-0002 PERSONAL DATA</p><h2>Identitas diri</h2></div>${btn}</header><div class="panel-body"><div class="empty-inline">Data diri belum dilengkapi. Klik <b>Pengkinian identitas</b> untuk mengisi NIK KTP, tempat/tanggal lahir, dan kontak — sekali isi, dipakai lintas modul HR & payroll.</div></div></article>`;
    }
    const rows = [
      ['NIK KTP', esc(p.nikKtp || '—')],
      ['Tempat, tgl lahir', (p.birthPlace || p.birthDate) ? `${esc(p.birthPlace || '—')}${p.birthDate ? `, ${fmtDate(p.birthDate)}` : ''}${age != null ? ` · ${age} th` : ''}` : '—'],
      ['Jenis kelamin', esc(p.gender ? (GENDER_LABEL[p.gender] || p.gender) : '—')],
      ['Status perkawinan', esc(p.maritalStatus || '—')],
      ['Agama', esc(p.religion || '—')],
      ['Golongan darah', esc(p.bloodType || '—')],
      ['Telepon / HP', esc(p.phone || '—')],
      ['Email pribadi', esc(p.personalEmail || '—')],
      ['Alamat domisili', esc(p.address || '—')]
    ];
    return `<article class="panel emp-infotype it-lav"><header><div><p class="eyebrow">DATA PRIBADI · IT-0002 PERSONAL DATA</p><h2>Identitas diri</h2></div>${btn}</header><div class="panel-body"><dl class="detail-dl eth-dl">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl></div></article>`;
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

  // Quality flag → aksi cepat: loncat ke tab terkait atau buka Edit data dasar.
  const FLAG_ACTION = {
    POSITION_MISSING: { tab: 'employment', label: 'Lengkapi posisi' },
    BANK_UNVERIFIED: { tab: 'bank-accounts', label: 'Verifikasi rekening' },
    TAX_MISSING: { tab: 'tax-profiles', label: 'Lengkapi pajak' },
    DEPARTMENT_MISSING: { edit: true, label: 'Edit data dasar' },
    JOB_TITLE_MISSING: { edit: true, label: 'Edit data dasar' },
    BRANCH_ID_MISSING: { edit: true, label: 'Edit data dasar' },
    JOIN_DATE_MISSING: { edit: true, label: 'Edit data dasar' }
  };
  const employeeQualityPanel = (overview) => {
    const flags = Array.isArray(overview.qualityFlags) ? overview.qualityFlags : [];
    if (!flags.length) return '';
    const canEdit = can('employee.edit');
    const items = flags.map((f) => {
      const act = FLAG_ACTION[f.code], sev = String(f.severity || 'WARNING').toLowerCase();
      const btn = canEdit && act ? (act.edit ? `<button class="btn secondary sm" data-quality-edit>${esc(act.label)}</button>` : `<button class="btn secondary sm" data-quality-goto="${esc(act.tab)}">${esc(act.label)}</button>`) : '';
      return `<li class="eq-flag eq-${sev}"><span class="eq-dot" aria-hidden="true"></span><span class="eq-detail">${esc(f.detail || f.code)}</span>${btn}</li>`;
    }).join('');
    return `<article class="panel emp-infotype it-coral"><header><div><p class="eyebrow">DATA QUALITY · PERLU TINDAKAN</p><h2>${flags.length} isu data perlu ditindak</h2></div><span class="chip ${Number(overview.dataQualityScore) >= 80 ? 'mint' : Number(overview.dataQualityScore) >= 50 ? 'amber' : 'coral'}">Skor ${Math.round(Number(overview.dataQualityScore) || 0)}%</span></header><div class="panel-body"><ul class="eq-list">${items}</ul></div></article>`;
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
      const isParty = ['customers', 'suppliers'].includes(params.type);
      const isProduct = params.type === 'products';
      const isEmployee = params.type === 'employees';
      const hasPhoto = isParty || isProduct || isEmployee;
      const editBtn = EDIT_FIELDS[params.type] && can(`${cfg.module}.edit`) ? `<button class="btn primary" id="masterEditBtn">${ICONS.gear} Edit / Revisi</button>` : '';
      const identityBtn = isEmployee && can('employee.edit') ? `<button class="btn clay-action" data-identity-edit><span class="clay-ic" aria-hidden="true">${ICONS.people}</span> Pengkinian Identitas</button>` : '';

      main.innerHTML = pageHead({
        eyebrow: isParty ? `PARTY 360 · ${cfg.title.toUpperCase()}` : isProduct ? `PRODUCT 360 · ${cfg.title.toUpperCase()}` : isEmployee ? `EMPLOYEE 360 · ${cfg.title.toUpperCase()}` : `MASTER DATA · ${cfg.title.toUpperCase()}`, title: (isParty || isEmployee) ? `Profil ${cfg.title}` : (overview.name || overview.code || cfg.title),
        sub: isParty ? 'Identitas, commercial control, compliance, dan seluruh relasi operasional dalam satu workspace.' : isProduct ? 'Foto, spesifikasi, harga, dan riwayat dalam satu profil produk & jasa.' : isEmployee ? 'Identitas, kepegawaian, kompensasi, pajak PPh21, BPJS, dan tata kelola data dalam satu profil.' : `Status data: ${overview.lifecycleStatus || 'ACTIVE'} · versi ${overview.mdmVersion || 1}`,
        actions: `${identityBtn}${editBtn}<a class="btn secondary" href="${cfg.listRoute}">${ICONS.arrow} Kembali</a>${lifeBtns}`
      }) + `
        ${isParty ? partyIdentityHero(overview, params.type, can(`${cfg.module}.edit`)) : isProduct ? productIdentityHero(overview, can(`${cfg.module}.edit`)) : isEmployee ? employeeIdentityHero(overview, can(`${cfg.module}.edit`)) : ''}
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

      main.querySelector('[data-identity-edit]')?.addEventListener('click', () => openIdentityUpdate(params, overview, () => this.render(main, params)));

      const renderTab = async (tabId) => {
        this._tab = tabId;
        main.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
        const body = main.querySelector('#tabBody');
        const tab = cfg.tabs.find((t) => t.id === tabId);
        if (tabId === 'overview') {
          if (params.type === 'employees') {
            const s=overview.enterpriseSummary||{},pos=s.currentPosition||{},employment=s.employment||{},comp=s.compensation||{},tax=s.tax||{},sup=s.supervisor||{};
            const personal = await api(`${cfg.base}/${params.id}/personal`).then((r) => (r && r.items && r.items[0]) || (r && r.nikKtp !== undefined ? r : {})).catch(() => ({}));
            body.innerHTML=`${employeeQualityPanel(overview)}
              ${personalDataCard(personal, overview, can('employee.edit'))}
              <section class="dashboard-grid"><article class="panel"><header><div><p class="eyebrow">ORGANISASI & GARIS KOMANDO</p><h2>Penempatan &amp; atasan</h2></div>${chip(employment.employmentStatus||overview.lifecycleStatus||'ACTIVE')}</header><div class="panel-body stack"><div class="stat-row"><span>Atasan langsung</span><b>${sup.supervisorName?`${esc(sup.supervisorName)}${sup.supervisorTitle?` · ${esc(sup.supervisorTitle)}`:''}`:'Belum ditetapkan'}</b></div><div class="stat-row"><span>Bawahan langsung</span><b>${Number(s.directReports||0)} orang</b></div><div class="stat-row"><span>Grade</span><b>${esc(pos.salaryGrade||comp.salaryGrade||'—')}</b></div><div class="stat-row"><span>Tipe &amp; status kerja</span><b>${esc([employment.employmentType,employment.employmentStatus].filter(Boolean).join(' · ')||'—')}</b></div><div class="stat-row"><span>Lokasi kerja</span><b>${esc(pos.workLocation||overview.branchName||'—')}</b></div></div></article>
              <article class="panel tax-auto-panel"><header><div><p class="eyebrow">PAJAK OTOMATIS · PPh 21 TER</p><h2>PTKP &amp; TER (PP 58/2023)</h2></div>${can('employee.edit')?`<button class="btn primary sm" id="taxAutoBtn">${ICONS.gear} Hitung otomatis</button>`:''}</header><div class="panel-body"><div class="tax-auto-grid"><div><span>Status PTKP</span><b>${esc(tax.ptkpStatus||'—')}</b></div><div><span>Kategori TER</span><b>${esc(tax.terCategory||'—')}</b></div><div><span>Tarif TER / bln</span><b>${tax.terRate!=null&&tax.terRate!==''?Number(tax.terRate)+'%':'—'}</b></div><div><span>Gaji bruto / bln</span><b>${overview.baseSalary?fmtIDR(overview.baseSalary):'—'}</b></div></div></div></article></section>`;
            body.querySelector('#taxAutoBtn')?.addEventListener('click', async () => {
              const v = await formDialog({ title: 'Hitung pajak otomatis — PPh 21 TER', description: 'Sistem menetapkan status PTKP, kategori TER (A/B/C), dan tarif TER bulanan dari status kawin + tanggungan + gaji, lalu menyimpannya sebagai profil pajak baru.', fields: [
                { name: 'maritalStatus', label: 'Status kawin', type: 'select', options: [['BELUM KAWIN', 'Belum kawin (TK)'], ['KAWIN', 'Kawin (K)']], required: true },
                { name: 'dependents', label: 'Jumlah tanggungan (maks 3)', type: 'number', min: 0, max: 3, value: 0 },
                { name: 'monthlyGross', label: 'Gaji bruto / bln (kosongkan = gaji pokok)', type: 'number', min: 0 },
                { name: 'npwp', label: 'NPWP (opsional)' } ], submitLabel: 'Hitung & terapkan' });
              if (!v) return;
              try {
                const r = await api(`/api/masters/employees/${params.id}/tax-auto`, { method: 'POST', body: { ...v, apply: true } });
                toast('Pajak dihitung otomatis', `PTKP ${r.ptkpStatus} · TER ${r.terCategory} ${r.terRate}% · PPh21 ${fmtIDR(r.monthlyPph21)}/bln`);
                invalidate(`master:${params.id}`); this.render(main, params);
              } catch (error) { toast('Gagal menghitung pajak', error.message, 'coral'); }
            });
            body.querySelector('[data-identity-edit]')?.addEventListener('click', () => openIdentityUpdate(params, overview, () => this.render(main, params)));
            body.querySelectorAll('[data-quality-goto]').forEach((b) => b.addEventListener('click', () => renderTab(b.dataset.qualityGoto)));
            body.querySelectorAll('[data-quality-edit]').forEach((b) => b.addEventListener('click', () => main.querySelector('#masterEditBtn')?.click()));
            return;
          }
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
            const heroSubs = params.type === 'employees' ? (EMP_GROUP_HERO[tab.id] || []) : [];
            const groupHero = heroSubs.map((sub) => { const gi = groups.findIndex((g) => g.sub === sub); return gi >= 0 ? employeeTabHero(sub, (datasets[gi] && datasets[gi].items) || [], overview) : ''; }).join('');
            body.innerHTML = (groupHero ? `<div class="eth-hero-stack">${groupHero}</div>` : '') + groups.map((g, index) => {
              const items=datasets[index].items||[];
              return `<div class="panel table-panel"><header><div>${params.type==='employees'?'<p class="eyebrow">RIWAYAT & DATA</p>':`<p class="eyebrow">${esc(tab.label.toUpperCase())}</p>`}<h2>${esc(g.label)}</h2></div>${can(`${cfg.module}.edit`)&&g.form?`<button class="btn primary sm" data-group-add="${index}">${ICONS.plus} Tambah</button>`:''}</header><div class="table-wrap"><table><thead><tr>${g.cols.map(c=>`<th>${esc(c[1])}</th>`).join('')}${g.employeeApprove?'<th></th>':''}</tr></thead><tbody>${items.length?items.map(row=>`<tr>${g.cols.map(c=>`<td>${fmtCell(row,c)}</td>`).join('')}${g.employeeApprove?`<td class="right">${['PENDING_APPROVAL','PENDING_VERIFICATION'].includes(row[g.statusKey])&&can('employee.approve')?`<button class="btn secondary sm" data-employee-approve="${esc(row.id)}" data-resource="${esc(g.sub)}">Setujui</button>`:''}</td>`:''}</tr>`).join(''):`<tr><td colspan="${g.cols.length+1}"><div class="empty-state"><h3>Belum ada data</h3><p>Tambahkan ${esc(g.label.toLowerCase())} pertama.</p></div></td></tr>`}</tbody></table></div></div>`;
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
        const heroHtml = params.type === 'employees' ? employeeTabHero(tab.id, data.items, overview) : '';
        const tHead = heroHtml ? { e: 'RIWAYAT & PERUBAHAN', t: `Riwayat ${tab.label.toLowerCase()}` } : { e: cfg.title.toUpperCase(), t: tab.label };
        body.innerHTML = heroHtml + `<div class="panel table-panel"><header><div><p class="eyebrow">${esc(tHead.e)}</p><h2>${esc(tHead.t)}</h2></div><div class="panel-tools">${addBtn}</div></header>
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
