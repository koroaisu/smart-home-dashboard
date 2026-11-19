import { handleCalendarRequest } from './calendar-cloud.mjs';
import { verifyCloudflareAccess } from './cloudflare-access.mjs';
import { handleSwitchBotRequest } from './switchbot-cloud.mjs';

export function createCloudflareWorker({ verify = verifyCloudflareAccess, calendar = handleCalendarRequest, switchbot = handleSwitchBotRequest } = {}) {
  return {
    async fetch(request, env) {
      try {
        // The static asset router does not pass ctx.access. Verify its signed JWT
        // before both HTML/assets and API requests, including unprotected origins.
        const access = await verify(request, env);
        if (!access.ok) return Response.json({ error: access.error }, { status: access.status, headers: { 'Cache-Control': 'private, no-store' } });
        const switchbotResponse = await switchbot(request, env);
        if (switchbotResponse) return switchbotResponse;
        const calendarResponse = await calendar(request, env);
        if (calendarResponse) return calendarResponse;
        if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
        if (new URL(request.url).pathname.startsWith('/api/')) return Response.json({ error: 'Not found' }, { status: 404 });
        const assetUrl = new URL(request.url);
        if (assetUrl.pathname === '/') assetUrl.pathname = '/index.html';
        const asset = await env.ASSETS.fetch(new Request(assetUrl, request));
        const response = new Response(asset.body, asset);
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('Referrer-Policy', 'same-origin');
        response.headers.set('Cache-Control', 'private, no-cache');
        return response;
      } catch {
        return Response.json({ error: '画面を取得できませんでした。時間をおいて再度お試しください。' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
      }
    },
  };
}

export default createCloudflareWorker();
