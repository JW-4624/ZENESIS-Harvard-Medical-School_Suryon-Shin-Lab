import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Play,
  Layers,
  Scissors,
  Sliders,
  FlaskConical,
  Settings as SettingsIcon,
  ArrowRight,
  Power,
  Thermometer,
  Zap,
  Home as HomeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const shortcuts = [
  {
    title: "Dashboard",
    desc: "Live job · sensors · safety",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  { title: "Print", desc: "Job queue & execution", url: "/print", icon: Play },
  { title: "Slicer", desc: "Layer preview & params", url: "/slicer", icon: Layers },
  {
    title: "Auto Slice",
    desc: "STL / design → layer folder",
    url: "/autoslice",
    icon: Scissors,
  },
  { title: "Hardware", desc: "Z-stage · UV · vat", url: "/hardware", icon: Sliders },
  { title: "Materials", desc: "Bioink presets", url: "/materials", icon: FlaskConical },
  { title: "Settings", desc: "System & safety", url: "/settings", icon: SettingsIcon },
];

function HomePage() {
  const [printerOn, setPrinterOn] = useState(true);
  const [chamberHeat, setChamberHeat] = useState(false);
  const [uvSafety, setUvSafety] = useState(true);
  const [vatTemp, setVatTemp] = useState([37]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono flex items-center gap-2">
          <HomeIcon className="h-3 w-3" /> Home
        </p>
        <h1 className="text-2xl font-semibold mt-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Quick access to control panels and basic system settings.
        </p>
      </div>

      {/* Shortcuts */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-sm font-medium">Control panels</h2>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
            Shortcuts
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shortcuts.map((s) => (
            <Link
              key={s.url}
              to={s.url}
              className="group rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <s.icon className="h-4 w-4" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="mt-3">
                <h3 className="text-sm font-medium">{s.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Basic settings */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-sm font-medium">Basic settings</h2>
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">
            Quick toggles
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Printer power */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Power
                  className={printerOn ? "h-4 w-4 text-success" : "h-4 w-4 text-muted-foreground"}
                />
                <span className="text-sm font-medium">Printer</span>
              </div>
              <Switch checked={printerOn} onCheckedChange={setPrinterOn} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {printerOn ? "Powered on · ready" : "Powered off · idle"}
            </p>
          </div>

          {/* Chamber heater */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer
                  className={chamberHeat ? "h-4 w-4 text-warning" : "h-4 w-4 text-muted-foreground"}
                />
                <span className="text-sm font-medium">Chamber heater</span>
              </div>
              <Switch checked={chamberHeat} onCheckedChange={setChamberHeat} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {chamberHeat ? "Pre-heating to 37 °C" : "Off"}
            </p>
          </div>

          {/* UV safety interlock */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className={uvSafety ? "h-4 w-4 text-uv" : "h-4 w-4 text-destructive"} />
                <span className="text-sm font-medium">UV interlock</span>
              </div>
              <Switch checked={uvSafety} onCheckedChange={setUvSafety} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {uvSafety ? "Active · safe" : "Bypassed · caution"}
            </p>
          </div>

          {/* Vat target temp */}
          <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Vat target temperature</span>
              <span className="font-mono text-sm">
                {vatTemp[0].toFixed(1)} <span className="text-muted-foreground">°C</span>
              </span>
            </div>
            <Slider value={vatTemp} onValueChange={setVatTemp} min={20} max={45} step={0.5} />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-2">
              <span>20</span>
              <span>45</span>
            </div>
          </div>

          {/* Open full settings */}
          <div className="rounded-lg border border-dashed border-border bg-card/40 p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-medium">More settings</h3>
              <p className="text-xs text-muted-foreground mt-1">
                System info, calibration, safety configuration.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="mt-3 self-start">
              <Link to="/settings">
                Open settings <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
