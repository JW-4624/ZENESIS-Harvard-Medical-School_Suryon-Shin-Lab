import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/slicer")({
  component: SlicerPage,
});

function SlicerPage() {
  const [layer, setLayer] = useState([248]);
  const total = 600;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
          Slicer
        </p>
        <h1 className="text-2xl font-semibold mt-1">Layer preview</h1>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-medium">Layer {layer[0]} / {total}</h3>
            <span className="text-[10px] font-mono text-muted-foreground">
              Z = {(layer[0] * 0.05).toFixed(2)} mm
            </span>
          </div>
          <div className="aspect-square stat-grid-bg flex items-center justify-center relative">
            <svg viewBox="0 0 200 200" className="w-2/3 h-2/3">
              <circle cx="100" cy="100" r="70" fill="none" stroke="oklch(0.58 0.11 200)" strokeWidth="1.5" />
              <circle cx="100" cy="100" r="50" fill="none" stroke="oklch(0.58 0.11 200)" strokeWidth="1" opacity="0.6" />
              <circle cx="100" cy="100" r="30" fill="oklch(0.58 0.11 200)" opacity="0.15" />
              {Array.from({ length: 8 }).map((_, i) => {
                const a = (i * Math.PI) / 4;
                return (
                  <line
                    key={i}
                    x1={100 + Math.cos(a) * 30}
                    y1={100 + Math.sin(a) * 30}
                    x2={100 + Math.cos(a) * 70}
                    y2={100 + Math.sin(a) * 70}
                    stroke="oklch(0.58 0.11 200)"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                );
              })}
            </svg>
          </div>
          <div className="px-4 py-3 border-t border-border">
            <Slider
              value={layer}
              onValueChange={setLayer}
              min={1}
              max={total}
              step={1}
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-2">
              <span>1</span>
              <span>{total}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-3">Slice settings</h3>
            <dl className="grid grid-cols-2 gap-y-2 text-xs">
              <dt className="text-muted-foreground">Layer height</dt>
              <dd className="text-right font-mono">50 µm</dd>
              <dt className="text-muted-foreground">Bottom layers</dt>
              <dd className="text-right font-mono">5</dd>
              <dt className="text-muted-foreground">Bottom exposure</dt>
              <dd className="text-right font-mono">12.0 s</dd>
              <dt className="text-muted-foreground">Normal exposure</dt>
              <dd className="text-right font-mono">4.2 s</dd>
              <dt className="text-muted-foreground">Anti-aliasing</dt>
              <dd className="text-right font-mono">4×</dd>
            </dl>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-3">Model</h3>
            <dl className="grid grid-cols-2 gap-y-2 text-xs">
              <dt className="text-muted-foreground">File</dt>
              <dd className="text-right font-mono truncate">lobule_v3.stl</dd>
              <dt className="text-muted-foreground">Volume</dt>
              <dd className="text-right font-mono">1.84 mL</dd>
              <dt className="text-muted-foreground">Bounding</dt>
              <dd className="text-right font-mono">22×22×30</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
