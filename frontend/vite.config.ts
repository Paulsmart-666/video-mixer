import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// @ 别名 -> src；dev 代理 /api 到后端 8000（与后端 CORS/端口一致）
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
