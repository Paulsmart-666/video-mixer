import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// 构建时从 package.json 读取版本号，注入为全局 __APP_VERSION__，
// 与 更新日志.md 的「当前版本」标记、Git tag vX.Y.Z 保持一致（见 开发规范.md）。

// @ 别名 -> src；dev 代理 /api 到后端 8000（与后端 CORS/端口一致）
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
