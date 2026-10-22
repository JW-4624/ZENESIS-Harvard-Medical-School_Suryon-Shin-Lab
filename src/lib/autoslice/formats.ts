/**
 * Print-surface formats supported by Auto Slice.
 *
 * All formats share the standard 75 × 25 mm microscope-slide footprint (the
 * footprint of 1/2/4/8-well chamber slides as well as of a plain slide glass).
 * Coordinates are millimetres, origin at the top-left corner of the footprint,
 * x to the right, y downwards (same orientation as the exported images).
 *
 * Well sizes are nominal culture-area dimensions of common chamber slides and
 * can be overridden in the UI, because vendors differ by a millimetre or two.
 */

export type FormatId = "1well" | "2well" | "4well" | "8well" | "slide";

export interface Well {
  id: string;
  /** Centre of the well, mm from the top-left of the footprint. */
  cx: number;
  cy: number;
  /** Printable area of the well, mm. */
  w: number;
  h: number;
}

export interface PlateFormat {
  id: FormatId;
  label: string;
  description: string;
  /** Footprint of the whole slide, mm. */
  width: number;
  height: number;
  wells: Well[];
}

interface FormatSpec {
  id: FormatId;
  label: string;
  description: string;
  cols: number;
  rows: number;
  wellW: number;
  wellH: number;
}

export const SLIDE_WIDTH_MM = 75;
export const SLIDE_HEIGHT_MM = 25;

export const FORMAT_SPECS: FormatSpec[] = [
  {
    id: "1well",
    label: "1 well",
    description: "Single chamber · ≈ 8 cm²",
    cols: 1,
    rows: 1,
    wellW: 40,
    wellH: 20,
  },
  {
    id: "2well",
    label: "2 well",
    description: "2 × 1 chambers · ≈ 4 cm² each",
    cols: 2,
    rows: 1,
    wellW: 20,
    wellH: 20,
  },
  {
    id: "4well",
    label: "4 well",
    description: "2 × 2 chambers · ≈ 1.8 cm² each",
    cols: 2,
    rows: 2,
    wellW: 18,
    wellH: 10,
  },
  {
    id: "8well",
    label: "8 well",
    description: "4 × 2 chambers · ≈ 0.7 cm² each",
    cols: 4,
    rows: 2,
    wellW: 10,
    wellH: 7,
  },
  {
    id: "slide",
    label: "Slide glass",
    description: "Open 75 × 25 mm slide · 2 mm margin",
    cols: 1,
    rows: 1,
    wellW: SLIDE_WIDTH_MM - 4,
    wellH: SLIDE_HEIGHT_MM - 4,
  },
];

export interface WellSizeOverride {
  w?: number;
  h?: number;
}

/** Builds a format with wells distributed evenly over the slide footprint. */
export function buildFormat(id: FormatId, override: WellSizeOverride = {}): PlateFormat {
  const spec = FORMAT_SPECS.find((f) => f.id === id);
  if (!spec) throw new Error(`Unknown format: ${id}`);

  const wellW = clampSize(override.w ?? spec.wellW, SLIDE_WIDTH_MM / spec.cols);
  const wellH = clampSize(override.h ?? spec.wellH, SLIDE_HEIGHT_MM / spec.rows);
  const gapX = (SLIDE_WIDTH_MM - spec.cols * wellW) / (spec.cols + 1);
  const gapY = (SLIDE_HEIGHT_MM - spec.rows * wellH) / (spec.rows + 1);

  const wells: Well[] = [];
  for (let r = 0; r < spec.rows; r++) {
    for (let c = 0; c < spec.cols; c++) {
      wells.push({
        id: spec.id === "slide" ? "slide" : `${String.fromCharCode(65 + r)}${c + 1}`,
        cx: gapX * (c + 1) + wellW * (c + 0.5),
        cy: gapY * (r + 1) + wellH * (r + 0.5),
        w: wellW,
        h: wellH,
      });
    }
  }

  return {
    id: spec.id,
    label: spec.label,
    description: spec.description,
    width: SLIDE_WIDTH_MM,
    height: SLIDE_HEIGHT_MM,
    wells,
  };
}

function clampSize(value: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0) return max / 2;
  return Math.min(value, max);
}

export function defaultWellSize(id: FormatId): { w: number; h: number } {
  const spec = FORMAT_SPECS.find((f) => f.id === id);
  if (!spec) throw new Error(`Unknown format: ${id}`);
  return { w: spec.wellW, h: spec.wellH };
}
