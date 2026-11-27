# 캐릭터 아이콘 그림(assets/brand/icon-source.png) 위에 AIU 로고를 얹어 앱 아이콘 세 장을 만듦. 로고 PNG는 tools/make_app_icons.js 와 같은 SVG 에서 렌더링
from PIL import Image, ImageDraw, ImageFilter
S=1024; A='/home/claude/aiu/assets/'
src=Image.open(A+'brand/icon-source.png').convert('RGB').crop((95,95,1159,1159))
logo=Image.open(A+'brand/aiu_letters_gpt.png').convert('RGBA').crop((470,120,1655,620))   # GPT 금색 AIU 글자 (빛 번짐 조금 포함)
def with_outline(lg, w):
    a=lg.split()[3]; o=a.filter(ImageFilter.MaxFilter(w*2+1))
    out=Image.new('RGBA',lg.size,(10,8,20,0)); out.putalpha(o)
    g=Image.new('RGBA',lg.size,(150,100,255,0)); g.putalpha(o.filter(ImageFilter.GaussianBlur(w*1.6)).point(lambda v:int(v*.8)))
    pad=w*4; c=Image.new('RGBA',(lg.width+pad*2,lg.height+pad*2),(0,0,0,0))
    for im in (g,out,lg): c.alpha_composite(im,(pad,pad))
    return c
def place(canvas, width, cy):
    lg=with_outline(logo.resize((width,int(logo.height*width/logo.width)),Image.LANCZOS), max(4,width//60))
    canvas.alpha_composite(lg,((S-lg.width)//2, int(cy-lg.height/2)))
def shade(canvas, y0):
    sh=Image.new('L',(S,S),0); d=ImageDraw.Draw(sh)
    for y in range(y0,S): d.line([(0,y),(S,y)],fill=int(200*min(1,(y-y0)/(S-y0)*1.5)))
    canvas.alpha_composite(Image.composite(Image.new('RGBA',(S,S),(8,6,18,255)),Image.new('RGBA',(S,S),(0,0,0,0)),sh))
full=src.resize((S,S),Image.LANCZOS).convert('RGBA'); shade(full,700); place(full,520,895); full.convert('RGB').save(A+'icon-only.png')
bg=src.resize((S,S),Image.LANCZOS).filter(ImageFilter.GaussianBlur(30)); bg.paste(src.resize((720,720),Image.LANCZOS),(152,152))
bgr=bg.convert('RGBA'); shade(bgr,620); bgr.convert('RGB').save(A+'icon-background.png')
fg=Image.new('RGBA',(S,S),(0,0,0,0)); place(fg,400,745); fg.save(A+'icon-foreground.png')
ad=bgr.copy(); ad.alpha_composite(fg)
def mask(im,kind):
    c=im.crop((170,170,854,854)).resize((S,S),Image.LANCZOS); m=Image.new('L',(S,S),0); d=ImageDraw.Draw(m)
    if kind=='c': d.ellipse((0,0,S-1,S-1),fill=255)
    else: d.rounded_rectangle((0,0,S-1,S-1),radius=230,fill=255)
    o=Image.new('RGBA',(S,S),(0,0,0,0)); o.paste(c,(0,0),m); return o
row=Image.new('RGBA',(256*3+40+96+48+40,256),(60,60,70,255))
row.alpha_composite(full.resize((256,256),Image.LANCZOS),(0,0))
row.alpha_composite(mask(ad,'c').resize((256,256),Image.LANCZOS),(276,0))
row.alpha_composite(mask(ad,'r').resize((256,256),Image.LANCZOS),(552,0))
row.alpha_composite(mask(ad,'r').resize((96,96),Image.LANCZOS),(828,80))
row.alpha_composite(mask(ad,'r').resize((48,48),Image.LANCZOS),(944,104))
row.save('/home/claude/iconwork/preview6.png')
