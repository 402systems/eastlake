import type { Era, League, Slot, SlotId } from './types';

export const LEAGUES: League[] = [
  'Premier League',
  'La Liga',
  'Bundesliga',
  'Serie A',
  'Ligue 1',
];

export const ERAS: Era[] = [
  { era: '2015', label: '2015' },
  { era: '2019', label: '2019' },
  { era: '2022', label: '2022' },
];

// 4-3-3 slots in visual order (bottom to top)
export const FORMATION_SLOTS: Slot[] = [
  { id: 'GK', label: 'GK', positionGroup: 'GK' },
  { id: 'LB', label: 'LB', positionGroup: 'DEF' },
  { id: 'LCB', label: 'CB', positionGroup: 'DEF' },
  { id: 'RCB', label: 'CB', positionGroup: 'DEF' },
  { id: 'RB', label: 'RB', positionGroup: 'DEF' },
  { id: 'LCM', label: 'CM', positionGroup: 'MID' },
  { id: 'CM', label: 'CM', positionGroup: 'MID' },
  { id: 'RCM', label: 'CM', positionGroup: 'MID' },
  { id: 'LW', label: 'LW', positionGroup: 'FWD' },
  { id: 'ST', label: 'ST', positionGroup: 'FWD' },
  { id: 'RW', label: 'RW', positionGroup: 'FWD' },
];

export const SLOT_ROWS: SlotId[][] = [
  ['LW', 'ST', 'RW'],
  ['LCM', 'CM', 'RCM'],
  ['LB', 'LCB', 'RCB', 'RB'],
  ['GK'],
];
