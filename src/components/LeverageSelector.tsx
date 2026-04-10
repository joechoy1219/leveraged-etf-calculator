import type { Direction, LeverageOption, Multiplier } from '../types';

interface LeverageSelectorProps {
  value: LeverageOption;
  onChange: (value: LeverageOption) => void;
}

const OPTIONS: { multiplier: Multiplier; direction: Direction; label: string }[] = [
  { multiplier: 2, direction: 'long',  label: '2x 做多' },
  { multiplier: 3, direction: 'long',  label: '3x 做多' },
  { multiplier: 2, direction: 'short', label: '2x 做空' },
  { multiplier: 3, direction: 'short', label: '3x 做空' },
];

export function LeverageSelector({ value, onChange }: LeverageSelectorProps) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500 mb-2">槓桿倍數</p>
      <div className="grid grid-cols-4 gap-2">
        {OPTIONS.map((opt) => {
          const isActive =
            opt.multiplier === value.multiplier && opt.direction === value.direction;
          const isLong = opt.direction === 'long';
          return (
            <button
              key={`${opt.multiplier}-${opt.direction}`}
              type="button"
              onClick={() => onChange({ multiplier: opt.multiplier, direction: opt.direction })}
              className={[
                'py-2 rounded-lg text-sm font-semibold border transition-colors cursor-pointer',
                isActive
                  ? isLong
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-red-500 border-red-500 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
