import numpy as np
from PIL import Image, ImageEnhance, ImageDraw
U='/mnt/user-data/uploads/'; A='/home/claude/aiu/assets/art/'
BG={'knight':((58,74,110),(18,22,34)),'archer':((52,86,66),(16,24,20)),'mage':((110,52,40),(30,16,14)),'priest':((96,90,120),(24,22,34)),'dark':((84,52,140),(20,12,34))}
SRC={'knight':'07b534cc','archer':'f984b80a','mage':'124b7a85','priest':'80a0c524','dark':'1d21367f'}
# 얼굴 가운데 x, 머리 꼭대기 y, 턱 y (원본 1024x1536 기준, 격자로 잰 값)
FACE={'knight':(512,22,217),'archer':(497,22,210),'mage':(595,38,225),'priest':(512,22,210),'dark':(512,15,165)}
def tinted(k):
  im=np.asarray(Image.open(U+SRC[k]+'-image.png').convert('RGB')).astype(np.float32)
  border=np.concatenate([im[0],im[-1],im[:,0],im[:,-1]]); bg=np.median(border,0)
  pad=400; P=np.empty((im.shape[0]+2*pad,im.shape[1]+2*pad,3),np.float32); P[:]=bg; P[pad:-pad,pad:-pad]=im
  d=np.sqrt(((P-bg)**2).sum(-1)); w=np.exp(-(d/16)**2)[...,None]
  return P,w,pad
def make(k,P,w,pad,box,size):
  x0,y0,x1,y1=[int(v)+pad for v in box]
  c=P[y0:y1,x0:x1]; ww=w[y0:y1,x0:x1]
  c1,c2=np.array(BG[k][0],float),np.array(BG[k][1],float)
  t=np.linspace(0,1,c.shape[0])[:,None,None]; tgt=c1*(1-t)+c2*t
  out=c*(1-ww)+tgt*ww
  return ImageEnhance.Brightness(Image.fromarray(np.clip(out,0,255).astype(np.uint8)).resize(size,Image.LANCZOS)).enhance(1.1)
sheet=Image.new('RGB',(5*240,330),(15,20,34)); dd=ImageDraw.Draw(sheet)
for i,k in enumerate(SRC):
  P,w,pad=tinted(k); cx,ht,cb=FACE[k]; H=cb-ht
  # 머리 실제 너비를 픽셀로 재서 가운데를 맞춤 (어깨, 방패, 손 제외: 머리 윗부분 줄만, 얼굴 근처 칸만)
  rows=w[pad+int(ht+0.08*H):pad+int(ht+0.42*H), pad+int(cx-H):pad+int(cx+H),0]
  cols=np.where((rows<0.5).mean(0)>0.25)[0]
  cx=cx-H+(cols[0]+cols[-1])/2+0.12*H; print(k,round(cx))  # 모두 오른쪽을 보므로 얼굴 쪽으로 조금
  s=1.75*H; sq=make(k,P,w,pad,(cx-s/2,ht-0.08*H,cx+s/2,ht-0.08*H+s),(256,256))
  cw,ch=1.2*H,1.6*H; cd=make(k,P,w,pad,(cx-cw/2,ht-0.02*H,cx+cw/2,ht-0.02*H+ch),(240,320))
  sq.save(A+f'card_{k}.webp',quality=86); cd.save(A+f'id_{k}.webp',quality=86)
  # 확인용: 실제 표시 크기(칸 62, 카드 76x112)와 큰 크기
  sheet.paste(sq.resize((120,120)),(i*240,0)); sheet.paste(cd.resize((90,120)),(i*240+130,0))
  sheet.paste(sq.resize((62,62)),(i*240,140)); sheet.paste(cd.resize((76,101)),(i*240+130,140))
  dd.line((i*240+60,0,i*240+60,120),fill=(255,0,0)); dd.line((i*240+175,0,i*240+175,120),fill=(255,0,0))
sheet.save('verify.png')
