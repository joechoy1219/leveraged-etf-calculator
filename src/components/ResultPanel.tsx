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

interface StatCardProps {
  label: string;
  badge?: string;
  badgeColor?: string;
  change: number | null;
  price?: number | null;
}

function StatCard({ label, badge, badgeColor, change, price }: StatCardProps) {
  const hasValue = change !== null;
  return (
    <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        {badge && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      <span
        className={`text-2xl font-bold tabular-nums ${hasValue ? changeColor(change!) : 'text-gray-300 dark:text-slate-600'}`}
      >
        {hasValue ? formatPercent(change!) : '—'}
      </span>
      {price !== undefined && (
        <span className="text-xs text-gray-400 dark:text-slate-300 tabular-nums">
          {hasValue && price !== null ? `估算價格 ${formatPrice(price!)}` : ''}
        </span>
      )}
    </div>
  );
}

export function ResultPanel({ result, leverage }: ResultPanelProps) {
  const directionLabel = leverage.direction === 'long' ? '做多' : '做空';
  const badgeColor =
    leverage.direction === 'long'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
      : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400';

  return (
    <div className="grid grid-cols-1 gap-3">
      <StatCard
        label="ETF 變動"
        badge={`${leverage.multiplier}x ${directionLabel}`}
        badgeColor={badgeColor}
        change={result ? result.etfChangePercent : null}
        price={result ? result.etfEstimatedPrice : null}
      />
    </div>
  );
}
