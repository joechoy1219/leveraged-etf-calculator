export const AASTOCKS_REFERER_BASE = 'http://www.aastocks.com/tc/usq/quote/quote.aspx?symbol=';
export const AASTOCKS_API_TOKEN_URL = 'https://www.aastocks.com/tc/resources/datafeed/getapitoken.ashx';
export const AASTOCKS_CE_TOKEN_URL = 'https://www.aastocks.com/tc/resources/datafeed/getcetoken.ashx';
export const AASTOCKS_QUOTE_URL = 'https://fctdata.aastocks.com/g2ce/Quote/getQuote';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function parseFieldFromHtml(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match?.[1] ?? null;
}

export async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}
