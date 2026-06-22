# Issue draft — file in extend-hq/react-xlsx

**Title:** `exportXlsx()` / `saveXlsxBytes()` drop chart colors on round-trip

---

### Summary

Re-serializing a chart-containing workbook through the export APIs loses the charts'
colors. The chart parts survive and still render, but the explicit per-series, axis,
gridline, and background colors are dropped — a multi-series chart comes back with only
its first series colored and its legend swatches defaulted. This reproduces on a
**zero-edit round-trip** (just load → export), so any load → edit → save flow degrades
charts.

### Environment

- `@extend-ai/react-xlsx`: reproduced on **0.12.1** (latest); first observed on **0.10.2**
- Engine: `@dukelib/sheets-wasm` 0.1.x
- React 19, Vite 6, Chrome

### Evidence

Re-serializing a workbook (3 Excel-authored charts) in-page and unzipping the output —
distinct `srgbClr` values in `xl/charts/chart*.xml`, original vs after round-trip:

| chart | original colors | after round-trip | lost |
| --- | --- | --- | --- |
| `chart1` | `000000 4f81bd 878787 d9d9d9 ffffff` | `4f81bd 878787` | `000000 d9d9d9 ffffff` |
| `chart2` (multi-series) | `000000 4f81bd 8064a2 9bbb59 c0504d d9d9d9 ffffff` | `4f81bd` | `000000 8064a2 9bbb59 c0504d d9d9d9 ffffff` |
| `chart3` | `000000 4a7ebb 878787 d9d9d9 ffffff` | `4a7ebb 878787` | `000000 d9d9d9 ffffff` |

`chart2` is the clearest: of its four explicit series colors (`4f81bd`, `c0504d`,
`9bbb59`, `8064a2`) only the first survives, so three of four series — and their legend
swatches — lose their color. Axis/text (`000000`), gridline (`d9d9d9`), and background
(`ffffff`) colors are dropped from all three charts.

`saveXlsxBytes()` (raw) and `exportXlsx()` (merged) produce the **same** color loss.

### Expected vs actual

- **Expected:** an exported workbook preserves chart colors, matching the input.
- **Actual:** most chart colors are dropped; multi-series charts keep only the first
  series color.

### Where it appears to originate

Because raw and merged lose identical colors, the loss is in the engine's chart
serialization (`saveXlsxBytes()` re-emits `xl/charts/chart*.xml` with explicit `srgbClr`
fills stripped), not in the export merge. The merge does re-inject `xl/drawings/`
(the raw output even drops `xl/drawings/drawing3.xml`, which the merge restores), but it
does not touch chart colors. The serializer likely lives in `@dukelib/sheets-wasm`
(https://github.com/guseggert/duke-sheets); filing here since it surfaces through this
package's public API — feel free to route upstream.

### Reproduction

Repo: https://github.com/tarungunampalli-rox/react-xlsx-chart-color-repro
<!-- live demo: add Vercel URL after deploying -->

```bash
npm install
npm run dev
```

1. The bundled `sample-chart.xlsx` has 3 charts (Summary / Charts sheets); the page
   should show `charts parsed by engine (all sheets): 3`.
2. Click **Download saveXlsxBytes (raw)** and **Download exportXlsx (merged)**.
3. Open both downloads next to the original; compare the charts.

### Impact

Blocks any load → edit → save workflow for chart-containing workbooks: the documented
"save" is a file export, and that export silently degrades the chart even with no edits.

### Possible fix directions

- Preserve explicit chart colors (and `xl/charts/colorsN.xml` / `styleN.xml`,
  `xl/theme/theme1.xml`) through `saveXlsxBytes()`; or
- If the engine cannot yet round-trip them, have the export merge re-inject the original
  `xl/charts/*` + theme parts the way it already does for `xl/drawings/`.
