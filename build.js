// core.js 를 game.html 의 /*CORE*/ 자리에 넣어 한 파일짜리 dist/index.html 을 만든다.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'src/game.html'), 'utf8');
const core = fs.readFileSync(path.join(__dirname, 'src/core.js'), 'utf8');
if (!html.includes('/*CORE*/')) throw new Error('game.html 에 /*CORE*/ 표시가 없습니다');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
// 제작사 로고: 수사 3팀과 같은 인라인 SVG 를 그대로 넣는다
const logo = fs.readFileSync(path.join(__dirname, 'assets/brand/loopandlamp_wordmark_inline.svg'), 'utf8').trim();
if (!logo.startsWith('<svg') || !html.includes('LOGO_SVG')) throw new Error('로고 SVG 또는 LOGO_SVG 표시가 없습니다');
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), html.replace('/*CORE*/', () => core).replace('LOGO_SVG', () => logo));
console.log('built dist/index.html');
