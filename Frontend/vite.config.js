import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to the Backend
      '/upload': 'http://localhost:3000',
      '/files': 'http://localhost:3000',
      '/file': 'http://localhost:3000'
    }
  }
})
