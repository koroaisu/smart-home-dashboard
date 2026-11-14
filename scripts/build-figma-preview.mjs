import { readFile, writeFile } from 'node:fs/promises';

// Templates are the source of truth; both entry points use the approved six-screen UI.
const [home, devices, pages] = await Promise.all([
  readFile(new URL('../templates/figma-home.html', import.meta.url), 'utf8'),
  readFile(new URL('../templates/figma-devices.html', import.meta.url), 'utf8'),
  readFile(new URL('../templates/figma-pages.html', import.meta.url), 'utf8'),
]);
const html = home.replace('<!-- devices-screen -->', devices).replace('<!-- extra-screens -->', pages);
await Promise.all(['index.html', 'figma.html'].map(name => writeFile(new URL(`../${name}`, import.meta.url), html)));
console.log('Built all six native dashboard screens.');
