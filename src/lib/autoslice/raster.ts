/**
 * Scanline rasteriser for oriented slice segments.
 *
 * Every segment is oriented so the solid lies on its left. A pixel is filled
 * when the winding number along its scanline is non-zero, which keeps
 * overlapping shells (common in exported STL files) from carving holes.
 */

export interface RasterTarget {
  width: number;
  height: number;
  /** Edge length of one pixel in mm. */
  pixelMm: number;
  /** width*height bytes; 255 = exposed, 0 = dark. */
  data: Uint8Array;
}

export class SegmentRasterizer {
  private start = new Int32Array(0);
  private cursor = new Int32Array(0);
  private xs = new Float64Array(0);
  private dirs = new Int8Array(0);

  /**
   * @param segs flat x0,y0,x1,y1 (mm) per segment, relative to the model centre
   * @param count number of segments in `segs`
   * @param offX,offY position of the model centre on the target, mm
   */
  fill(segs: Float64Array, count: number, offX: number, offY: number, t: RasterTarget): void {
    const { width: W, height: H, pixelMm } = t;
    const inv = 1 / pixelMm;
    if (this.start.length < H + 1) {
      this.start = new Int32Array(H + 1);
      this.cursor = new Int32Array(H + 1);
    }
    const start = this.start;
    const cursor = this.cursor;
    start.fill(0, 0, H + 1);

    for (let s = 0; s < count; s++) {
      const y0 = (segs[s * 4 + 1] + offY) * inv;
      const y1 = (segs[s * 4 + 3] + offY) * inv;
      if (y0 === y1) continue;
      const [j0, j1] = rowRange(Math.min(y0, y1), Math.max(y0, y1), H);
      for (let j = j0; j <= j1; j++) start[j + 1]++;
    }
    for (let j = 0; j < H; j++) start[j + 1] += start[j];
    const total = start[H];
    if (total === 0) return;
    if (this.xs.length < total) {
      this.xs = new Float64Array(total * 2);
      this.dirs = new Int8Array(total * 2);
    }
    const xs = this.xs;
    const dirs = this.dirs;
    cursor.set(start.subarray(0, H));

    for (let s = 0; s < count; s++) {
      const x0 = (segs[s * 4] + offX) * inv;
      const y0 = (segs[s * 4 + 1] + offY) * inv;
      const x1 = (segs[s * 4 + 2] + offX) * inv;
      const y1 = (segs[s * 4 + 3] + offY) * inv;
      if (y0 === y1) continue;
      const dir = y1 > y0 ? 1 : -1;
      const [j0, j1] = rowRange(Math.min(y0, y1), Math.max(y0, y1), H);
      const slope = (x1 - x0) / (y1 - y0);
      for (let j = j0; j <= j1; j++) {
        const at = cursor[j]++;
        xs[at] = x0 + (j + 0.5 - y0) * slope;
        dirs[at] = dir;
      }
    }

    for (let j = 0; j < H; j++) {
      const a = start[j];
      const b = start[j + 1];
      if (b - a < 2) continue;
      // Insertion sort: rows hold only a handful of crossings.
      for (let i = a + 1; i < b; i++) {
        const x = xs[i];
        const d = dirs[i];
        let k = i - 1;
        while (k >= a && xs[k] > x) {
          xs[k + 1] = xs[k];
          dirs[k + 1] = dirs[k];
          k--;
        }
        xs[k + 1] = x;
        dirs[k + 1] = d;
      }
      let wind = 0;
      const row = j * W;
      for (let i = a; i < b - 1; i++) {
        wind += dirs[i];
        if (wind === 0) continue;
        const from = Math.max(0, Math.ceil(xs[i] - 0.5));
        const to = Math.min(W - 1, Math.ceil(xs[i + 1] - 0.5) - 1);
        if (to >= from) t.data.fill(255, row + from, row + to + 1);
      }
    }
  }
}

/** Rows whose centre (j + 0.5) lies in [ya, yb). */
function rowRange(ya: number, yb: number, height: number): [number, number] {
  return [Math.max(0, Math.ceil(ya - 0.5)), Math.min(height - 1, Math.ceil(yb - 0.5) - 1)];
}
