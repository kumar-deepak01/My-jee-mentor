import {CHAT_FALLBACK, getChatDebugInfo, handleChatRequest} from './_chat-handler.js';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.searchParams.get('debug') === '1') {
      const diagnostics = await getChatDebugInfo();
      return Response.json(diagnostics, {status: 200, headers: {'cache-control': 'no-store'}});
    }
    if (request.method !== 'POST') {
      return Response.json({reply: CHAT_FALLBACK}, {status: 405, headers: {'cache-control': 'no-store'}});
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 12_000) {
      return Response.json({reply: CHAT_FALLBACK}, {status: 413, headers: {'cache-control': 'no-store'}});
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({reply: CHAT_FALLBACK}, {status: 400, headers: {'cache-control': 'no-store'}});
    }

    const ip = request.headers.get('x-real-ip')
      || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || 'unknown';
    const result = await handleChatRequest({method: request.method, body, ip});
    return Response.json(result.body, {status: result.status, headers: {'cache-control': 'no-store'}});
  }
};
