import type { IplPlayer, IplRole, IplSquad } from './types';

export function computePercentile(player: IplPlayer, _squad: IplSquad): number {
  return player.globalPercentile;
}

export function getRoleEligible(squad: IplSquad, role: IplRole): IplPlayer[] {
  return squad.players
    .filter((p) => p.role === role)
    .sort((a, b) => b.rating - a.rating);
}
