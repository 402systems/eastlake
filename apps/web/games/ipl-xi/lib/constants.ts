import type { Slot } from './types';

// localStorage key carrying the "Ball Knowledge" (ratings hidden) preference
// from the home page into the game, so the mode isn't embedded in the URL.
export const BALL_KNOWLEDGE_KEY = 'ipl-ball-knowledge';

export const SLOTS: Slot[] = [
  { id: 'OPENER', label: 'Opener', description: 'Bats 1–2' },
  { id: 'MIDDLE_ORDER', label: 'Middle Order', description: 'Bats 3–4' },
  {
    id: 'ALL_ROUNDER',
    label: 'All-rounder / Finisher',
    description: 'Bats 5–6',
  },
  { id: 'SPIN_BOWLER', label: 'Spin Bowler', description: 'Spinner' },
  { id: 'PACE_BOWLER', label: 'Pace Bowler', description: 'Pacer' },
];
