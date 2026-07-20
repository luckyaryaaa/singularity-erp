# Runbook Deployment dan Rollback MAT ERP V2

Dokumen ini berlaku setelah LAN-UAT, Owner sign-off, backup/restore drill, dan
gate aktivasi production disetujui. Memiliki domain/hosting tidak otomatis
memberi izin go-live; VPS tetap tahap terakhir.

## Prasyarat

1. Linux LTS, Node.js 20+, PostgreSQL 16, Caddy, dan UFW tersedia.
2. DNS subdomain ERP mengarah ke IP VPS. Set `MAT_ERP_DOMAIN` untuk Caddy.
3. PostgreSQL dan Node hanya listen di `127.0.0.1`; port publik hanya SSH,
   80, dan 443.
4. User/group `materp`, `/etc/mat-erp/mat-erp.env` (`root:materp`, `0640`),
   `/opt/mat-erp/releases`, dan `/var/lib/mat-erp` tersedia.
5. Environment production lolos guard, termasuk HTTPS public URL, signing
   key dokumen, MFA/scanner, database runtime dan migration URL terpisah.

Script CLI membaca file eksternal melalui `MAT_ENV_FILE`; file secret tidak
pernah di-`source` atau dieksekusi oleh shell.

## Release

```bash
npm ci
npm test
npm run predeploy
npm run release:build
sudo deploy/install-release.sh release/MAT-ERP-V2-RELEASE 0.22.0
```

Installer membuat backup sebelum migration, menjalankan migration/validation,
memasang dependency production, mengubah symlink `current` secara atomik,
restart service, dan memeriksa `/api/health`. Health check gagal mengembalikan
symlink kode ke release sebelumnya.

## Verifikasi pascadeploy

```bash
systemctl status mat-erp --no-pager
journalctl -u mat-erp -n 100 --no-pager
curl -fsS https://$MAT_ERP_DOMAIN/api/live
curl -fsS https://$MAT_ERP_DOMAIN/api/health
ss -ltnp | grep -E ':(5432|4173)'
ufw status verbose
```

Lakukan smoke login, permission lintas role, cetak/verifikasi satu dokumen
resmi, satu transaksi non-finansial, dan satu transaksi finansial terkontrol.

## Rollback

```bash
sudo deploy/rollback-release.sh <release-id-sebelumnya>
```

Rollback otomatis hanya memindahkan versi kode. Database tidak pernah di-down
secara otomatis karena berpotensi menghapus data. Bila incompatibility schema
terjadi, hentikan service, eskalasi ke DBA, dan gunakan backup tervalidasi serta
prosedur change-management. Simpan evidence waktu, operator, release checksum,
hasil health check, dan alasan rollback.
