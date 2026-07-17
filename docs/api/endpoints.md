# API MAT ERP V2

Semua endpoint berada di `/api`. Sesi memakai cookie HttpOnly `mat_session`.
Mutasi wajib `X-CSRF-Token`; operasi kritis wajib `Idempotency-Key`. Error
selalu berbentuk `{ code, message, detail? }`.

## Publik (tanpa autentikasi)

- `GET /api/live` — liveness: proses hidup, tanpa menyentuh database.
- `GET /api/health` — readiness: termasuk cek database; untuk uptime monitor
  dan load balancer; hanya `{ ok, db, at }`, dibatasi rate limit per IP;
  503 bila database tumbang.

## Ruang kerja (Sprint 8B)

- `GET /api/my-work` — inbox lintas modul (§10.7): menunggu persetujuan saya,
  dibuat saya yang masih berjalan, dikembalikan untuk revisi, dokumen jatuh
  tempo (ber-scope cabang), job gagal, notifikasi perlu tindakan.
- `GET /api/approvals` — Approval Center 2.0 (§10.8): tiap item kini menyertakan
  `policyVersion` (versi snapshot kebijakan approval) dan `credit` (hold,
  limit, exposure, projected, overLimit) untuk dokumen pelanggan.

## Auth

- `POST /api/auth/login`
- `POST /api/auth/mfa`
- `POST /api/auth/change-password-required`
- `POST /api/auth/change-password`
- `POST /api/auth/mfa/setup`
- `POST /api/auth/mfa/enable`
- `POST /api/auth/mfa/disable`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`
- `GET /api/auth/session`
- `GET /api/auth/devices`

## Workspace dan transaksi

- `GET /api/dashboard`
- `GET /api/approvals`
- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `GET|POST /api/documents`
- `GET|PATCH /api/documents/:id`
- `POST /api/documents/:id/action`
- `POST /api/documents/:id/convert`

Aksi dokumen: `submit`, `approve`, `reject`, `revise`, `start`, `complete`,
`close`, `cancel`, dan `void` sesuai status serta permission modul.

## Master, ringkasan, dan sistem

- `GET|POST /api/customers|suppliers|products|employees`
- `PATCH /api/customers|suppliers|products|employees/:id`

### Master data enterprise (R014/R015)

- `GET /api/masters/{employees|customers|suppliers|products}/:id` — overview + subCounts
- `POST /api/masters/{master}/:id/lifecycle` — `{action, reason?}` DRAFT→…→ARCHIVED
- `GET|POST /api/masters/{master}/:id/{sub}` — sub-resource per tab (kontak, alamat,
  kontrak, kompensasi ber-izin payroll, pajak, BPJS, bank, dokumen, dst.)
- `POST /api/masters/suppliers/:id/bank-accounts/:bankId/approve` — maker-checker (SoD)
- `POST /api/masters/products/:id/cost-revisions/:revId/{review|approve|lock|activate}` — HPP versioning; activate menjadikan Active HPP + snapshot `products.hpp`
- `POST /api/masters/products/:id/bom/:bomId/{review|approve|effective}` — BOM revision
- `GET /api/master-governance/quality` — quality scan + issue prioritas empat master
- `POST /api/master-governance/quality/scan` — jalankan ulang quality rules (settings.edit)
- `GET /api/master-governance/currencies` — currency registry aktif
- `GET|POST /api/master-governance/exchange-rates` — kurs effective-dated dan audit
- `GET /api/master-governance/products/:id/cost-trace` — trace BOM × Active HPP
- `GET|POST /api/masters/products/:id/variants` — normalized product variant matrix
- `GET /api/master-wizards/customer-link/sources` — sumber Inquiry/Quotation/PO pelanggan/SO/Project yang dapat ditautkan
- `GET /api/master-wizards/customer-link/candidates` — kandidat customer existing berdasarkan source/search
- `GET /api/master-wizards/customer-link/recover` — recovery draft aktif milik pengguna (retensi 30 hari)
- `POST /api/master-wizards/customer-link` — mulai draft Customer Link server-side
- `PATCH /api/master-wizards/customer-link/:id` — autosave payload/step dengan optimistic `version`
- `POST /api/master-wizards/customer-link/:id/abandon` — tinggalkan draft secara eksplisit
- `POST /api/master-wizards/customer-link/:id/finalize` — finalisasi existing/new customer; wajib `Idempotency-Key`
- `GET|POST /api/master-governance/suppliers/:id/performance` — lihat atau hitung ulang score/evidence/hold/histori periode
- `POST /api/master-governance/suppliers/score` — batch scoring supplier
- `POST /api/masters/suppliers/:id/documents/:documentId/{verify|reject}` — maker-checker dokumen supplier

Masking server-side: nomor rekening & gaji tertutup bila peran tanpa izin
finance/payroll. Harga supplier append-only (revisi bertambah, tidak menimpa).
- `GET /api/inventory`

### Inventory enterprise — lot/heat & stock opname (R018, Sprint 11)

- `GET /api/inventory/lots` — daftar lot (filter productId/warehouseId/status/search
  lot/heat/cert; ber-scope cabang)
- `GET /api/inventory/lots/:id` — detail + mutasi + silsilah dua arah (ancestry/children)
- `POST /api/inventory/lots/:id/{block|quarantine|release}` — QC hold ber-alasan;
  lot terblokir dilewati pemilihan FIFO
- `GET /api/inventory/valuation` — valuasi per produk×gudang (saldo agregat + lapisan lot)
- `POST /api/inventory/opname` — buat sesi opname (dokumen `STOCK_OPNAME`, nomor OPN,
  snapshot qty per lot + sisa tanpa lot; satu sesi berjalan per gudang)
- `GET /api/inventory/opname/:docId/lines` — baris + variance
- `POST /api/inventory/opname/:docId/counts` — isi hasil hitung (hanya DRAFT/REVISION;
  amount dokumen = nilai selisih absolut → eskalasi matriks approval otomatis)

Alur opname: hitung → submit → approve (checker ≠ maker via SoD) → penyesuaian
saldo + lot otomatis dan selisih dijurnal via posting profile `OPNAME-DEFAULT`
(GAIN → 1300/4250, LOSS → 6150/1300). Lot lahir otomatis dari Goods Receipt
(heat number/mill cert dari baris GR); Material Issue konsumsi FIFO; Stock
Transfer melahirkan lot anak yang mewarisi heat/biaya (lineage `parent_lot_id`).

### Production, Quality & MRP (R019, Sprint 12)

- `GET /api/work-orders/:id/production` — cockpit routing, material, issue,
  finished receipt, dan job costing aktual.
- `POST /api/work-orders/:id/plan` — ledakan BOM + reservasi; body wajib
  `warehouseId` dan `operations[]`.
- `POST /api/work-orders/:id/issue-materials` — membuat draft Material Issue.
- `POST /api/work-orders/:id/finish` — final costing dan draft Goods Receipt
  barang jadi setelah seluruh operasi/material selesai.
- `POST /api/work-orders/:id/release-reservations` — melepas sisa reservasi.
- `GET /api/production/stock-locations` dan `GET /api/production/work-centers`
  — pilihan yang sudah dibatasi scope cabang.
- `POST /api/production/operations/:id/time|complete` — actual time append-only
  (koreksi negatif wajib alasan) dan penyelesaian operasi.
- `GET|POST /api/quality/:qcDocId/inspections` — inspeksi, NCR, CAPA, dan
  karantina lot otomatis.
- `POST /api/mrp/run`, `GET /api/mrp/suggestions`, dan
  `POST /api/mrp/suggestions/:id/convert` — netting MRP dan konversi PR.

Seluruh endpoint `POST` di atas wajib memakai `Idempotency-Key`; CSRF, role,
branch scope, status dokumen, dan prerequisite completion divalidasi server.
- `GET /api/accounting/summary`
- `GET /api/accounting/accounts`
- `GET /api/accounting/posting-profiles` — determinasi akun configuration-driven (§18.2)
- `GET /api/accounting/payroll-rules` — tarif payroll effective-dated (§19.5)
- `GET /api/accounting/ledger`
- `GET /api/accounting/reconciliation`
- `POST /api/accounting/period/close`
- `POST /api/accounting/period/reopen` — Owner + PIN + alasan
- `POST /api/payments/allocate`
- `GET /api/tax/summary`
- `POST /api/tax/sync`
- `POST /api/tax/records/:id/report`
- `GET|POST /api/hr/attendance`
- `GET /api/hr/leave-balances`
- `POST /api/payroll/runs`
- `GET /api/payroll/runs/:id/items`
- `GET /api/payroll/my` — hanya data employee yang sedang login
- `GET /api/audit`
- `GET /api/governance/roles`
- `GET|POST /api/governance/assignments`
- `POST /api/governance/assignments/:id/{approve|reject|revoke}` — maker-checker; Owner approval/revoke memakai PIN
- `GET /api/governance/sod`
- `GET|POST /api/governance/overrides` — emergency access Owner + PIN, maksimum 24 jam
- `GET|POST /api/governance/approval-policies`
- `POST /api/governance/approval-policies/:id/activate` — checker berbeda dan overlap guard
- `GET|POST /api/governance/access-reviews`
- `GET /api/governance/access-reviews/:id`
- `POST /api/governance/access-reviews/items/:id/decide`
- `POST /api/governance/access-reviews/:id/complete`
- `GET /api/organization` — profil legal entity + skor kelengkapan + jumlah hierarchy
- `PATCH /api/organization/:id` — identitas versioned, Owner + PIN + alasan
- `GET /api/organization/:id/hierarchy`
- `GET|POST /api/organization/:id/{assets|signatories|tax-identities|bank-accounts}`
- `POST /api/organization/:id/bank-accounts/:bankId/{approve|reject}` — Owner PIN + MFA terbaru + maker ≠ checker
- `GET /api/masters/employees/:id/audit`
- `POST /api/masters/employees/:id/{bank-accounts|compensation}/:rowId/{approve|reject}` — maker-checker employee
- `GET|POST /api/jobs`
- `GET /api/artifacts`
- `GET /api/artifacts/:id` — unduhan privat milik pemohon
- `GET|POST /api/files`
- `GET|DELETE /api/files/:id`
- `GET /api/system/users|settings|monitoring|self-test`
- `PATCH /api/system/settings/company` — compatibility facade ke Organization Master; rekening wajib melalui maker-checker
- `POST /api/system/users/:id/reset-password`
- `GET /api/events` — SSE terautentikasi

## Sprint 9 — Order-to-Cash completion (R016)

- `POST /api/quotations/:id/revise` — bekukan keadaan sekarang ke
  `quotation_revisions` (immutable), dokumen kembali DRAFT dengan revisionNo
  naik, approval di-reset; penawaran yang sudah dikonversi ditolak
- `GET /api/quotations/:id/revisions` — histori revisi + delta nilai
- `POST /api/collection/dunning/run` — pindai invoice jatuh tempo, terbitkan
  notice per jenjang `dunning_policies` (idempoten per invoice per level);
  level CREDIT_HOLD otomatis menahan kredit pelanggan ber-alasan
- `GET /api/collection/dunning` — notice terbuka + ringkasan outstanding
- `POST /api/collection/dunning/:id/resolve` — selesaikan ber-alasan
- `POST /api/rma` — buat RMA/klaim garansi dari Delivery/Invoice; garansi
  divalidasi `products.warranty_months` sejak tanggal dokumen sumber; saat
  COMPLETED: disposisi RESTOCK menghidupkan stok + lot retur (`/R{n}`), nilai
  kredit dijurnal via posting profile `RMA-DEFAULT` (D 4110 / C 1200)

## Sprint 14 — HR: shift, kalender, koreksi, akrual cuti (R021)

- `GET /api/hr/shifts` — shift configuration-driven; jam standar lembur
  payroll mengikuti shift roster per tanggal (default NORMAL 8 jam efektif)
- `GET|POST /api/hr/roster` — penetapan shift massal per karyawan per hari
- `GET|POST /api/hr/calendar` — hari libur (global/cabang) + aturan akhir
  pekan dari hr_calendar_config
- `GET|POST /api/hr/corrections` — koreksi absensi ber-workflow: nilai lama
  dibekukan; karyawan hanya boleh mengoreksi absensinya sendiri
- `POST /api/hr/corrections/:id/{approve|reject}` — pemutus ≠ pemohon (SoD,
  CHECK database); approve menulis attendance source=CORRECTION
- `POST /api/hr/leave-accrual/run` — akrual cuti bulanan dari leave_policies
  (days_per_year/12; masa kerja ≥ min_service_months), idempoten per
  karyawan per periode, jejak append-only
- `LEAVE_REQUEST`: submit memvalidasi payload.startDate/endDate + saldo
  (durasi = HARI KERJA dari kalender); approve penuh memotong saldo
  (idempoten, tercatat payload.leaveApplied)

## Sprint 13 — Finance: aset tetap, laporan, cockpit (R020)

- `GET|POST /api/assets` — registry aset tetap (nomor FA-YYYY-####); umur
  manfaat & akun jurnal dari `asset_categories` (configuration-driven §35)
- `GET /api/assets/categories`
- `POST /api/assets/depreciation/run` — penyusutan garis lurus per periode,
  idempoten per aset per periode; satu jurnal sistem JRN-* per run
  (D beban penyusutan / C akumulasi per kategori); aset habis umur otomatis
  FULLY_DEPRECIATED
- `POST /api/assets/:id/dispose` — pelepasan ber-alasan; nilai buku dihitung
  sistem dan dijurnal otomatis (hapus perolehan + akumulasi, sisa ke 7100)
- `GET /api/accounting/financial-statements?period=` — neraca (kumulatif s/d
  periode; akun kontra bertanda negatif sesuai sifat kategori sehingga
  identitas aset = kewajiban + ekuitas terjaga) + laba rugi periode
- `GET /api/accounting/closing-cockpit?period=` — checklist siap-tutup:
  trial balance, dokumen belum posting, rekonsiliasi bank/inventori/payroll/
  pajak, penyusutan, subledger AR/AP, tunggakan kritis → readiness
  READY/REVIEW/BLOCKED
- `GET /api/accounting/subledger?type=AR|AP&period=` — outstanding per relasi
  (dokumen terposting, alokasi reversed dikecualikan) vs saldo GL 1200/2100 +
  selisih terukur

## Sprint 10 — Source-to-Pay completion (R017)

- `GET|POST /api/procurement/budgets` — anggaran per periode (YYYY-MM) per
  cabang (NULL = global); submit PR/PO yang melampaui anggaran ditolak
  `409 BUDGET_EXCEEDED` kecuali `budgetOverrideReason` (izin budget.approve,
  teraudit). Tanpa baris anggaran = tidak ada pemeriksaan.
- RFQ multi-baris: `POST /api/rfq/:id/quotes` menerima `lines[]`
  ({description,qty,uom,unitPrice}); total harga dihitung server dari baris,
  respons `GET` menyertakan `lines` per kuota + `lineComparison` (termurah per
  item); PO hasil konversi menyalin baris kuota terpilih.
- `GET|POST /api/purchase-orders/:id/change-orders` — amendemen PO ber-versi
  (snapshot nilai & baris lama immutable); diblokir setelah ada GR selesai.
- `POST /api/purchase-orders/change-orders/:id/{approve|reject}` — pemutus ≠
  pemohon (SoD, juga CHECK di database); approve menerapkan nilai+baris baru.
- Service receipt: `GOODS_RECEIPT` dengan `payload.receiptType='SERVICE'` —
  saat COMPLETED dicatat sebagai bukti penerimaan (three-way match) tanpa
  mutasi stok/lot.
- `POST /api/payments/:id/reverse` — pembalikan pembayaran: Owner + PIN +
  alasan; jurnal pembalik (D/C ditukar) diposting ke periode terbuka, alokasi
  ditandai reversed (histori utuh), status invoice dihitung ulang, dokumen
  pembayaran menjadi VOID. Idempoten.

## Wave 2 — Source-to-Pay & credit control

- `GET /api/credit/:customerId` — status kredit (hold, limit, eksposur, sisa plafon)
- `POST /api/documents/:id/credit-override` — override kredit (finance, ber-alasan)
- `GET|POST /api/rfq/:id/quotes` — daftar/tambah kuota supplier (landed cost otomatis)
- `POST /api/rfq/:id/quotes/:quoteId/select` — pilih supplier (ber-alasan, audit)
- `POST /api/rfq/:id/create-po` — konversi RFQ terpilih → Purchase Order (idempoten)
- `GET|POST /api/supplier-invoices/:id/match` — three-way match (PO vs GR vs invoice)
- `POST /api/payment-proposals` — buat batch usulan pembayaran tagihan jatuh tempo
- `GET /api/payment-proposals/:id/lines` — baris usulan (rekening belum verifikasi ditahan)

Kontrol otomatis: submit SO/Invoice diblokir `409 CREDIT_HOLD` bila pelanggan
hold/over-limit tanpa override; approve Supplier Invoice diblokir `409 MATCH_FAILED`
bila three-way match EXCEPTION tanpa `matchOverrideReason`.

Job Sprint 4: `IMPORT_CSV`, `RECONCILIATION`, `PAYROLL_SLIPS`,
`REPORT_GENERATE`, `EXPORT_EXCEL`, `GENERATE_PDF`, dan `BACKUP_RUN`.

Rate limit: read 120/menit, write 30/menit, login 5/15 menit per akun+IP,
export 3/menit. HTTP 429 menyertakan `Retry-After`. Baseline dapat dituning
per lingkungan via env `MAT_RATE_READ_PER_MIN`, `MAT_RATE_WRITE_PER_MIN`,
`MAT_RATE_LOGIN_PER_15MIN`, `MAT_RATE_PDF_PER_MIN`, `MAT_RATE_EXPORT_PER_MIN`.
