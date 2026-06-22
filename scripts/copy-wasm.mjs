// Copy the engine's vendored wasm into public/ so it is served at the site
// root with the correct MIME, in both dev and build. Keyed to node_modules so
// it stays in sync when the package version in package.json changes.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(
  root,
  'node_modules/@extend-ai/react-xlsx/dist/duke_sheets_wasm_bg.wasm'
)
const dest = resolve(root, 'public/duke_sheets_wasm_bg.wasm')

mkdirSync(dirname(dest), { recursive: true })
copyFileSync(src, dest)
console.log(`copied wasm -> ${dest}`)
