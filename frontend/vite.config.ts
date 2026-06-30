import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allows external devices to connect
    allowedHosts: [
      'professor-suitably-puzzling.ngrok-free.dev' // Whitelists your ngrok link
    ],
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})

