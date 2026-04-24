import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('/react-force-graph-2d/')) return 'graph'
          if (id.includes('/recharts/')) return 'charts'
          if (id.includes('/framer-motion/')) return 'motion'
          if (id.includes('/react-dom/') || id.includes('/react-router-dom/') || id.includes('/react/')) {
            return 'react'
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
})
