import { type Fetcher } from '@cloudflare/workers-types';

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};
const ALLOWED_ORIGINS = [
  'https://web.402systems.com',
  'http://localhost:3000',
  'http://localhost:8081',
];

interface Env {
  DB_DEMO_API: Fetcher;
  FRIEND_TRACKER_API: Fetcher;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      const res = new Response(null, { status: 204 });
      Object.entries(corsHeaders).forEach(([key, value]) => {
        res.headers.set(key, value);
      });
      const origin = request.headers.get('Origin');
      if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.headers.set('Access-Control-Allow-Origin', origin);
      }
      return res;
    }

    let response: Response;

    if (url.pathname.startsWith('/db-demo')) {
      const newPath = url.pathname.replace('/db-demo', '');
      const targetUrl = `${url.origin}${newPath}${url.search}`;
      const newRequest = new Request(targetUrl, request);
      response = await env.DB_DEMO_API.fetch(newRequest);
    } else if (url.pathname.startsWith('/friend-tracker')) {
      const newPath = url.pathname.replace('/friend-tracker', '');
      const targetUrl = `${url.origin}${newPath}${url.search}`;
      const newRequest = new Request(targetUrl, request);
      response = await env.FRIEND_TRACKER_API.fetch(newRequest);
    } else {
      response = new Response('Not found', { status: 404 });
    }

    const newResponse = new Response(response.body, response);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });
    const origin = request.headers.get('Origin');
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      newResponse.headers.set('Access-Control-Allow-Origin', origin);
    }

    return newResponse;
  },
};
