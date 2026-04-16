export interface PollingBootstrap {
  symbol: string;
  group0: string;
  group1: string;
  token: string;
  expiresAt: number;
}

export interface ParsedQuote {
  previousClosePrice: number | null;
  regularPrice: number | null;
  preMarketPrice: number | null;
  marketStatus: string;
  quoteTime: string;
}

export type MarketSession = 'premarket' | 'regular' | 'afterhours' | 'closed';

function toNumber(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return isFinite(n) && n > 0 ? n : null;
}

function getETNowParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = Number(map.hour ?? '0');
  const minute = Number(map.minute ?? '0');
  const weekday = map.weekday ?? 'Mon';
  return { weekday, minuteOfDay: hour * 60 + minute };
}

export function getUsMarketSession(now = new Date()): MarketSession {
  const { weekday, minuteOfDay } = getETNowParts(now);
  if (weekday === 'Sat' || weekday === 'Sun') return 'closed';

  if (minuteOfDay >= 240 && minuteOfDay < 570) return 'premarket';
  if (minuteOfDay >= 570 && minuteOfDay < 960) return 'regular';
  if (minuteOfDay >= 960 && minuteOfDay < 1200) return 'afterhours';
  return 'closed';
}

export function pickDisplayPrice(quote: ParsedQuote, now = new Date()): { price: number | null; source: 'r2' | 'r167' | 'none' } {
  const session = getUsMarketSession(now);
  if (session === 'premarket' && quote.preMarketPrice) {
    return { price: quote.preMarketPrice, source: 'r167' };
  }
  if (quote.regularPrice) {
    return { price: quote.regularPrice, source: 'r2' };
  }
  if (quote.preMarketPrice) {
    return { price: quote.preMarketPrice, source: 'r167' };
  }
  return { price: null, source: 'none' };
}

export function getPollingIntervalMs(now = new Date()): number {
  return getUsMarketSession(now) === 'closed' ? 30_000 : 1_000;
}

export function shouldRebootstrap(status: number | null, errorCode: string | null, failCount: number): boolean {
  if (status === 401 || status === 403) return true;
  if (errorCode === 'EMPTY' || errorCode === 'PARSE') return true;
  return failCount >= 3;
}

export async function bootstrapAastocksPolling(symbol: string): Promise<PollingBootstrap> {
  const cleaned = symbol.trim().toUpperCase();
  if (!cleaned) throw new Error('請先輸入股票代號');

  const response = await fetch(`/api/aastocks/bootstrap?symbol=${encodeURIComponent(cleaned)}`);
  if (!response.ok) throw new Error('初始化報價參數失敗');

  const data = (await response.json()) as PollingBootstrap;
  if (!data.symbol || !data.group0 || !data.group1 || !data.token) {
    throw new Error('初始化參數格式錯誤');
  }
  return data;
}

export async function pollAastocksQuote(params: PollingBootstrap): Promise<ParsedQuote> {
  const query = new URLSearchParams({
    symbol: params.symbol,
    group0: params.group0,
    group1: params.group1,
    token: params.token,
  });

  const response = await fetch(`/api/aastocks/quote?${query.toString()}`);
  if (response.status === 401 || response.status === 403) {
    const e = new Error('授權失效');
    (e as Error & { status?: number }).status = response.status;
    throw e;
  }
  if (!response.ok) {
    const e = new Error('輪詢報價失敗');
    (e as Error & { status?: number }).status = response.status;
    throw e;
  }

  const data = await response.json() as {
    root?: { gp?: Array<{ stock?: Array<Record<string, string>> }> };
  };

  const stock = data.root?.gp?.[0]?.stock?.[0];
  if (!stock) {
    const e = new Error('empty');
    (e as Error & { code?: string }).code = 'EMPTY';
    throw e;
  }

  const parsed: ParsedQuote = {
    previousClosePrice: toNumber(stock.r1),
    regularPrice: toNumber(stock.r2),
    preMarketPrice: toNumber(stock.r167),
    marketStatus: String(stock.c5 ?? stock.c6 ?? ''),
    quoteTime: String(stock.r166 ?? stock.r0 ?? ''),
  };

  if (!parsed.regularPrice && !parsed.preMarketPrice) {
    const e = new Error('parse');
    (e as Error & { code?: string }).code = 'PARSE';
    throw e;
  }

  return parsed;
}
