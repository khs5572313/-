#!/usr/bin/env node
// 웹 화면을 '파일 하나'로 묶는다. 결과물은 설치·서버 없이 더블클릭으로 열린다.
//   node tools/build.mjs
//   → dist/samgukgi.html   (완전한 HTML 문서, 내려받아 바로 실행)
//   → dist/artifact.html   (claude.ai 아티팩트 게시용 조각)
// 번들러는 esbuild(npx로 자동 설치, 네트워크 필요)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const js = execFileSync('npx', ['-y', 'esbuild@0.24.0', join(root, 'web/app.js'), '--bundle', '--format=iife', '--target=es2020'],
  { encoding: 'utf8', maxBuffer: 1 << 26 });
const html = readFileSync(join(root, 'web/index.html'), 'utf8');
const tag = '<script type="module" src="./app.js"></script>';
if (!html.includes(tag)) throw new Error('index.html에서 app.js 스크립트 태그를 찾지 못했습니다');
const fragment = html.replace(tag, () => `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/artifact.html'), fragment);
const cut = fragment.indexOf('<div class="wrap">');
writeFileSync(join(root, 'dist/samgukgi.html'),
  `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n`
  + `<style>body{margin:0}[hidden]{display:none!important}</style>\n${fragment.slice(0, cut)}</head>\n<body>\n${fragment.slice(cut)}\n</body>\n</html>\n`);
console.log(`빌드 완료: dist/samgukgi.html (${(fragment.length / 1024).toFixed(0)} KB)`);
