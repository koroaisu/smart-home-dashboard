import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { getMedia } from './media.mjs';
const files = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/styles.css', 'styles.css'], ['/app.js', 'app.js'], ['/state.js', 'state.js'], ['/notifications.js','notifications.js'], ['/assets/sekhmet.png','assets/sekhmet.png']]);
const types = {png:'image/png',html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8'};
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
