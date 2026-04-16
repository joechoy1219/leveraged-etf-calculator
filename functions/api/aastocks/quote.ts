import { AASTOCKS_QUOTE_URL, jsonResponse } from '../../_lib/aastocks';

export const onRequestGet = async ({ request }: { request: Request }) => {
  try {
    const url = new URL(request.url);
    const symbol = (url.searchParams.get('symbol') ?? '').trim();
    const group0 = (url.searchParams.get('group0') ?? '').trim();
    const group1 = (url.searchParams.get('group1') ?? '').trim();
    const token = (url.searchParams.get('token') ?? '').trim();

    if (!symbol || !group0 || !group1 || !token) {
      return jsonResponse(400, { error: 'missing params' });
    }

    const query = new URLSearchParams();
    query.set('format', 'json');
    const tokenParams = new URLSearchParams(token.startsWith('&') ? token.slice(1) : token);
    tokenParams.forEach((value, key) => query.set(key, value));
    query.set('grp0', `${symbol}|${group0}|F=Y`);
    query.set('grp1', `${symbol}|${group1}`);

    const quoteResponse = await fetch(`${AASTOCKS_QUOTE_URL}?${query.toString()}`);
    const contentType = quoteResponse.headers.get('content-type') ?? 'application/json';
    const body = await quoteResponse.text();

    return new Response(body, {
      status: quoteResponse.status,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch {
    return jsonResponse(502, { error: 'quote failed' });
  }
};
