import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 项目站点路径：https://<用户名>.github.io/job-tracker/
export default defineConfig({
  base: '/job-tracker/',
  plugins: [react()],
  // usePolling：避免在部分 Windows 路径（含中文目录）下文件修改未被检测到
  server: { port: 5173, strictPort: true, watch: { usePolling: true, interval: 300 } },
  preview: { port: 4173, strictPort: true },
  build: { sourcemap: false },
});
