import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';

test('approved icons use transparent 16x16 integer cells and only appliances use chromatic colours',()=>{
 const base=new URL('./assets/pixel-icons-v3/',import.meta.url);
 const files=readdirSync(base).filter(f=>f.endsWith('.svg'));
 assert.equal(files.length,53);
 for(const file of files){
  const svg=readFileSync(new URL(file,base),'utf8');
  assert.match(svg,/width="16" height="16" viewBox="0 0 16 16" shape-rendering="crispEdges"/);
  const cells=[...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="1" height="1" fill="(#[a-f0-9]{6})"\/>/g)];
  assert.ok(cells.length>0,file);
  for(const c of cells){assert.ok(Number(c[1])<16&&Number(c[2])<16,file);}
  if(!/^(ac|floor|ceiling|humidifier|fan|purifier|vacuum)-(on|off)/.test(file))for(const c of cells){const rgb=c[3].slice(1).match(/../g);assert.ok(rgb[0]===rgb[1]&&rgb[1]===rgb[2],file);}
 }
});
