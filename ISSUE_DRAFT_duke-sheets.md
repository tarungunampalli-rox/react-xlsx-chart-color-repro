# Issue draft — file in guseggert/duke-sheets

**Title:** `Workbook.saveXlsxBytes()` strips chart colors on round-trip

---

### Summary

A load → save round-trip drops the explicit `srgbClr` colors from charts. The chart
parts are kept, but their per-series / axis / gridline / background fills are removed —
a multi-series chart comes back with only its **first** series colored.

`@dukelib/sheets-wasm` **0.1.16** (wasm bindings), Node 24.

### Repro

```js
import { readFileSync, writeFileSync } from 'node:fs'
import { initSync, Workbook } from '@dukelib/sheets-wasm'

initSync({
  module: readFileSync('node_modules/@dukelib/sheets-wasm/duke_sheets_wasm_bg.wasm'),
})

const input = new Uint8Array(readFileSync('sample-chart.xlsx'))
const out = Workbook.fromBytes(input).saveXlsxBytes()
writeFileSync('roundtrip.xlsx', Buffer.from(out))
// unzip both, compare xl/charts/chart*.xml
```

Distinct `srgbClr` values in `xl/charts/chart*.xml`, before vs after `saveXlsxBytes()`:

| chart | before | after | lost |
| --- | --- | --- | --- |
| chart1 | `000000 4f81bd 878787 d9d9d9 ffffff` | `4f81bd 878787` | `000000 d9d9d9 ffffff` |
| chart2 (multi-series) | `000000 4f81bd 8064a2 9bbb59 c0504d d9d9d9 ffffff` | `4f81bd` | `000000 8064a2 9bbb59 c0504d d9d9d9 ffffff` |
| chart3 | `000000 4a7ebb 878787 d9d9d9 ffffff` | `4a7ebb 878787` | `000000 d9d9d9 ffffff` |

In `chart2`, of four explicit series colors (`4f81bd`, `c0504d`, `9bbb59`, `8064a2`) only
the first survives; axis/text (`000000`), gridline (`d9d9d9`), and background (`ffffff`)
are dropped from all three charts.

### Expected vs actual

- **Expected:** `saveXlsxBytes()` preserves the chart fill colors present in the input.
- **Actual:** most explicit chart `srgbClr` fills are removed.

### Notes

- Surfaced downstream via `@extend-ai/react-xlsx` (`controller.workbook.saveXlsxBytes()`
  and `exportXlsx()` both lose the same colors). A runnable browser repro + the sample
  file: https://github.com/tarungunampalli-rox/react-xlsx-chart-color-repro
  (`scripts/engine-roundtrip.mjs` is the pure-engine version above).
