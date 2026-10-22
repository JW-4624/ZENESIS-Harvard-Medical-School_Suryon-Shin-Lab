import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Number input that tolerates half-typed values like "1." or an empty box. */
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 0.1,
  unit,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft((prev) => (Number(prev) === value ? prev : String(value)));
  }, [value]);

  const commit = (text: string) => {
    setDraft(text);
    const n = Number(text);
    if (text.trim() === "" || !Number.isFinite(n)) return;
    if (n < min || (max !== undefined && n > max)) return;
    onChange(n);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          value={draft}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => setDraft(String(value))}
          className="h-8 font-mono text-xs pr-9"
        />
        {unit && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
