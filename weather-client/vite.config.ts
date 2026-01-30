import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy MCP server requests during development
      // Update this to match your MCP server URL
      '/mcp': {
        target: 'http://localhost:8880',
        changeOrigin: true,
      },
    },
  },
})
