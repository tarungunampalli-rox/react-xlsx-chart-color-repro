import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // @extend-ai/react-xlsx spawns a Web Worker that code-splits; Vite's default
  // worker.format ('iife') rejects that. ES worker output is required.
  worker: { format: 'es' },
})
