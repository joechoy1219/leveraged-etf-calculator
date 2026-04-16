export type Direction = 'long' | 'short';
export type Multiplier = 2 | 3;

export interface LeverageOption {
  multiplier: Multiplier;
  direction: Direction;
}

export interface CalculatorInputs {
  stockOpen: string;
  stockCurrent: string;
  etfOpen: string;
  leverage: LeverageOption;
}

export interface CalculatorResult {
  stockChangePercent: number;
  etfChangePercent: number;
  etfEstimatedPrice: number;
}

export interface StockMemory {
  id: string;
  name: string;
  symbol?: string;
  autoRefreshQuote?: boolean;
  stockOpen: string;
  stockCurrent: string;
  etfOpen: string;
  leverage: LeverageOption;
}
