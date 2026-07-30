import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { deflateSync } from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function createPng(size, bg = [10, 10, 11], accent = [16, 185, 129]) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.42

  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4
      const dx = x - cx
      const dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const inCircle = dist < r
      const bar =
        Math.abs(dy) < size * 0.06 && Math.abs(dx) < size * 0.28 ||
        Math.abs(dx) < size * 0.06 && dy > -size * 0.18 && dy < size * 0.18
      if (inCircle && bar) {
        raw[i] = accent[0]
        raw[i + 1] = accent[1]
        raw[i + 2] = accent[2]
        raw[i + 3] = 255
      } else if (inCircle) {
        raw[i] = bg[0]
        raw[i + 1] = bg[1]
        raw[i + 2] = bg[2]
        raw[i + 3] = 255
      } else {
        raw[i] = bg[0]
        raw[i + 1] = bg[1]
        raw[i + 2] = bg[2]
        raw[i + 3] = 255
      }
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512, 180]) {
  const name =
    size === 180 ? 'apple-touch-icon.png' : `pwa-${size}.png`
  writeFileSync(join(outDir, name), createPng(size))
  console.log('wrote', name)
}
