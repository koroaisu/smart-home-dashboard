import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
const run = promisify(execFile);
const clean = value => typeof value === 'string' ? value.slice(0, 500) : '';
export function normalizeMedia(data) {
  if (data?.status !== 'available') return {status:data?.status==='idle'?'idle':'unavailable'};
  const source=clean(data.source);
  // Browser sessions identify the browser, not reliably the streaming website.
  const mappings=[[/applemusic|apple\.music/i,'Apple Music'],[/amazonmusic|amazon\.music/i,'Amazon Music'],[/spotify/i,'Spotify'],[/msedge/i,'Microsoft Edge'],[/chrome/i,'Google Chrome'],[/firefox/i,'Firefox'],[/itunes/i,'iTunes']];
  const service=mappings.find(([pattern])=>pattern.test(source))?.[1] || 'その他のメディアアプリ';
  return {status:'available',service,title:clean(data.title),artist:clean(data.artist),album:clean(data.album),duration:Number.isFinite(data.duration)&&data.duration>0?Math.min(data.duration,604800):null,position:Number.isFinite(data.position)&&data.position>=0?Math.min(data.position,604800):null,artwork:typeof data.artwork==='string'&&data.artwork.length<=1500000&&/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(data.artwork)?data.artwork:'',playback:['Playing','Paused','Stopped','Closed','Opened','Changing'].includes(data.playback)?data.playback:'Unknown',browser:/msedge|chrome|firefox/i.test(source)};
}
let pending,cache,expires=0;
export async function getMedia() {
  if (cache && Date.now()<expires) return cache;
  if (pending) return pending;
  pending=(async()=>{
    try {
      if(process.platform!=='win32') return {status:'unsupported'};
      const command=`${process.env.SystemRoot || 'C:\\Windows'}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
      const script=await readFile(new URL('./scripts/read-media.ps1',import.meta.url),'utf8');
      const {stdout}=await run(command,['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:12000,maxBuffer:2097152,encoding:'utf8'});
      return normalizeMedia(JSON.parse(stdout.replace(/^\uFEFF/,'')));
    } catch {return {status:'unavailable'};}
  })();
  try {cache=await pending;expires=Date.now()+8000;return cache;}finally{pending=undefined;}
}
