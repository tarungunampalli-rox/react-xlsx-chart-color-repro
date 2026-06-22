import { XlsxViewer, useXlsxViewerController } from '@extend-ai/react-xlsx'
import { useEffect, useState } from 'react'

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const SAMPLE_URL = '/sample-chart.xlsx'

function downloadBytes(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], { type: XLSX_MIME })
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [file, setFile] = useState<ArrayBuffer | undefined>(undefined)
  const [sourceName, setSourceName] = useState('sample-chart.xlsx (bundled)')

  useEffect(() => {
    fetch(SAMPLE_URL)
      .then((res) => res.arrayBuffer())
      .then(setFile)
  }, [])

  const controller = useXlsxViewerController({
    file,
    fileName: 'workbook.xlsx',
  })

  // Exposed so the round-trip can be inspected from the console / automation:
  //   __xlsxController.charts.length                  -> did the engine parse charts?
  //   __xlsxController.workbook.saveXlsxBytes()        -> raw re-serialized bytes
  //   __xlsxController.exportXlsx()                    -> merged download
  ;(globalThis as unknown as { __xlsxController?: unknown }).__xlsxController =
    controller

  // `controller.charts` is the ACTIVE sheet only; count across every sheet.
  const totalCharts = (controller.sheets ?? []).reduce(
    (sum, _sheet, i) => sum + (controller.getSheetCharts?.(i)?.length ?? 0),
    0
  )

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 980,
        margin: '0 auto',
        padding: 24,
      }}
    >
      <h1>@extend-ai/react-xlsx — chart round-trip fidelity repro</h1>
      <p>
        Load a workbook that contains a chart, then re-serialize it through the
        engine via each path and open the downloads in Excel / Numbers / Google
        Sheets. The chart&rsquo;s colors (and, depending on the file, the chart
        itself) are not preserved.
      </p>

      <p
        style={{
          background: '#fff7e6',
          border: '1px solid #ffd591',
          borderRadius: 6,
          padding: '8px 12px',
        }}
      >
        The bundled <code>sample-chart.xlsx</code> is an Excel-authored workbook
        with three charts (on the <strong>Summary</strong> and{' '}
        <strong>Charts</strong> sheets). It renders correctly, but its chart
        colors are lost on export. Or load your own Excel chart file below.
      </p>

      <p>
        <label>
          <strong>Load .xlsx: </strong>
          <input
            type='file'
            accept='.xlsx'
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setSourceName(`${f.name} (picked)`)
              f.arrayBuffer().then(setFile)
            }}
          />
        </label>
      </p>

      <p style={{ fontSize: 14 }}>
        Loaded: <code>{sourceName}</code> — charts parsed by engine (all
        sheets):{' '}
        <strong style={{ color: totalCharts > 0 ? '#237804' : '#cf1322' }}>
          {totalCharts}
        </strong>
        {totalCharts === 0 && ' (this file will not exercise the chart bug)'}
      </p>

      <div style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
        <button
          type='button'
          disabled={!controller.workbook}
          onClick={() => {
            const bytes = controller.workbook?.saveXlsxBytes()
            if (bytes) downloadBytes(bytes, 'roundtrip-saveXlsxBytes.xlsx')
          }}
        >
          Download saveXlsxBytes (raw)
        </button>
        <button
          type='button'
          disabled={!controller.canExport}
          onClick={() => controller.exportXlsx()}
        >
          Download exportXlsx (merged)
        </button>
      </div>

      <div
        style={{
          height: 520,
          border: '1px solid #ddd',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <XlsxViewer controller={controller} height='100%' />
      </div>

      <p style={{ color: '#666', fontSize: 13, marginTop: 16 }}>
        react-xlsx@0.12.1 · first observed on 0.10.2 · bump the version in{' '}
        <code>package.json</code> to re-test other releases.
      </p>
    </main>
  )
}
