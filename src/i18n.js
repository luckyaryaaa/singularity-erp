'use strict';
// i18n baseline (§10.15): id-ID + en-US, fallback ke teks inline Indonesia.
// t(key, fallback) — kode tetap terbaca; en-US menimpa via kamus JSON.
// Preferensi bahasa disimpan di localStorage (bukan data sensitif).
(() => {
  const state = { locale: localStorage.getItem('mat-locale') || 'id-ID', dict: {} };

  async function load() {
    if (state.locale === 'id-ID') { state.dict = {}; return; } // inline = id-ID
    try {
      const res = await fetch(`/src/locales/${state.locale}.json`, { cache: 'no-cache' });
      state.dict = res.ok ? await res.json() : {};
    } catch { state.dict = {}; }
  }

  const t = (key, fallback) => state.dict[key] ?? fallback;

  function setLocale(locale) {
    localStorage.setItem('mat-locale', locale);
    location.reload(); // seluruh halaman dirender ulang dengan kamus baru
  }

  // Terapkan ke elemen statis ber-atribut data-i18n (login layer, shell).
  function applyStatic() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const value = state.dict[el.dataset.i18n];
      if (value) el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const value = state.dict[el.dataset.i18nPlaceholder];
      if (value) el.placeholder = value;
    });
  }

  window.MAT_I18N = { load, t, setLocale, applyStatic, get locale() { return state.locale; } };
})();
