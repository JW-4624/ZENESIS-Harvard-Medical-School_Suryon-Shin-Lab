import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/materials")({
  component: MaterialsPage,
});

function MaterialsPage() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
          Materials
        </p>
        <h1 className="text-2xl font-semibold mt-1">Bioink presets</h1>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {presets.map((p) => (
          <div key={p.name} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{p.name}</h3>
              <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                {p.code}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>
            <dl className="grid grid-cols-2 gap-y-2 text-xs mt-4 pt-4 border-t border-border">
              <dt className="text-muted-foreground">Wavelength</dt>
              <dd className="text-right font-mono">{p.lambda}</dd>
              <dt className="text-muted-foreground">Exposure</dt>
              <dd className="text-right font-mono">{p.exposure}</dd>
              <dt className="text-muted-foreground">Layer height</dt>
              <dd className="text-right font-mono">{p.layer}</dd>
              <dt className="text-muted-foreground">Vat temp</dt>
              <dd className="text-right font-mono">{p.temp}</dd>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

const presets = [
  { name: "GelMA 10%", code: "GM10", notes: "Soft tissue scaffolds, hepatic models", lambda: "405 nm", exposure: "4.2 s", layer: "50 µm", temp: "37 °C" },
  { name: "GelMA 8%", code: "GM08", notes: "Lower stiffness, vascular structures", lambda: "405 nm", exposure: "5.0 s", layer: "50 µm", temp: "37 °C" },
  { name: "PEGDA 20%", code: "PG20", notes: "Stiff scaffolds, microfluidic chips", lambda: "405 nm", exposure: "2.8 s", layer: "25 µm", temp: "25 °C" },
  { name: "HAMA 5%", code: "HA05", notes: "Cartilage, chondrocyte-laden constructs", lambda: "405 nm", exposure: "6.5 s", layer: "100 µm", temp: "37 °C" },
  { name: "dECM heart", code: "ECM-H", notes: "Decellularized cardiac matrix", lambda: "405 nm", exposure: "8.0 s", layer: "100 µm", temp: "37 °C" },
  { name: "Custom", code: "USR", notes: "User-defined bioink profile", lambda: "—", exposure: "—", layer: "—", temp: "—" },
];
