interface Field {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

interface InputPanelProps {
  stockOpen: string;
  stockCurrent: string;
  stockChangePercent?: number | null;
  etfOpen: string;
  onStockOpenChange: (v: string) => void;
  onStockCurrentChange: (v: string) => void;
  onEtfOpenChange: (v: string) => void;
  disableStockOpen?: boolean;
  disableStockCurrent?: boolean;
}

function NumberInput({ id, label, placeholder, value, onChange, disabled }: Field) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-4 py-2.5 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-right tabular-nums text-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </div>
  );
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function changeColor(value: number): string {
  if (value > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (value < 0) return 'text-red-500 dark:text-red-400';
  return 'text-gray-600 dark:text-gray-300';
}

export function InputPanel({
  stockOpen,
  stockCurrent,
  stockChangePercent,
  etfOpen,
  onStockOpenChange,
  onStockCurrentChange,
  onEtfOpenChange,
  disableStockOpen,
  disableStockCurrent,
}: InputPanelProps) {
  const hasChange = stockChangePercent !== null && stockChangePercent !== undefined;
  const changeDisplay = hasChange ? formatPercent(stockChangePercent) : '—';
  const changeColorClass = hasChange ? changeColor(stockChangePercent) : 'text-gray-300 dark:text-slate-500';

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="min-w-0">
          <NumberInput
            id="stock-open"
            label="正股 前收價"
            placeholder="0.00"
            value={stockOpen}
            onChange={onStockOpenChange}
            disabled={disableStockOpen}
          />
        </div>
        <div className="min-w-0">
          <NumberInput
            id="stock-current"
            label="正股 現價"
            placeholder="0.00"
            value={stockCurrent}
            onChange={onStockCurrentChange}
            disabled={disableStockCurrent}
          />
        </div>
        <div className="min-w-0 flex flex-col gap-1">
          <div className="text-sm h-5" aria-hidden="true" />
          <div className="px-1 py-2.5 tabular-nums flex items-center justify-end gap-1">
            <span
              className={`whitespace-nowrap font-extrabold tracking-tight leading-none text-xl sm:text-2xl ${changeColorClass}`}
            >
              {changeDisplay}
            </span>
          </div>
        </div>
      </div>
      <NumberInput
        id="etf-open"
        label="槓桿 ETF 前收價"
        placeholder="0.00"
        value={etfOpen}
        onChange={onEtfOpenChange}
      />
    </div>
  );
}
