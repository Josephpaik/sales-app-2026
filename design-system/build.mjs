// 디자인 시스템 번들 빌드: npm run build:ds
//  1) vite(lib, iife)로 src/index.tsx → .build/bundle.js (+ antd-mobile CSS)
//  2) components/bundle.js, components/bundle.css(= src/patterns.css + antd-mobile CSS) 생성
import { build } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));
await build({ configFile: r('./vite.config.ts'), logLevel: 'warn' });

const js = readFileSync(r('./.build/bundle.js'), 'utf8');
const header = '/* @ds-bundle: {"format":4,"namespace":"SomansaSales","components":[{"name":"StatusTag"},{"name":"CertTag"},{"name":"TaxTag"},{"name":"Prob"},{"name":"DesktopShell"},{"name":"MobileShell"}]} */\n';
if (/<\/script|<!--/i.test(js)) throw new Error('bundle.js에 </script 또는 <!-- 가 있어 인라인 불가');
writeFileSync(r('./components/bundle.js'), header + js);

// antd-mobile CSS 먼저, 이후 패턴(--adm-color-primary 등 덮어쓰기) — 앱의 styles.css 로드 순서와 같다
const css = '/* ---------- antd-mobile (generated) ---------- */\n' + readFileSync(r('./.build/antd-mobile.css'), 'utf8') + '\n' + readFileSync(r('./src/patterns.css'), 'utf8');
if (/<\/style/i.test(css)) throw new Error('bundle.css에 </style 이 있음');
writeFileSync(r('./components/bundle.css'), css);
console.log(`bundle.js ${(js.length / 1024).toFixed(0)} KB · bundle.css ${(css.length / 1024).toFixed(0)} KB`);
