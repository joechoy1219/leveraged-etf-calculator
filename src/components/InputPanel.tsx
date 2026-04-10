interface Field {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}

interface InputPanelProps {
  stockOpen: string;
  stockCurrent: string;
  etfOpen: string;
  onStockOpenChange: (v: string) => void;
  onStockCurrentChange: (v: string) => void;
  onEtfOpenChange: (v: string) => void;
}

function NumberInput({ id, label, placeholder, value, onChange }: Field) {
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
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 px-4 py-2.5 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-right tabular-nums text-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900 transition"
      />
    </div>
  );
}

export function InputPanel({
  stockOpen,
  stockCurrent,
  etfOpen,
  onStockOpenChange,
  onStockCurrentChange,
  onEtfOpenChange,
}: InputPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          id="stock-open"
          label="正股 前收價"
          placeholder="0.00"
          value={stockOpen}
          onChange={onStockOpenChange}
        />
        <NumberInput
          id="stock-current"
          label="正股 現價"
          placeholder="0.00"
          value={stockCurrent}
          onChange={onStockCurrentChange}
        />
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
