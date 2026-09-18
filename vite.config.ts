import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 배포 시 저장소 이름을 base 경로로 사용 (로컬 dev는 '/')
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/sales-app-2026/' : '/',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
  },
  server: { port: 5173, host: true },
}));
