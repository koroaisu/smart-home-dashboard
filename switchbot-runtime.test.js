import test from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

test('state requests use options supported by the deployed Workers runtime', async () => {
  const root = fileURLToPath(new URL('./', import.meta.url));
  const compiled = await build({
    stdin: { contents: `
      import { handleSwitchBotRequest } from './switchbot-cloud.mjs';
      export default { fetch(request, env) {
        return handleSwitchBotRequest(request, env, { fetchImpl: async (url, options) => {
          // Exercise workerd's Request parser rather than Node's permissive one.
          // No upstream request or real credential is used by this test.
          const outgoing = new Request(url, options);
          if (outgoing.redirect !== 'manual') throw Error('Redirects must not forward credentials');
          return Response.json({ statusCode: 100, body: {
            deviceType: 'Color Bulb', power: 'on', brightness: 42, colorTemperature: 2700,
          }});
        }});
      }};
    `, resolveDir: root },
    bundle: true, format: 'esm', platform: 'browser', write: false,
  });
  const runtime = new Miniflare({ workers: [{
    config: {
      name: 'switchbot-runtime-test', compatibilityDate: '2026-11-14',
      manifest: { mainModule: 'index.js', modulesRoot: root, modules: { 'index.js': { type: 'esm', contents: compiled.outputFiles[0].text } } },
      env: {
        SWITCHBOT_TOKEN: { type: 'text', value: 'fixture-token' },
        SWITCHBOT_SECRET: { type: 'text', value: 'fixture-secret' },
        SWITCHBOT_DEVICE_MAP: { type: 'text', value: JSON.stringify({ ceiling: ['001122334455', '001122334466', '001122334477', '001122334488'] }) },
      },
    }, dev: { rootPath: root },
  }] });
  try {
    const response = await runtime.dispatchFetch('http://localhost/api/switchbot/state');
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.devices.ceiling.available, 4);
    assert.equal(data.devices.ceiling.brightness, 42);
  } finally { await runtime.dispose(); }
});
