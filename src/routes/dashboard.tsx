import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Droplet,
  Thermometer,
  Zap,
  Layers,
  Clock,
  AlertTriangle,
  Pause,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const layer = 248;
  const totalLayers = 600;
  const pct = (layer / totalLayers) * 100;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
            Active Job · J-2041
          </p>
          <h1 className="text-2xl font-semibold mt-1">Hepatic lobule scaffold v3</h1>
          <p className="text-sm text-muted-foreground mt-1">
            GelMA 10% · 405 nm · started 14:22 KST
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Pause className="h-3.5 w-3.5 mr-1.5" /> Pause
          </Button>
          <Button variant="destructive" size="sm">
            <Square className="h-3.5 w-3.5 mr-1.5" /> Abort
          </Button>
        </div>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={Layers}
          label="Layer"
          value={`${layer}`}
          sub={`of ${totalLayers}`}
        />
        <StatCard icon={Clock} label="ETA" value="38:14" sub="hh:mm remaining" />
        <StatCard
          icon={Thermometer}
          label="Vat Temp"
          value="37.0"
          unit="°C"
          sub="target 37.0"
          status="ok"
        />
        <StatCard
          icon={Zap}
          label="UV Power"
          value="22.4"
          unit="mW/cm²"
          sub="405 nm"
          status="uv"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live preview */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 pulse-dot" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <h3 className="text-sm font-medium">Build Chamber · Live</h3>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <span>1280×800</span>
              <span>·</span>
              <span>30 FPS</span>
            </div>
          </div>
          <div className="relative aspect-[16/10] stat-grid-bg flex items-center justify-center">
            {/* Faux build stage rendering */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="h-48 w-48 rounded-full border border-uv/40 bg-uv/5 flex items-center justify-center">
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-uv/30 to-primary/10 blur-xl" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-24 w-24 rounded-md bg-card border border-border shadow-sm" />
                </div>
              </div>
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <Badge className="bg-uv/10 text-uv border-uv/20 hover:bg-uv/10 font-mono text-[10px]">
                CURING
              </Badge>
              <span className="text-[10px] text-muted-foreground font-mono">
                exposure 4.2s
              </span>
            </div>
            <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground font-mono">
              Z = 12.40 mm
            </div>
          </div>
          {/* Progress bar */}
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-mono text-muted-foreground">PROGRESS</span>
              <span className="font-mono font-medium">{pct.toFixed(1)}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Layer info */}
          <Panel title="Current Layer" meta="L-248">
            <dl className="grid grid-cols-2 gap-y-2.5 text-xs">
              <Row label="Exposure" value="4.20 s" />
              <Row label="Lift height" value="3.00 mm" />
              <Row label="Lift speed" value="40 mm/min" />
              <Row label="Settle" value="2.0 s" />
              <Row label="Intensity" value="22.4 mW/cm²" />
              <Row label="Z-step" value="50 µm" />
            </dl>
          </Panel>

          {/* Material */}
          <Panel title="Material" meta="GelMA 10%">
            <div className="space-y-2.5 text-xs">
              <Row label="Batch" value="GM-2025-04-A" />
              <Row label="Volume used" value="14.8 / 30 mL" />
              <Row label="Viscosity" value="412 mPa·s" />
              <div className="pt-2">
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                  <span>VAT LEVEL</span>
                  <span>49%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-[49%] bg-primary" />
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel title="Sensors" meta="Real-time">
          <div className="space-y-3">
            <Sensor icon={Thermometer} label="Vat" value={37.0} unit="°C" max={45} />
            <Sensor icon={Thermometer} label="Chamber" value={28.4} unit="°C" max={40} />
            <Sensor icon={Droplet} label="Humidity" value={42} unit="%" max={100} />
            <Sensor icon={Activity} label="Stage load" value={0.18} unit="N" max={2} />
          </div>
        </Panel>

        <Panel title="Event Log" meta="Last 10">
          <ul className="space-y-2 text-xs font-mono">
            {events.map((e, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">{e.t}</span>
                <span
                  className={
                    e.level === "warn"
                      ? "text-warning"
                      : e.level === "err"
                      ? "text-destructive"
                      : "text-foreground/80"
                  }
                >
                  {e.msg}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Safety" meta="Interlocks">
          <ul className="space-y-2.5 text-xs">
            {safety.map((s) => (
              <li
                key={s.label}
                className="flex items-center justify-between border-b border-border last:border-0 pb-2 last:pb-0"
              >
                <span className="text-muted-foreground">{s.label}</span>
                <Badge
                  variant="outline"
                  className={
                    s.ok
                      ? "border-success/30 bg-success/10 text-success font-mono text-[10px]"
                      : "border-warning/30 bg-warning/10 text-warning font-mono text-[10px]"
                  }
                >
                  {s.ok ? "OK" : "CHECK"}
                </Badge>
              </li>
            ))}
          </ul>
          <Button variant="destructive" className="w-full mt-3" size="sm">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Emergency Stop
          </Button>
        </Panel>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  status,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  status?: "ok" | "uv";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </span>
        <Icon
          className={
            status === "uv"
              ? "h-3.5 w-3.5 text-uv"
              : status === "ok"
              ? "h-3.5 w-3.5 text-success"
              : "h-3.5 w-3.5 text-muted-foreground"
          }
        />
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight font-mono">{value}</span>
        {unit && <span className="text-xs text-muted-foreground font-mono">{unit}</span>}
      </div>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function Panel({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <h3 className="text-sm font-medium">{title}</h3>
        {meta && (
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            {meta}
          </span>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-mono">{value}</dd>
    </>
  );
}

function Sensor({
  icon: Icon,
  label,
  value,
  unit,
  max,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  unit: string;
  max: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <span className="font-mono">
          {value} <span className="text-muted-foreground">{unit}</span>
        </span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const events = [
  { t: "14:36:12", level: "info", msg: "Layer 248 cured · 4.20s" },
  { t: "14:36:08", level: "info", msg: "Stage lifted 3.00 mm" },
  { t: "14:35:58", level: "info", msg: "Layer 247 cured · 4.20s" },
  { t: "14:32:04", level: "warn", msg: "Vat temp drift +0.4°C" },
  { t: "14:30:00", level: "info", msg: "Pre-heat complete" },
  { t: "14:22:00", level: "info", msg: "Job J-2041 started" },
];

const safety = [
  { label: "Lid interlock", ok: true },
  { label: "UV shielding", ok: true },
  { label: "Stage limit Z", ok: true },
  { label: "Vat seated", ok: true },
  { label: "Coolant flow", ok: false },
];
