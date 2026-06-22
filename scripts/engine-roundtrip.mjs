// Pure @dukelib/sheets-wasm round-trip — no react-xlsx involved.
// Loads a workbook, re-serializes it, and reports the chart colors lost.
//
//   node scripts/engine-roundtrip.mjs [path-to.xlsx]
//
// Run from the repo root (so the bare import and relative paths resolve).
import { readFileSync, writeFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'

import { initSync, Workbook } from '@dukelib/sheets-wasm'

initSync({
  module: readFileSync(
    'node_modules/@dukelib/sheets-wasm/duke_sheets_wasm_bg.wasm'
  ),
})

const inputPath = process.argv[2] ?? 'public/sample-chart.xlsx'
const input = new Uint8Array(readFileSync(inputPath))
const out = Workbook.fromBytes(input).saveXlsxBytes()
writeFileSync('/tmp/engine-roundtrip.xlsx', Buffer.from(out))

// Minimal zip reader: pull each `xl/charts/chartN.xml` and collect srgbClr values.
function chartColors(bytes) {
  const buf = Buffer.from(bytes)
  const colorsByChart = {}
  // Central directory scan (good enough for these small files).
  for (let i = 0; i < buf.length - 4; i++) {
    if (buf.readUInt32LE(i) !== 0x02014b50) continue // central dir header
    const method = buf.readUInt16LE(i + 10)
    const compSize = buf.readUInt32LE(i + 20)
    const nameLen = buf.readUInt16LE(i + 28)
    const extraLen = buf.readUInt16LE(i + 30)
    const commentLen = buf.readUInt16LE(i + 32)
    const localOff = buf.readUInt32LE(i + 42)
    const name = buf.toString('utf8', i + 46, i + 46 + nameLen)
    i += 46 + nameLen + extraLen + commentLen - 1
    if (!/^xl\/charts\/chart\d+\.xml$/.test(name)) continue
    // local header -> data
    const lhNameLen = buf.readUInt16LE(localOff + 26)
    const lhExtraLen = buf.readUInt16LE(localOff + 28)
    const dataStart = localOff + 30 + lhNameLen + lhExtraLen
    const raw = buf.subarray(dataStart, dataStart + compSize)
    const text = (
      method === 8 ? inflateRawSync(raw) : raw
    ).toString('utf8')
    colorsByChart[name] = [
      ...new Set(
        [...text.matchAll(/srgbClr val="([0-9A-Fa-f]{6})"/g)].map((m) =>
          m[1].toLowerCase()
        )
      ),
    ].sort()
  }
  return colorsByChart
}

const before = chartColors(input)
const after = chartColors(out)
console.log(`engine round-trip: ${input.length} -> ${out.length} bytes\n`)
for (const name of Object.keys(before)) {
  const o = new Set(before[name])
  const a = new Set(after[name] ?? [])
  const lost = [...o].filter((c) => !a.has(c))
  console.log(name)
  console.log('  before:', [...o].join(' ') || '(none)')
  console.log('  after :', [...a].join(' ') || '(none)')
  console.log('  LOST  :', lost.join(' ') || 'none')
}
