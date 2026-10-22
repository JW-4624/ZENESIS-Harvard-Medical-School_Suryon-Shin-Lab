import { AlertTriangle, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented } from "@/components/autoslice/segmented";
import {
  parseIntensity,
  recommendSetting,
  UV_CALIBRATIONS,
  type UvCalibration,
} from "@/lib/autoslice/uv-calibration";

/** Cross-check differences smaller than this many engine units are not worth showing. */
const CROSS_CHECK_GAP = 5;

/**
 * Turns a target intensity ("3.7", "3.7mW", "3.7 mW/cm²" …) into the engine
 * power setting to type into the machine.
 */
export function UvIntensity({
  text,
  onText,
  calibration,
  onCalibration,
}: {
  text: string;
  onText: (text: string) => void;
  calibration: UvCalibration;
  onCalibration: (id: string) => void;
}) {
  const target = parseIntensity(text);
  const rec = target === null ? null : recommendSetting(calibration, target);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Enter the light intensity you want, for example <code className="font-mono">3.7</code>,{" "}
        <code className="font-mono">3.7mW</code> or <code className="font-mono">3.7 mW/cm²</code>,
        and this shows which value to set on the machine.
      </p>

      {UV_CALIBRATIONS.length > 1 && (
        <Segmented
          label="Machine"
          value={calibration.id}
          onChange={onCalibration}
          options={UV_CALIBRATIONS.map((c) => ({ value: c.id, label: c.id }))}
        />
      )}

      <div className="space-y-1.5">
        <Label htmlFor="uv-target" className="text-xs text-muted-foreground">
          Target light intensity
        </Label>
        <div className="relative max-w-xs">
          <Input
            id="uv-target"
            value={text}
            onChange={(e) => onText(e.target.value)}
            placeholder="3.7 mW/cm²"
            inputMode="decimal"
            className="h-8 font-mono text-xs pr-16"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">
            mW/cm²
          </span>
        </div>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground">
        {calibration.equipment} · {calibration.wavelengthNm} nm · inspected{" "}
        {calibration.inspectedOn}
      </p>

      {text.trim() !== "" && target === null && (
        <Notice>Could not find a number in “{text}”. Try something like 3.7 mW/cm².</Notice>
      )}

      {rec && rec.status === "unreachable" && (
        <Notice>
          {target} mW/cm² is outside what this machine can produce (about{" "}
          {format(calibration.coeffs, calibration.settingRange[0])}–
          {format(calibration.coeffs, calibration.settingRange[1])} mW/cm² for settings{" "}
          {calibration.settingRange[0]}–{calibration.settingRange[1]}).
        </Notice>
      )}

      {rec && rec.primary && (
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            For {rec.target} mW/cm², set the machine to
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-semibold font-mono text-primary">
              {rec.primary.setting}
            </span>
            {rec.alternate && (
              <span className="text-sm text-muted-foreground">
                or <span className="font-mono font-medium">{rec.alternate.setting}</span>
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] font-mono text-muted-foreground">
            {rec.primary.setting} → {rec.primary.predicted.toFixed(2)} mW/cm²
            {rec.alternate &&
              ` · ${rec.alternate.setting} → ${rec.alternate.predicted.toFixed(2)} mW/cm²`}
          </p>
        </div>
      )}

      {rec && rec.status === "below-measured" && rec.primary && (
        <Notice>
          The inspection sheet could not measure anything below {calibration.measuredOutputRange[0]}{" "}
          mW/cm², so this setting is extrapolated. Verify it with a power meter.
        </Notice>
      )}
      {rec && rec.status === "above-measured" && rec.primary && (
        <Notice>
          The highest measured output is {calibration.measuredOutputRange[1]} mW/cm²; settings above
          850 could not be measured, so this value is extrapolated.
        </Notice>
      )}
      {rec &&
        rec.primary &&
        rec.exact !== null &&
        rec.measuredEstimate !== undefined &&
        Math.abs(rec.measuredEstimate - rec.exact) >= CROSS_CHECK_GAP && (
          <Notice>
            The sheet’s direct readings point to about {Math.round(rec.measuredEstimate)} instead
            (the fit is less accurate at low intensity). Check with a power meter if exactness
            matters.
          </Notice>
        )}
    </div>
  );
}

function format({ a, b, c }: UvCalibration["coeffs"], x: number): string {
  return (a * x * x + b * x + c).toFixed(1);
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs"
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
      <span>{children}</span>
    </div>
  );
}
