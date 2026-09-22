import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The API runs separately; proxying keeps the browser on one origin in development.
    proxy: { '/api': 'http://localhost:5080' },
  },
})
