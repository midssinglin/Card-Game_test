#!/usr/bin/env python3
"""Draws the app icons (jade felt, bone tile with a brass 牌) into docs/icons/."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
R=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','docs','icons')
os.makedirs(R,exist_ok=True)
FONT='/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'
def icon(size,maskable=False,rounded=True):
    S=size*4
    im=Image.new('RGBA',(S,S),(0,0,0,0))
    bg=Image.new('RGBA',(S,S))
    px=bg.load();cx=cy=S/2
    for y in range(S):
        for x in range(0,S):
            d=min(1,((x-cx)**2+(y-cy*0.85)**2)**.5/(S*0.75))
            a=(20,112,88);b=(7,52,40)
            px[x,y]=tuple(int(a[i]+(b[i]-a[i])*d) for i in range(3))+(255,)
    mask=Image.new('L',(S,S),0)
    ImageDraw.Draw(mask).rounded_rectangle([0,0,S-1,S-1],radius=0 if (maskable or not rounded) else int(S*.22),fill=255)
    im.paste(bg,(0,0),mask)
    d=ImageDraw.Draw(im)
    k=.62 if maskable else .74
    tw,th=S*k*.72,S*k
    x0,y0=cx-tw/2,cy-th/2-S*.01
    sh=Image.new('RGBA',(S,S),(0,0,0,0));ImageDraw.Draw(sh).rounded_rectangle([x0,y0+S*.03,x0+tw,y0+th+S*.03],radius=int(S*.07),fill=(0,0,0,120))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(S*.02)))
    d.rounded_rectangle([x0,y0+S*.035,x0+tw,y0+th+S*.035],radius=int(S*.07),fill=(31,139,96))
    d.rounded_rectangle([x0,y0,x0+tw,y0+th],radius=int(S*.07),fill=(247,242,227))
    f=ImageFont.truetype(FONT,int(th*.62),index=1)
    bb=d.textbbox((0,0),'牌',font=f)
    d.text((cx-(bb[0]+bb[2])/2,y0+th/2-(bb[1]+bb[3])/2),'牌',font=f,fill=(140,104,40))
    return im.resize((size,size),Image.LANCZOS)
icon(192).save(os.path.join(R,'icon-192.png'))
icon(512).save(os.path.join(R,'icon-512.png'))
icon(512,maskable=True).save(os.path.join(R,'maskable-512.png'))
icon(180,rounded=False).convert('RGB').save(os.path.join(R,'apple-touch-icon.png'))
icon(32).save(os.path.join(R,'favicon-32.png'))
print('icons written to',R)
