import type { CalculatorResult, LeverageOption } from '../types';

interface ResultPanelProps {
  result: CalculatorResult | null;
  leverage: LeverageOption;
}

function changeColor(value: number): string {
  if (value > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (value < 0) return 'text-red-500 dark:text-red-400';
  return 'text-gray-700 dark:text-gray-300';
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatPrice(value: number): string {
  return value.toFixed(4);
}

export function ResultPanel({ result, leverage }: ResultPanelProps) {
  const directionLabel = leverage.direction === 'long' ? '做多' : '做空';
  const badgeColor =
    leverage.direction === 'long'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
      : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400';

  const etfChange = result?.etfChangePercent ?? null;
  const etfPrice = result?.etfEstimatedPrice ?? null;

  return (
    <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">ETF 變動</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
          {`${leverage.multiplier}x ${directionLabel}`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 items-end">
        <div className="min-w-0">
          <div className="text-xs text-gray-400 dark:text-slate-300 mb-1">估算價格</div>
          <div className={`tabular-nums font-extrabold tracking-tight text-2xl sm:text-3xl ${etfPrice !== null ? 'text-gray-800 dark:text-gray-100' : 'text-gray-300 dark:text-slate-600'}`}>
            {etfPrice !== null ? formatPrice(etfPrice) : '—'}
          </div>
        </div>

        <div className="min-w-0 text-right">
          <div className="text-xs text-gray-400 dark:text-slate-300 mb-1">估算變動率</div>
          <div className={`tabular-nums font-bold text-xl sm:text-2xl ${etfChange !== null ? changeColor(etfChange) : 'text-gray-300 dark:text-slate-600'}`}>
            {etfChange !== null ? formatPercent(etfChange) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
