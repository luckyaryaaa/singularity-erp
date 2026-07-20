#!/usr/bin/env bash
# Instalasi atomik paket MAT ERP V2. Tidak mengubah database/aplikasi lain.
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then echo "Jalankan sebagai root." >&2; exit 1; fi
SOURCE_DIR="${1:?Pemakaian: install-release.sh <release-directory> [release-id]}"
SOURCE_DIR="$(realpath "${SOURCE_DIR}")"
[[ -f "${SOURCE_DIR}/release-manifest.json" && -f "${SOURCE_DIR}/server.js" ]] || { echo "Paket release tidak valid." >&2; exit 1; }
[[ ! -e "${SOURCE_DIR}/.env" ]] || { echo "Paket release tidak boleh berisi .env." >&2; exit 1; }

APP_USER="${MAT_ERP_USER:-materp}"
APP_GROUP="${MAT_ERP_GROUP:-materp}"
APP_ROOT="/opt/mat-erp"
STATE_ROOT="/var/lib/mat-erp"
ENV_FILE="/etc/mat-erp/mat-erp.env"
RELEASE_ID="${2:-$(node -p "require('${SOURCE_DIR}/package.json').version")-$(date -u +%Y%m%d%H%M%S)}"
[[ "${RELEASE_ID}" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "release-id tidak aman." >&2; exit 1; }
TARGET="${APP_ROOT}/releases/${RELEASE_ID}"
[[ ! -e "${TARGET}" ]] || { echo "Release ${RELEASE_ID} sudah ada." >&2; exit 1; }
[[ -f "${ENV_FILE}" ]] || { echo "Environment file ${ENV_FILE} belum tersedia." >&2; exit 1; }

install -d -o root -g "${APP_GROUP}" -m 0750 "${APP_ROOT}/releases"
install -d -o "${APP_USER}" -g "${APP_GROUP}" -m 0750 "${STATE_ROOT}"
cp -a "${SOURCE_DIR}" "${TARGET}"
rm -rf "${TARGET}/storage"
ln -s "${STATE_ROOT}" "${TARGET}/storage"
chown -R root:"${APP_GROUP}" "${TARGET}"
chmod -R go-w "${TARGET}"

(cd "${TARGET}" && npm ci --omit=dev --ignore-scripts)

# Jangan source file secret lewat shell. Parser aplikasi membaca KEY=VALUE
# secara literal melalui MAT_ENV_FILE sehingga $, #, !, dan simbol lain aman.
runuser -u "${APP_USER}" -- env MAT_ENV_FILE="${ENV_FILE}" bash -c "cd '${TARGET}' && node scripts/backup-postgres.js run"
runuser -u "${APP_USER}" -- env MAT_ENV_FILE="${ENV_FILE}" bash -c "cd '${TARGET}' && node scripts/db.js migrate && node scripts/db.js validate"
env MAT_ENV_FILE="${ENV_FILE}" node "${TARGET}/scripts/grant-runtime.js"

PREVIOUS="$(readlink -f "${APP_ROOT}/current" 2>/dev/null || true)"
ln -sfn "${TARGET}" "${APP_ROOT}/current.next"
mv -Tf "${APP_ROOT}/current.next" "${APP_ROOT}/current"
systemctl restart mat-erp

if ! curl --fail --silent --show-error --max-time 15 http://127.0.0.1:4173/api/health >/dev/null; then
  if [[ -n "${PREVIOUS}" && -d "${PREVIOUS}" ]]; then ln -sfn "${PREVIOUS}" "${APP_ROOT}/current"; systemctl restart mat-erp; fi
  echo "Health check gagal; symlink kode dikembalikan ke release sebelumnya." >&2
  exit 1
fi

echo "Release aktif: ${RELEASE_ID}"
echo "Release sebelumnya: ${PREVIOUS:-tidak ada}"
