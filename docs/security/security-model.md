# Model Keamanan MAT ERP V2

## Identity dan session

- Password: scrypt N=16384, salt acak, timing-safe comparison.
- Cookie session: token 256-bit, HttpOnly, SameSite=Strict, Secure di production.
- Token session dan CSRF hanya disimpan sebagai SHA-256.
- Idle timeout 60 menit; absolute timeout 8 jam; logout seluruh perangkat.
- Lockout 5 kegagalan selama 15 menit dan login rate limit terpisah.
- Password-change login challenge berlaku 5 menit; tautan reset terkontrol
  berlaku 30 menit. Keduanya sekali pakai dan hanya disimpan sebagai hash.
- TOTP RFC 6238; secret terenkripsi AES-256-GCM. Sepuluh recovery code
  diterbitkan saat enrollment/regenerasi, disimpan SHA-256, dan sekali pakai.
- `last_seen_at` ditulis maksimal sekali per 5 menit; perubahan IP/perangkat
  disimpan sebagai risk flag. Rotasi CSRF mempertahankan hash sebelumnya selama
  10 menit agar beberapa tab aktif tidak menghasilkan false 403.
- Perubahan password, role, status akun, atau postur MFA mencabut sesi sesuai
  policy. Perubahan faktor mengirim notifikasi keamanan.
- Reset Owner server-only. Reset administrator memakai maker-checker
  Security Admin/Owner → Owner dengan MFA terbaru dan SoD maker ≠ checker.

## Authorization dan proteksi request

- RBAC + ABAC untuk role, permission, branch, status, nominal, dan approval tier.
- Mutasi wajib CSRF serta pemeriksaan Origin.
- Void finansial dan aksi kritis membutuhkan PIN Owner serta alasan.
- CSP, frame deny, nosniff, referrer policy, dan permissions policy aktif.
- Audit append-only mencatat request ID, user, aksi, entity, nilai, alasan, IP.
- Forwarded IP/protocol/host hanya diterima dari `MAT_TRUSTED_PROXIES` yang
  mendukung exact IP dan IPv4 CIDR; spoofing dari peer lain diabaikan.
- Scope organisasi baku: GLOBAL, LEGAL_ENTITY, BUSINESS_UNIT, BRANCH, PLANT,
  WAREHOUSE, DEPARTMENT, PROJECT, dan OWN_RECORD. Snapshot scope ikut disimpan
  pada policy job; report/export/file difilter kembali di worker/repository.
- Matriks endpoint terversi di `docs/security/endpoint-authorization-matrix.md`
  memetakan 14 router dan 324 handler ke public/session/permission control.
  Automated negative test memverifikasi allow/deny dan menjaga endpoint publik
  tetap menggunakan allowlist eksplisit.

## Enterprise IAM, SoD, dan access review (v0.9.0)

- 13 role enterprise dipisahkan antara executive, platform, control, business,
  dan self-service. System Admin tidak dapat posting transaksi; Security Admin
  tidak dapat menjalankan fungsi finance; Auditor bersifat read/export only.
- Perubahan role langsung pada user ditolak API. Security Admin mengusulkan
  assignment dan checker berbeda menyetujui; sesi dicabut setelah perubahan.
- Assignment primary aktif dan effective-dated adalah sumber otorisasi login
  serta sesi. Assignment kedaluwarsa ditandai EXPIRED dan sesi berakhir dengan
  alasan `access_expired`.
- SoD rule engine memblokir role konflik dan creator=approver. Emergency access
  hanya Owner + PIN + alasan, scoped, maksimal 24 jam, dan selalu diaudit.
- Access review menyimpan snapshot assignment serta keputusan retain/revoke.
  Review hanya dapat selesai setelah seluruh item diputuskan.
- Approval policy ber-versi memakai maker-checker dan overlap guard; snapshot
  policy pada dokumen menjaga bukti approval historis.

## Credential operations

`npm.cmd run security:rotate-owner` menghasilkan secret langsung ke `.env`,
memperbarui hash PostgreSQL, menghapus challenge tertunda, mencabut sesi Owner,
dan tidak mencetak password. `.env` diabaikan Git dan tidak boleh dikirim.

Untuk rotasi lengkap gunakan `npm.cmd run security:rotate-runtime`. Perintah ini
merotasi password Owner/UAT, password role aplikasi PostgreSQL, kunci MFA, dan
kunci backup, mencabut sesi/challenge, serta mempertahankan kunci backup lama
hanya sementara untuk pemulihan arsip. Nilai secret tidak pernah masuk log.

## File dan background job (v0.8.0)

- File baru selalu `QUARANTINED`; download hanya tersedia setelah status CLEAN.
- Signature/MIME, ukuran, archive bomb, checksum, pola EICAR, dan engine malware
  diperiksa. Production menolak scanner builtin.
- Job berjalan QUEUED → CLAIMED → RUNNING → SUCCEEDED, dengan heartbeat,
  deadline, exponential backoff, retry/cancel manual, dan DEAD_LETTER.
- Registry per jenis job membatasi role/permission, scope, MFA/PIN, concurrency,
  jumlah baris, timeout, jumlah percobaan, serta retensi artifact.

PostgreSQL hanya listen di `127.0.0.1:5432`; akses remote wajib melalui lapisan
aplikasi dan VPN/zero-trust, bukan port forwarding database.

## Ketahanan operasional (v0.6.0)

- Runtime menolak menyala tanpa `MAT_DB_MODE=postgres` (fail-fast; adapter
  in-memory butuh `MAT_ALLOW_MEMORY_RUNTIME=1` eksplisit dan hanya untuk demo).
- Backup 3-2-1: dump lokal + salinan offsite terenkripsi AES-256-GCM
  (`MAT_BACKUP_OFFSITE_DIR` + `MAT_BACKUP_ENCRYPTION_KEY`, kunci scrypt),
  retensi 14 salinan; pemulihan offsite via `npm run backup:decrypt`.
  Simpan kunci enkripsi backup di dua lokasi aman terpisah.
- Alert webhook (`MAT_ALERT_WEBHOOK_URL`) untuk backup/restore/maintenance
  partisi/job backup yang gagal — anti-spam 5 menit per kunci alert.
- Partisi audit (tahun berjalan + 1) dan inventory (bulan berjalan + ke depan)
  dibuat oleh fungsi SECURITY DEFINER terkontrol; partisi DEFAULT menjamin
  transaksi tidak gagal karena partisi, sedangkan role runtime tidak memiliki
  hak CREATE schema/table.
- `npm run predeploy` adalah gerbang wajib: migrasi + tes + boot + health +
  kesegaran backup; deploy diblokir bila ada yang merah.
