import { createFileRoute } from "@tanstack/react-router";
import { Upload, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/print")({
  component: PrintPage,
});

function PrintPage() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
          Print
        </p>
        <h1 className="text-2xl font-semibold mt-1">Job queue</h1>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm">
          <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload .stl / .ctb
        </Button>
        <Button size="sm">
          <Play className="h-3.5 w-3.5 mr-1.5" /> Start next
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-mono">
            <tr>
              <th className="text-left px-4 py-2.5">Job</th>
              <th className="text-left px-4 py-2.5">Material</th>
              <th className="text-left px-4 py-2.5">Layers</th>
              <th className="text-left px-4 py-2.5">Duration</th>
              <th className="text-left px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-medium">{j.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{j.id}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{j.material}</td>
                <td className="px-4 py-3 font-mono text-xs">{j.layers}</td>
                <td className="px-4 py-3 font-mono text-xs">{j.duration}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      j.status === "running"
                        ? "rounded-sm bg-success/10 px-1.5 py-0.5 font-mono text-[10px] text-success"
                        : j.status === "queued"
                        ? "rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                        : "rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary"
                    }
                  >
                    {j.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const jobs = [
  { id: "J-2041", name: "Hepatic lobule scaffold v3", material: "GelMA 10%", layers: 600, duration: "1h 12m", status: "running" },
  { id: "J-2040", name: "Vascular branch · trial 7", material: "PEGDA 20%", layers: 420, duration: "48m", status: "queued" },
  { id: "J-2039", name: "Cartilage disc 8mm", material: "GelMA 8%", layers: 320, duration: "36m", status: "queued" },
  { id: "J-2038", name: "Skin patch test", material: "GelMA 10%", layers: 120, duration: "14m", status: "done" },
];
