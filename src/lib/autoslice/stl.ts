/** Minimal STL reader (binary and ASCII). Output is a flat triangle soup. */

export interface Mesh {
  /** 9 numbers per triangle: ax ay az bx by bz cx cy cz. */
  vertices: Float64Array;
  triangleCount: number;
}

export function parseStl(buffer: ArrayBuffer): Mesh {
  if (isBinaryStl(buffer)) return parseBinary(buffer);
  return parseAscii(new TextDecoder().decode(buffer));
}

function isBinaryStl(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 84) return false;
  const count = new DataView(buffer).getUint32(80, true);
  if (84 + count * 50 === buffer.byteLength) return true;
  // Some exporters start binary files with "solid"; a size mismatch with the
  // ASCII marker present means ASCII, otherwise assume (padded) binary.
  const head = new TextDecoder().decode(new Uint8Array(buffer, 0, 5));
  return head.toLowerCase() !== "solid";
}

function parseBinary(buffer: ArrayBuffer): Mesh {
  const view = new DataView(buffer);
  const count = view.getUint32(80, true);
  if (84 + count * 50 > buffer.byteLength) {
    throw new Error("STL file is truncated or corrupt.");
  }
  const vertices = new Float64Array(count * 9);
  for (let i = 0; i < count; i++) {
    const base = 84 + i * 50 + 12; // skip stored normal
    for (let k = 0; k < 9; k++) {
      vertices[i * 9 + k] = view.getFloat32(base + k * 4, true);
    }
  }
  return { vertices, triangleCount: count };
}

function parseAscii(text: string): Mesh {
  const numbers: number[] = [];
  const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    numbers.push(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  if (
    numbers.length === 0 ||
    numbers.length % 9 !== 0 ||
    numbers.some((n) => !Number.isFinite(n))
  ) {
    throw new Error("Could not read any triangles from this STL file.");
  }
  return { vertices: Float64Array.from(numbers), triangleCount: numbers.length / 9 };
}
