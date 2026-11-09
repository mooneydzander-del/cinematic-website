/*
 * Renders the share image (og.png, 1200×630) and the home-screen icon (apple-touch-icon.png,
 * 180×180) in the page's own light: warm black, a page slab, one brass rule. No dependencies.
 * vite.config.js calls these at build time unless public/ already has the file.
 */
import { deflateSync } from 'node:zlib';

const BASE = [16, 14, 12];
const AMBER = [224, 177, 90];
const PAPER = [244, 240, 232];
const SLAB = [28, 25, 22];

/* ── PNG encoding (RGB, 8-bit, Paeth-filtered rows) ───────────────────── */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export function encodePng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1);
    raw[row] = 4; // Paeth
    for (let i = 0; i < stride; i++) {
      const p = y * stride + i;
      const a = i >= 3 ? rgb[p - 3] : 0;
      const b = y > 0 ? rgb[p - stride] : 0;
      const c = i >= 3 && y > 0 ? rgb[p - stride - 3] : 0;
      const estimate = a + b - c;
      const pa = Math.abs(estimate - a);
      const pb = Math.abs(estimate - b);
      const pc = Math.abs(estimate - c);
      const predictor = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      raw[row + 1 + i] = (rgb[p] - predictor) & 0xff;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour RGB
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ── A tiny light table ───────────────────────────────────────────────── */

function frame(width, height) {
  const px = new Float32Array(width * height * 3);
  for (let i = 0; i < px.length; i += 3) {
    px[i] = BASE[0];
    px[i + 1] = BASE[1];
    px[i + 2] = BASE[2];
  }

  /** Lay a light over the frame; alphaAt(x, y) returns 0–1. box limits the work to [x0, y0, x1, y1]. */
  const light = (color, alphaAt, box = [0, 0, width - 1, height - 1]) => {
    const x0 = Math.max(0, Math.floor(box[0]));
    const y0 = Math.max(0, Math.floor(box[1]));
    const x1 = Math.min(width - 1, Math.ceil(box[2]));
    const y1 = Math.min(height - 1, Math.ceil(box[3]));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const a = Math.min(1, alphaAt(x + 0.5, y + 0.5));
        if (!(a > 0.0005)) continue;
        const k = (y * width + x) * 3;
        px[k] += (color[0] - px[k]) * a;
        px[k + 1] += (color[1] - px[k + 1]) * a;
        px[k + 2] += (color[2] - px[k + 2]) * a;
      }
    }
  };

  /** Quantise with a 4×4 ordered dither so flat fields don't band. */
  const bytes = () => {
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const out = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const d = bayer[(y & 3) * 4 + (x & 3)] / 16 - 0.47;
        const k = (y * width + x) * 3;
        for (let c = 0; c < 3; c++) out[k + c] = Math.max(0, Math.min(255, Math.round(px[k + c] + d)));
      }
    }
    return out;
  };

  return { light, bytes };
}

/* ── The share image: a page slab and one brass rule. No sky, no trail. ─ */

export function renderOgImage() {
  const W = 1200;
  const H = 630;
  const f = frame(W, H);
  f.light(SLAB, () => 1, [560, 78, 1110, 552]);
  f.light(AMBER, () => 1, [560, 78, 1110, 96]);
  f.light(PAPER, () => 0.14, [596, 150, 980, 168]);
  f.light(PAPER, () => 0.1, [596, 196, 860, 214]);
  return encodePng(W, H, f.bytes());
}

/* ── The home-screen icon: a page with a brass top edge ──────────────── */

export function renderTouchIcon() {
  const S = 180;
  const f = frame(S, S);
  f.light(PAPER, () => 1, [48, 36, 132, 146]);
  f.light(AMBER, () => 1, [48, 36, 132, 54]);
  return encodePng(S, S, f.bytes());
}
