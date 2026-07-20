# SOP-02 — Weekly Performance & Security Review

## Tujuan

Menemukan degradasi performa dan pola keamanan sebelum menjadi insiden.

## Pemilik dan frekuensi

System Administrator bersama Security Administrator; mingguan.

## Prosedur

1. Tinjau p50/p95 API, pool active/idle, slow query, job retry, dan pertumbuhan
   storage dibanding minggu sebelumnya.
2. Jalankan `npm.cmd run load:smoke` dan `npm.cmd run load:lan` di luar jam sibuk.
3. Tinjau failed login, akun terkunci, sesi berisiko, emergency access, dan
   perubahan role melalui audit trail.
4. Jalankan `npm.cmd run security:scan` dan review advisory dependency.
5. Buat tindakan korektif untuk p95 melewati target atau temuan high/critical.

## Evidence

Simpan ringkasan latency, throughput, zero-error rate, hasil scan, advisory,
dan daftar tindakan dengan owner serta target penyelesaian.

## Eskalasi dan rollback

High/critical vulnerability, lonjakan 5xx, atau indikasi credential abuse
memicu SOP-06. Batasi akses terdampak dan rollback release terakhir bila bukti
menunjukkan regresi aplikasi.
