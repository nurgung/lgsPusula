// Draws the PWA icons. Run: node scripts/render-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
  const a = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const b = (bx - ax) * (py - ay) - (px - ax) * (by - ay);
  const c = area - a - b;
  const sign = Math.sign(area);
  return sign * a >= -0.5 && sign * b >= -0.5 && sign * c >= -0.5;
}

function rounded(x, y, size, radius) {
  const left = radius;
  const right = size - 1 - radius;
  const top = radius;
  const bottom = size - 1 - radius;
  if (x >= left && x <= right) return true;
  if (y >= top && y <= bottom) return true;
  const cx = x < left ? left : right;
  const cy = y < top ? top : bottom;
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function draw(size, maskable) {
  const pixels = Buffer.alloc(size * size * 4);
  const teal = [15, 118, 110, 255];
  const white = [255, 255, 255, 255];
  const pale = [205, 245, 239, 255];
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const radius = size * (maskable ? 0.22 : 0.28);
  const corner = size * (maskable ? 0 : 0.18);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      if (!maskable && !rounded(x, y, size, corner)) continue;
      pixels.set(teal, index);
      const dx = x - cx;
      const dy = y - cy;
      const distance = Math.hypot(dx, dy);
      if (distance < radius * 0.92 && distance > radius * 0.72) pixels.set(white, index);
      if (
        inTriangle(
          x,
          y,
          cx,
          cy - radius * 0.62,
          cx - radius * 0.16,
          cy,
          cx + radius * 0.16,
          cy,
        )
      ) {
        pixels.set(white, index);
      }
      if (
        inTriangle(
          x,
          y,
          cx,
          cy + radius * 0.4,
          cx - radius * 0.12,
          cy,
          cx + radius * 0.12,
          cy,
        )
      ) {
        pixels.set(pale, index);
      }
      if (distance < radius * 0.1) pixels.set(white, index);
    }
  }
  return encodePng(size, pixels);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", draw(192, false));
writeFileSync("public/icons/icon-512.png", draw(512, false));
writeFileSync("public/icons/icon-maskable-512.png", draw(512, true));
writeFileSync("src/app/icon.png", draw(32, false));
