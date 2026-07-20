#!/usr/bin/env bash
# Rollback atomik kode. Migrasi database TIDAK diturunkan otomatis karena
# down-migration produksi berisiko kehilangan data; gunakan prosedur DBA.
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then echo "Jalankan sebagai root." >&2; exit 1; fi
RELEASE_ID="${1:?Pemakaian: rollback-release.sh <release-id>}"
[[ "${RELEASE_ID}" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "release-id tidak aman." >&2; exit 1; }
APP_ROOT="/opt/mat-erp"
TARGET="$(realpath "${APP_ROOT}/releases/${RELEASE_ID}")"
[[ "${TARGET}" == "${APP_ROOT}/releases/"* && -f "${TARGET}/release-manifest.json" ]] || { echo "Release target tidak valid." >&2; exit 1; }

CURRENT="$(readlink -f "${APP_ROOT}/current" 2>/dev/null || true)"
ln -sfn "${TARGET}" "${APP_ROOT}/current.next"
mv -Tf "${APP_ROOT}/current.next" "${APP_ROOT}/current"
systemctl restart mat-erp

if ! curl --fail --silent --show-error --max-time 15 http://127.0.0.1:4173/api/health >/dev/null; then
  if [[ -n "${CURRENT}" && -d "${CURRENT}" ]]; then ln -sfn "${CURRENT}" "${APP_ROOT}/current"; systemctl restart mat-erp; fi
  echo "Rollback gagal health check; release awal dipulihkan." >&2
  exit 1
fi

echo "Rollback kode berhasil ke ${RELEASE_ID}. Database tidak diubah."
