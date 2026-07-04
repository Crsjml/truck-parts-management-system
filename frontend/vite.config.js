import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: './vitest.setup.js',
    globals: true
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/countries': {
        target: 'https://restcountries.com/v3.1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/countries/, '')
      },
      '/api': {
        target: process.env.BACKEND_PROXY_TARGET || process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('react-select')) return 'vendor-react-select';
            if (id.includes('jspdf')) return 'vendor-pdf';
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('@phosphor-icons')) return 'vendor-icons';
            return 'vendor-core'; // all other dependencies go here
          }
        }
      }
    }
  }
})
