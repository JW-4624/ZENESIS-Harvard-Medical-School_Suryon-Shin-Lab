import { buildFormat, FORMAT_SPECS, type FormatId } from "@/lib/autoslice/formats";
import { cn } from "@/lib/utils";

/** Small top-down schematic of a format: slide outline plus its wells. */
export function FormatGlyph({ id, className }: { id: FormatId; className?: string }) {
  const format = buildFormat(id);
  return (
    <svg viewBox={`0 0 ${format.width} ${format.height}`} className={className} aria-hidden>
      <rect
        x={0.4}
        y={0.4}
        width={format.width - 0.8}
        height={format.height - 0.8}
        rx={1.5}
        fill="none"
        stroke="currentColor"
        strokeWidth={0.8}
        opacity={0.5}
      />
      {format.wells.map((w) => (
        <rect
          key={w.id}
          x={w.cx - w.w / 2}
          y={w.cy - w.h / 2}
          width={w.w}
          height={w.h}
          rx={1}
          fill="currentColor"
          opacity={id === "slide" ? 0.08 : 0.22}
          stroke="currentColor"
          strokeWidth={0.6}
        />
      ))}
    </svg>
  );
}

export function FormatPicker({
  value,
  onChange,
}: {
  value: FormatId;
  onChange: (id: FormatId) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="radiogroup" aria-label="Format">
      {FORMAT_SPECS.map((spec) => {
        const active = spec.id === value;
        return (
          <button
            key={spec.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(spec.id)}
            className={cn(
              "rounded-md border p-2.5 text-left transition-colors",
              active
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent/40",
            )}
          >
            <FormatGlyph id={spec.id} className="w-full h-auto" />
            <div
              className={cn(
                "mt-2 text-xs font-medium",
                active ? "text-primary" : "text-foreground",
              )}
            >
              {spec.label}
            </div>
            <div className="text-[10px] leading-snug text-muted-foreground mt-0.5">
              {spec.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
