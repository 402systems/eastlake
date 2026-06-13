export type IplRole =
  | 'OPENER'
  | 'MIDDLE_ORDER'
  | 'ALL_ROUNDER'
  | 'SPIN_BOWLER'
  | 'PACE_BOWLER';

export interface IplTeam {
  id: string;
  name: string;
  shortName: string;
  color: string;
  years: number[];
}

export interface IplPlayer {
  id: string;
  name: string;
  role: IplRole;
  rating: number;
  globalPercentile: number;
  matches: number;
  runs?: number;
  average?: number;
  strikeRate?: number;
  wickets?: number;
  economy?: number;
  bowlingAverage?: number;
}

export interface SquadStats {
  min: number;
  max: number;
  mean: number;
}

export interface IplSquad {
  teamId: string;
  year: string;
  label: string;
  players: IplPlayer[];
  stats: SquadStats;
}

export interface SeasonTeam {
  teamId: string;
  teamName: string;
  shortName: string;
  composite: number;
  pctComposite: number;
}

export type SlotId = IplRole;
export type Lineup = Partial<Record<SlotId, IplPlayer>>;

export interface Slot {
  id: SlotId;
  label: string;
  description: string;
}
