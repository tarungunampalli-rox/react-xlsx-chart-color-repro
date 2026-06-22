# react-xlsx — chart color round-trip repro

Minimal reproduction showing that re-serializing a chart-containing workbook
through [`@extend-ai/react-xlsx`](https://github.com/extend-hq/react-xlsx) loses
the chart's colors. Both export paths are affected:

- `controller.workbook.saveXlsxBytes()` — the raw WASM-engine serialize
- `controller.exportXlsx()` — the library's own export (full image/drawing merge)

The chart **parts survive** (the chart still renders), but the explicit
per-series / axis / gridline colors are dropped, so a multi-series chart comes
back with only its first series colored and its legend swatches defaulted. This
happens on a **zero-edit round-trip**, so any "load → edit → save" flow degrades
charts.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

The bundled `public/sample-chart.xlsx` is an Excel-authored workbook with three
charts (on the **Summary** and **Charts** sheets). Then:

1. Confirm the page shows **charts parsed by engine (all sheets): 3**.
2. Click **Download saveXlsxBytes (raw)** and **Download exportXlsx (merged)**.
3. Open both downloads next to the original in Excel / Numbers / Google Sheets,
   and look at the charts on the Summary / Charts sheets.

**Expected:** chart series, legend, axis, and gridline colors match the original.
**Actual:** most colors are gone — see below.

## Verified evidence (react-xlsx@0.12.1)

Captured by re-serializing the bundled workbook in-page and unzipping the
output. Distinct `srgbClr` values found in `xl/charts/chart*.xml`:

| chart | original colors | after round-trip | lost |
| --- | --- | --- | --- |
| `chart1` | `000000 4f81bd 878787 d9d9d9 ffffff` | `4f81bd 878787` | `000000 d9d9d9 ffffff` |
| `chart2` (multi-series) | `000000 4f81bd 8064a2 9bbb59 c0504d d9d9d9 ffffff` | `4f81bd` | `000000 8064a2 9bbb59 c0504d d9d9d9 ffffff` |
| `chart3` | `000000 4a7ebb 878787 d9d9d9 ffffff` | `4a7ebb 878787` | `000000 d9d9d9 ffffff` |

`chart2` is the clearest case: of its four explicit series colors
(`4f81bd`, `c0504d`, `9bbb59`, `8064a2`) only the first survives, so three of
four series — and their legend swatches — lose their color. Axis/text
(`000000`), gridline (`d9d9d9`), and background (`ffffff`) colors are dropped
across all three charts.

`saveXlsxBytes()` (raw) and `exportXlsx()` (merged) produce the **same** color
loss, so it originates in the engine's chart serialization, not the merge. (The
merge does matter for one thing: the raw output also drops `xl/drawings/drawing3.xml`,
which the merge re-injects — but neither restores the lost chart colors.)

First observed in our app on **0.10.2**; the table above is from **0.12.1**.
Bump the version in `package.json` to compare releases.

## How the engine handles the wasm

`@extend-ai/react-xlsx@0.12.1` ships the wasm at
`dist/duke_sheets_wasm_bg.wasm` but does not export it as a package subpath, so
`scripts/copy-wasm.mjs` copies it into `public/` (run automatically by
`predev` / `prebuild`) and `src/main.tsx` points the engine at it with
`setWasmSource('/duke_sheets_wasm_bg.wasm')`. Vite also needs
`worker: { format: 'es' }` (the engine spawns a code-splitting Web Worker).

## Layout

```
src/main.tsx                 setWasmSource + mount
src/App.tsx                  file picker, viewer, both download buttons
scripts/copy-wasm.mjs        stage wasm into public/
scripts/generate-sample.py   (optional) regenerate a synthetic sample
public/sample-chart.xlsx     Excel-authored workbook with 3 charts
```

> Note: `scripts/generate-sample.py` produces an openpyxl chart that the engine
> does **not** parse (`controller.charts.length === 0`) — kept only for
> reference. The committed `sample-chart.xlsx` is an Excel-authored file, which
> the engine does parse and which exhibits the bug.
