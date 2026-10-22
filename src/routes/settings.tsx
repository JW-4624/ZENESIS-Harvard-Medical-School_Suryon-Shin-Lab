import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
          Settings
        </p>
        <h1 className="text-2xl font-semibold mt-1">System</h1>
      </div>

      {sections.map((s) => (
        <div key={s.title} className="rounded-lg border border-border bg-card">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-medium">{s.title}</h3>
          </div>
          <dl className="divide-y divide-border text-sm">
            {s.items.map((it) => (
              <div key={it.label} className="grid grid-cols-2 px-5 py-3">
                <dt className="text-muted-foreground">{it.label}</dt>
                <dd className="text-right font-mono">{it.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

const sections = [
  {
    title: "Device",
    items: [
      { label: "Model", value: "Helix BP-X1" },
      { label: "Serial", value: "BPX1-00482" },
      { label: "Firmware", value: "v2.4.1" },
      { label: "IP address", value: "192.168.1.42" },
    ],
  },
  {
    title: "Operator",
    items: [
      { label: "Lab", value: "Tissue Eng. Lab 3" },
      { label: "User", value: "dr.kim" },
      { label: "Units", value: "metric" },
    ],
  },
  {
    title: "Safety",
    items: [
      { label: "Auto-pause on lid open", value: "ENABLED" },
      { label: "UV interlock", value: "ENABLED" },
      { label: "Max chamber temp", value: "45 °C" },
    ],
  },
];
