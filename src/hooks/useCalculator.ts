import type { CalculatorInputs, CalculatorResult } from '../types';

export function calculate(inputs: CalculatorInputs): CalculatorResult | null {
  const stockOpen = parseFloat(inputs.stockOpen);
  const stockCurrent = parseFloat(inputs.stockCurrent);
  const etfOpen = parseFloat(inputs.etfOpen);

  if (
    !isFinite(stockOpen) || stockOpen <= 0 ||
    !isFinite(stockCurrent) || stockCurrent <= 0 ||
    !isFinite(etfOpen) || etfOpen <= 0
  ) {
    return null;
  }

  const stockChangePercent = ((stockCurrent - stockOpen) / stockOpen) * 100;
  const leverageMultiplier =
    inputs.leverage.direction === 'short'
      ? -inputs.leverage.multiplier
      : inputs.leverage.multiplier;
  const etfChangePercent = stockChangePercent * leverageMultiplier;
  const etfEstimatedPrice = etfOpen * (1 + etfChangePercent / 100);

  return { stockChangePercent, etfChangePercent, etfEstimatedPrice };
}
