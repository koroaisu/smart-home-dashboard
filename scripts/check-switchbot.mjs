import { handleSwitchBotRequest } from '../switchbot-cloud.mjs';

// Read the ignored local file without ever printing its contents or auth headers.
try { process.loadEnvFile(new URL('../.env.switchbot', import.meta.url)); }
catch { console.error('ローカルの .env.switchbot を用意してください。'); process.exit(1); }
const response = await handleSwitchBotRequest(new Request('http://127.0.0.1/api/switchbot/devices'), process.env);
const data = await response.json();
if (!response.ok) { console.error(data.error); process.exit(1); }
console.log(JSON.stringify(data, null, 2));
