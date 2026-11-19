import { Miniflare } from 'miniflare';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.loadEnvFile(new URL('../.env.switchbot', import.meta.url));
const names = ['SWITCHBOT_TOKEN', 'SWITCHBOT_SECRET', 'SWITCHBOT_DEVICE_MAP'];
if (names.some(name => !process.env[name])) throw Error('SwitchBot settings incomplete');
const compiled = await build({
  stdin: { contents: `
    import { handleSwitchBotRequest } from './switchbot-cloud.mjs';
    export default { fetch(request, env) {
      return handleSwitchBotRequest(request, env, { fetchImpl: async (...args) => {
        try {
          const response = await fetch(...args);
          let providerCode = null;
          try { providerCode = (await response.clone().json()).statusCode; } catch {}
          console.log(JSON.stringify({event:'switchbot_diagnostic',httpStatus:response.status,providerCode}));
          return response;
        } catch(error) {
          let message = error.message;
          for (const value of [env.SWITCHBOT_TOKEN, env.SWITCHBOT_SECRET]) message = message.replaceAll(value, '[REDACTED]');
          console.log(JSON.stringify({event:'switchbot_diagnostic',errorType:error.name,message}));
          throw error;
        }
      }});
    }};
  `, resolveDir: root },
  bundle: true, format: 'esm', platform: 'browser', write: false,
});
const runtime = new Miniflare({
  workers: [{
    config: {
      name: 'switchbot-diagnostic', compatibilityDate: '2026-11-14',
      manifest: { mainModule: 'index.js', modulesRoot: root, modules: { 'index.js': { type: 'esm', contents: compiled.outputFiles[0].text } } },
      env: Object.fromEntries(names.map(name => [name, { type: 'text', value: process.env[name] }])),
    },
    dev: { rootPath: root },
  }],
});
try {
  const response = await runtime.dispatchFetch('http://localhost/api/switchbot/state');
  console.log('Workers runtime:', response.status, await response.text());
} finally { await runtime.dispose(); }
