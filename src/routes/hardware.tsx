import { createFileRoute } from "@tanstack/react-router";
import { ArrowUp, ArrowDown, Home, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export const Route = createFileRoute("/hardware")({
  component: HardwarePage,
});

function HardwarePage() {
  const [intensity, setIntensity] = useState([60]);
  const [uvOn, setUvOn] = useState(false);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
          Hardware
        </p>
        <h1 className="text-2xl font-semibold mt-1">Manual control</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Direct stage, light, and projector control. Use with care.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Z stage */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-1">Z Stage</h3>
          <p className="text-[11px] text-muted-foreground mb-4">Build platform position</p>
          <div className="flex items-center justify-center mb-4">
            <span className="font-mono text-3xl font-semibold tabular-nums">12.40</span>
            <span className="font-mono text-xs text-muted-foreground ml-1">mm</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[10, 1, 0.05].map((step) => (
              <Button key={`up-${step}`} variant="outline" size="sm" className="font-mono text-[11px]">
                <ArrowUp className="h-3 w-3 mr-1" /> {step}
              </Button>
            ))}
            {[10, 1, 0.05].map((step) => (
              <Button key={`down-${step}`} variant="outline" size="sm" className="font-mono text-[11px]">
                <ArrowDown className="h-3 w-3 mr-1" /> {step}
              </Button>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="w-full mt-3">
            <Home className="h-3.5 w-3.5 mr-1.5" /> Home Z
          </Button>
        </div>

        {/* Light source */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-1">UV Light · 405 nm</h3>
          <p className="text-[11px] text-muted-foreground mb-4">DMD projector array</p>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className={uvOn ? "h-4 w-4 text-uv" : "h-4 w-4 text-muted-foreground"} />
              <span className="text-sm">{uvOn ? "ON" : "OFF"}</span>
            </div>
            <Switch checked={uvOn} onCheckedChange={setUvOn} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Intensity</span>
              <span className="font-mono">{intensity[0]}%</span>
            </div>
            <Slider value={intensity} onValueChange={setIntensity} max={100} step={1} />
            <div className="text-[10px] font-mono text-muted-foreground">
              ≈ {((intensity[0] / 100) * 37.3).toFixed(1)} mW/cm²
            </div>
          </div>
        </div>

        {/* Vat / temp */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-1">Vat heater</h3>
          <p className="text-[11px] text-muted-foreground mb-4">Resin temperature control</p>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="font-mono text-3xl font-semibold tabular-nums">37.0</span>
            <span className="font-mono text-xs text-muted-foreground">°C</span>
          </div>
          <dl className="grid grid-cols-2 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Setpoint</dt>
            <dd className="text-right font-mono">37.0 °C</dd>
            <dt className="text-muted-foreground">PID mode</dt>
            <dd className="text-right font-mono">AUTO</dd>
            <dt className="text-muted-foreground">Heater duty</dt>
            <dd className="text-right font-mono">18%</dd>
          </dl>
          <Button variant="outline" size="sm" className="w-full mt-4">
            Adjust setpoint
          </Button>
        </div>
      </div>

      {/* Projector calibration */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-3">DMD Calibration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-muted-foreground mb-1">Resolution</div>
            <div className="font-mono text-base">1280 × 800</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Pixel pitch</div>
            <div className="font-mono text-base">25.4 µm</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Build area</div>
            <div className="font-mono text-base">32.5 × 20.3 mm</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Last calibrated</div>
            <div className="font-mono text-base">2 days ago</div>
          </div>
        </div>
      </div>
    </div>
  );
}
