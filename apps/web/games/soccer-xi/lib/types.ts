export type League =
  | 'Premier League'
  | 'La Liga'
  | 'Bundesliga'
  | 'Serie A'
  | 'Ligue 1';

export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface Club {
  id: string;
  name: string;
  league: League;
  color: string;
}

export interface Nation {
  id: string;
  name: string;
  flag: string;
}

export interface Player {
  id: string;
  name: string;
  position: string;
  positionGroup: PositionGroup;
  rating: number;
  nationality: string;
  photoUrl: string;
}

export interface SquadStats {
  min: number;
  max: number;
  mean: number;
  p10?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
  samples?: number[];
}

export interface Squad {
  clubId: string;
  era: string;
  label: string;
  players: Player[];
  stats: SquadStats;
  note?: string;
}

// 4-3-3 slot definitions
export type SlotId =
  | 'GK'
  | 'LB'
  | 'LCB'
  | 'RCB'
  | 'RB'
  | 'LCM'
  | 'CM'
  | 'RCM'
  | 'LW'
  | 'ST'
  | 'RW';

export interface Slot {
  id: SlotId;
  label: string;
  positionGroup: PositionGroup;
}

export type Lineup = Partial<Record<SlotId, Player>>;

export interface Era {
  era: string;
  label: string;
}
