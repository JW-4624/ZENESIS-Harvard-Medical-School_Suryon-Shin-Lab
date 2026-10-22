import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, FolderDown, Info, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDrop } from "@/components/autoslice/file-drop";
import { FormatPicker } from "@/components/autoslice/format-picker";
import { NumberField } from "@/components/autoslice/number-field";
import { PlatePreview } from "@/components/autoslice/plate-preview";
import { Segmented } from "@/components/autoslice/segmented";
import { UvIntensity } from "@/components/autoslice/uv-intensity";
import {
  createImageDesign,
  createPresetDesign,
  loadImageMask,
  type ImageMask,
  type PresetKind,
  type PresetParams,
} from "@/lib/autoslice/designs";
import { buildFormat, defaultWellSize, type FormatId } from "@/lib/autoslice/formats";
import {
  LayerRenderer,
  runSlice,
  sanitizeName,
  type LightSetting,
  type OutputSink,
  type SliceJob,
} from "@/lib/autoslice/pipeline";
import type { RasterTarget } from "@/lib/autoslice/raster";
import {
  DirectorySink,
  pickDirectory,
  supportsDirectoryPicker,
  ZipSink,
} from "@/lib/autoslice/sinks";
import {
  createExtrusionSource,
  createMeshSource,
  meshBounds,
  type SliceSource,
} from "@/lib/autoslice/sources";
import { parseStl, type Mesh } from "@/lib/autoslice/stl";
import { parseIntensity, recommendSetting, UV_CALIBRATIONS } from "@/lib/autoslice/uv-calibration";

export const Route = createFileRoute("/autoslice")({
  component: AutoSlicePage,
});

type InputKind = "stl" | "image" | "preset";
type ScaleMode = "actual" | "fit" | "percent";

const FIT_FILL = 0.9;
const PREVIEW_MIN_PIXEL_MM = 0.05;

