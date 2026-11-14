from pathlib import Path
import json, math
from PIL import Image, ImageDraw, ImageFont
OUT=Path('docs/icon-proposals-v1'); icons=[]
INK='#3f392f'; EDGE='#514838'; GOLD='#efc65e'; BLUE='#79aeb9'; PALE='#e8e1cd'; WHITE='#fff6df'; GREEN='#96ac83'
def make(key,label,group,fn):
 p={}
 def dot(x,y,c=INK):
  assert 0<=x<20 and 0<=y<20,(key,x,y)
  p[x,y]=c
 def rect(x,y,w,h,c=INK):
  for yy in range(y,y+h):
   for xx in range(x,x+w):dot(xx,yy,c)
 def line(x,y,a,b,c=INK):
  n=max(abs(a-x),abs(b-y))
  for i in range(n+1):dot(round(x+(a-x)*i/(n or 1)),round(y+(b-y)*i/(n or 1)),c)
 def box(x,y,w,h,c=INK):rect(x,y,w,1,c);rect(x,y+h-1,w,1,c);rect(x,y,1,h,c);rect(x+w-1,y,1,h,c)
 fn(rect,line,box,dot)
 assert len(p)>0
 svg='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" shape-rendering="crispEdges">'+''.join(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{c}"/>' for (x,y),c in sorted(p.items()))+'</svg>'
 (OUT/(key+'-20x20.svg')).write_text(svg,'utf-8')
 im=Image.new('RGBA',(20,20))
 for xy,c in p.items():im.putpixel(xy,tuple(bytes.fromhex(c[1:]))+(255,))
 im.save(OUT/(key+'-20x20.png'));icons.append(dict(id=key,label=label,group=group,pixels=[[x,y,c] for (x,y),c in sorted(p.items())]))
def simple(k,l,fn):make(k,l,'基本・操作',fn)
simple('home','ホーム',lambda r,l,b,d:(l(2,9,9,2),l(9,2,17,10),b(4,9,12,9),r(9,12,3,6)))
simple('devices','家電タブ',lambda r,l,b,d:[b(x,y,6,6) for x in (3,11) for y in (3,11)])
simple('music','音楽',lambda r,l,b,d:(r(7,4,2,11),r(15,2,2,11),r(8,3,8,2),r(3,14,5,3),r(11,12,5,3)))
simple('news','ニュース',lambda r,l,b,d:(b(3,2,13,16),r(6,5,7,3),r(6,11,3,1),r(11,11,2,1),r(6,14,7,1),l(16,6,17,6),l(17,6,17,17),l(16,17,17,17)))
simple('calendar','カレンダー',lambda r,l,b,d:(b(2,4,16,14),r(6,2,2,5),r(12,2,2,5),r(3,8,14,1),[r(x,y,2,2) for x in (5,9,13) for y in (10,14)]))
simple('bell','通知',lambda r,l,b,d:(r(9,2,2,2),l(6,4,13,4),l(5,5,5,12),l(14,5,14,12),l(4,13,15,13),r(3,14,14,2),r(8,17,4,1)))
simple('pin','位置情報',lambda r,l,b,d:(l(6,2,13,2),l(4,4,4,10),l(15,4,15,10),l(5,3,6,2),l(13,2,14,3),l(4,10,10,17),l(15,10,10,17),b(8,5,4,4)))
for key,label,reverse in [('fullscreen','全画面',False),('exit-fullscreen','全画面を戻す',True)]:
 def f(r,l,b,d,rev=reverse):
  for x,y in [(3,3),(12,3),(3,12),(12,12)]:
   xx=x+(3 if (x==3 and rev) or (x==12 and not rev) else 0); yy=y+(3 if (y==3 and rev) or (y==12 and not rev) else 0)
   r(x,yy,5,2);r(xx,y,2,5)
 simple(key,label,f)
simple('plus','追加',lambda r,l,b,d:(r(9,4,2,12),r(4,9,12,2)))
simple('close','閉じる',lambda r,l,b,d:[r(x,y,2,2) for x,y in [(i,i) for i in range(4,15)]+[(18-i,i) for i in range(4,15)]])
for direction in ['left','right']:
 simple(direction,'前へ' if direction=='left' else '次へ',lambda r,l,b,d,side=direction:[r((6+abs(y-9)) if side=='left' else (12-abs(y-9)),y,2,1) for y in range(4,15)])
for k,label in [('play','再生'),('pause','一時停止'),('stop','停止'),('previous','前の曲'),('next','次の曲')]:
 def f(r,l,b,d,k=k):
  if k=='pause':r(5,4,3,12);r(12,4,3,12)
  elif k=='stop':r(5,5,10,10)
  elif k=='play':
   for x in range(6,15):r(x,4+(x-6)//2,1,12-(x-6)//2*2)
  else:
   r(3 if k=='previous' else 15,4,2,12)
   for x in range(6,14):
    h=2+2*(x-6) if k=='previous' else 16-2*(x-6)
    h=min(h,12);r(x,10-h//2,1,h)
 simple(k,label,f)
simple('repeat','リピート',lambda r,l,b,d:(l(4,5,15,5),l(15,5,15,8),l(5,14,15,14),l(4,11,4,14),l(12,2,15,5),l(12,8,15,5),l(4,14,7,11),l(4,14,7,17)))
simple('shuffle','シャッフル',lambda r,l,b,d:(l(3,5,6,5),l(6,5,13,14),l(13,14,17,14),l(3,14,6,14),l(6,14,13,5),l(13,5,17,5),l(15,3,17,5),l(17,5,15,7),l(15,12,17,14),l(17,14,15,16)))
for k,label,mute in [('volume','音量',False),('mute','ミュート',True)]:
 simple(k,label,lambda r,l,b,d,m=mute:(r(3,7,4,6),l(6,7,10,3),l(10,3,10,16),l(6,12,10,16), (l(13,7,17,12),l(13,12,17,7)) if m else (l(13,6,15,8),l(15,8,15,11),l(15,11,13,13))))
simple('check','確認',lambda r,l,b,d:(l(3,10,7,14),l(7,14,16,5),l(3,9,7,13),l(7,13,16,4)))
simple('clock','時計',lambda r,l,b,d:(b(5,2,10,1),l(3,5,3,14),l(16,5,16,14),l(5,17,14,17),d(4,3),d(15,3),d(4,16),d(15,16),l(10,5,10,10),l(10,10,14,10)))
simple('spark','注目・テクノロジー',lambda r,l,b,d:(l(10,2,8,8),l(8,8,2,10),l(2,10,8,12),l(8,12,10,18),l(10,18,12,12),l(12,12,18,10),l(18,10,12,8),l(12,8,10,2)))
# Monochrome weather and environment symbols.
def weather(k,label,fn):make(k,label,'天気・環境',fn)
def cloud(r,l,b,d):
 points=[(3,13),(2,12),(2,10),(3,9),(5,9),(5,7),(7,5),(10,5),(12,7),(12,9),(14,8),(16,8),(17,10),(17,12),(16,13),(3,13)]
 for a,z in zip(points,points[1:]):l(*a,*z)
def sun(r,l,b,d):
 b(7,7,6,6)
 for a,z in [((9,2),(9,4)),((9,16),(9,18)),((2,9),(4,9)),((16,9),(18,9)),((3,3),(5,5)),((14,14),(16,16)),((3,16),(5,14)),((14,5),(16,3))]:l(*a,*z)
weather('sun','晴れ',sun)
weather('moon','夜・月',lambda r,l,b,d:(l(8,2,5,4),l(5,4,3,8),l(3,8,3,12),l(3,12,6,16),l(6,16,12,17),l(12,17,16,14),l(16,14,10,14),l(10,14,7,11),l(7,11,7,6),l(7,6,8,2)))
weather('cloud','曇り',cloud)
weather('partly-cloudy','晴れ時々曇り',lambda r,l,b,d:(b(3,3,6,6),l(5,1,5,2),l(1,5,2,5),cloud(r,l,b,d)))
weather('rain-light','弱い雨',lambda r,l,b,d:(cloud(r,l,b,d),[l(x,15,x-1,17) for x in (6,11,16)]))
weather('rain-heavy','強い雨',lambda r,l,b,d:(cloud(r,l,b,d),[l(x,15,x-1,18) for x in (4,7,10,13,16)]))
weather('rain-stop','雨上がり',lambda r,l,b,d:(l(5,9,10,3),l(10,3,15,9),l(5,9,15,9),l(10,9,10,16),l(10,16,7,16),l(7,16,7,14)))
weather('thunder','雷雨',lambda r,l,b,d:(cloud(r,l,b,d),r(10,13,3,2),r(8,15,3,2),r(10,17,1,2)))
weather('temperature','温度',lambda r,l,b,d:(b(8,2,4,12),r(9,5,2,11),l(7,13,6,16),l(6,16,8,18),l(8,18,12,18),l(12,18,14,16),l(14,16,12,13)))
weather('humidity','湿度',lambda r,l,b,d:(l(9,2,4,10),l(9,2,15,10),l(3,11,3,14),l(16,11,16,14),l(3,14,6,17),l(16,14,13,17),l(6,17,13,17),l(6,11,6,13),l(6,13,8,15)))
weather('co2','CO2',lambda r,l,b,d:(b(2,5,6,8),b(11,7,6,8),r(7,3,4,1),r(10,16,4,1)))
weather('aqi','空気質',lambda r,l,b,d:(l(2,5,13,5),l(13,5,15,3),l(15,3,17,5),l(17,5,15,7),l(2,10,15,10),l(2,15,11,15),l(11,15,13,17),l(13,17,15,15)))
weather('pm25','PM2.5',lambda r,l,b,d:(r(3,4,3,3),r(12,3,4,4),r(7,10,4,4),r(14,13,3,3),r(3,15,2,2)))
weather('pollen','花粉',lambda r,l,b,d:(b(7,7,6,6),r(8,2,4,3),r(8,15,4,3),r(2,8,3,4),r(15,8,3,4),r(4,4,2,2),r(14,14,2,2),r(4,14,2,2),r(14,4,2,2)))
# Appliances: deliberately limited colour palette with the same one-dot outlines.
for kind,label in [('ac','エアコン'),('floor','フロアランプ'),('ceiling','天井照明'),('humidifier','加湿器'),('fan','サーキュレーター'),('purifier','空気清浄機'),('vacuum','掃除機')]:
 for on in [True,False]:
  def f(r,l,b,d,kind=kind,on=on):
   active=BLUE if on else PALE
   if kind=='ac':
    r(3,4,14,6,PALE);b(2,3,16,8,EDGE);r(5,7,10,1,EDGE);r(14,5,2,1,GREEN if on else EDGE)
    if on:
     for x in (5,9,13):l(x,13,x,16,BLUE);d(x+1,17,BLUE)
   elif kind=='floor':
    for y in range(3,9):r(7-(y-3)//2,y,6+(y-3)//2*2,1,GOLD if on else PALE)
    l(7,2,12,2,EDGE);l(7,2,4,9,EDGE);l(12,2,15,9,EDGE);r(4,9,12,1,EDGE);r(9,10,2,7,EDGE);r(5,17,10,1,EDGE)
   elif kind=='ceiling':
    r(9,2,2,3,EDGE);r(5,6,10,4,GOLD if on else PALE);b(4,5,12,6,EDGE)
    if on:
     for x in (5,9,14):r(x,13,1,3,GOLD)
   elif kind=='humidifier':
    r(5,9,10,8,PALE);b(4,8,12,10,EDGE);r(7,10,6,1,EDGE);r(8,15,4,1,active)
    if on:l(7,6,8,3,BLUE);l(12,6,13,2,BLUE)
   elif kind=='fan':
    b(3,2,14,13,EDGE);r(9,7,2,2,GOLD if on else EDGE);r(9,4,4,3,active);r(12,8,3,3,active);r(6,10,4,3,active);r(5,6,3,3,active);r(9,15,2,2,EDGE);r(6,17,8,1,EDGE)
   elif kind=='purifier':
    r(6,3,8,14,PALE);b(5,2,10,16,EDGE)
    for y in (5,8,11):r(7,y,6,1,EDGE)
    r(9,14,2,2,GREEN if on else EDGE)
   else:
    r(5,5,10,11,PALE);r(3,7,14,7,PALE);l(5,4,14,4,EDGE);l(3,6,3,14,EDGE);l(16,6,16,14,EDGE);l(5,16,14,16,EDGE);l(4,5,3,6,EDGE);l(15,5,16,6,EDGE);l(3,14,5,16,EDGE);l(16,14,14,16,EDGE);r(8,6,4,3,active);r(6,13,8,1,EDGE)
  make(kind+('-on' if on else '-off'),label+(' ON' if on else ' OFF'),'家電',f)
(OUT/'pixel-maps.json').write_text(json.dumps(icons,ensure_ascii=False,indent=2),'utf-8')
fontfile=r'C:\Users\kouro\Documents\ChatGPT\smart-home-dashboard\assets\fonts\DotGothic16-Regular.ttf'
font=ImageFont.truetype(fontfile,18);small=ImageFont.truetype(fontfile,13);label_font=ImageFont.truetype(fontfile,15)
cols=6;cw=192;ch=164;rows=math.ceil(len(icons)/cols)
contact=Image.new('RGB',(cols*cw,rows*ch+72),'#eee6d5');draw=ImageDraw.Draw(contact);draw.text((20,16),f'PIXEL ICONS v1 | 20 x 20 | {len(icons)} icons',font=font,fill=INK)
for i,item in enumerate(icons):
 x=(i%cols)*cw;y=(i//cols)*ch+60;draw.rectangle((x+5,y+3,x+cw-5,y+ch-5),fill='#fbf4e3')
 im=Image.open(OUT/(item['id']+'-20x20.png'))
 contact.paste(im.resize((80,80),Image.Resampling.NEAREST),(x+12,y+13),im.resize((80,80),Image.Resampling.NEAREST))
 contact.paste(im,(x+112,y+23),im)
 draw.rectangle((x+142,y+13,x+177,y+49),fill='#292722')
 dark=im.copy()
 if item['group']!='家電':
  for yy in range(20):
   for xx in range(20):
    if dark.getpixel((xx,yy))[3]:dark.putpixel((xx,yy),(245,237,218,255))
 contact.paste(dark,(x+150,y+21),dark)
 label=item['label'];lines=['']
 for char in label:
  if draw.textlength(lines[-1]+char,font=label_font)>cw-24:lines.append(char)
  else:lines[-1]+=char
 for j,text in enumerate(lines[:2]):draw.text((x+12,y+97+j*18),text,font=label_font,fill=INK)
 draw.text((x+12,y+137),item['id'],font=small,fill=INK)
contact.save(OUT/'catalog-preview.png')
html='''<!doctype html><html lang="ja"><meta charset="utf-8"><title>アイコン候補 v1</title><style>body{font-family:monospace;background:#eee6d5;color:#3f392f;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}article{background:#fbf4e3;border:2px solid #ac9568;padding:16px}img{image-rendering:pixelated;object-fit:contain}.large{width:80px;height:80px}.actual{width:20px;height:20px;margin:12px}p{font-size:14px}h2{margin-top:32px}</style><h1>アイコン候補 v1</h1><p>元データ20×20・透明背景。左は4倍、右は原寸。家電のみカラー。アプリには未反映。</p>'''
for group in ['基本・操作','天気・環境','家電']:
 html+='<h2>'+group+'</h2><main>'
 for item in icons:
  if item['group']!=group:continue
  file=item['id']+'-20x20.svg';html+=f'<article><img class="large" src="{file}" alt="{item["label"]}"><img class="actual" src="{file}" alt=""><p>{item["label"]}</p><a href="{file}">{item["id"]}</a></article>'
 html+='</main>'
(OUT/'index.html').write_text(html,'utf-8')
print(f'{len(icons)} icons generated; all 20x20 with integer pixels')

