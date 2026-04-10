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
