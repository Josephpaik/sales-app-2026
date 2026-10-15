import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// 디자인 시스템 번들: design-system/src → design-system/components/bundle.js (IIFE, window.SomansaSales)
// React/ReactDOM은 미리보기 프레임의 전역(window.React, window.ReactDOM)을 쓴다.
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export default defineConfig({
  root: r('.'),
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  resolve: {
    alias: [
      { find: /^react\/jsx(-dev)?-runtime$/, replacement: r('./src/jsx-shim.ts') },
      { find: /^@\//, replacement: r('../src/') + '/' },
    ],
  },
  oxc: { jsx: { runtime: 'automatic' } },
  build: {
    outDir: r('./.build'),
    emptyOutDir: true,
    minify: true,
    cssCodeSplit: false,
    lib: { entry: r('./src/index.tsx'), formats: ['iife'], name: 'SomansaSales', fileName: () => 'bundle.js', cssFileName: 'antd-mobile' },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client'],
      output: { globals: { react: 'React', 'react-dom': 'ReactDOM', 'react-dom/client': 'ReactDOM' } },
    },
  },
});
