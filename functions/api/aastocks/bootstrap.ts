import {
  AASTOCKS_API_TOKEN_URL,
  AASTOCKS_CE_TOKEN_URL,
  AASTOCKS_REFERER_BASE,
  jsonResponse,
  parseFieldFromHtml,
  parseJsonOrThrow,
} from '../../_lib/aastocks';

export const onRequestGet = async ({ request }: { request: Request }) => {
  try {
    const url = new URL(request.url);
    const symbol = (url.searchParams.get('symbol') ?? '').trim().toUpperCase();
    if (!symbol) {
      return jsonResponse(400, { error: 'missing symbol' });
    }

    const referer = `${AASTOCKS_REFERER_BASE}${encodeURIComponent(symbol)}`;

    const pageResponse = await fetch(referer);
    const pageHtml = await pageResponse.text();

    const symbolFromPage =
      parseFieldFromHtml(pageHtml, /var\s+USStaticInfo\s*=\s*\{"S":"([^"]+)"/) ?? `${symbol}.US`;
    const group0 = parseFieldFromHtml(pageHtml, /var\s+USBasicGroup\s*=\s*"([^"]+)"/) ?? '127,76,40,6';
    const group1 = parseFieldFromHtml(pageHtml, /var\s+USBidAskGroup\s*=\s*"([^"]+)"/) ?? '3,-1,28';

    const apiTokenResponse = await fetch(
      `${AASTOCKS_API_TOKEN_URL}?${new URLSearchParams({
        PageURL: referer,
        HKT: 'Y',
        UST: 'Y',
      }).toString()}`,
      {
        headers: {
          Origin: 'https://www.aastocks.com',
          Referer: referer,
        },
      },
    );

    const apiTokenData = await parseJsonOrThrow<{ token: string }>(apiTokenResponse);
    const ceTokenResponse = await fetch(AASTOCKS_CE_TOKEN_URL, {
      headers: {
        Auth: `Bearer ${apiTokenData.token}`,
        Origin: 'https://www.aastocks.com',
        Referer: referer,
      },
    });
    const ceToken = (await ceTokenResponse.text()).trim();
    if (!ceToken) throw new Error('empty ce token');

    return jsonResponse(200, {
      symbol: symbolFromPage,
      group0,
      group1,
      token: ceToken,
      expiresAt: Date.now() + 8 * 60 * 1000,
    });
  } catch {
    return jsonResponse(502, { error: 'bootstrap failed' });
  }
};
