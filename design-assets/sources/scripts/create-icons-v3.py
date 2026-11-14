from pathlib import Path
import json,math
from PIL import Image,ImageDraw,ImageFont
OUT=Path('docs/icon-proposals-v3');OUT.mkdir(exist_ok=True)
META=json.loads(Path('docs/icon-proposals-v1/pixel-maps.json').read_text('utf-8'))
INK='#282828';EDGE='#282828';GOLD='#e3b850';BLUE='#8ebbd0';PALE='#ecece6';GREEN='#7ea39d'
icons=[]
def make(item):
 p={};key=item['id'];base=key.rsplit('-',1)[0];on=key.endswith('-on')
 def dot(x,y,c=INK):
  assert 0<=x<16 and 0<=y<16,(key,x,y)
  p[x,y]=c
 def r(x,y,w,h,c=INK):
  for yy in range(y,y+h):
   for xx in range(x,x+w):dot(xx,yy,c)
 def l(x,y,a,b,c=INK):
  n=max(abs(a-x),abs(b-y))
  for i in range(n+1):dot(round(x+(a-x)*i/(n or 1)),round(y+(b-y)*i/(n or 1)),c)
 def b(x,y,w,h,c=INK):r(x,y,w,1,c);r(x,y+h-1,w,1,c);r(x,y,1,h,c);r(x+w-1,y,1,h,c)
 def path(points,c=INK):
  for a,z in zip(points,points[1:]):l(*a,*z,c)
 def cloud():path([(2,11),(1,10),(1,8),(2,7),(4,7),(4,5),(6,3),(8,3),(10,5),(10,6),(12,6),(14,8),(14,10),(13,11),(2,11)])
 if item['group']=='家電':
  active=BLUE if on else PALE
  if base=='ac':
   r(2,3,12,5,PALE);b(1,2,14,7,EDGE);r(4,6,8,1,EDGE);dot(12,4,GREEN if on else EDGE)
   if on:
    for x in (4,7,10):l(x,11,x,13,BLUE);dot(x+1,14,BLUE)
  elif base=='floor':
   r(6,2,4,1,EDGE);r(5,3,6,2,GOLD if on else PALE);r(4,5,8,2,GOLD if on else PALE);r(3,7,10,1,EDGE);r(7,8,2,6,EDGE);r(4,14,8,1,EDGE)
  elif base=='ceiling':
   r(7,1,2,3,EDGE);r(4,5,8,3,GOLD if on else PALE);b(3,4,10,5,EDGE)
   if on:
    for x in (4,7,11):r(x,11,1,3,GOLD)
  elif base=='humidifier':
   r(4,7,8,7,PALE);b(3,6,10,9,EDGE);r(6,8,4,1,EDGE);r(6,12,4,1,active)
   if on:l(5,4,6,2,BLUE);l(9,4,10,1,BLUE)
  elif base=='fan':
   b(2,1,12,11,EDGE);r(7,6,2,2,GOLD if on else EDGE);r(7,3,3,3,active);r(9,7,3,3,active);r(4,8,3,2,active);r(3,4,3,3,active);r(7,12,2,2,EDGE);r(4,14,8,1,EDGE)
  elif base=='purifier':
   r(5,2,6,12,PALE);b(4,1,8,14,EDGE)
   for y in (4,7,10):r(6,y,4,1,EDGE)
   r(7,12,2,1,GREEN if on else EDGE)
  elif base=='vacuum':
   r(4,4,8,8,PALE);r(2,6,12,4,PALE);path([(4,3),(11,3),(13,5),(14,7),(14,9),(12,12),(4,12),(1,9),(1,7),(2,5),(4,3)],EDGE);r(6,5,4,2,active);r(5,10,6,1,EDGE)
 elif key=='home':path([(1,7),(7,1),(14,8)]);l(3,7,3,14);l(12,7,12,14);l(3,14,12,14);b(6,9,4,6)
 elif key=='devices':
  for x in (2,9):
   for y in (2,9):b(x,y,5,5)
 elif key=='music':r(6,3,2,9);r(12,1,2,9);r(7,2,6,2);r(2,10,5,3);r(8,9,5,3)
 elif key=='news':b(2,1,10,13);r(4,3,6,3);r(4,8,2,1);r(8,8,2,1);r(4,11,6,1);path([(12,4),(14,4),(14,14),(3,14)])
 elif key=='calendar':b(2,3,12,11);r(5,1,1,4);r(10,1,1,4);r(3,6,10,1);[r(x,y,2,2) for x in (4,7,10) for y in (8,11)]
 elif key=='bell':r(7,1,2,2);path([(5,3),(10,3),(12,5),(12,10),(14,12),(1,12),(3,10),(3,5),(5,3)]);r(6,14,4,1)
 elif key=='pin':path([(5,1),(10,1),(12,3),(12,8),(8,14),(3,8),(3,3),(5,1)]);b(6,4,4,4)
 elif key in ('fullscreen','exit-fullscreen'):
  reverse=key=='exit-fullscreen'
  for x,y in ((2,2),(10,2),(2,10),(10,10)):
   xx=x+(3 if (x==2 and reverse) or (x==10 and not reverse) else 0);yy=y+(3 if (y==2 and reverse) or (y==10 and not reverse) else 0);r(x,yy,4,1);r(xx,y,1,4)
 elif key=='plus':r(7,3,2,10);r(3,7,10,2)
 elif key=='close':
  for i in range(3,12):dot(i,i);dot(14-i,i)
 elif key in ('left','right'):
  path([(10,3),(5,8),(10,13)] if key=='left' else [(5,3),(10,8),(5,13)])
 elif key=='play':
  for x in range(4,12):
   h=12-2*((x-4)//2);r(x,8-h//2,1,h)
 elif key=='pause':r(4,3,3,10);r(10,3,3,10)
 elif key=='stop':r(4,4,8,8)
 elif key in ('previous','next'):
  r(2 if key=='previous' else 13,3,1,10)
  for x in range(5,12):
   h=min(10,2+2*(x-5)) if key=='previous' else max(2,10-2*(x-5));r(x,8-h//2,1,h)
 elif key=='repeat':path([(3,6),(3,4),(13,4),(11,2)]);l(13,4,11,6);path([(12,9),(12,12),(2,12),(4,10)]);l(2,12,4,14)
 elif key=='shuffle':path([(2,4),(5,4),(10,11),(13,11)]);path([(2,11),(5,11),(10,4),(13,4)]);path([(11,2),(13,4),(11,6)]);path([(11,9),(13,11),(11,13)])
 elif key in ('volume','mute'):
  r(2,6,3,4);path([(5,6),(8,3),(8,12),(5,9)])
  if key=='mute':l(11,6,14,9);l(11,9,14,6)
  else:path([(11,4),(13,6),(13,9),(11,11)])
 elif key=='check':path([(2,8),(6,12),(13,4)]);path([(2,7),(6,11),(13,3)])
 elif key=='clock':path([(5,1),(10,1),(14,5),(14,10),(10,14),(5,14),(1,10),(1,5),(5,1)]);path([(8,4),(8,8),(11,8)])
 elif key=='spark':path([(8,1),(6,6),(1,8),(6,10),(8,14),(10,10),(14,8),(10,6),(8,1)])
 elif key=='sun':
  b(5,5,6,6)
  for a,z in [((7,1),(7,3)),((7,12),(7,14)),((1,7),(3,7)),((12,7),(14,7)),((2,2),(3,3)),((12,12),(13,13)),((2,13),(3,12)),((12,3),(13,2))]:l(*a,*z)
 elif key=='moon':path([(8,1),(5,2),(2,5),(1,9),(3,12),(6,14),(10,14),(13,11),(8,11),(5,8),(5,4),(8,1)])
 elif key in ('cloud','rain-light','rain-heavy','thunder','partly-cloudy'):
  if key=='partly-cloudy':b(2,1,5,5);dot(1,1);dot(8,2)
  cloud()
  if key in ('rain-light','rain-heavy'):
   for x in ((4,9,13) if key=='rain-light' else (3,6,9,12)):l(x,13,x-1,14)
  if key=='thunder':path([(9,12),(7,13),(9,13),(8,15)])
 elif key=='rain-stop':path([(3,7),(8,2),(13,7),(3,7)]);path([(8,7),(8,13),(6,13),(5,12)])
 elif key=='temperature':b(6,1,4,11);r(7,4,2,8);path([(5,10),(4,13),(6,15),(9,15),(11,13),(10,10)])
 elif key=='humidity':path([(7,1),(2,8),(2,11),(5,14),(10,14),(13,11),(13,8),(7,1)]);path([(5,8),(5,10),(7,12)])
 elif key=='co2':b(1,4,5,6);b(10,6,5,6);l(5,6,10,8);r(5,2,4,1);r(7,13,4,1)
 elif key=='aqi':path([(1,4),(11,4),(13,2),(14,4),(12,6)]);l(1,8,13,8);path([(1,12),(9,12),(11,14),(13,12)])
 elif key=='pm25':r(2,3,3,3);r(10,2,3,3);r(6,8,4,4);r(2,12,2,2);r(12,12,2,2)
 elif key=='pollen':b(6,6,4,4);r(6,1,4,3);r(6,12,4,3);r(1,6,3,4);r(12,6,3,4);dot(3,3);dot(12,3);dot(3,12);dot(12,12)
 else:raise ValueError(key)
 # Reference-led filled silhouettes; all drawing still uses integer cells.
 def polygon(points,fill,outline=INK):
  for yy in range(16):
   for xx in range(16):
    inside=False
    for (x1,y1),(x2,y2) in zip(points,points[1:]+points[:1]):
     if (y1>yy+.5)!=(y2>yy+.5) and xx+.5 < (x2-x1)*(yy+.5-y1)/(y2-y1)+x1:inside=not inside
    if inside:dot(xx,yy,fill)
  path(points+[points[0]],outline)
 def filled_cloud():
  polygon([(2,11),(1,10),(1,8),(3,6),(5,6),(5,4),(7,3),(9,4),(11,6),(13,6),(14,8),(14,10),(13,11)],'#eeeeee')
  r(3,10,10,1,'#a5a5a5');r(6,5,3,1,'#ffffff')
 if item['group']!='家電':
  if key=='home':
   p.clear();r(3,7,10,8,'#dedede');b(3,7,10,8);r(6,10,3,5,'#777777');b(6,10,3,5);r(10,9,2,2,'#ffffff');r(11,2,2,4,'#777777');b(11,2,2,4);polygon([(1,7),(7,1),(14,7),(13,8),(7,3),(2,8)],'#8c8c8c')
  elif key=='devices':
   p.clear();r(4,1,10,10,'#a3a3a3');b(4,1,10,10);r(7,11,3,1);r(5,12,7,1);r(1,6,5,9,'#cccccc');b(1,6,5,9);r(2,7,3,5,'#eeeeee');r(8,8,7,6,'#cccccc');b(8,8,7,6);r(9,9,5,3,'#eeeeee');r(10,14,3,1)
  elif key=='news':
   p.clear();r(2,1,11,13,'#eeeeee');b(2,1,11,13);path([(13,4),(14,4),(14,14),(3,14)]);r(4,3,7,2);b(4,7,3,3)
   for y in (7,9,11):r(8,y,3,1)
   r(4,11,3,1)
  elif key=='calendar':
   p.clear();r(2,3,12,12,'#eeeeee');b(2,3,12,12);r(3,4,10,3,'#777777');r(5,1,2,4);r(10,1,2,4);r(5,2,1,2,'#eeeeee');r(10,2,1,2,'#eeeeee');r(5,8,1,5);r(9,8,3,1);r(9,9,1,2);r(9,10,3,1);r(11,11,1,2);r(9,12,3,1)
  elif key=='bell':
   p.clear();r(7,1,2,2);polygon([(6,3),(9,3),(11,5),(11,10),(13,12),(2,12),(4,10),(4,5)],'#adadad');r(5,5,1,5,'#eeeeee');r(3,12,10,1);r(6,14,4,1)
  elif key=='pin':
   p.clear();polygon([(5,1),(10,1),(13,4),(13,8),(8,14),(2,8),(2,4)],'#303030');r(6,4,4,4,'#eeeeee');r(7,5,2,2,'#999999')
  elif key=='close':
   p.clear()
   for i in range(3,12):r(i,i,2,2);r(14-i,i,2,2)
  elif key in ('left','right'):
   p.clear();points=[(10,2),(4,8),(10,14)] if key=='left' else [(5,2),(11,8),(5,14)]
   path(points);path([(x+1,y) for x,y in points])
  elif key in ('volume','mute'):
   p.clear();r(1,6,4,4);polygon([(4,6),(8,2),(8,13),(4,9)],'#555555')
   if key=='mute':l(11,6,14,9);l(11,9,14,6)
   else:path([(10,5),(12,7),(12,9),(10,11)]);path([(12,3),(14,6),(14,10),(12,13)])
  elif key=='clock':
   p.clear();polygon([(5,1),(10,1),(14,5),(14,10),(10,14),(5,14),(1,10),(1,5)],'#eeeeee');path([(8,4),(8,8),(11,8)]);dot(4,4);dot(11,4);dot(4,11);dot(11,11);dot(3,8);dot(8,12)
  elif key=='spark':
   p.clear();polygon([(8,1),(6,6),(1,8),(6,10),(8,14),(10,10),(14,8),(10,6)],'#bbbbbb');r(7,6,2,4,'#eeeeee')
  elif key=='sun':
   p.clear();polygon([(6,4),(9,4),(11,6),(11,9),(9,11),(6,11),(4,9),(4,6)],'#b6b6b6');r(6,5,3,1,'#eeeeee')
   for a,z in [((7,1),(7,2)),((7,13),(7,14)),((1,7),(2,7)),((13,7),(14,7)),((2,2),(3,3)),((12,12),(13,13)),((2,13),(3,12)),((12,3),(13,2))]:l(*a,*z)
  elif key=='moon':
   p.clear();polygon([(8,1),(5,2),(2,5),(1,9),(3,12),(6,14),(10,14),(13,11),(8,11),(5,8),(5,4)],'#bbbbbb');path([(5,3),(3,6),(3,9)],'#eeeeee')
  elif key in ('cloud','partly-cloudy','rain-light','rain-heavy','rain-stop','thunder'):
   p.clear()
   if key=='partly-cloudy':polygon([(3,1),(6,1),(8,3),(8,6),(6,8),(3,8),(1,6),(1,3)],'#aaaaaa');dot(0,0);dot(9,1)
   filled_cloud()
   if key in ('rain-light','rain-heavy','rain-stop'):
    for x in ((4,10,13) if key=='rain-heavy' else (5,11) if key=='rain-light' else (8,)):
     r(x,13,1,2,'#777777');dot(x-1,14,'#777777')
   if key=='thunder':polygon([(8,8),(6,12),(8,12),(7,15),(11,10),(9,10),(10,8)],'#999999')
  elif key=='temperature':
   p.clear();r(6,1,4,11,'#eeeeee');b(6,1,4,11);polygon([(6,10),(4,13),(6,15),(9,15),(11,13),(9,10)],'#b0b0b0');r(7,5,2,8,'#777777');dot(5,13,'#eeeeee')
  elif key=='humidity':
   p.clear();polygon([(7,1),(2,8),(2,11),(5,14),(10,14),(13,11),(13,8)],'#888888');path([(6,5),(4,8),(4,10)],'#eeeeee');r(6,12,4,1,'#bbbbbb')
 elif base=='ac':
  p.clear();r(1,3,14,6,PALE);b(1,3,14,6);r(2,4,12,1,'#ffffff');r(3,7,10,1,BLUE if on else '#888888');dot(12,5,BLUE if on else '#777777')
  if on:
   for x in (4,7,10):path([(x,10),(x-1,11),(x,12),(x-1,14)],BLUE)
  else:path([(7,10),(5,12),(5,14),(9,14),(9,12),(8,10)]);l(7,10,7,12)
 elif base=='floor':
  p.clear();polygon([(5,2),(10,2),(13,8),(2,8)],GOLD if on else '#eeeeee');r(7,9,2,5,'#626262');r(4,14,8,1);r(5,3,1,2,'#fff5d0' if on else '#ffffff')
 elif base=='ceiling':
  p.clear();r(7,1,2,4);r(3,5,10,4,GOLD if on else '#777777');b(3,5,10,4)
  if on:
   for x in (4,7,11):r(x,11,1,3,GOLD)
 elif base=='humidifier':
  p.clear();r(4,7,8,7,'#eeeeee');b(3,6,10,9);r(4,11,8,3,BLUE if on else '#cccccc');r(5,8,6,1,'#777777');dot(10,12,'#ffffff')
  if on:path([(5,4),(4,3),(5,2)],'#888888');path([(9,4),(10,2),(9,1)],'#888888')
 elif base=='fan':
  p.clear();r(3,2,10,9,'#e8e8e4');b(2,1,12,11);r(7,12,2,2,'#777777');r(4,14,8,1)
  colour=BLUE if on else '#777777';r(7,3,3,3,colour);r(9,7,3,3,colour);r(4,8,3,2,colour);r(3,4,3,3,colour);r(7,6,2,2,'#777777')
 elif base=='purifier':
  p.clear();r(5,2,6,12,'#eeeeee');b(4,1,8,14);r(5,2,6,1,'#ffffff')
  for y in (4,6,8,10):r(6,y,4,1,BLUE if on and y==4 else '#777777')
  r(7,12,2,1,BLUE if on else '#777777')
  if on:
   for x,y in ((2,4),(13,5),(2,11),(13,12)):dot(x,y,BLUE)
 elif base=='vacuum':
  p.clear();polygon([(5,1),(10,1),(14,5),(14,10),(10,14),(5,14),(1,10),(1,5)],'#777b79');polygon([(5,3),(10,3),(12,5),(12,9),(10,11),(5,11),(3,9),(3,5)],'#d5d8d4');b(6,5,4,4);r(7,6,2,2,BLUE if on else '#777777');path([(4,11),(6,12),(10,12),(12,10)],'#303030')
 svg='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges">'+''.join(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{c}"/>' for (x,y),c in sorted(p.items()))+'</svg>'
 (OUT/(key+'-16x16.svg')).write_text(svg,'utf-8');im=Image.new('RGBA',(16,16))
 for xy,c in p.items():im.putpixel(xy,tuple(bytes.fromhex(c[1:]))+(255,))
 im.save(OUT/(key+'-16x16.png'));icons.append(dict(id=key,label=item['label'],group=item['group'],pixels=[[x,y,c] for (x,y),c in sorted(p.items())]))
for item in META:make(item)
(OUT/'pixel-maps.json').write_text(json.dumps(icons,ensure_ascii=False,indent=2),'utf-8')
fontfile='assets/fonts/DotGothic16-Regular.ttf';font=ImageFont.truetype(fontfile,15);small=ImageFont.truetype(fontfile,12)
cols=6;cw=192;ch=148;sheet=Image.new('RGB',(cols*cw,math.ceil(len(icons)/cols)*ch+60),'#eee6d5');d=ImageDraw.Draw(sheet);d.text((18,14),'PIXEL ICONS v3 | 16 x 16 | 53 icons',font=font,fill=INK)
for i,item in enumerate(icons):
 x=i%cols*cw;y=i//cols*ch+50;d.rectangle((x+5,y+3,x+cw-5,y+ch-4),fill='#fbf4e3');im=Image.open(OUT/(item['id']+'-16x16.png'));large=im.resize((64,64),Image.Resampling.NEAREST);sheet.paste(large,(x+15,y+12),large);sheet.paste(im,(x+110,y+22),im);d.rectangle((x+140,y+14,x+174,y+48),fill='#292722');dark=im.copy()
 if item['group']!='家電':
  for yy in range(16):
   for xx in range(16):
    if dark.getpixel((xx,yy))[3]:
     rr,gg,bb,aa=dark.getpixel((xx,yy));dark.putpixel((xx,yy),(255-rr,255-gg,255-bb,aa))
 sheet.paste(dark,(x+150,y+23),dark);label=item['label'];lines=['']
 for c in label:
  if d.textlength(lines[-1]+c,font=font)>168:lines.append(c)
  else:lines[-1]+=c
 for j,t in enumerate(lines[:2]):d.text((x+12,y+84+j*17),t,font=font,fill=INK)
 d.text((x+12,y+124),item['id'],font=small,fill=INK)
sheet.save(OUT/'catalog-preview.png')
print('53 freshly drawn 16x16 icons generated')
