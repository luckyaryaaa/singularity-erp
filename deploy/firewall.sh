#!/usr/bin/env bash
# Firewall VPS MAT ERP V2 (Ubuntu/Debian + ufw).
# Prinsip: hanya SSH (rate-limited) + HTTP/HTTPS yang terbuka.
# PostgreSQL (5432) dan aplikasi (4173) TIDAK PERNAH terekspos publik.
set -euo pipefail

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH dengan rate limit bawaan ufw (anti brute-force jaringan).
ufw limit OpenSSH

# Reverse proxy Caddy.
ufw allow 80/tcp
ufw allow 443/tcp

ufw --force enable
ufw status verbose

echo ""
echo "Verifikasi bind lokal (keduanya WAJIB 127.0.0.1, bukan 0.0.0.0):"
ss -ltnp | grep -E ':(5432|4173)' || echo "  (layanan belum berjalan)"
