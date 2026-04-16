import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const AASTOCKS_REFERER_BASE = 'http://www.aastocks.com/tc/usq/quote/quote.aspx?symbol='
const AASTOCKS_API_TOKEN_URL = 'https://www.aastocks.com/tc/resources/datafeed/getapitoken.ashx'
const AASTOCKS_CE_TOKEN_URL = 'https://www.aastocks.com/tc/resources/datafeed/getcetoken.ashx'
const AASTOCKS_QUOTE_URL = 'https://fctdata.aastocks.com/g2ce/Quote/getQuote'

function parseFieldFromHtml(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern)
  return match?.[1] ?? null
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<T>
}

function aastocksProxyPlugin() {
  return {
    name: 'aastocks-proxy',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/api/aastocks/bootstrap', async (req, res) => {
        try {
          const url = new URL(req.url ?? '', 'http://localhost')
          const symbol = (url.searchParams.get('symbol') ?? '').trim().toUpperCase()
          if (!symbol) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'missing symbol' }))
            return
          }

          const referer = `${AASTOCKS_REFERER_BASE}${encodeURIComponent(symbol)}`

          const pageResponse = await fetch(referer)
          const pageHtml = await pageResponse.text()

          const symbolFromPage = parseFieldFromHtml(pageHtml, /var\s+USStaticInfo\s*=\s*\{"S":"([^"]+)"/) ?? `${symbol}.US`
          const group0 = parseFieldFromHtml(pageHtml, /var\s+USBasicGroup\s*=\s*"([^"]+)"/) ?? '127,76,40,6'
          const group1 = parseFieldFromHtml(pageHtml, /var\s+USBidAskGroup\s*=\s*"([^"]+)"/) ?? '3,-1,28'

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
          )

          const apiTokenData = await parseJsonOrThrow<{ token: string }>(apiTokenResponse)
          const ceTokenResponse = await fetch(AASTOCKS_CE_TOKEN_URL, {
            headers: {
              Auth: `Bearer ${apiTokenData.token}`,
              Origin: 'https://www.aastocks.com',
              Referer: referer,
            },
          })
          const ceToken = (await ceTokenResponse.text()).trim()
          if (!ceToken) throw new Error('empty ce token')

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            symbol: symbolFromPage,
            group0,
            group1,
            token: ceToken,
            expiresAt: Date.now() + 8 * 60 * 1000,
          }))
        } catch {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'bootstrap failed' }))
        }
      })

      server.middlewares.use('/api/aastocks/quote', async (req, res) => {
        try {
          const url = new URL(req.url ?? '', 'http://localhost')
          const symbol = (url.searchParams.get('symbol') ?? '').trim()
          const group0 = (url.searchParams.get('group0') ?? '').trim()
          const group1 = (url.searchParams.get('group1') ?? '').trim()
          const token = (url.searchParams.get('token') ?? '').trim()

          if (!symbol || !group0 || !group1 || !token) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'missing params' }))
            return
          }

          const query = new URLSearchParams()
          query.set('format', 'json')
          const tokenParams = new URLSearchParams(token.startsWith('&') ? token.slice(1) : token)
          tokenParams.forEach((value, key) => query.set(key, value))
          query.set('grp0', `${symbol}|${group0}|F=Y`)
          query.set('grp1', `${symbol}|${group1}`)

          const quoteResponse = await fetch(`${AASTOCKS_QUOTE_URL}?${query.toString()}`)
          const contentType = quoteResponse.headers.get('content-type') ?? 'application/json'
          const body = await quoteResponse.text()

          res.statusCode = quoteResponse.status
          res.setHeader('Content-Type', contentType)
          res.end(body)
        } catch {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'quote failed' }))
        }
      })
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_PATH || '/'

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(command === 'serve' ? [aastocksProxyPlugin()] : []),
    ],
    base,
  }
})
