# Auto Slice (ZENESIS · Harvard Medical School · Suryon Shin Lab)

Browser-based slicer that turns an STL file or a 2D design into a folder of
layer images for DLP bioprinting on **1 / 2 / 4 / 8-well chamber slides** or a
plain **slide glass** (all 75 × 25 mm). Open it from the sidebar: **Auto Slice**
(`/autoslice`).

Everything runs locally in the browser. No file is uploaded anywhere.

## Run it

```bash
bun install        # or: npm install
bun run dev        # http://localhost:8080/autoslice
```

Use Chrome or Edge to write directly into a folder. Other browsers can use the
ZIP download.

New to the repo or a Harvard researcher? Start with
[`docs/HARVARD_USER_GUIDE.md`](docs/HARVARD_USER_GUIDE.md) (access, setup, usage,
working with your own GitHub / Claude account).

## Workflow

1. **Format** – pick 1, 2, 4 or 8 well, or slide glass. Well sizes are nominal
   (see `src/lib/autoslice/formats.ts`); adjust them under "Adjust well size" if
   your chamber slide differs.
2. **Design** – one of:
   - **STL file** (binary or ASCII, millimetres, Z up)
   - **2D image** (PNG / JPG / SVG), extruded to a thickness you choose
   - **Built-in shape** (disc, rectangle, lattice)
3. **Placement** – the same design is centred in every selected well (click wells
   in the preview to skip some). Scale: fit to well, actual size, or custom %.
4. **Slicing & output** – layer height (10–200 µm), pixel size (10–100 µm),
   full-slide image per layer and/or one image per well.
5. **Light intensity** – type the intensity you want (`3.7`, `3.7mW`, `광량 3.7`,
   `3.7 mW/cm²` all work) and the page tells you which engine setting to enter on
   the machine (3.7 mW/cm² → **118** or 119). See "UV calibration" below.
6. **Generate to folder** (pick a folder) or **Download ZIP**.

## Output

```
<job name>/
  manifest.json        format, wells, layer height, pixel size, scale, image size
  README.txt
  plate/layer_00001.png      full 75 × 25 mm mask, all selected wells
  wells/A1/layer_00001.png   optional: cropped mask per well
```

PNG, 8-bit grayscale, **255 = exposed, 0 = dark**, viewed from above with the
origin at the top-left. The pixel pitch is stored in the PNG `pHYs` chunk and in
`manifest.json`.

## UV calibration

`src/lib/autoslice/uv-calibration.ts` holds the machine's measured data and
the regression from the inspection sheet (`y = a·x² + b·x + c`, x = engine
setting, y = mW/cm²) and inverts it to get the setting for a target intensity.
The current data is for **ZENESIS ZNS-6200626-BFAP01 (385 nm, inspected
2026-07-02)**. Calibration is per machine: add another entry to
`UV_CALIBRATIONS` for each additional device, otherwise the setting shown is
only valid for that one.

- Measured range is 2.5–26 mW/cm²; values outside it are flagged as extrapolated.
- At low intensity the fit deviates from the raw readings (3.7 mW/cm² → 118 by
  the fit, ≈129 by interpolating the sheet's own readings). The page shows both
  when they differ noticeably; verify with a power meter if exactness matters.
- The chosen setting is also written to `manifest.json` and `README.txt`.

## Notes

- Meshes should be closed (watertight). Overlapping shells are merged.
- Layers are sampled at their mid-plane height.
- Source layout: `src/lib/autoslice/` (engine, no UI) and
  `src/components/autoslice/` + `src/routes/autoslice.tsx` (UI).
