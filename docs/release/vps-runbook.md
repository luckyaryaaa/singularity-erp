# Runbook Go-Live VPS — MAT ERP V2

Prinsip: **VPS baru diaktifkan setelah seluruh gerbang lokal hijau** —
`npm run predeploy` lulus, UAT selesai, dan runbook ini dibaca sampai habis.
Estimasi eksekusi runbook: 60–90 menit.

Spesifikasi VPS minimum: Ubuntu 22.04/24.04 LTS, 2 vCPU, 2–4 GB RAM,
40 GB SSD. Yang dibutuhkan: 1 domain/subdomain (A record → IP VPS).

---

## Fase 0 — Sebelum menyewa/mengaktifkan VPS (di lokal)

```powershell
npm.cmd run predeploy         # WAJIB hijau semua
npm.cmd run backup:run        # backup segar + salinan offsite terenkripsi
```

Siapkan di catatan aman (password manager):
- password owner produksi baru (bukan yang dipakai development);
- `MAT_MFA_ENCRYPTION_KEY` baru (32+ karakter acak, khusus produksi);
- `MAT_BACKUP_ENCRYPTION_KEY` baru (khusus produksi — simpan di 2 tempat;
  tanpa kunci ini salinan offsite TIDAK bisa dipulihkan);
- password PostgreSQL `mat_erp_app` + superuser produksi.

## Fase 1 — Provisioning dasar VPS

```bash
adduser materp && usermod -aG sudo materp
# SSH: hanya key-based
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh
apt update && apt -y upgrade
apt -y install ufw fail2ban git curl
# Node.js 20 LTS (NodeSource) + PostgreSQL 16 + Caddy — ikuti dokumentasi resmi masing-masing
bash deploy/firewall.sh            # deny-all kecuali SSH(limit)/80/443
systemctl enable --now fail2ban
```

## Fase 2 — PostgreSQL

```bash
# listen_addresses = 'localhost' (default) — JANGAN diubah ke '*'
sudo -u postgres psql -c "ALTER USER postgres PASSWORD '<superuser-baru>';"
```

Set journald agar log tidak memenuhi disk: `/etc/systemd/journald.conf`
→ `SystemMaxUse=500M`, lalu `systemctl restart systemd-journald`.

## Fase 3 — Deploy aplikasi

```bash
mkdir -p /opt/mat-erp && chown materp:materp /opt/mat-erp
sudo -u materp git clone <url-repo-privat> /opt/mat-erp   # atau rsync dari lokal
cd /opt/mat-erp && sudo -u materp npm ci --omit=dev

mkdir -p /etc/mat-erp
cp .env.example /etc/mat-erp/mat-erp.env
chmod 600 /etc/mat-erp/mat-erp.env && chown materp:materp /etc/mat-erp/mat-erp.env
# Edit /etc/mat-erp/mat-erp.env:
#   NODE_ENV=production   MAT_DB_MODE=postgres   MAT_DEMO_MODE=0
#   seluruh password/kunci = nilai PRODUKSI baru dari Fase 0
#   MAT_BACKUP_OFFSITE_DIR=/mnt/offsite/backups   (mount NAS/object storage)
#   MAT_ALERT_WEBHOOK_URL=<webhook Telegram/Slack/n8n>

node scripts/provision-db.js          # buat database + role least-privilege
npm run db:migrate && npm run db:validate
node scripts/seed-postgres-uat.js     # user & master data awal produksi
npm run security:rotate-owner         # password owner final, sesi lama dicabut
```

## Fase 4 — Layanan & HTTPS

```bash
cp deploy/mat-erp.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now mat-erp
curl -s http://127.0.0.1:4173/api/health        # {"ok":true,"db":"up"}

cp deploy/Caddyfile /etc/caddy/Caddyfile        # ganti domain terlebih dahulu
systemctl reload caddy
curl -s https://erp.<domain>/api/health         # HTTPS + sertifikat otomatis
```

## Fase 5 — Gerbang rilis produksi

1. `npm run predeploy` **di VPS** — semua hijau.
2. Login owner → Sistem → Self test: gerbang rilis terbuka.
3. `npm run backup:run && npm run backup:restore-test` di VPS — sukses +
   salinan offsite terbentuk.
4. Uji alert: hentikan PostgreSQL sebentar → webhook alert masuk → nyalakan lagi.
5. Daftarkan `https://erp.<domain>/api/health` ke uptime monitor eksternal
   (UptimeRobot/BetterStack — interval 1–5 menit).
6. Smoke manual per role: login, satu approve, satu upload, satu ekspor.

## Fase 6 — Serah terima

- Simpan URL, akun owner, prosedur reset sandi di dokumen internal.
- Jadwalkan restore drill bulanan (kalender ops) — backup tanpa drill = tidak valid.
- Simpan `MAT_BACKUP_ENCRYPTION_KEY` di dua lokasi aman terpisah.

---

## Rollback

**Rilis kode bermasalah** (data aman):
```bash
cd /opt/mat-erp && sudo -u materp git log --oneline -5
sudo -u materp git checkout <commit-stabil-sebelumnya>
sudo -u materp npm ci --omit=dev && systemctl restart mat-erp
curl -s http://127.0.0.1:4173/api/health
```

**Migrasi bermasalah** (butuh pemulihan data):
```bash
systemctl stop mat-erp                       # hentikan write
ls storage/backups/                          # pilih dump terakhir yang baik
# uji dulu ke DB temporer:
npm run backup:restore-test
# bila valid, restore ke DB utama:
pg_restore --clean --if-exists --no-owner --no-acl \
  -h 127.0.0.1 -U mat_erp_app -d mat_erp_v2_dev storage/backups/<file>.dump
npm run db:validate && systemctl start mat-erp
```

**Pulihkan dari salinan offsite** (disk utama hancur):
```bash
npm run backup:decrypt -- /mnt/offsite/backups/<file>.dump.enc /tmp/pulih.dump
pg_restore --no-owner --no-acl -h 127.0.0.1 -U mat_erp_app -d <db-baru> /tmp/pulih.dump
```

Setiap rollback dicatat: waktu, penyebab, commit/dump yang dipakai, dan
verifikasi pasca-pemulihan (self-test + smoke login).
