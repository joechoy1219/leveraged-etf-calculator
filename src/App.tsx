import { useState, useMemo, useRef } from 'react'
import type { CalculatorInputs, LeverageOption, StockMemory } from './types'
import { calculate } from './hooks/useCalculator'
import { useStockMemory } from './hooks/useStockMemory'
import { InputPanel } from './components/InputPanel'
import { LeverageSelector } from './components/LeverageSelector'
import { ResultPanel } from './components/ResultPanel'
import { StockSidebar } from './components/StockSidebar'
import './index.css'

const DEFAULT_LEVERAGE: LeverageOption = { multiplier: 2, direction: 'long' }

function App() {
  const [stockName, setStockName] = useState('')
  const [stockOpen, setStockOpen] = useState('')
  const [stockCurrent, setStockCurrent] = useState('')
  const [etfOpen, setEtfOpen] = useState('')
  const [leverage, setLeverage] = useState<LeverageOption>(DEFAULT_LEVERAGE)
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [activeId, setActiveId] = useState<string | null>(null)

  // Tracks activeId synchronously without render-time assignment (safe in concurrent mode)
  const activeIdRef = useRef<string | null>(null)

  const { stocks, upsert, remove } = useStockMemory()

  const inputs: CalculatorInputs = { stockOpen, stockCurrent, etfOpen, leverage }
  const result = useMemo(() => calculate(inputs), [stockOpen, stockCurrent, etfOpen, leverage])

  const buildSnapshot = (): StockMemory => {
    const activeStock = stocks.find(s => s.id === activeId)
    const reuseId = activeStock?.name === stockName
    return {
      id: reuseId ? activeId! : crypto.randomUUID(),
      name: stockName,
      stockOpen,
      stockCurrent,
      etfOpen,
      leverage,
    }
  }

  const loadStock = (stock: StockMemory) => {
    activeIdRef.current = stock.id  // update ref before setState so next click sees it immediately
    setActiveId(stock.id)
    setStockName(stock.name)
    setStockOpen(stock.stockOpen)
    setStockCurrent(stock.stockCurrent)
    setEtfOpen(stock.etfOpen)
    setLeverage(stock.leverage)
  }

  const handleSelectStock = (stock: StockMemory) => {
    if (stock.id === activeIdRef.current) return
    if (stockName.trim()) {
      upsert(buildSnapshot())
    }
    loadStock(stock)
  }

  const handleSave = () => {
    if (!stockName.trim()) return
    const snapshot = buildSnapshot()
    upsert(snapshot)
    activeIdRef.current = snapshot.id  // keep ref in sync
    setActiveId(snapshot.id)
  }

  const handleDelete = (id: string) => {
    remove(id)
    if (activeIdRef.current === id) {
      activeIdRef.current = null
      setActiveId(null)
      setStockName('')
      setStockOpen('')
      setStockCurrent('')
      setEtfOpen('')
      setLeverage(DEFAULT_LEVERAGE)
    }
  }

  const handleReset = () => {
    activeIdRef.current = null
    setStockName('')
    setStockOpen('')
    setStockCurrent('')
    setEtfOpen('')
    setLeverage(DEFAULT_LEVERAGE)
    setActiveId(null)
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex flex-col md:flex-row items-start justify-center gap-4 pt-12 px-4 pb-12${dark ? ' dark' : ''}`}>
      <StockSidebar
        stocks={stocks}
        activeId={activeId}
        onSelect={handleSelectStock}
        onDelete={handleDelete}
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
              onChange={(e) => setStockName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="flex-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={!stockName.trim()}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              儲存
            </button>
          </div>

          {/* Input fields */}
          <InputPanel
            stockOpen={stockOpen}
            stockCurrent={stockCurrent}
            etfOpen={etfOpen}
            onStockOpenChange={setStockOpen}
            onStockCurrentChange={setStockCurrent}
            onEtfOpenChange={setEtfOpen}
          />

          {/* Leverage selector */}
          <LeverageSelector value={leverage} onChange={setLeverage} />

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
  )
}

export default App
