const fs = require('fs');
const path = require('path');

function createIcon() {
  const size = 32;
  const pixels = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2 + 0.5;
      const cy = y - size / 2 + 0.5;
      const dist = Math.sqrt(cx * cx + cy * cy);
      if (dist < size / 2 - 1) {
        pixels.push(59, 130, 246, 255);
      } else if (dist < size / 2) {
        pixels.push(37, 99, 235, 255);
      } else {
        pixels.push(0, 0, 0, 0);
      }
    }
  }

  const raw = Buffer.from(pixels);

  const png = createPNG(size, size, raw);
  const outPath = path.join(__dirname, '..', 'src', 'assets', 'tray-icon.png');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, png);
  console.log('Tray icon created:', outPath);
}

function createPNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflate(rgba, width, height);

  const chunks = [];
  chunks.push(makeChunk('IHDR', ihdr));
  chunks.push(makeChunk('IDAT', idat));
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat([sig, ...chunks]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = crc32(crcData);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function deflate(rgba, width, height) {
  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw.push(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]);
    }
  }
  const buf = Buffer.from(raw);
  const deflated = zlibDeflate(buf);
  return deflated;
}

function zlibDeflate(data) {
  const out = [];
  out.push(0x78, 0x01);

  let i = 0;
  while (i < data.length) {
    const remaining = data.length - i;
    const blockLen = Math.min(remaining, 65535);
    const last = (i + blockLen >= data.length) ? 1 : 0;
    out.push(last);
    out.push(blockLen & 0xff, (blockLen >> 8) & 0xff);
    const nlen = (~blockLen) & 0xffff;
    out.push(nlen & 0xff, (nlen >> 8) & 0xff);
    for (let j = 0; j < blockLen; j++) {
      out.push(data[i + j]);
    }
    i += blockLen;
  }

  const adler = adler32(data);
  out.push((adler >> 24) & 0xff, (adler >> 16) & 0xff, (adler >> 8) & 0xff, adler & 0xff);

  return Buffer.from(out);
}

function adler32(buf) {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return (b << 16) | a;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

createIcon();
