import { encodeGrayPng } from "./encode";
import type { PlateFormat, Well } from "./formats";
import type { RasterTarget } from "./raster";
import type { SliceSource } from "./sources";

export const AUTOSLICE_VERSION = "1.0.0";

const MAX_PLATE_PIXELS = 64_000_000;
const MAX_LAYERS = 20_000;

/** Target UV intensity and the engine setting chosen for it (optional). */
export interface LightSetting {
  equipment: string;
  wavelengthNm: number;
  targetMwPerCm2: number;
  engineSetting: number;
  predictedMwPerCm2: number;
}

export interface SliceJob {
  name: string;
  format: PlateFormat;
  /** Wells that receive the design (subset of `format.wells`). */
  wellIds: string[];
  source: SliceSource;
  /** Human-readable description of the input, stored in the manifest. */
  sourceInfo: Record<string, unknown>;
  layerHeightMm: number;
  pixelMm: number;
  /** One full-footprint PNG per layer. */
  outputPlate: boolean;
  /** One cropped PNG per layer for every selected well. */
  outputWells: boolean;
  light?: LightSetting;
}

export interface OutputSink {
  write(path: string, data: Uint8Array | string): Promise<void>;
}

export interface SliceProgress {
  done: number;
  total: number;
  layer: number;
  layers: number;
}

export interface SliceSummary {
  folder: string;
  layers: number;
  files: number;
  plateWidth: number;
  plateHeight: number;
}

export function layerCount(heightMm: number, layerHeightMm: number): number {
  return Math.max(1, Math.ceil(heightMm / layerHeightMm - 1e-9));
}

export function sanitizeName(name: string): string {
  const clean = name
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .replace(/^[._]+|[._]+$/g, "");
  return clean || "slice_job";
}

export function pad(n: number): string {
  return String(n).padStart(5, "0");
}

/** Pixel rectangle of a well on the plate image. */
export function wellRect(well: Well, pixelMm: number, plateW: number, plateH: number) {
  const x0 = Math.max(0, Math.round((well.cx - well.w / 2) / pixelMm));
  const y0 = Math.max(0, Math.round((well.cy - well.h / 2) / pixelMm));
  const x1 = Math.min(plateW, Math.round((well.cx + well.w / 2) / pixelMm));
  const y1 = Math.min(plateH, Math.round((well.cy + well.h / 2) / pixelMm));
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}

/** Renders layers of a job onto a reusable plate-sized bitmap. */
export class LayerRenderer {
  readonly target: RasterTarget;
  readonly layers: number;
  readonly wells: Well[];

  constructor(private readonly job: SliceJob) {
    const { format, pixelMm, layerHeightMm, source } = job;
    const width = Math.ceil(format.width / pixelMm);
    const height = Math.ceil(format.height / pixelMm);
    if (width * height > MAX_PLATE_PIXELS) {
      throw new Error("Pixel size is too small for this format. Increase the pixel size.");
    }
    this.layers = layerCount(source.height, layerHeightMm);
    if (this.layers > MAX_LAYERS) {
      throw new Error(`Too many layers (${this.layers}). Increase the layer height.`);
    }
    this.target = { width, height, pixelMm, data: new Uint8Array(width * height) };
    this.wells = format.wells.filter((w) => job.wellIds.includes(w.id));
  }

  /** Mid-plane height of layer `index` (0-based), clamped inside the last layer. */
  private layerZ(index: number): number {
    const { layerHeightMm, source } = this.job;
    const bottom = index * layerHeightMm;
    const top = Math.min(bottom + layerHeightMm, source.height);
    return (bottom + top) / 2;
  }

  /** Returns the shared plate bitmap with layer `index` painted into it. */
  render(index: number): Uint8Array {
    this.target.data.fill(0);
    const shape = this.job.source.sliceLayer(this.layerZ(index));
    for (const well of this.wells) shape.fill(this.target, well.cx, well.cy);
    return this.target.data;
  }
}

