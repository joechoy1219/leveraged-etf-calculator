import { useState, useMemo } from 'react'
import type { CalculatorInputs, LeverageOption } from './types'
import { calculate } from './hooks/useCalculator'
import { InputPanel } from './components/InputPanel'
import { LeverageSelector } from './components/LeverageSelector'
import { ResultPanel } from './components/ResultPanel'
import './index.css'

const DEFAULT_LEVERAGE: LeverageOption = { multiplier: 2, direction: 'long' }

function App() {
  const [stockOpen, setStockOpen] = useState('')
  const [stockCurrent, setStockCurrent] = useState('')
  const [etfOpen, setEtfOpen] = useState('')
  const [leverage, setLeverage] = useState<LeverageOption>(DEFAULT_LEVERAGE)
  const [dark, setDark] = useState(false)

  const inputs: CalculatorInputs = { stockOpen, stockCurrent, etfOpen, leverage }
  const result = useMemo(() => calculate(inputs), [stockOpen, stockCurrent, etfOpen, leverage])

  const handleReset = () => {
    setStockOpen('')
    setStockCurrent('')
    setEtfOpen('')
    setLeverage(DEFAULT_LEVERAGE)
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-start justify-center pt-12 px-4 pb-12${dark ? ' dark' : ''}`}>
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 dark:bg-indigo-800 px-6 py-5 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">槓桿 ETF 計算器</h1>
            <p className="text-indigo-200 text-sm mt-0.5">即時計算正股及槓桿 ETF 價格變動</p>
          </div>
          <button
            type="button"
            onClick={() => setDark(d => !d)}
            className="mt-0.5 p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-500 dark:hover:bg-indigo-700 transition cursor-pointer text-lg leading-none"
            aria-label={dark ? '切換淺色模式' : '切換深色模式'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
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
