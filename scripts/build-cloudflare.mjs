import { readFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'cloudflare-dist/public');
// Rebuild only this fixed output directory so obsolete assets cannot be deployed.
await rm(output, { recursive: true, force: true });
await import('./build-figma-preview.mjs');
const routes = [
  'responsive-layout.css',
  'manifest.webmanifest', 'assets/pwa/icon-180.png', 'assets/pwa/icon-192.png', 'assets/pwa/icon-512.png',
  'figma.html', 'figma-exact.css', 'figma-exact.js', 'figma-devices.css', 'figma-devices.js', 'figma-device-actions.js',
  'figma-pages.css', 'figma-pages.js', 'calendar-client.js', 'calendar-data.js', 'state.js', 'assets/fonts/DotGothic16-Regular.ttf',
];
const manifest = JSON.parse(await readFile(join(root, 'assets/figma-home/manifest.json'), 'utf8'));
for (const name of manifest.files) {
  if (!/^[a-zA-Z0-9-]+\.(svg|png)$/.test(name)) throw Error('Invalid asset filename');
  routes.push(`assets/figma-home/${name}`);
}
for (const path of routes) {
  const target = join(output, path);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(root, path), target);
}
await copyFile(join(root, 'figma.html'), join(output, 'index.html'));
console.log(`Built Cloudflare static assets: ${routes.length + 1} files. OAuth credentials and calendar data are excluded.`);
