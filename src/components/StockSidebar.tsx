import { useState, useRef } from 'react';
import type { StockMemory } from '../types';
import { ConfirmDialog } from './ConfirmDialog';

type SidebarMode = 'normal' | 'batch' | 'reorder';

interface StockSidebarProps {
  stocks: StockMemory[];
  activeId: string | null;
  onSelect: (stock: StockMemory) => void;
  onDelete: (id: string) => void;
  onReorder: (newList: StockMemory[]) => void;
}

export function StockSidebar({ stocks, activeId, onSelect, onDelete, onReorder }: StockSidebarProps) {
  const [mode, setMode] = useState<SidebarMode>('normal');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingBatchDelete, setPendingBatchDelete] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [collapsingId, setCollapsingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggedIdRef = useRef<string | null>(null);

  const pendingStock = stocks.find(s => s.id === pendingDeleteId);

  const switchMode = (m: SidebarMode) => {
    setMode(prev => prev === m ? 'normal' : m);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    setDeletingId(pendingDeleteId);
    setPendingDeleteId(null);
  };

  const handleConfirmBatchDelete = () => {
    setPendingBatchDelete(false);
    selectedIds.forEach(id => onDelete(id));
    setSelectedIds(new Set());
    setMode('normal');
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    draggedIdRef.current = id;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIdRef.current !== id) setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const fromId = draggedIdRef.current;
    draggedIdRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
    if (!fromId || fromId === targetId) return;
    const newList = [...stocks];
    const fromIdx = newList.findIndex(s => s.id === fromId);
    const toIdx = newList.findIndex(s => s.id === targetId);
    const [item] = newList.splice(fromIdx, 1);
    newList.splice(toIdx, 0, item);
    onReorder(newList);
  };

  const handleDragEnd = () => {
    draggedIdRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <>
      <aside className="w-full md:w-44 shrink-0">
        {/* Header row */}
        <div className="flex items-center mb-2 px-1">
          <h2 className="flex-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
            已儲存股票
          </h2>
          {stocks.length > 0 && (
            <div className="flex gap-1">
              <button
                type="button"
                title={mode === 'batch' ? '退出批量刪除' : '批量刪除'}
                onClick={() => switchMode('batch')}
                className={[
                  'w-6 h-6 flex items-center justify-center rounded text-sm transition cursor-pointer',
                  mode === 'batch'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                    : 'text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400',
                ].join(' ')}
              >
                🗑
              </button>
              <button
                type="button"
                title={mode === 'reorder' ? '完成排序' : '拖曳排序'}
                onClick={() => switchMode('reorder')}
                className={[
                  'w-6 h-6 flex items-center justify-center rounded text-base font-bold leading-none transition cursor-pointer',
                  mode === 'reorder'
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500'
                    : 'text-gray-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400',
                ].join(' ')}
              >
                ≡
              </button>
            </div>
          )}
        </div>

        {/* Batch action bar */}
        {mode === 'batch' && stocks.length > 0 && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <span className="text-xs text-gray-400 dark:text-slate-500 flex-1">
              已選 {selectedIds.size} 個
            </span>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => setPendingBatchDelete(true)}
              className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 transition cursor-pointer"
            >
              刪除
            </button>
          </div>
        )}

        {stocks.length === 0 ? (
          <div className="bg-white/70 dark:bg-slate-800/70 rounded-xl px-3 py-5 text-center">
            <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
              尚無紀錄<br />輸入名稱後按「儲存」
            </p>
          </div>
        ) : (
          <ul className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
            {stocks.map(stock => {
              const isActive = activeId === stock.id && mode !== 'batch';
              const isDeleting = deletingId === stock.id;
              const isCollapsing = collapsingId === stock.id;
              const isSelected = selectedIds.has(stock.id);
              const isDragOver = dragOverId === stock.id;
              const isDragging = draggingId === stock.id;
              return (
                <li
                  key={stock.id}
                  draggable={mode === 'reorder'}
                  onDragStart={mode === 'reorder' ? (e) => handleDragStart(e, stock.id) : undefined}
                  onDragOver={mode === 'reorder' ? (e) => handleDragOver(e, stock.id) : undefined}
                  onDrop={mode === 'reorder' ? (e) => handleDrop(e, stock.id) : undefined}
                  onDragEnd={mode === 'reorder' ? handleDragEnd : undefined}
                  className={[
                    'group relative rounded-xl px-3 py-2.5 transition-colors shrink-0 md:shrink overflow-hidden select-none',
                    mode === 'reorder' ? 'cursor-grab' : '',
                    isDragging ? 'opacity-40' : '',
                    isDragOver ? 'ring-2 ring-indigo-400 dark:ring-indigo-500' : '',
                    isActive
                      ? 'bg-indigo-600 shadow-md'
                      : mode === 'batch' && isSelected
                        ? 'bg-red-50 dark:bg-red-900/20 ring-1 ring-red-300 dark:ring-red-700'
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
                    className="flex items-center gap-2"
                    style={isCollapsing ? { animation: 'collapse-slide 0.5s cubic-bezier(0.4,0,0.2,1) forwards' } : undefined}
                    onClick={() => {
                      if (mode === 'normal' && !isDeleting) onSelect(stock);
                      else if (mode === 'batch') toggleSelect(stock.id);
                    }}
                  >
                    <span
                      className={[
                        'flex-1 text-sm font-semibold truncate max-w-[80px] md:max-w-none',
                        mode !== 'reorder' ? 'cursor-pointer' : 'cursor-grab',
                        isActive ? 'text-white' : 'text-gray-700 dark:text-gray-200',
                        mode === 'batch' && isSelected ? 'text-red-600 dark:text-red-400' : '',
                      ].join(' ')}
                    >
                      {stock.name}
                    </span>

                    {/* Normal mode: ✕ delete button */}
                    {mode === 'normal' && (
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
                    )}

                    {/* Batch mode: checkbox circle */}
                    {mode === 'batch' && (
                      <div
                        className={[
                          'shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                          isSelected
                            ? 'bg-red-500 border-red-500'
                            : 'border-gray-300 dark:border-slate-500',
                        ].join(' ')}
                      >
                        {isSelected && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    )}

                    {/* Reorder mode: drag handle ≡ */}
                    {mode === 'reorder' && (
                      <span className="shrink-0 text-gray-400 dark:text-slate-500 text-base font-bold leading-none cursor-grab">
                        ≡
                      </span>
                    )}
                  </div>

                  {/* Sweep delete overlay */}
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

      {/* Individual delete confirm */}
      {pendingStock && (
        <ConfirmDialog
          stockName={pendingStock.name}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {/* Batch delete confirm */}
      {pendingBatchDelete && (
        <ConfirmDialog
          stockName={`${selectedIds.size} 個股票`}
          onConfirm={handleConfirmBatchDelete}
          onCancel={() => setPendingBatchDelete(false)}
        />
      )}
    </>
  );
}
