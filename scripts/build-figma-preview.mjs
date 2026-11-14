import { readFile, writeFile } from 'node:fs/promises';

// This page intentionally has no dependency on the old dashboard's HTML, CSS or app.js.
const [home, devices, pages] = await Promise.all([
  readFile(new URL('../templates/figma-home.html', import.meta.url), 'utf8'),
  readFile(new URL('../templates/figma-devices.html', import.meta.url), 'utf8'),
  readFile(new URL('../templates/figma-pages.html', import.meta.url), 'utf8'),
]);
await writeFile(new URL('../figma.html', import.meta.url), home.replace('<!-- devices-screen -->', devices).replace('<!-- extra-screens -->', pages));
console.log('Built all six native dashboard screens.');
