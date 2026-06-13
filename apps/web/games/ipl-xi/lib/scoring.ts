import type { IplPlayer, IplRole } from './types';

export function computePercentile(player: IplPlayer): number {
  return player.globalPercentile;
}

export function getRoleEligible(squad: IplSquad, role: IplRole): IplPlayer[] {
  return squad.players
    .filter((p) => p.role === role)
    .sort((a, b) => b.rating - a.rating);
}
