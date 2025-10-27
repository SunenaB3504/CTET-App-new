import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Explicit HMR settings so the client connects to the dev server's websocket
    // even when the page is served from a different port (e.g. forwarded proxy).
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      // clientPort is the port the browser should use to reach the HMR websocket.
      // When the page is served from a forwarded/proxied port (e.g. 5174) set this
      // to that port so the client connects successfully through the proxy.
      clientPort: 5174,
      // optional: a stable path for the websocket endpoint
      path: '/hmr'
    }
  }
})
