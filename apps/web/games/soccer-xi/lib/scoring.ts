import type { Lineup, Squad } from './types';
import { FORMATION_SLOTS } from './constants';

export interface ScoreResult {
  avgRating: number;
  percentile: number; // 0-100
  maxPossibleAvg: number;
  minPossibleAvg: number;
  slotScores: Record<string, { rating: number; rank: number; total: number }>;
}

/**
 * Compute the user's lineup score as a percentile.
 *
 * For each position group, rank the chosen player among all eligible players.
 * Percentile = average of per-slot percentiles across all 11 picks.
 * 100 = best possible at every slot, 0 = worst possible at every slot.
 */
export function scoreLineup(lineup: Lineup, squad: Squad): ScoreResult {
  const ratings = lineup as Record<string, { rating: number } | undefined>;
  let totalRating = 0;
  let filledCount = 0;
  const slotScores: ScoreResult['slotScores'] = {};
  let totalPercentile = 0;
  let scoredSlots = 0;

  // Build per-group sorted rating lists for ranking
  const byGroup: Record<string, number[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  };
  for (const p of squad.players) {
    const g = p.positionGroup;
    if (byGroup[g]) byGroup[g].push(p.rating);
  }
  for (const g of Object.keys(byGroup)) {
    byGroup[g].sort((a, b) => a - b);
  }

  for (const slot of FORMATION_SLOTS) {
    const player = ratings[slot.id];
    if (!player) continue;
    filledCount++;
    totalRating += player.rating;

    const group = slot.positionGroup;
    const eligible = byGroup[group] ?? [];
    const total = eligible.length;

    if (total > 0) {
      // rank = number of players with strictly lower rating
      const rank = eligible.filter((r) => r < player.rating).length + 1;
      // percentile: rank 1 (worst) → 0%, rank total (best) → 100%
      const pct = total === 1 ? 100 : ((rank - 1) / (total - 1)) * 100;
      slotScores[slot.id] = { rating: player.rating, rank, total };
      totalPercentile += pct;
      scoredSlots++;
    }
  }

  const avgRating = filledCount > 0 ? totalRating / filledCount : 0;
  const percentile =
    scoredSlots > 0 ? Math.round(totalPercentile / scoredSlots) : 0;

  // Best/worst possible: top/bottom N in each group
  const maxAvg = computeGroupAvg(byGroup, [1, 4, 3, 3], 'top');
  const minAvg = computeGroupAvg(byGroup, [1, 4, 3, 3], 'bottom');

  return {
    avgRating,
    percentile,
    maxPossibleAvg: maxAvg,
    minPossibleAvg: minAvg,
    slotScores,
  };
}

function computeGroupAvg(
  byGroup: Record<string, number[]>,
  counts: [number, number, number, number],
  mode: 'top' | 'bottom'
): number {
  const groups: Array<[string, number]> = [
    ['GK', counts[0]],
    ['DEF', counts[1]],
    ['MID', counts[2]],
    ['FWD', counts[3]],
  ];
  let total = 0;
  let n = 0;
  for (const [group, count] of groups) {
    const sorted = [...(byGroup[group] ?? [])];
    const picks =
      mode === 'top' ? sorted.slice(-count) : sorted.slice(0, count);
    total += picks.reduce((a, b) => a + b, 0);
    n += picks.length;
  }
  return n > 0 ? total / n : 0;
}
