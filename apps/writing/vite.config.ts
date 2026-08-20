import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only config: Vite serves the React app on 5173 and proxies `/api` to the
// Hono server on 8787. Production (`pnpm start`) serves the built `dist/` from
// the same Hono server, so no proxy is involved there.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
