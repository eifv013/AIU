# GPT가 만든 "AIU" 글자 위에 '위험 등급 Ω' 도장과 아래 두 줄(영문, 한글)을 정확한 위치로 붙여 타이틀 로고 완성
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random
F = '/usr/share/fonts/opentype/noto/'
def font(name, size, idx=1): return ImageFont.truetype(F + name, size, index=idx)   # ttc 1번 = 한국어(KR)
src = Image.open('/home/claude/aiu/assets/brand/aiu_letters_gpt.png').convert('RGBA')
L, T, R, B = 516, 167, 1608, 572                      # 글자 몸통 범위 (빛 번짐 제외)
W, H = 1600, 1060
cv = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ox, oy = (W - (R - L)) // 2 - L, 150 - T               # 글자 몸통을 가운데, 위에서 150px
cv.alpha_composite(src, (ox, oy))
UL, UT, UR = 1213 + ox, T + oy, R + ox                 # U 글자 왼쪽, 위, 오른쪽
uw = UR - UL

# --- 도장: 평평한 직사각형, 오른쪽 아래로 12도, 왼쪽 아래 1/4이 U 오른쪽 위 모서리에 걸침 ---
sw, sh = int(uw * 0.92), int(uw * 0.92 * 0.33)
st = Image.new('RGBA', (sw, sh), (0, 0, 0, 0)); d = ImageDraw.Draw(st)
bw = max(8, sh // 11)
d.rounded_rectangle((0, 0, sw - 1, sh - 1), radius=bw * 2, fill=(22, 10, 14, 200), outline=(226, 52, 40, 255), width=bw)
d.rounded_rectangle((bw * 2, bw * 2, sw - 1 - bw * 2, sh - 1 - bw * 2), radius=bw, outline=(226, 52, 40, 150), width=max(2, bw // 3))
f = font('NotoSansCJK-Black.ttc', int(sh * 0.48))
d.text((sw / 2, sh / 2 + sh * 0.02), '위험 등급 Ω', font=f, fill=(240, 60, 46, 255), anchor='mm')
# 고무 도장 질감: 잉크가 군데군데 빠진 점
random.seed(3); al = st.getchannel('A'); px = al.load()
for _ in range(int(sw * sh * 0.012)):
    x, y = random.randrange(sw), random.randrange(sh); r = random.choice([1, 1, 2, 3])
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            if 0 <= x + dx < sw and 0 <= y + dy < sh and dx * dx + dy * dy <= r * r: px[x + dx, y + dy] = int(px[x + dx, y + dy] * 0.35)
st.putalpha(al)
rot = st.rotate(-12, expand=True, resample=Image.BICUBIC)     # 음수 = 시계 방향: 왼쪽 끝 높고 오른쪽 끝 낮음
# 회전 전 도장의 왼쪽 아래 1/4 지점이 U 오른쪽 위 모서리에 오도록 → 도장 중심 = 모서리 + (폭 1/4, -높이 1/4) 쯤
cx, cy = UR + sw * 0.10, UT + sh * 0.02
shadow = Image.new('RGBA', rot.size, (0, 0, 0, 0)); shadow.putalpha(rot.getchannel('A').point(lambda v: int(v * 0.6)).filter(ImageFilter.GaussianBlur(8)))
cv.alpha_composite(shadow, (int(cx - rot.width / 2) + 6, int(cy - rot.height / 2) + 8))
cv.alpha_composite(rot, (int(cx - rot.width / 2), int(cy - rot.height / 2)))

# --- 아래 두 줄: 영문 줄은 AIU 글자 폭에 딱 맞게, 한글 줄은 그보다 조금 좁게 크게 ---
d = ImageDraw.Draw(cv)
LW = R - L                                              # AIU 글자 몸통 폭
def spaced(text, fnt, target_w, y, fill, shadow=True):
    ws = [d.textlength(c, font=fnt) for c in text]
    sp = (target_w - sum(ws)) / (len(text) - 1)         # 글자 사이 간격으로 폭을 정확히 맞춤
    x = W / 2 - target_w / 2
    for c, w_ in zip(text, ws):
        if shadow: d.text((x + 3, y + 4), c, font=fnt, fill=(0, 0, 0, 170), anchor='lm')
        d.text((x, y), c, font=fnt, fill=fill, anchor='lm'); x += w_ + sp
y1 = B + oy + 78
spaced('ANOMALOUS INCIDENT UNIT', font('NotoSansCJK-Bold.ttc', 58, 2), LW, y1, (186, 190, 204, 255))
y2 = y1 + 112
kw = LW * 0.70
spaced('이상현상 전담수사팀', font('NotoSansCJK-Black.ttc', 84), kw, y2, (248, 248, 252, 255))
for sgn in (-1, 1):                                       # 양옆 가로선: 한글 줄 끝에서 AIU 글자 끝까지
    x0 = W / 2 + sgn * (kw / 2 + 26); x1 = W / 2 + sgn * (LW / 2)
    d.line((x0, y2, x1, y2), fill=(205, 205, 220, 235), width=6)
bb = cv.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
half = max(W / 2 - bb[0], bb[2] - W / 2)                 # 좌우 대칭으로 잘라야 화면 가운데에 놓았을 때 AIU 글자가 정확히 가운데
out = cv.crop((int(W / 2 - half), bb[1], int(W / 2 + half), bb[3]))
out.save('/home/claude/aiu/assets/brand/aiu_logo_final.png')
w = 900; out.resize((w, int(out.height * w / out.width)), Image.LANCZOS).save('/home/claude/aiu/assets/art/logo_title.webp', quality=90, method=6)
prev = Image.new('RGBA', out.size, (12, 12, 24, 255)); prev.alpha_composite(out); prev.convert('RGB').resize((out.width // 2, out.height // 2)).save('/home/claude/iconwork/logo_prev.png')
print(out.size)
