import { TeamValidator } from '@pkmn/sim';
import { describe, expect, it } from 'vitest';

import { SAMPLE_TEAM, cloneTeam } from '@/lib/engine/team';

describe('sample team', () => {
  it('is legal in Gen 3 (moves, abilities, genders)', () => {
    // The validator nags about level 50 / 0 EVs unless one EV is set; 1 EV
    // doesn't change any stat.
    const team = cloneTeam().map((s) => ({ ...s, evs: { ...s.evs, hp: 1 } }));
    expect(TeamValidator.get('gen3ou').validateTeam(team)).toBeNull();
  });

  it('has no moves that end a wild battle', () => {
    for (const s of SAMPLE_TEAM) {
      for (const m of s.moves)
        expect(['roar', 'whirlwind', 'teleport']).not.toContain(m);
    }
  });
});
