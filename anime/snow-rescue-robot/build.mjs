// 단일 HTML 빌드: three.js 포함 전체 코드를 하나의 파일로 인라인
import { build } from 'esbuild';
import fs from 'fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
const html = fs.readFileSync('template.html', 'utf8').replace('/*__BUNDLE__*/', () => js);
fs.writeFileSync('snow-rescue-robot.html', html);
console.log('built', (html.length / 1024).toFixed(0) + 'KB');
