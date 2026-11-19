// Notas de voz: el navegador (Chrome) graba Opus dentro de WebM, pero WhatsApp espera Opus dentro de Ogg.
// Este módulo «re-empaqueta» los mismos paquetes de audio de WebM a Ogg, sin volver a codificar (no necesita ffmpeg).

const ID = { EBML: 0x1a45dfa3, Segment: 0x18538067, Tracks: 0x1654ae6b, TrackEntry: 0xae, CodecPrivate: 0x63a2, Cluster: 0x1f43b675, BlockGroup: 0xa0, Block: 0xa1, SimpleBlock: 0xa3 }
const MASTER = new Set([ID.Segment, ID.Tracks, ID.TrackEntry, ID.Cluster, ID.BlockGroup])

/** Lee un número de longitud variable de EBML. `id` conserva los bits marcadores (así se definen los IDs). */
function vint(buffer: Buffer, pos: number, id: boolean): { value: number; length: number; unknown: boolean } | null {
  const first = buffer[pos]
  if (first === undefined || first === 0) return null
  let length = 1
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length++
  if (length > 8 || pos + length > buffer.length) return null
  let value = id ? first : first & (0xff >> length)
  let allOnes = value === (0xff >> length)
  for (let i = 1; i < length; i++) { value = value * 256 + buffer[pos + i]; if (buffer[pos + i] !== 0xff) allOnes = false }
  return { value, length, unknown: !id && allOnes }
}

/** Duración en muestras (48 kHz) de un paquete Opus según su byte TOC. */
function opusSamples(packet: Buffer) {
  if (!packet.length) return 0
  const toc = packet[0], config = toc >> 3
  const frameMs = config < 12 ? [10, 20, 40, 60][config % 4] : config < 16 ? [10, 20][config % 2] : [2.5, 5, 10, 20][config % 4]
  const code = toc & 3
  const frames = code === 0 ? 1 : code < 3 ? 2 : (packet[1] ?? 0) & 0x3f
  return Math.round(frameMs * 48 * frames)
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) { let r = i << 24; for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1; table[i] = r >>> 0 }
  return table
})()
function oggCrc(data: Buffer) { let crc = 0; for (const byte of data) crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ byte) & 0xff]) >>> 0; return crc >>> 0 }

function oggPage(packet: Buffer, granule: bigint, serial: number, sequence: number, flags: number) {
  const lacing: number[] = []
  let rest = packet.length
  while (rest >= 255) { lacing.push(255); rest -= 255 }
  lacing.push(rest)
  const header = Buffer.alloc(27 + lacing.length)
  header.write("OggS", 0, "ascii"); header[4] = 0; header[5] = flags
  header.writeBigInt64LE(granule, 6); header.writeUInt32LE(serial, 14); header.writeUInt32LE(sequence, 18); header.writeUInt32LE(0, 22)
  header[26] = lacing.length; lacing.forEach((value, i) => { header[27 + i] = value })
  const page = Buffer.concat([header, packet])
  page.writeUInt32LE(oggCrc(page), 22)
  return page
}

/** Convierte una grabación WebM/Opus en Ogg/Opus. Devuelve null si no es WebM con Opus. */
export function webmOpusToOgg(webm: Buffer): { ogg: Buffer; seconds: number } | null {
  if (webm.length < 4 || webm.readUInt32BE(0) !== ID.EBML) return null
  let codecPrivate: Buffer | null = null
  const packets: Buffer[] = []
  let pos = 0
  while (pos < webm.length) {
    const id = vint(webm, pos, true); if (!id) break
    const size = vint(webm, pos + id.length, false); if (!size) break
    const start = pos + id.length + size.length
    if (MASTER.has(id.value)) { pos = start; continue }
    const end = size.unknown ? webm.length : Math.min(webm.length, start + size.value)
    if (id.value === ID.CodecPrivate) codecPrivate = webm.subarray(start, end)
    else if (id.value === ID.SimpleBlock || id.value === ID.Block) {
      const track = vint(webm, start, false)
      // pista (vint) + timecode relativo (2 bytes) + flags (1 byte); MediaRecorder no usa «lacing».
      if (track && ((webm[start + track.length + 2] >> 1) & 3) === 0) packets.push(webm.subarray(start + track.length + 3, end))
    }
    pos = end
  }
  if (!packets.length) return null
  const head = codecPrivate && codecPrivate.subarray(0, 8).toString("ascii") === "OpusHead" ? Buffer.from(codecPrivate) : (() => {
    const fallback = Buffer.alloc(19); fallback.write("OpusHead", 0, "ascii"); fallback[8] = 1; fallback[9] = 1
    fallback.writeUInt16LE(312, 10); fallback.writeUInt32LE(48000, 12); return fallback
  })()
  const tags = Buffer.alloc(8 + 4 + 8 + 4); tags.write("OpusTags", 0, "ascii"); tags.writeUInt32LE(8, 8); tags.write("RestoPOS", 12, "ascii"); tags.writeUInt32LE(0, 20)
  const serial = Math.floor(Math.random() * 0xffffffff) >>> 0
  const pages = [oggPage(head, BigInt(0), serial, 0, 0x02), oggPage(tags, BigInt(0), serial, 1, 0)]
  let granule = BigInt(0)
  packets.forEach((packet, index) => {
    granule += BigInt(opusSamples(packet))
    pages.push(oggPage(packet, granule, serial, index + 2, index === packets.length - 1 ? 0x04 : 0))
  })
  const preSkip = head.readUInt16LE(10)
  return { ogg: Buffer.concat(pages), seconds: Math.max(1, Math.round((Number(granule) - preSkip) / 48000)) }
}
