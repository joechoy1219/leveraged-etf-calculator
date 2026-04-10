import { useState } from 'react';
import type { StockMemory } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

interface StockSidebarProps {
  stocks: StockMemory[];
  activeId: string | null;
  onSelect: (stock: StockMemory) => void;
  onDelete: (id: string) => void;
}

export function StockSidebar({ stocks, activeId, onSelect, onDelete }: StockSidebarProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsingId, setCollapsingId] = useState<string | null>(null);

  const pendingStock = stocks.find(s => s.id === pendingDeleteId);

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    setDeletingId(pendingDeleteId);
    setPendingDeleteId(null);
  };

  return (
    <>
      <aside className="w-full md:w-44 shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2 px-1">
          已儲存股票
        </h2>

        {stocks.length === 0 ? (
          <div className="bg-white/70 dark:bg-slate-800/70 rounded-xl px-3 py-5 text-center">
            <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
              尚無紀錄<br />輸入名稱後按「儲存」
            </p>
          </div>
        ) : (
          <ul className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
            {stocks.map(stock => {
              const isActive = activeId === stock.id;
              const isDeleting = deletingId === stock.id;
              const isCollapsing = collapsingId === stock.id;
              return (
                <li
                  key={stock.id}
                  className={[
                    'group relative rounded-xl px-3 py-2.5 transition shrink-0 md:shrink overflow-hidden',
                    isActive
                      ? 'bg-indigo-600 shadow-md'
                      : 'bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700',
                  ].join(' ')}
                  style={isCollapsing ? { animation: 'collapse-height 0.5s cubic-bezier(0.4,0,0.2,1) forwards' } : undefined}
                  onAnimationEnd={isCollapsing ? (e) => {
                    if (e.animationName === 'collapse-height') {
                      setCollapsingId(null);
                      onDelete(stock.id);
                    }
                  } : undefined}
                >
                  <div
                    className="flex items-center gap-1"
                    style={isCollapsing ? { animation: 'collapse-slide 0.5s cubic-bezier(0.4,0,0.2,1) forwards' } : undefined}
                  >
                  <button
                    type="button"
                    onClick={() => !isDeleting && onSelect(stock)}
                    className={[
                      'flex-1 text-left text-sm font-semibold truncate max-w-[80px] md:max-w-none',
                      isActive ? 'text-white' : 'text-gray-700 dark:text-gray-200',
                    ].join(' ')}
                  >
                    {stock.name}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPendingDeleteId(stock.id); }}
                    aria-label={`刪除 ${stock.name}`}
                    className={[
                      'shrink-0 w-5 h-5 flex items-center justify-center rounded text-xs',
                      'opacity-0 group-hover:opacity-100 transition cursor-pointer',
                      isActive
                        ? 'text-indigo-200 hover:text-white hover:bg-indigo-500'
                        : 'text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
                    ].join(' ')}
                  >
                    ✕
                  </button>
                  </div>

                  {isDeleting && (
                    <div
                      className="absolute inset-0 bg-red-500 rounded-xl flex items-center justify-center"
                      style={{
                        transformOrigin: 'right',
                        animation: 'sweep-delete 0.5s cubic-bezier(0.4,0,0.2,1) forwards',
                      }}
                      onAnimationEnd={() => {
                        setDeletingId(null);
                        setCollapsingId(stock.id);
                      }}
                    >
                      <span className="text-white text-xs font-bold whitespace-nowrap">已刪除</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {pendingStock && (
        <ConfirmDialog
          stockName={pendingStock.name}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </>
  );
}
