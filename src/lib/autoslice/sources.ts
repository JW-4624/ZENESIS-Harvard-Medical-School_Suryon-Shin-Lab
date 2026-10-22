/**
 * Slice sources: anything that can answer "what is solid at height z?".
 * Two kinds exist: triangle meshes (STL) and 2D designs extruded to a thickness.
 */

import type { Mesh } from "./stl";
import { SegmentRasterizer, type RasterTarget } from "./raster";

export interface LayerShape {
  /** Paints this layer onto `target`, centred at (cx, cy) mm. */
  fill(target: RasterTarget, cx: number, cy: number): void;
}

export interface SliceSource {
  /** Bounding box in XY after scaling, mm. */
  extent: { w: number; h: number };
  /** Total height, mm. */
  height: number;
  /** True when every layer is identical, so one render can be reused. */
  uniform: boolean;
  /** Valid until the next call. */
  sliceLayer(z: number): LayerShape;
}

export interface MeshBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export function meshBounds(mesh: Mesh): MeshBounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const v = mesh.vertices;
  for (let i = 0; i < v.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const value = v[i + k];
      if (value < min[k]) min[k] = value;
      if (value > max[k]) max[k] = value;
    }
  }
  return { min, max };
}

/**
 * Scales the mesh, centres it in XY, drops it onto z = 0 and flips Y so that
 * the exported image reads like the model seen from above (image y is down).
 */
export function createMeshSource(mesh: Mesh, scale: number): SliceSource {
  const bounds = meshBounds(mesh);
  const cx = (bounds.min[0] + bounds.max[0]) / 2;
  const cy = (bounds.min[1] + bounds.max[1]) / 2;
  const n = mesh.triangleCount;
  const verts = new Float64Array(n * 9);
  const zMin = new Float64Array(n);
  const zMax = new Float64Array(n);

  for (let t = 0; t < n; t++) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 0; k < 3; k++) {
      const i = t * 9 + k * 3;
      verts[i] = (mesh.vertices[i] - cx) * scale;
      verts[i + 1] = -(mesh.vertices[i + 1] - cy) * scale;
      const z = (mesh.vertices[i + 2] - bounds.min[2]) * scale;
      verts[i + 2] = z;
      if (z < lo) lo = z;
      if (z > hi) hi = z;
    }
    zMin[t] = lo;
    zMax[t] = hi;
  }

  const rasterizer = new SegmentRasterizer();
  let segs = new Float64Array(4 * 1024);
  let count = 0;
  const point = new Float64Array(2);

  const shape: LayerShape = {
    fill: (target, offX, offY) => rasterizer.fill(segs, count, offX, offY, target),
  };

  return {
    extent: {
      w: (bounds.max[0] - bounds.min[0]) * scale,
      h: (bounds.max[1] - bounds.min[1]) * scale,
    },
    height: (bounds.max[2] - bounds.min[2]) * scale,
    uniform: false,
    sliceLayer(z) {
      count = 0;
      for (let t = 0; t < n; t++) {
        // A vertex exactly on the plane counts as "above", which keeps loops closed.
        if (zMin[t] >= z || zMax[t] < z) continue;
        const o = t * 9;
        const above0 = verts[o + 2] >= z;
        const above1 = verts[o + 5] >= z;
        const above2 = verts[o + 8] >= z;
        let lone: number;
        if (above0 === above1) lone = 2;
        else if (above0 === above2) lone = 1;
        else lone = 0;
        const p = (lone + 1) % 3;
        const q = (lone + 2) % 3;

        const ux = verts[o + 3] - verts[o];
        const uy = verts[o + 4] - verts[o + 1];
        const uz = verts[o + 5] - verts[o + 2];
        const wx = verts[o + 6] - verts[o];
        const wy = verts[o + 7] - verts[o + 1];
        const wz = verts[o + 8] - verts[o + 2];
        const nx = uy * wz - uz * wy;
        const ny = uz * wx - ux * wz;
        if (nx === 0 && ny === 0) continue;

        edgePoint(verts, o + lone * 3, o + p * 3, z, point);
        const ax = point[0];
        const ay = point[1];
        edgePoint(verts, o + lone * 3, o + q * 3, z, point);
        const bx = point[0];
        const by = point[1];

        if (count * 4 + 4 > segs.length) {
          const grown = new Float64Array(segs.length * 2);
          grown.set(segs);
          segs = grown;
        }
        // Solid on the left of the segment: tangent is (-ny, nx) of the outward normal.
        const forward = (bx - ax) * -ny + (by - ay) * nx >= 0;
        const s = count * 4;
        segs[s] = forward ? ax : bx;
        segs[s + 1] = forward ? ay : by;
        segs[s + 2] = forward ? bx : ax;
        segs[s + 3] = forward ? by : ay;
        count++;
      }
      return shape;
    },
  };
}

/**
 * Intersection of edge (i → j) with the plane. Endpoints are ordered
 * canonically so the two triangles sharing an edge get bit-identical points.
 */
function edgePoint(v: Float64Array, i: number, j: number, z: number, out: Float64Array): void {
  const swap =
    v[j + 2] < v[i + 2] ||
    (v[j + 2] === v[i + 2] && (v[j] < v[i] || (v[j] === v[i] && v[j + 1] < v[i + 1])));
  const a = swap ? j : i;
  const b = swap ? i : j;
  const dz = v[b + 2] - v[a + 2];
  const t = dz === 0 ? 0 : (z - v[a + 2]) / dz;
  out[0] = v[a] + (v[b] - v[a]) * t;
  out[1] = v[a + 1] + (v[b + 1] - v[a + 1]) * t;
}

/** A 2D design: `inside(u, v)` with u,v in mm from its centre, v pointing down. */
export interface Design2D {
  width: number;
  height: number;
  inside(u: number, v: number): boolean;
}

export function createExtrusionSource(design: Design2D, thickness: number): SliceSource {
  const shape: LayerShape = {
    fill(target, cx, cy) {
      const { width: W, height: H, pixelMm: px, data } = target;
      const x0 = Math.max(0, Math.floor((cx - design.width / 2) / px));
      const x1 = Math.min(W - 1, Math.ceil((cx + design.width / 2) / px));
      const y0 = Math.max(0, Math.floor((cy - design.height / 2) / px));
      const y1 = Math.min(H - 1, Math.ceil((cy + design.height / 2) / px));
      for (let j = y0; j <= y1; j++) {
        const v = (j + 0.5) * px - cy;
        for (let i = x0; i <= x1; i++) {
          if (design.inside((i + 0.5) * px - cx, v)) data[j * W + i] = 255;
        }
      }
    },
  };
  return {
    extent: { w: design.width, h: design.height },
    height: thickness,
    uniform: true,
    sliceLayer: () => shape,
  };
}
