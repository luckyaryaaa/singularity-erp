'use strict';
// Dekoder gambar → XObject PDF (tanpa dependensi berat). Dipakai dokumen resmi
// untuk menanamkan logo/kop, stempel, dan tanda tangan ASLI dari master aset
// organisasi — bukan placeholder. JPEG ditanam apa adanya (DCTDecode); PNG
// di-unfilter lalu dipadatkan ulang (FlateDecode) + SMask untuk transparansi.
const { unzlibSync, zlibSync } = require('fflate');

// ── JPEG: baca dimensi & jumlah komponen dari marker SOF ────────────────────
function decodeJpeg(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    // SOF0..SOF15 kecuali DHT(c4)/JPG(c8)/DAC(cc) memuat dimensi.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      const height = buf.readUInt16BE(i + 5), width = buf.readUInt16BE(i + 7), comps = buf[i + 9];
      const colorSpace = comps === 1 ? '/DeviceGray' : comps === 4 ? '/DeviceCMYK' : '/DeviceRGB';
      return { width, height, colorSpace, bpc: 8, filter: '/DCTDecode', data: buf };
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) { i += 2; continue; }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

// ── PNG ─────────────────────────────────────────────────────────────────────
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const paeth = (a, b, c) => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

// Balikkan filter per-scanline (spesifikasi PNG 9.2) → piksel mentah.
function unfilter(raw, width, height, bpp) {
  const rowBytes = width * bpp, out = Buffer.alloc(rowBytes * height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const type = raw[pos++];
    const cur = out.subarray(y * rowBytes, (y + 1) * rowBytes);
    raw.copy(cur, 0, pos, pos + rowBytes); pos += rowBytes;
    const prior = y > 0 ? out.subarray((y - 1) * rowBytes, y * rowBytes) : null;
    for (let x = 0; x < rowBytes; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, b = prior ? prior[x] : 0, c = x >= bpp && prior ? prior[x - bpp] : 0;
      if (type === 1) cur[x] = (cur[x] + a) & 255;
      else if (type === 2) cur[x] = (cur[x] + b) & 255;
      else if (type === 3) cur[x] = (cur[x] + ((a + b) >> 1)) & 255;
      else if (type === 4) cur[x] = (cur[x] + paeth(a, b, c)) & 255;
    }
  }
  return out;
}

function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIG)) return null;
  let width = 0, height = 0, bitDepth = 8, colorType = 6, interlace = 0;
  const idat = []; let palette = null, trns = null;
  for (let i = 8; i + 8 <= buf.length;) {
    const len = buf.readUInt32BE(i), type = buf.toString('latin1', i + 4, i + 8), start = i + 8;
    if (type === 'IHDR') {
      width = buf.readUInt32BE(start); height = buf.readUInt32BE(start + 4);
      bitDepth = buf[start + 8]; colorType = buf[start + 9]; interlace = buf[start + 12];
    } else if (type === 'PLTE') palette = buf.subarray(start, start + len);
    else if (type === 'tRNS') trns = buf.subarray(start, start + len);
    else if (type === 'IDAT') idat.push(buf.subarray(start, start + len));
    else if (type === 'IEND') break;
    i = start + len + 4;                                     // + CRC
  }
  // Hanya 8-bit non-interlaced yang didukung (cakupan logo/stempel lazimnya).
  if (!width || !height || bitDepth !== 8 || interlace !== 0) return null;
  const bppMap = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const bpp = bppMap[colorType];
  if (!bpp) return null;
  const pixels = unfilter(Buffer.from(unzlibSync(Buffer.concat(idat))), width, height, bpp);

  let rgb, alpha = null, colorSpace = '/DeviceRGB', comps = 3;
  if (colorType === 2) rgb = pixels;
  else if (colorType === 6) {
    rgb = Buffer.alloc(width * height * 3); alpha = Buffer.alloc(width * height);
    for (let p = 0; p < width * height; p++) {
      rgb[p * 3] = pixels[p * 4]; rgb[p * 3 + 1] = pixels[p * 4 + 1]; rgb[p * 3 + 2] = pixels[p * 4 + 2];
      alpha[p] = pixels[p * 4 + 3];
    }
  } else if (colorType === 0) { rgb = pixels; colorSpace = '/DeviceGray'; comps = 1; }
  else if (colorType === 4) {
    rgb = Buffer.alloc(width * height); alpha = Buffer.alloc(width * height);
    for (let p = 0; p < width * height; p++) { rgb[p] = pixels[p * 2]; alpha[p] = pixels[p * 2 + 1]; }
    colorSpace = '/DeviceGray'; comps = 1;
  } else if (colorType === 3) {
    if (!palette) return null;
    rgb = Buffer.alloc(width * height * 3);
    if (trns) alpha = Buffer.alloc(width * height, 255);
    for (let p = 0; p < width * height; p++) {
      const idx = pixels[p];
      rgb[p * 3] = palette[idx * 3]; rgb[p * 3 + 1] = palette[idx * 3 + 1]; rgb[p * 3 + 2] = palette[idx * 3 + 2];
      if (trns && idx < trns.length) alpha[p] = trns[idx];
    }
  }
  return {
    width, height, colorSpace, bpc: 8, comps, filter: '/FlateDecode',
    data: Buffer.from(zlibSync(rgb)),
    smask: alpha ? Buffer.from(zlibSync(alpha)) : null
  };
}

// Kembalikan deskriptor XObject, atau null bila format tak dikenal/rusak.
function decodeImage(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16) return null;
  try {
    const mime = String(mimeType || '').toLowerCase();
    if (mime.includes('png') || buffer.subarray(0, 8).equals(PNG_SIG)) return decodePng(buffer);
    if (mime.includes('jpg') || mime.includes('jpeg') || (buffer[0] === 0xff && buffer[1] === 0xd8)) return decodeJpeg(buffer);
  } catch { return null; }                                   // aset rusak tidak boleh menggagalkan cetak
  return null;
}

module.exports = { decodeImage, decodePng, decodeJpeg };
