#!/usr/bin/env node
// Rasterises the app icon to PNG at the sizes the manifest declares.
// Written by hand against node:zlib so the repo needs no image dependency.
// Run with `npm run icons` after editing the mark below.

import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/icons');

const BG = [0x0e, 0x0e, 0x0e];
const ACCENT = [0xe8, 0x62, 0x2c];
const BRASS = [0xc9, 0xa2, 0x27];

// The mark: a pass profile over a road band — the same motif as the
// elevation charts, in unit coordinates (0..1, y down).
const RIDGE = [
  [0.02, 0.70], [0.24, 0.30], [0.38, 0.47],
  [0.56, 0.18], [0.74, 0.44], [0.98, 0.70],
];
const ROAD_TOP = 0.78;
const ROAD_BOTTOM = 0.86;

const TARGETS = [
  { file: 'icone-192.png', size: 192, inset: 0.06 },
  { file: 'icone-512.png', size: 512, inset: 0.06 },
  { file: 'icone-180.png', size: 180, inset: 0.06 },
  // Maskable icons are cropped to a circle by the launcher, so the mark
  // is pulled well inside the safe zone.
  { file: 'icone-maskable.png', size: 512, inset: 0.22 },
];

const SAMPLES = 3; // supersampling factor per axis

async function main() {
  await mkdir(outDir, { recursive: true });
  for (const target of TARGETS) {
    const png = encodePng(target.size, target.size, render(target.size, target.inset));
    await writeFile(join(outDir, target.file), png);
    console.log(`${target.file} — ${target.size}×${target.size}`);
  }
}

/** Returns an RGB buffer of `size * size * 3` bytes. */
function render(size, inset) {
  const pixels = Buffer.alloc(size * size * 3);
  const scale = 1 - inset * 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;

      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const u = ((x + (sx + 0.5) / SAMPLES) / size - inset) / scale;
          const v = ((y + (sy + 0.5) / SAMPLES) / size - inset) / scale;
          const colour = sample(u, v);
          r += colour[0];
          g += colour[1];
          b += colour[2];
        }
      }

      const n = SAMPLES * SAMPLES;
      const offset = (y * size + x) * 3;
      pixels[offset] = Math.round(r / n);
      pixels[offset + 1] = Math.round(g / n);
      pixels[offset + 2] = Math.round(b / n);
    }
  }

  return pixels;
}

function sample(u, v) {
  if (u < 0 || u > 1 || v < 0 || v > 1) return BG;
  if (v >= ROAD_TOP && v <= ROAD_BOTTOM && u >= 0.02 && u <= 0.98) return BRASS;
  if (v <= ROAD_TOP && insideRidge(u, v)) return ACCENT;
  return BG;
}

/** The ridge polygon closed along its baseline. */
function insideRidge(u, v) {
  if (v > 0.70) return false;
  for (let i = 0; i < RIDGE.length - 1; i += 1) {
    const [x1, y1] = RIDGE[i];
    const [x2, y2] = RIDGE[i + 1];
    if (u < Math.min(x1, x2) || u > Math.max(x1, x2)) continue;
    const t = (u - x1) / (x2 - x1);
    const yAt = y1 + t * (y2 - y1);
    if (v >= yAt) return true;
  }
  return false;
}

/* ---- Minimal PNG writer (8-bit truecolour, no interlace) ----------------- */

function encodePng(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 3 + 1)] = 0; // filter type: none
    rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: truecolour
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
