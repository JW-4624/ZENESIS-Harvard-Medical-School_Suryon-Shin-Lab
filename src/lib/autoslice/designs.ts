/** 2D design helpers: parametric presets and image masks. */

import type { Design2D } from "./sources";

export type PresetKind = "disc" | "rectangle" | "lattice" | "channels";

export interface PresetParams {
  kind: PresetKind;
  /** Disc diameter, or rectangle / lattice width, mm. */
  width: number;
  /** Rectangle / lattice height, mm (ignored for a disc). */
  height: number;
  /** Lattice line pitch, mm. */
  pitch: number;
  /** Lattice line width, or channel width, mm. */
  strut: number;
  /** Channel length, mm (channels only). */
  length: number;
}

export function createPresetDesign(p: PresetParams): Design2D {
  switch (p.kind) {
    case "disc": {
      const r = p.width / 2;
      return { width: p.width, height: p.width, inside: (u, v) => u * u + v * v <= r * r };
    }
    case "rectangle":
      return { width: p.width, height: p.height, inside: () => true };
    case "channels": {
      // Channels run along x; `pitch` is centre-to-centre, so the gap is pitch - strut.
      // The array is tiled with the same gap in both directions and centred in the area.
      const gap = Math.max(p.pitch - p.strut, 0);
      const pitchY = Math.max(p.pitch, 1e-3);
      const pitchX = Math.max(p.length + gap, 1e-3);
      const eps = 1e-9;
      const cols = Math.max(1, Math.floor((p.width + gap) / pitchX + eps));
      const rows = Math.max(1, Math.floor((p.height + gap) / pitchY + eps));
      const offX = (p.width - (cols * p.length + (cols - 1) * gap)) / 2;
      const offY = (p.height - (rows * p.strut + (rows - 1) * gap)) / 2;
      const along = (pos: number, size: number, pitch: number, count: number) => {
        if (pos < 0) return false;
        const k = Math.floor(pos / pitch + eps);
        return k < count && pos - k * pitch <= size + eps;
      };
      return {
        width: p.width,
        height: p.height,
        inside: (u, v) => {
          const x = u + p.width / 2 - offX;
          const y = v + p.height / 2 - offY;
          return along(x, p.length, pitchX, cols) && along(y, p.strut, pitchY, rows);
        },
      };
    }
    case "lattice": {
      const pitch = Math.max(p.pitch, p.strut * 1.01, 1e-3);
      const half = p.strut / 2;
      const w = p.width;
      const h = p.height;
      // Lines are laid out from the top-left corner so the border is always a strut.
      const onLine = (pos: number, size: number) => {
        const m = pos + size / 2;
        const d = m % pitch;
        return Math.min(d, pitch - d) <= half || size - m <= half;
      };
      return {
        width: w,
        height: h,
        inside: (u, v) => onLine(u, w) || onLine(v, h),
      };
    }
  }
}

export interface ImageMask {
  width: number;
  height: number;
  /** 1 = material. */
  data: Uint8Array;
}

/** Wraps an image mask as a design that is `widthMm` wide (aspect preserved). */
export function createImageDesign(mask: ImageMask, widthMm: number): Design2D {
  const heightMm = (widthMm * mask.height) / mask.width;
  return {
    width: widthMm,
    height: heightMm,
    inside(u, v) {
      const x = Math.floor((u / widthMm + 0.5) * mask.width);
      const y = Math.floor((v / heightMm + 0.5) * mask.height);
      if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
      return mask.data[y * mask.width + x] === 1;
    },
  };
}

const MAX_MASK_SIDE = 2048;

/**
 * Browser-only: decodes PNG / JPG / SVG into a binary mask. By default dark
 * opaque pixels are material (black artwork on white paper).
 */
export async function loadImageMask(file: File, darkIsMaterial: boolean): Promise<ImageMask> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const natural = {
      w: img.naturalWidth || 1024,
      h: img.naturalHeight || 1024,
    };
    const ratio = Math.min(1, MAX_MASK_SIDE / Math.max(natural.w, natural.h));
    const width = Math.max(1, Math.round(natural.w * ratio));
    const height = Math.max(1, Math.round(natural.h * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.drawImage(img, 0, 0, width, height);
    const rgba = ctx.getImageData(0, 0, width, height).data;

    const data = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i++) {
      const r = rgba[i * 4];
      const g = rgba[i * 4 + 1];
      const b = rgba[i * 4 + 2];
      const a = rgba[i * 4 + 3];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const dark = luma < 128;
      data[i] = a >= 128 && dark === darkIsMaterial ? 1 : 0;
    }
    return { width, height, data };
  } finally {
    URL.revokeObjectURL(url);
  }
}
