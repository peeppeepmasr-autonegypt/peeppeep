/**
 * Uploads a locally generated real PNG into R2, then prints the SQL needed to
 * point the demo X5 exterior gallery at it (proves R2 -> vendor_gallery -> render).
 *   node scratch/r2-gallery-demo.js
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:3000';
const SECRET = process.env.UPLOAD_SECRET || 'dev-upload-secret';

// ── minimal PNG encoder (no deps) ─────────────────────────────────────────────
function crc32(buf) {
  let c, table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  c = -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ table[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** WxH studio-style gradient with a horizon band, encoded as an 8-bit RGB PNG. */
function makePng(w, h) {
  const raw = Buffer.alloc(h * (1 + w * 3));
  let o = 0;
  for (let y = 0; y < h; y++) {
    raw[o++] = 0; // filter: none
    const t = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const s = x / (w - 1);
      // dark backdrop top -> lighter floor, with a soft "car body" ellipse band
      const band = Math.exp(-Math.pow((t - 0.62) / 0.16, 2)) * Math.exp(-Math.pow((s - 0.5) / 0.34, 2));
      const base = 24 + t * 40;
      const r = Math.round(base + band * 150 + s * 12);
      const g = Math.round(base + band * 155 + s * 14);
      const b = Math.round(base + band * 165 + s * 18);
      raw[o++] = Math.min(255, r);
      raw[o++] = Math.min(255, g);
      raw[o++] = Math.min(255, b);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function upload(buf, filename) {
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: 'image/png' }), filename);
  const res = await fetch(`${BASE}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SECRET}` },
    body: fd,
  });
  const text = await res.text();
  if (res.status !== 201) throw new Error(`upload ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function main() {
  const outDir = path.join(__dirname, 'media');
  fs.mkdirSync(outDir, { recursive: true });

  const slots = [
    { id: 'gal_x5_ext_1', name: 'x5-front.png', w: 1200, h: 800 },
    { id: 'gal_x5_ext_2', name: 'x5-side.png', w: 1200, h: 800 },
    { id: 'gal_x5_ext_3', name: 'x5-rear.png', w: 1200, h: 800 },
  ];

  const updates = [];
  for (const slot of slots) {
    const png = makePng(slot.w, slot.h);
    fs.writeFileSync(path.join(outDir, slot.name), png);
    const { url } = await upload(png, slot.name);
    updates.push({ id: slot.id, url });
    console.log(`${slot.name} (${png.length} bytes) -> ${url}`);
  }

  const sql = updates
    .map((u) => `UPDATE vendor_gallery SET url='${u.url}' WHERE id='${u.id}';`)
    .join('\n');
  fs.writeFileSync(path.join(outDir, 'gallery-update.sql'), sql + '\n');
  console.log('\nSQL written to scratch/media/gallery-update.sql:\n' + sql);
}

main().catch((e) => { console.error('ERROR', e); process.exitCode = 1; });
