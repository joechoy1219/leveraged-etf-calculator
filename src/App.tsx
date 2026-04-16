import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { CalculatorInputs, LeverageOption, StockMemory } from './types'
import { calculate } from './hooks/useCalculator'
import { useStockMemory } from './hooks/useStockMemory'
import {
  bootstrapAastocksPolling,
  getPollingIntervalMs,
  pickDisplayPrice,
  pollAastocksQuote,
  shouldRebootstrap,
  type PollingBootstrap,
} from './hooks/useAastocksQuote'
import { InputPanel } from './components/InputPanel'
import { LeverageSelector } from './components/LeverageSelector'
import { ResultPanel } from './components/ResultPanel'
import { StockSidebar } from './components/StockSidebar'
import './index.css'

const DEFAULT_LEVERAGE: LeverageOption = { multiplier: 2, direction: 'long' }
const APP_VERSION = __APP_VERSION__
const GITHUB_REPO_URL = 'https://github.com/joechoy1219/leveraged-etf-calculator'
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues/new/choose`

function formatAutoRefreshPrice(price: number): string {
  const roundedUp = Math.ceil((price + Number.EPSILON) * 1000) / 1000
  return roundedUp.toFixed(3)
}

function matchesBootstrapSymbol(bootstrapSymbol: string, uiSymbol: string): boolean {
  const left = bootstrapSymbol.trim().toUpperCase()
  const right = uiSymbol.trim().toUpperCase()
  return left === right || left === `${right}.US`
}

function App() {
  const [stockName, setStockName] = useState('')
  const [stockSymbol, setStockSymbol] = useState('')
  const [stockOpen, setStockOpen] = useState('')
  const [stockCurrent, setStockCurrent] = useState('')
  const [etfOpen, setEtfOpen] = useState('')
  const [leverage, setLeverage] = useState<LeverageOption>(DEFAULT_LEVERAGE)
  const [quoteError, setQuoteError] = useState('')
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteUpdatedAt, setQuoteUpdatedAt] = useState<Date | null>(null)
  const [autoRefreshQuote, setAutoRefreshQuote] = useState(true)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [activeId, setActiveId] = useState<string | null>(null)

  // Tracks activeId synchronously without render-time assignment (safe in concurrent mode)
  const activeIdRef = useRef<string | null>(null)
  const quoteInFlightRef = useRef(false)
  const latestRequestIdRef = useRef(0)
  const latestSymbolRef = useRef('')
  const stockCurrentRef = useRef('')
  const stockNameRef = useRef('')
  const stockSymbolRef = useRef('')
  const stockOpenRef = useRef('')
  const etfOpenRef = useRef('')
  const leverageRef = useRef<LeverageOption>(DEFAULT_LEVERAGE)
  const autoRefreshRef = useRef(true)
  const bootstrapRef = useRef<PollingBootstrap | null>(null)
  const failCountRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const { stocks, upsert, remove, reorder } = useStockMemory()
  const stocksRef = useRef<StockMemory[]>([])

  useEffect(() => {
    stocksRef.current = stocks
  }, [stocks])

  const result = useMemo(
    () => calculate({ stockOpen, stockCurrent, etfOpen, leverage } as CalculatorInputs),
    [stockOpen, stockCurrent, etfOpen, leverage],
  )
  const normalizedSymbol = stockSymbol.trim().toUpperCase()
  const aastocksQuoteUrl = normalizedSymbol
    ? `https://www.aastocks.com/tc/usq/quote/quote.aspx?symbol=${encodeURIComponent(normalizedSymbol)}`
    : 'https://www.aastocks.com/tc/usq/quote/quote.aspx'

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const applyStockName = (value: string) => {
    stockNameRef.current = value
    setStockName(value)
  }

  const applyStockSymbol = (value: string) => {
    stockSymbolRef.current = value
    latestSymbolRef.current = value.trim().toUpperCase()
    setStockSymbol(value)
  }

  const applyStockOpen = (value: string) => {
    stockOpenRef.current = value
    setStockOpen(value)
  }

  const applyStockCurrent = useCallback((value: string, ownerId: string | null) => {
    if (ownerId !== null && activeIdRef.current !== ownerId) {
      return
    }
    stockCurrentRef.current = value
    setStockCurrent(value)
  }, [])

  const applyEtfOpen = (value: string) => {
    etfOpenRef.current = value
    setEtfOpen(value)
  }

  const applyLeverage = (value: LeverageOption) => {
    leverageRef.current = value
    setLeverage(value)
  }

  const applyAutoRefresh = (value: boolean) => {
    autoRefreshRef.current = value
    setAutoRefreshQuote(value)
  }

  const bootstrapIfNeeded = useCallback(async () => {
    const current = bootstrapRef.current
    if (current && current.expiresAt > Date.now() && matchesBootstrapSymbol(current.symbol, normalizedSymbol)) {
      return current
    }

    const next = await bootstrapAastocksPolling(normalizedSymbol)
    bootstrapRef.current = next
    return next
  }, [normalizedSymbol])

  useEffect(() => {
    latestSymbolRef.current = normalizedSymbol
    stockSymbolRef.current = stockSymbol
    stockNameRef.current = stockName
    stockOpenRef.current = stockOpen
    stockCurrentRef.current = stockCurrent
    etfOpenRef.current = etfOpen
    leverageRef.current = leverage
    autoRefreshRef.current = autoRefreshQuote
  }, [autoRefreshQuote, etfOpen, leverage, normalizedSymbol, stockCurrent, stockName, stockOpen, stockSymbol])

  const persistStockPrices = useCallback((ownerId: string, patch: { stockCurrent?: string; stockOpen?: string }) => {
    const target = stocksRef.current.find((s) => s.id === ownerId)
    if (!target) return

    // During auto polling, keep non-price fields in sync with the latest UI edits
    // so quote writes do not roll back in-progress user input.
    if (ownerId === activeIdRef.current) {
      upsert({
        id: ownerId,
        name: stockNameRef.current,
        symbol: stockSymbolRef.current.trim().toUpperCase(),
        autoRefreshQuote: autoRefreshRef.current,
        stockOpen: patch.stockOpen ?? stockOpenRef.current,
        stockCurrent: patch.stockCurrent ?? stockCurrentRef.current,
        etfOpen: etfOpenRef.current,
        leverage: leverageRef.current,
      })
      return
    }

    upsert({ ...target, ...patch })
  }, [upsert])

  const updateQuote = useCallback(async (silent = false) => {
    if (!normalizedSymbol) {
      if (!silent) setQuoteError('請先輸入股票代號')
      return
    }
    if (quoteInFlightRef.current) return

    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId
    const requestSymbol = normalizedSymbol
    const requestActiveId = activeIdRef.current
    const isStale = () =>
      latestRequestIdRef.current !== requestId ||
      latestSymbolRef.current !== requestSymbol ||
      activeIdRef.current !== requestActiveId

    quoteInFlightRef.current = true
    setQuoteLoading(true)
    if (!silent) setQuoteError('')

    try {
      const bootstrap = await bootstrapIfNeeded()
      const quote = await pollAastocksQuote(bootstrap)
      const chosen = pickDisplayPrice(quote)
      if (!chosen.price) throw new Error('無法解析可用現價')
      if (isStale()) return

      const nextCurrent = autoRefreshQuote ? formatAutoRefreshPrice(chosen.price) : String(chosen.price)
      const nextOpen = autoRefreshQuote && quote.previousClosePrice
        ? formatAutoRefreshPrice(quote.previousClosePrice)
        : null
      applyStockCurrent(nextCurrent, requestActiveId)
      if (nextOpen !== null) {
        applyStockOpen(nextOpen)
      }
      if (requestActiveId) {
        persistStockPrices(requestActiveId, {
          stockCurrent: nextCurrent,
          ...(nextOpen !== null ? { stockOpen: nextOpen } : {}),
        })
      }
      setQuoteUpdatedAt(new Date())
      setQuoteError('')
      failCountRef.current = 0
    } catch (err) {
      if (isStale()) return

      failCountRef.current += 1
      const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status?: number }).status ?? NaN) : null
      const code = typeof err === 'object' && err && 'code' in err ? String((err as { code?: string }).code ?? '') : null

      if (shouldRebootstrap(status, code, failCountRef.current)) {
        bootstrapRef.current = null
      }

      const message = err instanceof Error ? err.message : '抓取現價失敗'
      if (!silent) setQuoteError(message)
    } finally {
      if (latestRequestIdRef.current === requestId) {
        quoteInFlightRef.current = false
        setQuoteLoading(false)
      }
    }
  }, [autoRefreshQuote, bootstrapIfNeeded, normalizedSymbol, applyStockCurrent, persistStockPrices])

  useEffect(() => {
    clearTimer()
    if (!autoRefreshQuote || !normalizedSymbol) return

    let cancelled = false

    const tick = async () => {
      if (cancelled) return

      if (!document.hidden) {
        await updateQuote(true)
      }

      const nextDelay = document.hidden ? 1000 : getPollingIntervalMs()
      timerRef.current = window.setTimeout(tick, nextDelay)
    }

    void tick()
    return () => {
      cancelled = true
      clearTimer()
    }
  }, [autoRefreshQuote, normalizedSymbol, updateQuote])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden && autoRefreshQuote && normalizedSymbol) {
        void updateQuote(true)
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [autoRefreshQuote, normalizedSymbol, updateQuote])

  useEffect(() => {
    bootstrapRef.current = null
    failCountRef.current = 0
    setQuoteError('')
  }, [normalizedSymbol])

  useEffect(() => {
    if (!autoRefreshQuote) return
    const n = parseFloat(stockCurrent)
    if (!isFinite(n) || n <= 0) return
    // Bind write ownership to the same render that produced stockCurrent.
    const ownerIdAtRender = activeId
    applyStockCurrent(formatAutoRefreshPrice(n), ownerIdAtRender)
  }, [activeId, autoRefreshQuote, stockCurrent, applyStockCurrent])

  useEffect(() => {
    if (!autoRefreshQuote) return
    const n = parseFloat(stockOpen)
    if (!isFinite(n) || n <= 0) return
    applyStockOpen(formatAutoRefreshPrice(n))
  }, [autoRefreshQuote, stockOpen])

  useEffect(() => {
    if (!activeId) return
    const activeStock = stocks.find((s) => s.id === activeId)
    if (!activeStock) return

    // Guardrail: ensure visible fields always match the selected stock snapshot.
    if (stockNameRef.current !== activeStock.name) applyStockName(activeStock.name)
    if (stockSymbolRef.current !== (activeStock.symbol ?? '')) applyStockSymbol(activeStock.symbol ?? '')
    if (stockOpenRef.current !== activeStock.stockOpen) applyStockOpen(activeStock.stockOpen)
    if (stockCurrentRef.current !== activeStock.stockCurrent) applyStockCurrent(activeStock.stockCurrent, activeStock.id)
    if (etfOpenRef.current !== activeStock.etfOpen) applyEtfOpen(activeStock.etfOpen)
    if (autoRefreshRef.current !== (activeStock.autoRefreshQuote ?? true)) applyAutoRefresh(activeStock.autoRefreshQuote ?? true)
  }, [activeId, stocks, applyStockCurrent])

  const buildSnapshot = (): StockMemory => ({
    id: activeIdRef.current ?? crypto.randomUUID(),
    name: stockNameRef.current,
    symbol: stockSymbolRef.current.trim().toUpperCase(),
    autoRefreshQuote: autoRefreshRef.current,
    stockOpen: stockOpenRef.current,
    stockCurrent: stockCurrentRef.current,
    etfOpen: etfOpenRef.current,
    leverage: leverageRef.current,
  })

  const loadStock = (stock: StockMemory) => {
    latestRequestIdRef.current += 1
    bootstrapRef.current = null
    quoteInFlightRef.current = false
    setQuoteLoading(false)
    activeIdRef.current = stock.id  // update ref before setState so next click sees it immediately
    setActiveId(stock.id)
    applyStockName(stock.name)
    applyStockSymbol(stock.symbol ?? '')
    applyAutoRefresh(stock.autoRefreshQuote ?? true)
    applyStockOpen(stock.stockOpen)
    applyStockCurrent(stock.stockCurrent, stock.id)
    applyEtfOpen(stock.etfOpen)
    applyLeverage(stock.leverage)
    setQuoteUpdatedAt(null)
  }

  const selectStock = (stock: StockMemory, skipAutoSave = false) => {
    if (stock.id === activeIdRef.current) return
    // Auto-save: always write back to the original stock (preserve its ID even if name changed)
    if (!skipAutoSave && activeIdRef.current && stockNameRef.current.trim()) {
      upsert({ ...buildSnapshot(), id: activeIdRef.current })
    }
    loadStock(stock)
  }

  const handleSelectStock = (stock: StockMemory) => {
    selectStock(stock, false)
  }

  const handleSave = () => {
    if (!stockNameRef.current.trim()) return
    const snapshot = buildSnapshot()
    upsert(snapshot)
    activeIdRef.current = snapshot.id
    setActiveId(snapshot.id)
  }

  const handleAddNew = () => {
    // Auto-save current before switching
    if (activeIdRef.current && stockNameRef.current.trim()) {
      upsert({
        id: activeIdRef.current,
        name: stockNameRef.current,
        symbol: stockSymbolRef.current.trim().toUpperCase(),
        autoRefreshQuote: autoRefreshRef.current,
        stockOpen: stockOpenRef.current,
        stockCurrent: stockCurrentRef.current,
        etfOpen: etfOpenRef.current,
        leverage: leverageRef.current,
      })
    }
    // Generate unique name
    const base = 'NEW'
    const existingNames = new Set(stocks.map(s => s.name))
    let name = base
    let counter = 1
    while (existingNames.has(name)) name = `${base} (${counter++})`
    const newStock: StockMemory = { id: crypto.randomUUID(), name, symbol: '', autoRefreshQuote: true, stockOpen: '', stockCurrent: '', etfOpen: '', leverage: DEFAULT_LEVERAGE }
    upsert(newStock)
    loadStock(newStock)
  }

  const handleDelete = (id: string) => {
    remove(id)
    if (activeIdRef.current === id) {
      latestRequestIdRef.current += 1
      quoteInFlightRef.current = false
      setQuoteLoading(false)
      activeIdRef.current = null
      setActiveId(null)
      applyStockName('')
      applyStockSymbol('')
      applyAutoRefresh(true)
      applyStockOpen('')
      applyStockCurrent('', null)
      applyEtfOpen('')
      applyLeverage(DEFAULT_LEVERAGE)
    }
  }

  const handleReset = () => {
    latestRequestIdRef.current += 1
    quoteInFlightRef.current = false
    setQuoteLoading(false)
    activeIdRef.current = null
    applyStockName('')
    applyStockSymbol('')
    applyAutoRefresh(true)
    applyStockOpen('')
    applyStockCurrent('', null)
    applyEtfOpen('')
    applyLeverage(DEFAULT_LEVERAGE)
    setQuoteError('')
    setQuoteUpdatedAt(null)
    setActiveId(null)
    bootstrapRef.current = null
    failCountRef.current = 0
  }

  const handleAutoRefreshToggle = (checked: boolean) => {
    applyAutoRefresh(checked)
    if (activeIdRef.current && stockNameRef.current.trim()) {
      upsert({
        id: activeIdRef.current,
        name: stockNameRef.current,
        symbol: stockSymbolRef.current.trim().toUpperCase(),
        autoRefreshQuote: checked,
        stockOpen: stockOpenRef.current,
        stockCurrent: stockCurrentRef.current,
        etfOpen: etfOpenRef.current,
        leverage: leverageRef.current,
      })
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex flex-col${dark ? ' dark' : ''}`}>
      <div className="flex w-full flex-1 flex-col items-start justify-center gap-4 pt-12 px-4 md:flex-row md:items-start md:justify-center">
        <StockSidebar
          stocks={stocks}
          activeId={activeId}
          onSelect={handleSelectStock}
          onDelete={handleDelete}
          onReorder={reorder}
          onAddNew={handleAddNew}
        />
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 dark:bg-indigo-800 px-6 py-5 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">槓桿 ETF 計算器</h1>
            <p className="text-indigo-200 text-sm mt-0.5">即時計算正股及槓桿 ETF 價格變動</p>
          </div>
          <button
            type="button"
            onClick={() => setDark(d => {
              const next = !d
              localStorage.setItem('theme', next ? 'dark' : 'light')
              return next
            })}
            className="mt-0.5 p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-500 dark:hover:bg-indigo-700 transition cursor-pointer text-lg leading-none"
            aria-label={dark ? '切換淺色模式' : '切換深色模式'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>

          <div className="px-6 py-5 flex flex-col gap-5">
            {/* Stock name + save */}
            <div className="flex gap-2">
            <input
              type="text"
              placeholder="股票名稱 / 代號（如 NVDA）"
              value={stockName}
              onChange={(e) => applyStockName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="flex-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!stockName.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {activeId ? '儲存' : '新增'}
            </button>
          </div>

            {/* Symbol + quote fetch */}
            <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="股票代號（如 NET）"
              value={stockSymbol}
              onChange={(e) => {
                const next = e.target.value.toUpperCase()
                applyStockSymbol(next)
              }}
              className="w-40 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition"
            />
            <button
              type="button"
              onClick={() => void updateQuote(false)}
              disabled={!normalizedSymbol || quoteLoading}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              抓現價
            </button>
            {quoteUpdatedAt && (
              <span className="text-xs text-gray-400 dark:text-slate-500">
                更新時間: {quoteUpdatedAt.toLocaleTimeString()}
              </span>
            )}
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 select-none">
              <input
                type="checkbox"
                checked={autoRefreshQuote}
                onChange={(e) => handleAutoRefreshToggle(e.target.checked)}
                className="rounded border-gray-300 dark:border-slate-600"
              />
              自動輪詢（交易時段 1 秒 / 非交易時段 30 秒）
            </label>
            <div className="w-full -mt-1 text-xs text-gray-400 dark:text-slate-500">
              資料來源: {' '}
              <a
                href={aastocksQuoteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                aastocks.com
              </a>
            </div>
            </div>
            {quoteError && (
              <p className="text-xs text-red-500 dark:text-red-400">{quoteError}</p>
            )}

            {/* Input fields */}
            <InputPanel
              stockOpen={stockOpen}
              stockCurrent={stockCurrent}
              stockChangePercent={result ? result.stockChangePercent : null}
              etfOpen={etfOpen}
              onStockOpenChange={applyStockOpen}
              onStockCurrentChange={(v) => applyStockCurrent(v, activeIdRef.current)}
              onEtfOpenChange={applyEtfOpen}
              disableStockOpen={autoRefreshQuote}
              disableStockCurrent={autoRefreshQuote}
            />

            {/* Leverage selector */}
            <LeverageSelector value={leverage} onChange={applyLeverage} />

            {/* Divider */}
            <hr className="border-gray-100 dark:border-slate-700" />

            {/* Results */}
            <ResultPanel result={result} leverage={leverage} />

            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="w-full mt-1 py-2 rounded-lg text-sm text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 hover:text-gray-600 dark:hover:text-slate-400 transition cursor-pointer"
            >
              清除重設
            </button>
          </div>
        </div>
      </div>

      <footer className="px-4 pb-8 pt-3 text-center text-xs text-slate-500 dark:text-slate-400">
        <p className="flex flex-wrap items-center justify-center gap-2">
          <span>© 2026 槓桿 ETF 計算器</span>
          <span aria-hidden="true">·</span>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            GitHub 原始碼
          </a>
          <span aria-hidden="true">·</span>
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            問題回報
          </a>
          <span aria-hidden="true">·</span>
          <span>歡迎意見回饋</span>
          <span aria-hidden="true">·</span>
          <span>{APP_VERSION}</span>
        </p>
      </footer>
    </div>
  )
}

export default App
