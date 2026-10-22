import { useEffect, useRef } from "react";
import type { PlateFormat } from "@/lib/autoslice/formats";
import type { RasterTarget } from "@/lib/autoslice/raster";
import { cn } from "@/lib/utils";

/**
 * Top-down view of the slide with its wells. The canvas shows the sliced layer
 * bitmap; the SVG overlay draws the wells and lets users toggle them.
 */
export function PlatePreview({
  format,
  selected,
  onToggle,
  bitmap,
}: {
  format: PlateFormat;
  selected: Set<string>;
  onToggle: (id: string) => void;
  bitmap: RasterTarget | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(bitmap.width, bitmap.height);
    const px = image.data;
    for (let i = 0; i < bitmap.data.length; i++) {
      if (bitmap.data[i]) {
        px[i * 4] = 18;
        px[i * 4 + 1] = 148;
        px[i * 4 + 2] = 176;
        px[i * 4 + 3] = 235;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [bitmap]);

  return (
    <div
      className="relative w-full rounded-md border border-border stat-grid-bg overflow-hidden"
      style={{ aspectRatio: `${format.width} / ${format.height}` }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
      <svg
        viewBox={`0 0 ${format.width} ${format.height}`}
        className="absolute inset-0 h-full w-full"
        role="group"
        aria-label="Wells"
      >
        {format.wells.map((w) => {
          const active = selected.has(w.id);
          return (
            <g
              key={w.id}
              role="checkbox"
              aria-checked={active}
              aria-label={`Well ${w.id}`}
              tabIndex={0}
              onClick={() => onToggle(w.id)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  onToggle(w.id);
                }
              }}
              className={cn("cursor-pointer outline-none", !active && "opacity-60")}
            >
              <rect
                x={w.cx - w.w / 2}
                y={w.cy - w.h / 2}
                width={w.w}
                height={w.h}
                rx={0.8}
                fill={active ? "oklch(0.58 0.11 200 / 0.07)" : "oklch(0.5 0.015 240 / 0.12)"}
                stroke={active ? "oklch(0.58 0.11 200)" : "oklch(0.5 0.015 240)"}
                strokeWidth={0.35}
                strokeDasharray={active ? undefined : "1.2 0.9"}
              />
              {format.id !== "slide" && (
                <text
                  x={w.cx - w.w / 2 + 0.9}
                  y={w.cy - w.h / 2 + 2.2}
                  fontSize={1.9}
                  fontFamily="var(--font-mono)"
                  fill="oklch(0.5 0.015 240)"
                >
                  {w.id}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
