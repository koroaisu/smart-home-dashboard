import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
for (const directory of ['.', 'scripts']) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.(mjs|js)$/.test(entry.name)) continue;
    const result = spawnSync(process.execPath, ['--check', `${directory}/${entry.name}`], { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
console.log('JavaScript syntax checks passed.');
