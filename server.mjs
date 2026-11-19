import { handleCalendarRequest } from './calendar-cloud.mjs';
import { handleSwitchBotRequest } from './switchbot-cloud.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const switchbotEnvFile = new URL('./.env.switchbot', import.meta.url);
if (existsSync(switchbotEnvFile)) process.loadEnvFile(switchbotEnvFile);

const files = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/state.js', 'state.js']]);
files.set('/figma.html', 'figma.html');
files.set('/responsive-layout.css', 'responsive-layout.css');
files.set('/typography.css', 'typography.css');
files.set('/weather-icons.js', 'weather-icons.js');
files.set('/weather-client.js', 'weather-client.js');
files.set('/weather-display.js', 'weather-display.js');
files.set('/switchbot-client.js', 'switchbot-client.js');
for (const name of ['weather_thunderstorm.png', 'moon_yellow.png', 'weather_cloudy_white.png', 'weather_rain_cloud_light.png', 'weather_rain_umbrella_heavy.png', 'weather_rain_umbrella_light.png', 'weather_sunny.png']) files.set(`/assets/weather/${name}`, `assets/weather/${name}`);
files.set('/manifest.webmanifest', 'manifest.webmanifest');
for (const size of [180, 192, 512]) files.set(`/assets/pwa/icon-${size}.png`, `assets/pwa/icon-${size}.png`);
files.set('/figma-exact.css', 'figma-exact.css');
files.set('/figma-exact.js', 'figma-exact.js');
files.set('/figma-pages.js', 'figma-pages.js');
files.set('/calendar-client.js', 'calendar-client.js');
files.set('/calendar-data.js', 'calendar-data.js');
files.set('/figma-pages.css', 'figma-pages.css');
files.set('/figma-devices.css', 'figma-devices.css');
files.set('/figma-devices.js', 'figma-devices.js');
files.set('/figma-device-actions.js', 'figma-device-actions.js');
files.set('/assets/fonts/DotGothic16-Regular.ttf', 'assets/fonts/DotGothic16-Regular.ttf');
const figmaAssets = JSON.parse(await readFile(new URL('./assets/figma-home/manifest.json', import.meta.url), 'utf8'));
for (const filename of figmaAssets.files) {
  if (!/^[a-zA-Z0-9-]+\.(svg|png)$/.test(filename)) throw Error('Invalid Figma asset filename');
  files.set(`/assets/figma-home/${filename}`, `assets/figma-home/${filename}`);
}
const types = {webmanifest:'application/manifest+json',ttf:'font/ttf',png:'image/png',svg:'image/svg+xml',html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8'};
const port = Number(process.env.PORT || 5173);
http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost');
  if (url.pathname.startsWith('/api/calendar/') || url.pathname.startsWith('/api/switchbot/')) {
    try {
      const origin = 'http://' + req.headers.host;
      const request = new Request(new URL(req.url, origin), { method: req.method, headers: req.headers, ...(req.method === 'POST' ? { body: req, duplex: 'half' } : {}) });
      const handler = url.pathname.startsWith('/api/switchbot/') ? handleSwitchBotRequest : handleCalendarRequest;
      const response = await handler(request, process.env);
      const headers = Object.fromEntries(response.headers);
      const setCookies = response.headers.getSetCookie();
      if (setCookies.length) headers['set-cookie'] = setCookies;
      res.writeHead(response.status, headers);res.end(Buffer.from(await response.arrayBuffer()));
    } catch { res.writeHead(500, {'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'サービスへの接続を確認できませんでした。'})); }
    return;
  }
  const file = files.get(url.pathname);
  if (!file) {res.writeHead(404); res.end('Not found'); return;}
  try {const body=await readFile(new URL(file,import.meta.url)); res.writeHead(200,{'Content-Type':types[file.split('.').pop()], 'Cache-Control':'no-store'}); res.end(body);}
  catch {res.writeHead(500); res.end('Unable to load page');}
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
