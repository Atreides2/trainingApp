// Generates the PWA icon PNGs (white dumbbell on solid blue) without any
// image dependencies: shapes are rasterized via signed distance functions
// and encoded as PNG by hand (zlib is the only non-trivial part, from node).
//
//   node scripts/generate-icons.mjs
//
// Outputs: public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const BG = [0x25, 0x63, 0xeb]; // tailwind blue-600, matches the app accent
const FG = [0xff, 0xff, 0xff];

// ── PNG encoding ──────────────────────────────────────────────

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
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

function encodePng(size, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor

  // Prefix every scanline with filter byte 0 (None)
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    rgb.copy(raw, y * (1 + size * 3) + 1, y * size * 3, (y + 1) * size * 3);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Glyph rasterization ───────────────────────────────────────

// Signed distance to a rounded rectangle centered at (cx, cy)
function sdRoundRect(px, py, [cx, cy, hw, hh, r]) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
  );
}

// Dumbbell in unit coordinates: bar + inner/outer plates on each side
const SHAPES = [
  [0.5, 0.5, 0.3, 0.042, 0.042], // bar
  [0.3, 0.5, 0.048, 0.175, 0.048], // inner plate L
  [0.7, 0.5, 0.048, 0.175, 0.048], // inner plate R
  [0.195, 0.5, 0.042, 0.12, 0.042], // outer plate L
  [0.805, 0.5, 0.042, 0.12, 0.042], // outer plate R
];

function render(size) {
  const rgb = Buffer.alloc(size * size * 3);
  const SS = 4; // 4×4 supersampling for antialiasing

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          if (SHAPES.some((s) => sdRoundRect(u, v, s) < 0)) hits++;
        }
      }
      const a = hits / (SS * SS);
      const i = (y * size + x) * 3;
      for (let c = 0; c < 3; c++) {
        rgb[i + c] = Math.round(BG[c] + (FG[c] - BG[c]) * a);
      }
    }
  }
  return rgb;
}

// ── Output ────────────────────────────────────────────────────

mkdirSync(join(ROOT, 'public'), { recursive: true });

for (const [size, name] of [
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
  [180, 'apple-touch-icon.png'],
]) {
  const file = join(ROOT, 'public', name);
  writeFileSync(file, encodePng(size, render(size)));
  console.log(`wrote ${file}`);
}
