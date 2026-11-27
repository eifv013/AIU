/* 앱 아이콘과 시작 그림 만들기 (Capacitor assets 형식)
 * - assets/icon-only.png        1024 정사각, 전체 그림 (옛 안드로이드, 스토어)
 * - assets/icon-foreground.png  1024, 투명 바탕 + 가운데 안전 영역(66%) 안에 로고 (적응형 아이콘 앞 그림)
 * - assets/icon-background.png  1024, 바탕 (적응형 아이콘 뒤 그림)
 * - assets/splash.png, splash-dark.png 2732 정사각, 가운데에 로고 (앱이 켜질 때)
 * 그림을 직접 그려 넣고 싶으면 이 파일들을 같은 이름, 같은 크기로 바꿔 넣으면 됨 (docs/그림주문서_4_아이콘.md)
 * 실행: node tools/make_app_icons.js  (Playwright + Chrome 필요) */
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW || '/opt/npm-tools/node_modules/playwright');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src/game.html'), 'utf8');
const m = html.match(/<svg class="aiu-mark"[\s\S]*?<\/svg>/);
if (!m) throw new Error('game.html 에서 AIU 로고 SVG 를 찾지 못함');
const logo = m[0].replace('class="aiu-mark"', 'class="lg"');
const BG = `radial-gradient(circle at 50% 42%, #3b2470 0%, #1a1438 38%, #0b0d18 75%)`;
const page = (w, body, transparent) => `<!doctype html><html><head><style>
  html,body{margin:0;width:${w}px;height:${w}px;overflow:hidden;background:${transparent ? 'transparent' : '#090d1b'}}
  .box{position:relative;width:${w}px;height:${w}px;display:grid;place-items:center}
  .bg{position:absolute;inset:0;background:${BG}}
  .crack{position:absolute;left:50%;top:0;bottom:0;width:${w * 0.006}px;background:linear-gradient(transparent,#b48cff 30%,#f2e9ff 50%,#b48cff 70%,transparent);filter:blur(${w * 0.004}px);opacity:.55}
  .lg{position:relative;display:block;overflow:visible;filter:drop-shadow(0 ${w * 0.01}px ${w * 0.02}px rgba(0,0,0,.6))}
  .sub{position:absolute;left:0;right:0;text-align:center;color:#c9c3e6;font:600 ${w * 0.018}px sans-serif;letter-spacing:.4em}
</style></head><body>${body}</body></html>`;
(async () => {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const shot = async (file, w, body, transparent) => {
    const p = await b.newPage({ viewport: { width: w, height: w }, deviceScaleFactor: 1 });
    await p.setContent(page(w, body, transparent)); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(root, 'assets', file), omitBackground: !!transparent });
    await p.close(); console.log('만듦', file);
  };
  // 전체 아이콘: 바탕 + 균열 + 로고 (폭 78%)
  await shot('icon-only.png', 1024, `<div class="box"><div class="bg"></div><div class="crack"></div>${logo.replace('class="lg"', 'class="lg" style="width:800px"')}</div>`);
  // 적응형 앞 그림: 투명 + 로고 (안전 영역 66% 안에 들도록 폭 60%)
  await shot('icon-foreground.png', 1024, `<div class="box">${logo.replace('class="lg"', 'class="lg" style="width:600px"')}</div>`, true);
  // 적응형 뒤 그림: 바탕 + 균열
  await shot('icon-background.png', 1024, `<div class="box"><div class="bg"></div><div class="crack"></div></div>`);
  // 시작 그림: 가운데 로고 (폭 30%) + 아래 정식 명칭
  const sp = `<div class="box"><div class="bg"></div>${logo.replace('class="lg"', 'class="lg" style="width:820px"')}<div class="sub" style="top:${2732 * 0.56}px">ANOMALOUS INCIDENT UNIT</div></div>`;
  await shot('splash.png', 2732, sp);
  await shot('splash-dark.png', 2732, sp);
  await b.close();
})();
