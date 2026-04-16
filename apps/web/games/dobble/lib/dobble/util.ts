import type { DobbleCard } from './types';

export const findCommonSymbol = (
  cardA: DobbleCard,
  cardB: DobbleCard
): number | null => {
  const setA = new Set(cardA.symbols.map((s) => s.id));
  const setB = new Set(cardB.symbols.map((s) => s.id));
  // const setB = new Set(cardB);
  for (const symbol of setA) {
    if (setB.has(symbol)) {
      return symbol;
    }
  }
  return null;
};
