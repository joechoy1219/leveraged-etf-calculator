import { useState, useCallback } from 'react';
import type { StockMemory } from '../types';

const STORAGE_KEY = 'etf-calc-stocks';

function loadFromStorage(): StockMemory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StockMemory[];
  } catch {
    return [];
  }
}

function saveToStorage(stocks: StockMemory[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
}

export function useStockMemory() {
  const [stocks, setStocks] = useState<StockMemory[]>(loadFromStorage);

  const upsert = useCallback((stock: StockMemory) => {
    setStocks(prev => {
      const idx = prev.findIndex(s => s.id === stock.id);
      const next = idx >= 0
        ? prev.map(s => s.id === stock.id ? stock : s)
        : [...prev, stock];
      saveToStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setStocks(prev => {
      const next = prev.filter(s => s.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  return { stocks, upsert, remove };
}
