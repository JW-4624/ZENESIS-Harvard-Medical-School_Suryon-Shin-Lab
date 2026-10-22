/**
 * UV engine calibration: converts a target light intensity (mW/cm²) into the
 * on-screen engine power setting of a specific machine.
 *
 * Source: ZENESIS "UV Output Measurement & Regression Analysis" inspection
 * sheet (ZNS-6200626-BFAP01, 385 nm, inspected 2026-07-02). The quadratic is
 * the sheet's own regression y = a·x² + b·x + c over the measured rows of
 * Table 1, where x is the engine power setting and y the output in mW/cm².
 *
 * Calibrations are per machine. Add another entry to `UV_CALIBRATIONS` for
 * each additional device.
 */

export interface UvCalibration {
  id: string;
  equipment: string;
  wavelengthNm: number;
  inspectedOn: string;
  /** Regression y = a·x² + b·x + c, x = engine setting, y = mW/cm². */
  coeffs: { a: number; b: number; c: number };
  r2: number;
  /** Selectable engine settings. */
  settingRange: [number, number];
  /** Output range covered by reliable measurements, mW/cm². */
  measuredOutputRange: [number, number];
  /** Table 1: setting → measured output (only rows that were measurable). */
  measured: { setting: number; output: number }[];
  /** Table 2: measured output → on-screen setting (only measurable rows). */
  displayTable: { output: number; setting: number }[];
}

export const ZENESIS_385: UvCalibration = {
  id: "ZNS-6200626-BFAP01",
  equipment: "ZENESIS ZNS-6200626-BFAP01",
  wavelengthNm: 385,
  inspectedOn: "2026-07-02",
  coeffs: { a: -8.9731682146543e-6, b: 0.0395121259029928, c: -0.848529411764712 },
  r2: 0.998238751333167,
  settingRange: [50, 950],
  measuredOutputRange: [2.5, 26],
  measured: [
    [50, 2.1],
    [100, 2.4],
    [150, 4.5],
    [200, 6.5],
    [250, 8.3],
    [300, 10.1],
    [350, 11.9],
    [400, 13.5],
    [450, 15.2],
    [500, 16.9],
    [550, 18.3],
    [600, 19.7],
    [650, 21.1],
    [700, 22.5],
    [750, 23.9],
    [800, 24.9],
    [850, 26],
  ].map(([setting, output]) => ({ setting, output })),
  displayTable: [
    [2.5, 100],
    [3, 113],
    [3.5, 124],
    [4, 136],
    [4.5, 150],
    [5, 162],
    [5.5, 174],
    [6, 186],
    [6.5, 200],
    [7, 213],
    [7.5, 226],
    [8, 242],
    [8.5, 254],
    [9, 268],
    [9.5, 280],
  ].map(([output, setting]) => ({ output, setting })),
};

export const UV_CALIBRATIONS: UvCalibration[] = [ZENESIS_385];

/**
 * Reads a light intensity out of free text such as "3.7", "3.7mW",
 * "광량 3.7", "3.7 mW/cm^2" or "3,7 mW/cm²". Returns null if there is no
 * positive number.
 */
export function parseIntensity(text: string): number | null {
  const match = text.match(/\d+(?:[.,]\d+)?|[.,]\d+/);
  if (!match) return null;
  const value = Number(match[0].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function predictOutput(cal: UvCalibration, setting: number): number {
  const { a, b, c } = cal.coeffs;
  return a * setting * setting + b * setting + c;
}

export interface SettingOption {
  setting: number;
  /** Output the regression predicts at this setting, mW/cm². */
  predicted: number;
}

export type RecommendationStatus = "ok" | "below-measured" | "above-measured" | "unreachable";

export interface SettingRecommendation {
  target: number;
  status: RecommendationStatus;
  /** Unrounded regression solution. */
  exact: number | null;
  /** Closest integer setting. Absent when the target cannot be reached. */
  primary?: SettingOption;
  /** The neighbouring integer when the solution falls between two settings. */
  alternate?: SettingOption;
  /** Setting interpolated from the raw measurements, when available. */
  measuredEstimate?: number;
}

/** Inverse of the regression: which engine setting gives `target` mW/cm²? */
export function recommendSetting(cal: UvCalibration, target: number): SettingRecommendation {
  const { a, b, c } = cal.coeffs;
  const [minSetting, maxSetting] = cal.settingRange;
  const result: SettingRecommendation = { target, status: "ok", exact: null };

  const disc = b * b - 4 * a * (c - target);
  const exact = disc >= 0 ? (-b + Math.sqrt(disc)) / (2 * a) : NaN;
  // Allow half a step of slack so targets at the very edge still round in.
  if (!Number.isFinite(exact) || exact < minSetting - 0.5 || exact > maxSetting + 0.5) {
    return { ...result, status: "unreachable" };
  }
  result.exact = exact;

  const clamp = (n: number) => Math.min(maxSetting, Math.max(minSetting, n));
  const options = [...new Set([Math.floor(exact), Math.ceil(exact)].map(clamp))]
    .map((setting) => ({ setting, predicted: predictOutput(cal, setting) }))
    .sort((p, q) => Math.abs(p.predicted - target) - Math.abs(q.predicted - target));
  result.primary = options[0];
  // Do not offer an alternative when the solution is effectively an integer.
  if (options.length > 1 && Math.abs(exact - Math.round(exact)) > 0.02) {
    result.alternate = options[1];
  }

  const [lo, hi] = cal.measuredOutputRange;
  if (target < lo) result.status = "below-measured";
  else if (target > hi) result.status = "above-measured";

  result.measuredEstimate = interpolateMeasured(cal, target);
  return result;
}

/** Linear interpolation over the raw measurements (output → setting). */
function interpolateMeasured(cal: UvCalibration, target: number): number | undefined {
  // The 50-setting row (2.1) sits too close to the 100-setting row (2.4) to be
  // monotonic in a useful way, so Table 1 is used from setting 100 upwards.
  const points = [
    ...cal.measured.filter((p) => p.setting >= 100).map((p) => ({ x: p.output, y: p.setting })),
    ...cal.displayTable.map((p) => ({ x: p.output, y: p.setting })),
  ].sort((p, q) => p.x - q.x || p.y - q.y);

  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i];
    const q = points[i + 1];
    if (target >= p.x && target <= q.x && q.x > p.x) {
      return p.y + ((target - p.x) / (q.x - p.x)) * (q.y - p.y);
    }
  }
  return undefined;
}
