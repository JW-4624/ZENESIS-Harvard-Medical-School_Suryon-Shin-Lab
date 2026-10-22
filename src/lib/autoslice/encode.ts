/** Dependency-free PNG and ZIP encoders used for the exported slice folder. */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array, seed = 0): number {
  let c = ~seed >>> 0;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

async function zlibDeflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

const PNG_SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

/**
 * Encodes an 8-bit grayscale PNG. `pixels` is width*height bytes, row-major.
 * `pixelMm` is written as a pHYs chunk so viewers report the physical size.
 */
export async function encodeGrayPng(
  pixels: Uint8Array,
  width: number,
  height: number,
  pixelMm?: number,
): Promise<Uint8Array> {
  const raw = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y++) {
    raw.set(pixels.subarray(y * width, (y + 1) * width), y * (width + 1) + 1); // filter byte 0
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // grayscale

  const chunks = [PNG_SIGNATURE, pngChunk("IHDR", ihdr)];
  if (pixelMm && pixelMm > 0) {
    const phys = new Uint8Array(9);
    const perMetre = Math.round(1000 / pixelMm);
    new DataView(phys.buffer).setUint32(0, perMetre);
    new DataView(phys.buffer).setUint32(4, perMetre);
    phys[8] = 1; // metres
    chunks.push(pngChunk("pHYs", phys));
  }
  chunks.push(pngChunk("IDAT", await zlibDeflate(raw)), pngChunk("IEND", new Uint8Array(0)));
  return concat(chunks);
}

export function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

interface ZipEntry {
  name: Uint8Array;
  crc: number;
  size: number;
  offset: number;
}

/** Streaming-friendly "store" ZIP writer (PNG data is already compressed). */
export class ZipWriter {
  private parts: Uint8Array[] = [];
  private entries: ZipEntry[] = [];
  private offset = 0;
  private dosTime: number;
  private dosDate: number;

  constructor(now = new Date()) {
    this.dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    this.dosDate =
      ((Math.max(now.getFullYear(), 1980) - 1980) << 9) |
      ((now.getMonth() + 1) << 5) |
      now.getDate();
  }

  add(path: string, data: Uint8Array): void {
    if (this.entries.length >= 0xfffe) {
      throw new Error("Too many files for a ZIP archive; use the folder output instead.");
    }
    const name = new TextEncoder().encode(path);
    const crc = crc32(data);
    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x0800, true); // UTF-8 names
    view.setUint16(8, 0, true); // stored
    view.setUint16(10, this.dosTime, true);
    view.setUint16(12, this.dosDate, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, name.length, true);
    header.set(name, 30);

    this.entries.push({ name, crc, size: data.length, offset: this.offset });
    this.parts.push(header, data);
    this.offset += header.length + data.length;
    if (this.offset > 0xffffffff - 1024 * 1024) {
      throw new Error("Archive exceeds 4 GB; use the folder output instead.");
    }
  }

  finish(): Blob {
    const central: Uint8Array[] = [];
    let centralSize = 0;
    for (const e of this.entries) {
      const rec = new Uint8Array(46 + e.name.length);
      const view = new DataView(rec.buffer);
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(8, 0x0800, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, this.dosTime, true);
      view.setUint16(14, this.dosDate, true);
      view.setUint32(16, e.crc, true);
      view.setUint32(20, e.size, true);
      view.setUint32(24, e.size, true);
      view.setUint16(28, e.name.length, true);
      view.setUint32(42, e.offset, true);
      rec.set(e.name, 46);
      central.push(rec);
      centralSize += rec.length;
    }
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, this.entries.length, true);
    endView.setUint16(10, this.entries.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, this.offset, true);
    return new Blob([...this.parts, ...central, end] as BlobPart[], { type: "application/zip" });
  }
}
