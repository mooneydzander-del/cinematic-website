/*
 * Renders the share image (og.png, 1200×630) and the home-screen icon (apple-touch-icon.png,
 * 180×180) in the page's own light: a near-black sky, sparse stars, a low horizon glow and one
 * thin amber light trail. No dependencies. vite.config.js calls these at build time unless
 * public/ already has the file.
 */
import { deflateSync } from 'node:zlib';

const BASE = [7, 9, 13];
const AMBER = [232, 162, 74];
const HORIZON_GLOW = [116, 138, 172];

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

/**
 * The one motif: a thin amber line rising from `base` to `head` at x, faint at the base and full
 * at the head, with a soft glow around it. `half` is the line's half-width in pixels.
 */
function lightTrail(f, x, head, base, half, glow) {
  const along = (y) => smoothstep(base, head, y);
  f.light(AMBER, (px, py) => 0.33 * along(py) * gauss(px - x, glow), [x - 4 * glow, head, x + 4 * glow, base]);
  f.light(AMBER, (px, py) => along(py) * Math.max(0, Math.min(1, half + 0.5 - Math.abs(px - x))), [x - half - 2, head, x + half + 2, base]);
}

/* ── The share image ──────────────────────────────────────────────────── */

export function renderOgImage() {
  const W = 1200;
  const H = 630;
  const f = frame(W, H);
  const horizon = Math.round(0.84 * H);

  // A sparse star field, thinning out toward the horizon.
  const rand = mulberry32(475);
  for (let i = 0; i < 150; i++) {
    const sx = rand() * W;
    const sy = rand() * horizon;
    const r = 0.55 + rand() ** 3 * 0.9;
    const a = (0.15 + rand() ** 2 * 0.55) * (1 - smoothstep(0.3 * H, horizon, sy));
    if (a < 0.02) continue;
    f.light([241, 239, 233], (x, y) => a * gauss(Math.hypot(x - sx, y - sy), r), [sx - 3 * r, sy - 3 * r, sx + 3 * r, sy + 3 * r]);
  }

  // The low horizon glow: cool and wide, brightest on the line, falling off faster below it.
  f.light(HORIZON_GLOW, (x, y) => {
    const dy = y - horizon;
    return 0.22 * gauss(dy, dy < 0 ? 110 : 40) * gauss(x - 0.74 * W, 560);
  });

  // The light trail, in the right third: from the horizon most of the way up the frame.
  lightTrail(f, 0.8 * W + 0.5, Math.round(0.16 * H), horizon, 1.1, 7);

  // Vignette.
  f.shade((x, y) => 1 - 0.6 * smoothstep(0.45, 1.1, Math.hypot((x - W / 2) / (0.62 * W), (y - H * 0.45) / (0.62 * H))));

  return encodePng(W, H, f.bytes());
}

/* ── The home-screen icon: the favicon, rendered ──────────────────────── */

export function renderTouchIcon() {
  const S = 180;
  const c = S / 2;
  const f = frame(S, S);
  const base = 146;
  f.light(HORIZON_GLOW, (x, y) => 0.16 * gauss(y - base, 26) * gauss(x - c, 90));
  lightTrail(f, c, 34, base, 1.9, 8);
  f.shade((x, y) => 1 - 0.35 * smoothstep(0.55, 1.2, Math.hypot(x - c, y - c) / c));
  return encodePng(S, S, f.bytes());
}
