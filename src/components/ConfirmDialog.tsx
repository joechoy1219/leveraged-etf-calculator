interface ConfirmDialogProps {
  stockName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ stockName, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-xs">
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-1">
          確認刪除
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          確定要刪除「<span className="font-semibold text-gray-700 dark:text-gray-200">{stockName}</span>」嗎？此操作無法復原。
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition cursor-pointer"
          >
            確認刪除
          </button>
        </div>
      </div>
    </div>
  );
}
