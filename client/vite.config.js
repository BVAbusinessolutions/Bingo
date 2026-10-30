import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // hls.js (~590 kB) ya va en su propio chunk y solo se descarga al abrir una transmisión LL-HLS:
    // no afecta la carga inicial, así que el aviso de 500 kB no aplica a ese archivo.
    chunkSizeWarningLimit: 650,
  },
  server: {
    port: 5173,
    // El proxy mantiene frontend y API en el mismo origen -> la cookie SameSite=Strict funciona.
    proxy: {
      '/api': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
});
