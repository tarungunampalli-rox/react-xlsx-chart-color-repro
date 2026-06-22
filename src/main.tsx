import { setWasmSource } from '@extend-ai/react-xlsx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'

// The wasm is copied into public/ by scripts/copy-wasm.mjs (pre-dev/pre-build),
// so it is served from the site root with the correct MIME. Point the engine at
// it before the viewer initializes, otherwise the default resolver 404s to the
// SPA fallback HTML and instantiation fails with a bad-magic-word error.
setWasmSource('/duke_sheets_wasm_bg.wasm')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
