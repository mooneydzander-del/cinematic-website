/*
 * Renders the share image (og.png, 1200×630) and the home-screen icon (apple-touch-icon.png,
 * 180×180) in the page's own light: letterbox, projector beam, leaks, anamorphic flare, dust.
 * No dependencies. vite.config.js calls these at build time unless public/ already has the file.
 */
import { deflateSync } from 'node:zlib';

const INK = [10, 10, 11];

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

const gauss = (d, s) => Math.exp(-(d * d) / (s * s));

const smoothstep = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Deterministic randomness, so every build renders the same frame. */
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function frame(width, height) {
  const px = new Float32Array(width * height * 3);
  for (let i = 0; i < px.length; i += 3) {
    px[i] = INK[0];
    px[i + 1] = INK[1];
    px[i + 2] = INK[2];
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

  /** Multiply the frame by factorAt(x, y). */
  const shade = (factorAt) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const f = factorAt(x + 0.5, y + 0.5);
        const k = (y * width + x) * 3;
        px[k] *= f;
        px[k + 1] *= f;
        px[k + 2] *= f;
      }
    }
  };

  /** Quantise with a 4×4 ordered dither so the dark gradients don't band. */
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

  return { light, shade, bytes };
}

const angleOff = (dx, dy, axis) => {
  let off = Math.abs(Math.atan2(dx, -dy) - axis);
  if (off > Math.PI) off = 2 * Math.PI - off;
  return off;
};

/* ── The share image ──────────────────────────────────────────────────── */

export function renderOgImage() {
  const W = 1200;
  const H = 630;
  const f = frame(W, H);
  const bar = Math.round((H - W / 2.39) / 2);

  // Projector beam from above the frame, top left.
  const apex = [0.06 * W, -0.2 * H];
  const axis = (131 * Math.PI) / 180;
  const spread = 0.27;
  f.light([242, 232, 214], (x, y) => {
    const dx = x - apex[0];
    const dy = y - apex[1];
    const off = angleOff(dx, dy, axis);
    if (off > spread) return 0;
    return 0.13 * (1 - off / spread) ** 2 * Math.max(0, 1 - Math.hypot(dx, dy) / 1500);
  });

  // Light leaks bleeding in from two corners.
  f.light([206, 92, 46], (x, y) => 0.32 * Math.max(0, 1 - Math.hypot(x + 40, y - 700) / 640) ** 2);
  f.light([236, 204, 160], (x, y) => 0.15 * Math.max(0, 1 - Math.hypot(x - 1240, y + 60) / 560) ** 2);

  // Anamorphic flare: halo, streak, warm bloom, hot core.
  const S = [430, 262];
  f.light([255, 228, 196], (x, y) => 0.16 * gauss(y - S[1], 26) * Math.max(0, 1 - Math.abs(x - S[0]) / 900) ** 1.2);
  f.light([255, 242, 226], (x, y) => 0.62 * gauss(y - S[1], 1.5) * Math.max(0, 1 - Math.abs(x - S[0]) / 760) ** 1.5, [0, S[1] - 8, W - 1, S[1] + 8]);
  f.light([240, 190, 130], (x, y) => 0.2 * gauss(Math.hypot(x - S[0], y - S[1]), 120), [S[0] - 360, S[1] - 360, S[0] + 360, S[1] + 360]);
  f.light([255, 246, 234], (x, y) => 0.7 * gauss(Math.hypot(x - S[0], y - S[1]), 30), [S[0] - 100, S[1] - 100, S[0] + 100, S[1] + 100]);

  // Lens ghosts on the far side of the centre.
  const C = [W / 2, H / 2];
  for (const [k, r, a] of [[0.45, 22, 0.05], [0.9, 38, 0.045], [1.35, 12, 0.07]]) {
    const gx = C[0] + (C[0] - S[0]) * k;
    const gy = C[1] + (C[1] - S[1]) * k;
    f.light(
      [237, 226, 205],
      (x, y) => {
        const d = Math.hypot(x - gx, y - gy);
        return a * (0.55 + 0.45 * smoothstep(r * 0.6, r, d)) * (1 - smoothstep(r - 1.5, r, d));
      },
      [gx - r, gy - r, gx + r, gy + r],
    );
  }

  // Dust in the beam.
  const rand = mulberry32(2390);
  for (let i = 0; i < 110; i++) {
    const mx = rand() * W;
    const my = bar + rand() * (H - 2 * bar);
    const lit = Math.max(0, 1 - angleOff(mx - apex[0], my - apex[1], axis) / spread) ** 2;
    const a = (0.05 + 0.75 * lit) * (0.4 + 0.6 * rand());
    const r = 0.7 + rand() * 1.6;
    if (a < 0.03) continue;
    f.light([255, 240, 220], (x, y) => a * gauss(Math.hypot(x - mx, y - my), r), [mx - 3 * r, my - 3 * r, mx + 3 * r, my + 3 * r]);
  }

  // Vignette, then the 2.39:1 bars.
  f.shade((x, y) => 1 - 0.62 * smoothstep(0.42, 1.05, Math.hypot((x - W / 2) / (0.62 * W), (y - H * 0.47) / (0.62 * H))));
  f.shade((x, y) => (y < bar || y > H - bar ? 0 : 1));

  return encodePng(W, H, f.bytes());
}

/* ── The home-screen icon: the favicon, rendered ──────────────────────── */

export function renderTouchIcon() {
  const S = 180;
  const c = S / 2;
  const f = frame(S, S);
  f.light([232, 162, 74], (x, y) => 0.42 * gauss(Math.hypot(x - c, y - c), 34));
  f.light([237, 232, 223], (x, y) => 0.85 * gauss(y - c, 1.6) * Math.max(0, 1 - Math.abs(x - c) / 76) ** 1.3);
  f.light([232, 162, 74], (x, y) => Math.max(0, Math.min(1, 15.5 - Math.hypot(x - c, y - c))));
  f.shade((x, y) => 1 - 0.35 * smoothstep(0.55, 1.2, Math.hypot(x - c, y - c) / c));
  return encodePng(S, S, f.bytes());
}
