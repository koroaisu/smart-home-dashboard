import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { getMedia } from './media.mjs';
const files = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/styles.css', 'styles.css'], ['/app.js', 'app.js'], ['/state.js', 'state.js'], ['/notifications.js','notifications.js'], ['/assets/sekhmet.png','assets/sekhmet.png']]);
files.set('/figma.html', 'figma.html');
files.set('/figma-home.css', 'figma-home.css');
files.set('/figma-home.js', 'figma-home.js');
files.set('/figma-exact.css', 'figma-exact.css');
files.set('/figma-exact.js', 'figma-exact.js');
files.set('/figma-pages.js', 'figma-pages.js');
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
files.set('/assets/mockup-pages/music.png', 'assets/mockup-pages/music.png');
files.set('/assets/mockup-pages/topics.png', 'assets/mockup-pages/topics.png');
files.set('/assets/mockup-pages/calendar.png', 'assets/mockup-pages/calendar.png');
files.set('/assets/mockup-pages/notifications.png', 'assets/mockup-pages/notifications.png');
const types = {ttf:'font/ttf',png:'image/png',svg:'image/svg+xml',html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8'};
const port = Number(process.env.PORT || 5173);
http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost');
  if (url.pathname === '/api/media') {
    // Only this local page may read the PC's media metadata.
    const expectedHost = `127.0.0.1:${port}`;
    if (req.method !== 'GET' || req.headers.host !== expectedHost ||
        (req.headers.origin && req.headers.origin !== `http://${expectedHost}`) ||
        req.headers['sec-fetch-site'] === 'cross-site') {
      res.writeHead(403);res.end('Forbidden');return;
    }
    const data = await getMedia();
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(JSON.stringify(data));return;
  }
  const file = files.get(url.pathname);
  if (!file) {res.writeHead(404); res.end('Not found'); return;}
  try {const body=await readFile(new URL(file,import.meta.url)); res.writeHead(200,{'Content-Type':types[file.split('.').pop()], 'Cache-Control':'no-store'}); res.end(body);}
  catch {res.writeHead(500); res.end('Unable to load page');}
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
