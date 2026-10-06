// Genera los íconos PNG y SVG de la app (mancuerna azul petróleo sobre amarillo).
// Uso: node tools/make-icons.mjs
import fs from 'node:fs';
import zlib from 'node:zlib';

const BG = [0xF4, 0xC4, 0x30];
const FG = [0x12, 0x34, 0x3B];

// Formas en un lienzo de 512: [x0, y0, x1, y1, radio]
const SHAPES = [
  [176, 238, 336, 274, 10],   // mango
  [136, 160, 182, 352, 14],   // disco interior izq.
  [330, 160, 376, 352, 14],   // disco interior der.
  [100, 196, 140, 316, 12],   // disco exterior izq.
  [372, 196, 412, 316, 12],   // disco exterior der.
  [84, 236, 104, 276, 8],     // tope izq.
  [408, 236, 428, 276, 8]     // tope der.
];

function inRRect(x, y, [x0, y0, x1, y1, r]) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
  const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size) {
  const ss = 4, scale = 512 / size;
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let hit = 0;
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const px = (x + (sx + 0.5) / ss) * scale, py = (y + (sy + 0.5) / ss) * scale;
        if (SHAPES.some(s => inRRect(px, py, s))) hit++;
      }
      const a = hit / (ss * ss);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(BG[c] * (1 - a) + FG[c] * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<rect width="512" height="512" rx="112" fill="${hex(BG)}"/>
<g fill="${hex(FG)}">
${SHAPES.map(([x0, y0, x1, y1, r]) => `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="${r}"/>`).join('\n')}
</g>
</svg>
`;

fs.mkdirSync('icons', { recursive: true });
fs.writeFileSync('icons/icon-192.png', png(192));
fs.writeFileSync('icons/icon-512.png', png(512));
fs.writeFileSync('icons/apple-touch-icon.png', png(180));
fs.writeFileSync('icons/icon.svg', svg);
console.log('Íconos generados en icons/');
