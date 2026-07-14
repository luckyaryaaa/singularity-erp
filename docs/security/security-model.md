# Model Keamanan MAT ERP V2

## Identity dan session

- Password: scrypt N=16384, salt acak, timing-safe comparison.
- Cookie session: token 256-bit, HttpOnly, SameSite=Strict, Secure di production.
- Token session dan CSRF hanya disimpan sebagai SHA-256.
- Idle timeout 60 menit; absolute timeout 8 jam; logout seluruh perangkat.
- Lockout 5 kegagalan selama 15 menit dan login rate limit terpisah.
- Password-change dan MFA challenge persisten, berlaku 5 menit, sekali pakai.
- TOTP RFC 6238; secret terenkripsi AES-256-GCM.

## Authorization dan proteksi request

- RBAC + ABAC untuk role, permission, branch, status, nominal, dan approval tier.
- Mutasi wajib CSRF serta pemeriksaan Origin.
- Void finansial dan aksi kritis membutuhkan PIN Owner serta alasan.
- CSP, frame deny, nosniff, referrer policy, dan permissions policy aktif.
- Audit append-only mencatat request ID, user, aksi, entity, nilai, alasan, IP.

## Credential operations

`npm.cmd run security:rotate-owner` menghasilkan secret langsung ke `.env`,
memperbarui hash PostgreSQL, menghapus challenge tertunda, mencabut sesi Owner,
dan tidak mencetak password. `.env` diabaikan Git dan tidak boleh dikirim.

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
- Partisi audit dibuat otomatis (tahun berjalan + 1) oleh fungsi SECURITY
  DEFINER; partisi DEFAULT menjamin transaksi tidak pernah gagal karena partisi.
- `npm run predeploy` adalah gerbang wajib: migrasi + tes + boot + health +
  kesegaran backup; deploy diblokir bila ada yang merah.
