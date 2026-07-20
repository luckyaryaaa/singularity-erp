# SOP-16 — Official Document, Notification & Integration

## Tujuan

Menjamin dokumen resmi immutable dan pengiriman/integrasi idempoten serta dapat
diverifikasi tanpa membocorkan data.

## Pemilik dan frekuensi

Document Controller dan System Administrator; setiap issuance, reprint, email,
atau perubahan kontrak integrasi.

## Prosedur

1. Terbitkan hanya dokumen eligible; simpan organization/payload/template snapshot.
2. Tanda tangani dengan current key ID, QR/kode verifikasi, watermark, dan pagination.
3. Reprint diberi label COPY dan audit; VOID tidak boleh diterbitkan ulang.
4. Email memakai attachment PDF, delivery key idempoten, retry, dan attempt history.
5. Perubahan API memperbarui OpenAPI, version header, event catalog, dan test.

## Evidence

Document number, signature key ID, verification code, template version, issue/
reprint audit, notification delivery attempts, job ID, dan API version.

## Eskalasi dan rollback

Signature invalid, duplicate delivery sukses, attachment mismatch, atau contract
breaking tanpa version memblokir pengiriman. Rotasi key mempertahankan previous
verification; retry tidak membuat delivery sukses kedua.