export async function runSlice(
  job: SliceJob,
  sink: OutputSink,
  hooks: { onProgress?: (p: SliceProgress) => void; signal?: AbortSignal } = {},
): Promise<SliceSummary> {
  if (!job.outputPlate && !job.outputWells) {
    throw new Error("Select at least one output type.");
  }
  if (job.wellIds.length === 0) throw new Error("Select at least one well.");

  const renderer = new LayerRenderer(job);
  const { target, layers, wells } = renderer;
  const folder = sanitizeName(job.name);
  const perLayerFiles = (job.outputPlate ? 1 : 0) + (job.outputWells ? wells.length : 0);
  const total = layers * perLayerFiles;
  let done = 0;
  let lastYield = performance.now();

  const rects = wells.map((w) => wellRect(w, job.pixelMm, target.width, target.height));

  let cached: { plate?: Uint8Array; wells: Uint8Array[] } | null = null;

  for (let layer = 0; layer < layers; layer++) {
    if (hooks.signal?.aborted) throw new DOMException("Slicing cancelled.", "AbortError");

    if (!(job.source.uniform && cached)) {
      const bitmap = renderer.render(layer);
      cached = { wells: [] };
      if (job.outputPlate) {
        cached.plate = await encodeGrayPng(bitmap, target.width, target.height, job.pixelMm);
      }
      if (job.outputWells) {
        for (const r of rects) {
          const crop = new Uint8Array(r.w * r.h);
          for (let y = 0; y < r.h; y++) {
            const from = (r.y + y) * target.width + r.x;
            crop.set(bitmap.subarray(from, from + r.w), y * r.w);
          }
          cached.wells.push(await encodeGrayPng(crop, r.w, r.h, job.pixelMm));
        }
      }
    }

    const name = `layer_${pad(layer + 1)}.png`;
    if (cached?.plate) {
      await sink.write(`${folder}/plate/${name}`, cached.plate);
      hooks.onProgress?.({ done: ++done, total, layer: layer + 1, layers });
    }
    if (cached) {
      for (let i = 0; i < cached.wells.length; i++) {
        await sink.write(`${folder}/wells/${wells[i].id}/${name}`, cached.wells[i]);
        hooks.onProgress?.({ done: ++done, total, layer: layer + 1, layers });
      }
    }

    if (performance.now() - lastYield > 40) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYield = performance.now();
    }
  }

  await sink.write(
    `${folder}/manifest.json`,
    JSON.stringify(buildManifest(job, renderer, rects), null, 2),
  );
  await sink.write(`${folder}/README.txt`, buildReadme(job, renderer));

  return {
    folder,
    layers,
    files: total + 2,
    plateWidth: target.width,
    plateHeight: target.height,
  };
}

function buildManifest(
  job: SliceJob,
  renderer: LayerRenderer,
  rects: ReturnType<typeof wellRect>[],
) {
  const { target, layers, wells } = renderer;
  return {
    tool: "Helix Auto Slice",
    version: AUTOSLICE_VERSION,
    createdAt: new Date().toISOString(),
    job: sanitizeName(job.name),
    format: {
      id: job.format.id,
      label: job.format.label,
      footprintMm: { width: job.format.width, height: job.format.height },
    },
    source: job.sourceInfo,
    model: {
      extentMm: {
        x: round(job.source.extent.w),
        y: round(job.source.extent.h),
        z: round(job.source.height),
      },
    },
    slicing: {
      layerHeightMm: job.layerHeightMm,
      layerCount: layers,
      pixelSizeMm: job.pixelMm,
      imageSizePx: { width: target.width, height: target.height },
      origin: "top-left, +x right, +y down (viewed from above)",
      encoding: "PNG 8-bit grayscale, 255 = exposed, 0 = dark",
    },
    light: job.light
      ? {
          equipment: job.light.equipment,
          wavelengthNm: job.light.wavelengthNm,
          targetMwPerCm2: job.light.targetMwPerCm2,
          engineSetting: job.light.engineSetting,
          predictedMwPerCm2: round(job.light.predictedMwPerCm2),
        }
      : null,
    outputs: {
      plate: job.outputPlate ? "plate/layer_NNNNN.png" : null,
      wells: job.outputWells ? "wells/<well id>/layer_NNNNN.png" : null,
    },
    wells: wells.map((w, i) => ({
      id: w.id,
      centerMm: { x: round(w.cx), y: round(w.cy) },
      sizeMm: { width: round(w.w), height: round(w.h) },
      pixelRect: rects[i],
    })),
  };
}

function buildReadme(job: SliceJob, renderer: LayerRenderer): string {
  const { target, layers, wells } = renderer;
  return [
    `Helix Auto Slice v${AUTOSLICE_VERSION}`,
    "",
    `Format      : ${job.format.label} (${job.format.width} x ${job.format.height} mm)`,
    `Wells       : ${wells.map((w) => w.id).join(", ")}`,
    `Layers      : ${layers} x ${job.layerHeightMm * 1000} um`,
    `Pixel size  : ${job.pixelMm * 1000} um  (${target.width} x ${target.height} px per plate image)`,
    ...(job.light
      ? [
          `UV light    : ${job.light.targetMwPerCm2} mW/cm2 @ ${job.light.wavelengthNm} nm -> engine setting ${job.light.engineSetting} (${job.light.equipment})`,
        ]
      : []),
    "",
    "plate/   one full-footprint mask per layer (all selected wells in one image)",
    "wells/   one cropped mask per well and layer (only if enabled)",
    "manifest.json   machine-readable description of everything above",
    "",
    "White (255) pixels are exposed, black (0) pixels stay dark.",
    "Images are viewed from above with the origin in the top-left corner.",
    "",
  ].join("\n");
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
