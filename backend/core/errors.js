'use strict';
// Model error terpusat. Semua endpoint mengembalikan bentuk { code, message, detail? }.

const CATALOG = {
  VALIDATION_ERROR:   { status: 422, message: 'Data yang dikirim tidak valid.' },
  PERMISSION_DENIED:  { status: 403, message: 'Anda tidak memiliki izin untuk tindakan ini.' },
  DOCUMENT_CONFLICT:  { status: 409, message: 'Dokumen diubah oleh pengguna lain. Muat ulang versi terbaru sebelum melanjutkan.' },
  SOD_CONFLICT:       { status: 409, message: 'Tindakan diblokir oleh kontrol segregation of duties (SoD).' },
  DUPLICATE_REQUEST:  { status: 409, message: 'Permintaan duplikat terdeteksi. Hasil pertama dikembalikan.' },
  RATE_LIMITED:       { status: 429, message: 'Terlalu banyak permintaan. Tunggu sebentar sebelum mencoba lagi.' },
  SESSION_EXPIRED:    { status: 401, message: 'Sesi Anda telah berakhir. Silakan masuk kembali.' },
  AUTH_FAILED:        { status: 401, message: 'Nama pengguna atau kata sandi salah.' },
  ACCOUNT_LOCKED:     { status: 423, message: 'Akun terkunci sementara karena percobaan masuk yang gagal. Coba lagi nanti.' },
  CSRF_REJECTED:      { status: 403, message: 'Token keamanan tidak valid. Muat ulang halaman lalu coba lagi.' },
  RESOURCE_NOT_FOUND: { status: 404, message: 'Data yang diminta tidak ditemukan.' },
  STATUS_INVALID:     { status: 422, message: 'Status dokumen tidak mengizinkan tindakan ini.' },
  REASON_REQUIRED:    { status: 422, message: 'Tindakan sensitif ini membutuhkan alasan tertulis.' },
  PIN_REQUIRED:       { status: 403, message: 'Tindakan kritis ini membutuhkan PIN Owner.' },
  MFA_REQUIRED:       { status: 403, message: 'Tindakan kritis ini membutuhkan verifikasi MFA terbaru.' },
  FILE_TOO_LARGE:     { status: 413, message: 'Ukuran file melebihi batas yang diizinkan.' },
  STORAGE_FULL:       { status: 507, message: 'Penyimpanan hampir penuh. Unggahan non-kritis diblokir.' },
  DATABASE_TIMEOUT:   { status: 504, message: 'Basis data tidak merespons tepat waktu. Coba lagi.' },
  JOB_FAILED:         { status: 500, message: 'Proses latar belakang gagal. Tim sistem sudah menerima detailnya.' },
  JOB_LIMIT:          { status: 429, message: 'Batas proses latar belakang aktif per pengguna tercapai.' },
  CREDIT_HOLD:        { status: 409, message: 'Pelanggan berada dalam credit hold atau melampaui batas kredit. Butuh persetujuan finance.' },
  MATCH_FAILED:       { status: 409, message: 'Three-way match gagal: selisih PO, penerimaan, dan tagihan melebihi toleransi.' },
  DUPLICATE_MASTER:   { status: 409, message: 'Data master serupa sudah ada. Periksa kemungkinan duplikat.' },
  INTERNAL:           { status: 500, message: 'Terjadi kesalahan internal. Detail teknis sudah dicatat.' }
};

class AppError extends Error {
  constructor(code, detail, extra) {
    const spec = CATALOG[code] || CATALOG.INTERNAL;
    super(spec.message);
    this.code = code in CATALOG ? code : 'INTERNAL';
    this.status = spec.status;
    this.detail = detail;
    this.extra = extra;
  }
  toBody() {
    const body = { code: this.code, message: this.message };
    if (this.detail) body.detail = this.detail;
    if (this.extra) Object.assign(body, this.extra);
    return body;
  }
}

module.exports = { AppError, CATALOG };
