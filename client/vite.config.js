import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const nodeEnv = globalThis.process?.env?.NODE_ENV || 'production'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'socket': ['socket.io-client'],
          'ui': ['axios'],
        },
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(nodeEnv),
  },
})
