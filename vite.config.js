import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: true, // Listen on all interfaces (0.0.0.0) so you can access from phone on same WiFi
    proxy: {
      // Proxying API requests
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Proxying auth requests
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
