// game.html 에 규칙(core.js), 제작사 로고, 그림(assets/art/*.webp)을 넣어 한 파일짜리 dist/index.html 을 만든다.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'src/game.html'), 'utf8');
const core = fs.readFileSync(path.join(__dirname, 'src/core.js'), 'utf8');
for (const mark of ['/*CORE*/', 'LOGO_SVG', '/*ART*/{}']) if (!html.includes(mark)) throw new Error(`game.html 에 ${mark} 표시가 없습니다`);
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
// 제작사 로고: 수사 3팀과 같은 인라인 SVG 를 그대로 넣는다
const logo = fs.readFileSync(path.join(__dirname, 'assets/brand/loopandlamp_wordmark_inline.svg'), 'utf8').trim();
if (!logo.startsWith('<svg')) throw new Error('로고 SVG 가 올바르지 않습니다');
// 그림: 파일 이름(확장자 뺀 것)을 열쇠로, webp 를 data URI 로
const artDir = path.join(__dirname, 'assets/art'), art = {};
for (const f of fs.readdirSync(artDir).sort()) {
  if (!f.endsWith('.webp')) continue;
  art[f.slice(0, -5)] = 'data:image/webp;base64,' + fs.readFileSync(path.join(artDir, f)).toString('base64');
}
const need = ['key', 'spr_shade', 'spr_crawler', 'spr_boss1', 'spr_boss2', 'spr_boss3', ...['knight', 'archer', 'mage', 'priest', 'dark'].flatMap(id => ['spr_' + id, 'card_' + id])];
const miss = need.filter(k => !art[k]); if (miss.length) throw new Error('빠진 그림: ' + miss.join(', '));
const out = html.replace('/*ART*/{}', () => JSON.stringify(art)).replace('/*CORE*/', () => core).replace('LOGO_SVG', () => logo);
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), out);
// 앱 자동 업데이트용: 현재 버전 (앱이 깃허브에서 이 파일을 보고 새 게임 파일을 받음)
const ver = (out.match(/window\.AIU_VER = '([\d.]+)'/) || [])[1];
if (!ver) throw new Error('AIU_VER 를 찾지 못했습니다');
fs.writeFileSync(path.join(__dirname, 'dist/version.json'), JSON.stringify({ v: ver }) + '\n');
console.log(`built dist/index.html (${(out.length / 1024).toFixed(0)} KB, 그림 ${Object.keys(art).length}장)`);
