# Sprint 8B — Enterprise UX & Delivery Foundation

## Keputusan arsitektur

- App shell, router, session, permission, workflow, dan rendering engine tetap
  tunggal. Tidak ada SPA kedua dan tidak ada microservice baru.
- Pemecahan monolith dilakukan melalui bounded module di bawah composition root.
  Seluruh domain mengikuti pola `dispatch(client, req, url, context)` dengan
  shared `NO_MATCH` sentinel; composition root menjaga transaction boundary,
  session, CSRF, rate limit, metrics, SSE, dan error mapping.
- Enterprise table menjadi komponen reusable dan tidak menyimpan business rule.
  Semua filter/sort/pagination tetap divalidasi serta dieksekusi server-side.

## Enterprise View Console

Setiap daftar dokumen mendapat pencarian, filter status, sorting, pagination,
saved view lokal maksimal 12, pilihan kolom, density nyaman/ringkas, serta query
state di URL. Baris dapat dibuka melalui tombol semantik dan header sort
mengumumkan `aria-sort`.

## Accessibility & visual quality gates

- `npm run test:a11y`: 18 kontrak landmark, focus, dialog, keyboard, live region,
  table semantics, reduced motion, dan anti-pattern CSS.
- `npm run test:visual`: browser Edge sungguhan, viewport 1440×1000 dan 390×844,
  Dashboard/Penawaran/Work Order/Approval, screenshot evidence di
  `storage/smoke`, page-overflow check, accessible-name check, dan console error.
- Kedua gate menjadi bagian `predeploy` sehingga kegagalan memblokir rilis.

## Asset delivery

`release:build` membuat nama content-hash 12 digit, `asset-manifest.json`, dan
sidecar `.br`/`.gz`. Runtime memilih Brotli lalu Gzip berdasarkan
`Accept-Encoding`; asset fingerprint memakai cache immutable satu tahun,
sedangkan `index.html` tetap `no-cache` agar rilis baru segera ditemukan.

## Modularization completion v0.14.0

| Layer | Sebelum | Sesudah | Domain module |
|---|---:|---:|---:|
| `src/pages.js` | 1.652 baris | 70 baris | 11 + My Work |
| `backend/api-postgres.js` | 372 baris | 66 baris | Auth + 11 domain |

Architecture test memblokir composition root di atas 100 baris, script domain
yang hilang/duplikat, route domain yang kembali ditulis di API root, serta
module backend tanpa dispatch contract.

## Batas status

v0.14.0 berstatus LOCAL BUILD READY. Ini bukan LAN-UAT READY atau PRODUCTION
READY. UAT pengguna, sign-off Owner, provisioning VPS, TLS/domain, dan aktivasi
produksi tetap mengikuti roadmap resmi.