function AutoSlicePage() {
  // --- format & wells ------------------------------------------------------
  const [formatId, setFormatId] = useState<FormatId>("8well");
  const [wellSize, setWellSize] = useState(() => defaultWellSize("8well"));
  const format = useMemo(() => buildFormat(formatId, wellSize), [formatId, wellSize]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(buildFormat("8well").wells.map((w) => w.id)),
  );

  const changeFormat = (id: FormatId) => {
    setFormatId(id);
    setWellSize(defaultWellSize(id));
    setSelected(new Set(buildFormat(id).wells.map((w) => w.id)));
  };
  const toggleWell = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // --- design input --------------------------------------------------------
  const [kind, setKind] = useState<InputKind>("preset");
  const [stl, setStl] = useState<{ name: string; mesh: Mesh } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [darkIsMaterial, setDarkIsMaterial] = useState(true);
  const [mask, setMask] = useState<ImageMask | null>(null);
  const [imageWidth, setImageWidth] = useState(8);
  const [thickness, setThickness] = useState(1);
  const [preset, setPreset] = useState<PresetParams>({
    kind: "disc",
    width: 6,
    height: 4,
    pitch: 1,
    strut: 0.2,
  });
  const [inputError, setInputError] = useState<string | null>(null);

  const loadStl = async (file: File) => {
    try {
      const mesh = parseStl(await file.arrayBuffer());
      setStl({ name: file.name, mesh });
      setInputError(null);
    } catch (e) {
      setStl(null);
      setInputError(e instanceof Error ? e.message : "Could not read this STL file.");
    }
  };

  useEffect(() => {
    if (!imageFile) return;
    let cancelled = false;
    loadImageMask(imageFile, darkIsMaterial)
      .then((m) => {
        if (cancelled) return;
        setMask(m);
        setInputError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setMask(null);
        setInputError("Could not read this image. Use PNG, JPG or SVG.");
      });
    return () => {
      cancelled = true;
    };
  }, [imageFile, darkIsMaterial]);

  // --- placement -----------------------------------------------------------
  const [scaleMode, setScaleMode] = useState<ScaleMode>("fit");
  const [percent, setPercent] = useState(100);

  // --- slicing settings ----------------------------------------------------
  const [layerUm, setLayerUm] = useState(50);
  const [pixelUm, setPixelUm] = useState(50);
  const [outputPlate, setOutputPlate] = useState(true);
  const [outputWells, setOutputWells] = useState(false);
  const [jobName, setJobName] = useState("slice_job");

  // --- UV intensity --------------------------------------------------------
  const [uvText, setUvText] = useState("");
  const [calId, setCalId] = useState(UV_CALIBRATIONS[0].id);
  const calibration = UV_CALIBRATIONS.find((c) => c.id === calId) ?? UV_CALIBRATIONS[0];
  const light: LightSetting | undefined = useMemo(() => {
    const target = parseIntensity(uvText);
    if (target === null) return undefined;
    const rec = recommendSetting(calibration, target);
    if (!rec.primary) return undefined;
    return {
      equipment: calibration.equipment,
      wavelengthNm: calibration.wavelengthNm,
      targetMwPerCm2: target,
      engineSetting: rec.primary.setting,
      predictedMwPerCm2: rec.primary.predicted,
    };
  }, [uvText, calibration]);

  // --- derived: source -----------------------------------------------------
  const selectedWells = useMemo(
    () => format.wells.filter((w) => selected.has(w.id)),
    [format, selected],
  );

  const baseExtent = useMemo(() => {
    if (kind === "stl" && stl) {
      const b = meshBounds(stl.mesh);
      return { w: b.max[0] - b.min[0], h: b.max[1] - b.min[1] };
    }
    if (kind === "image" && mask)
      return { w: imageWidth, h: (imageWidth * mask.height) / mask.width };
    if (kind === "preset") {
      return { w: preset.width, h: preset.kind === "disc" ? preset.width : preset.height };
    }
    return null;
  }, [kind, stl, mask, imageWidth, preset]);

  const scale = useMemo(() => {
    if (scaleMode === "percent") return percent / 100;
    if (scaleMode === "actual" || !baseExtent) return 1;
    const wells = selectedWells.length ? selectedWells : format.wells;
    const fitW = Math.min(...wells.map((w) => w.w));
    const fitH = Math.min(...wells.map((w) => w.h));
    const s = Math.min((fitW * FIT_FILL) / baseExtent.w, (fitH * FIT_FILL) / baseExtent.h);
    return Number.isFinite(s) && s > 0 ? s : 1;
  }, [scaleMode, percent, baseExtent, selectedWells, format]);

  const source: SliceSource | null = useMemo(() => {
    if (kind === "stl") return stl ? createMeshSource(stl.mesh, scale) : null;
    if (kind === "image") {
      return mask
        ? createExtrusionSource(createImageDesign(mask, imageWidth * scale), thickness)
        : null;
    }
    const design = createPresetDesign({
      ...preset,
      width: preset.width * scale,
      height: preset.height * scale,
      pitch: preset.pitch * scale,
      strut: preset.strut * scale,
    });
    return createExtrusionSource(design, thickness);
  }, [kind, stl, mask, imageWidth, preset, thickness, scale]);

  const sourceInfo = useMemo<Record<string, unknown>>(() => {
    if (kind === "stl") {
      return {
        type: "stl",
        file: stl?.name,
        scale: round(scale),
        triangles: stl?.mesh.triangleCount,
      };
    }
    if (kind === "image") {
      return {
        type: "image",
        file: imageFile?.name,
        scale: round(scale),
        darkIsMaterial,
        thicknessMm: thickness,
      };
    }
    return { type: "preset", ...preset, scale: round(scale), thicknessMm: thickness };
  }, [kind, stl, imageFile, darkIsMaterial, preset, scale, thickness]);

  const job: SliceJob | null = useMemo(
    () =>
      source
        ? {
            name: jobName,
            format,
            wellIds: selectedWells.map((w) => w.id),
            source,
            sourceInfo,
            layerHeightMm: layerUm / 1000,
            pixelMm: pixelUm / 1000,
            outputPlate,
            outputWells,
            light,
          }
        : null,
    [
      source,
      jobName,
      format,
      selectedWells,
      sourceInfo,
      layerUm,
      pixelUm,
      outputPlate,
      outputWells,
      light,
    ],
  );

  // --- preview -------------------------------------------------------------
  const [layerIdx, setLayerIdx] = useState(0);
  const preview = useMemo(() => {
    if (!job) return { renderer: null, error: null as string | null };
    try {
      const renderer = new LayerRenderer({
        ...job,
        pixelMm: Math.max(job.pixelMm, PREVIEW_MIN_PIXEL_MM),
      });
      return { renderer, error: null };
    } catch (e) {
      return { renderer: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [job]);

  const layers = preview.renderer?.layers ?? 0;
  const activeLayer = Math.min(layerIdx, Math.max(layers - 1, 0));
  const bitmap: RasterTarget | null = useMemo(() => {
    const r = preview.renderer;
    if (!r) return null;
    return { ...r.target, data: r.render(activeLayer).slice() };
  }, [preview.renderer, activeLayer]);

  // --- warnings & stats ----------------------------------------------------
  const warnings: string[] = [];
  if (selectedWells.length === 0) warnings.push("Select at least one well.");
  if (source) {
    const tooBig = selectedWells.find(
      (w) => source.extent.w > w.w + 1e-6 || source.extent.h > w.h + 1e-6,
    );
    if (tooBig) {
      warnings.push(
        `The design (${source.extent.w.toFixed(1)} × ${source.extent.h.toFixed(1)} mm) is larger than well ${tooBig.id} (${tooBig.w.toFixed(1)} × ${tooBig.h.toFixed(1)} mm) and will be clipped. Use "Fit to well" or lower the scale.`,
      );
    }
    if (source.height <= 0) warnings.push("The design has no height.");
  }
  if (preview.error) warnings.push(preview.error);

  const wellCount = selectedWells.length;
  const fileCount = job ? layers * ((outputPlate ? 1 : 0) + (outputWells ? wellCount : 0)) + 2 : 0;
  const ready = !!job && !preview.error && wellCount > 0 && (outputPlate || outputWells);

  // --- run -----------------------------------------------------------------
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; layer: number } | null>(
    null,
  );
  const [runError, setRunError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = async (mode: "folder" | "zip") => {
    if (!job || !ready) return;
    setRunError(null);

    let sink: OutputSink;
    let zip: ZipSink | null = null;
    let target = "";
    try {
      if (mode === "folder") {
        const handle = await pickDirectory();
        target = handle.name;
        sink = new DirectorySink(handle);
      } else {
        zip = new ZipSink();
        sink = zip;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // picker dismissed
      setRunError(e instanceof Error ? e.message : "Could not open the folder.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setProgress({ done: 0, total: 1, layer: 0 });
    try {
      const step = Math.max(1, Math.floor(fileCount / 200));
      const summary = await runSlice(job, sink, {
        signal: controller.signal,
        onProgress: (p) => {
          if (p.done === p.total || p.done % step === 0) {
            setProgress({ done: p.done, total: p.total, layer: p.layer });
          }
        },
      });
      if (zip) {
        download(zip.finish(), `${summary.folder}.zip`);
        toast.success(`${summary.layers} layers written to ${summary.folder}.zip`);
      } else {
        toast.success(`${summary.files} files written to ${target}/${summary.folder}`);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        toast("Slicing cancelled");
      } else {
        setRunError(e instanceof Error ? e.message : "Slicing failed.");
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  };

  // Decided after mount so server and client render the same markup.
  const [folderSupported, setFolderSupported] = useState(true);
  useEffect(() => setFolderSupported(supportsDirectoryPicker()), []);
  const pct = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-mono">
          Auto Slice
        </p>
        <h1 className="text-2xl font-semibold mt-1">Slice a design for a well plate or slide</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Choose a format, drop in an STL file or a 2D design, and get a folder of layer images
          ready for the projector. Everything runs in your browser; no file leaves this computer.
        </p>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_520px] gap-4 items-start">
        {/* ------------------------------------------------------------ controls */}
        <div className="space-y-4">
          <Card step={1} title="Format">
            <FormatPicker value={formatId} onChange={changeFormat} />
            <details className="mt-3 group">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Adjust well size (nominal values; check your chamber slide)
              </summary>
              <div className="grid grid-cols-2 gap-3 mt-3 max-w-sm">
                <NumberField
                  label="Well width"
                  unit="mm"
                  value={round(format.wells[0].w)}
                  min={1}
                  step={0.5}
                  onChange={(w) => setWellSize((s) => ({ ...s, w }))}
                />
                <NumberField
                  label="Well height"
                  unit="mm"
                  value={round(format.wells[0].h)}
                  min={1}
                  step={0.5}
                  onChange={(h) => setWellSize((s) => ({ ...s, h }))}
                />
              </div>
            </details>
          </Card>

          <Card step={2} title="Design">
            <Tabs value={kind} onValueChange={(v) => setKind(v as InputKind)}>
              <TabsList>
                <TabsTrigger value="stl">STL file</TabsTrigger>
                <TabsTrigger value="image">2D image</TabsTrigger>
                <TabsTrigger value="preset">Built-in shape</TabsTrigger>
              </TabsList>

              <TabsContent value="stl" className="mt-4 space-y-3">
                <FileDrop
                  accept=".stl"
                  title="Drop an STL file here"
                  hint="Binary or ASCII · units are read as millimetres · Z is up"
                  fileName={stl?.name}
                  onFile={loadStl}
                />
                {stl && (
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {stl.mesh.triangleCount.toLocaleString()} triangles
                    {baseExtent &&
                      ` · ${baseExtent.w.toFixed(1)} × ${baseExtent.h.toFixed(1)} mm footprint`}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="image" className="mt-4 space-y-3">
                <FileDrop
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/bmp,.svg"
                  title="Drop a PNG, JPG or SVG design here"
                  hint="The pattern is extruded to the thickness you set below"
                  fileName={imageFile?.name}
                  onFile={setImageFile}
                />
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Design width"
                    unit="mm"
                    value={imageWidth}
                    min={0.1}
                    step={0.5}
                    onChange={setImageWidth}
                  />
                  <NumberField
                    label="Thickness"
                    unit="mm"
                    value={thickness}
                    min={0.01}
                    step={0.1}
                    onChange={setThickness}
                  />
                </div>
                <label className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-xs">
                    Dark pixels are material
                    <span className="block text-[10px] text-muted-foreground">
                      Turn off for light artwork on a dark background
                    </span>
                  </span>
                  <Switch checked={darkIsMaterial} onCheckedChange={setDarkIsMaterial} />
                </label>
              </TabsContent>

              <TabsContent value="preset" className="mt-4 space-y-3">
                <Segmented<PresetKind>
                  label="Shape"
                  value={preset.kind}
                  onChange={(k) => setPreset((p) => ({ ...p, kind: k }))}
                  options={[
                    { value: "disc", label: "Disc" },
                    { value: "rectangle", label: "Rectangle" },
                    { value: "lattice", label: "Lattice" },
                  ]}
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <NumberField
                    label={preset.kind === "disc" ? "Diameter" : "Width"}
                    unit="mm"
                    value={preset.width}
                    min={0.1}
                    step={0.5}
                    onChange={(width) => setPreset((p) => ({ ...p, width }))}
                  />
                  {preset.kind !== "disc" && (
                    <NumberField
                      label="Height"
                      unit="mm"
                      value={preset.height}
                      min={0.1}
                      step={0.5}
                      onChange={(height) => setPreset((p) => ({ ...p, height }))}
                    />
                  )}
                  <NumberField
                    label="Thickness"
                    unit="mm"
                    value={thickness}
                    min={0.01}
                    step={0.1}
                    onChange={setThickness}
                  />
                  {preset.kind === "lattice" && (
                    <>
                      <NumberField
                        label="Line pitch"
                        unit="mm"
                        value={preset.pitch}
                        min={0.05}
                        step={0.1}
                        onChange={(pitch) => setPreset((p) => ({ ...p, pitch }))}
                      />
                      <NumberField
                        label="Line width"
                        unit="mm"
                        value={preset.strut}
                        min={0.02}
                        step={0.05}
                        onChange={(strut) => setPreset((p) => ({ ...p, strut }))}
                      />
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            {inputError && <Notice tone="error">{inputError}</Notice>}
          </Card>

          <Card step={3} title="Placement">
            <p className="text-xs text-muted-foreground mb-3">
              The same design is placed at the centre of every selected well. Click wells in the
              preview to include or skip them.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Segmented<ScaleMode>
                label="Scale"
                value={scaleMode}
                onChange={setScaleMode}
                options={[
                  { value: "fit", label: "Fit to well" },
                  { value: "actual", label: "Actual size" },
                  { value: "percent", label: "Custom %" },
                ]}
              />
              {scaleMode === "percent" && (
                <div className="w-32">
                  <NumberField
                    label="Scale"
                    unit="%"
                    value={percent}
                    min={1}
                    max={1000}
                    step={5}
                    onChange={setPercent}
                  />
                </div>
              )}
              <span className="text-xs font-mono text-muted-foreground">
                × {scale.toFixed(3)}
                {source &&
                  ` → ${source.extent.w.toFixed(1)} × ${source.extent.h.toFixed(1)} × ${source.height.toFixed(2)} mm`}
              </span>
            </div>
          </Card>

          <Card step={4} title="Slicing & output">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Layer height</Label>
                <div>
                  <Segmented
                    label="Layer height"
                    value={layerUm}
                    onChange={setLayerUm}
                    options={[10, 25, 50, 100, 200].map((v) => ({ value: v, label: `${v} µm` }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Pixel size (image resolution)
                </Label>
                <div>
                  <Segmented
                    label="Pixel size"
                    value={pixelUm}
                    onChange={setPixelUm}
                    options={[10, 25, 50, 100].map((v) => ({ value: v, label: `${v} µm` }))}
                  />
                </div>
              </div>
              <label className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-xs">
                  Full-slide image per layer
                  <span className="block text-[10px] text-muted-foreground">
                    plate/layer_00001.png … all wells in one image
                  </span>
                </span>
                <Switch checked={outputPlate} onCheckedChange={setOutputPlate} />
              </label>
              <label className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-xs">
                  Separate image per well
                  <span className="block text-[10px] text-muted-foreground">
                    wells/A1/layer_00001.png … one folder per well
                  </span>
                </span>
                <Switch checked={outputWells} onCheckedChange={setOutputWells} />
              </label>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="job-name" className="text-xs text-muted-foreground">
                  Output folder name
                </Label>
                <Input
                  id="job-name"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  className="h-8 font-mono text-xs max-w-sm"
                />
              </div>
            </div>
          </Card>

          <Card step={5} title="Light intensity → machine setting">
            <UvIntensity
              text={uvText}
              onText={setUvText}
              calibration={calibration}
              onCalibration={setCalId}
            />
          </Card>
        </div>

        {/* ------------------------------------------------------------- preview */}
        <div className="space-y-4 xl:sticky xl:top-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-medium">
                {layers > 0 ? `Layer ${activeLayer + 1} / ${layers}` : "Preview"}
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground">
                {layers > 0 && `Z = ${(((activeLayer + 0.5) * layerUm) / 1000).toFixed(3)} mm · `}
                {format.label}
              </span>
            </div>
            <div className="p-3">
              <PlatePreview
                format={format}
                selected={selected}
                onToggle={toggleWell}
                bitmap={bitmap}
              />
              {!source && (
                <p className="text-xs text-muted-foreground mt-3">
                  Add a design to see the sliced layers here.
                </p>
              )}
            </div>
            {layers > 1 && (
              <div className="px-4 py-3 border-t border-border">
                <Slider
                  value={[activeLayer + 1]}
                  onValueChange={([v]) => setLayerIdx(v - 1)}
                  min={1}
                  max={layers}
                  step={1}
                  aria-label="Preview layer"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-2">
                  <span>1</span>
                  <span>{layers}</span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <dl className="grid grid-cols-2 gap-y-2 text-xs">
              <dt className="text-muted-foreground">Wells</dt>
              <dd className="text-right font-mono">
                {wellCount} / {format.wells.length}
              </dd>
              <dt className="text-muted-foreground">Layers</dt>
              <dd className="text-right font-mono">
                {layers || "–"} × {layerUm} µm
              </dd>
              <dt className="text-muted-foreground">Image size</dt>
              <dd className="text-right font-mono">
                {Math.ceil(format.width / (pixelUm / 1000))} ×{" "}
                {Math.ceil(format.height / (pixelUm / 1000))} px
              </dd>
              <dt className="text-muted-foreground">Files</dt>
              <dd className="text-right font-mono">{job ? fileCount.toLocaleString() : "–"}</dd>
            </dl>

            {warnings.map((w) => (
              <Notice key={w} tone="warn">
                {w}
              </Notice>
            ))}
            {runError && <Notice tone="error">{runError}</Notice>}

            {busy && progress && (
              <div className="space-y-1.5">
                <Progress value={pct} />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>
                    Layer {progress.layer} / {layers}
                  </span>
                  <span>{pct}%</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {busy ? (
                <Button variant="outline" onClick={() => abortRef.current?.abort()}>
                  <X /> Cancel
                </Button>
              ) : (
                <>
                  <Button disabled={!ready || !folderSupported} onClick={() => run("folder")}>
                    <FolderDown /> Generate to folder
                  </Button>
                  <Button variant="outline" disabled={!ready} onClick={() => run("zip")}>
                    <Download /> Download ZIP
                  </Button>
                </>
              )}
              {busy && (
                <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />
              )}
            </div>
            {!folderSupported && (
              <p className="text-[11px] text-muted-foreground flex gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
                Writing straight into a folder needs Chrome, Edge or another Chromium browser. In
                other browsers use the ZIP download and unpack it.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-mono">
          {step}
        </span>
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Notice({ tone, children }: { tone: "warn" | "error"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "mt-3 flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          : "flex gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs"
      }
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
      <span>{children}</span>
    </div>
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = sanitizeName(filename.replace(/\.zip$/, "")) + ".zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
