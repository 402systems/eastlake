import { PRNG } from '@pkmn/sim';
import { describe, expect, it } from 'vitest';

import {
  EMPTY_SCENE,
  StepBuilder,
  applyStep,
  type Step,
} from '@/lib/anim/steps';
import '@/lib/engine/mod';
import { WildBattle, type PlayerAction } from '@/lib/engine/battle';
import type { BallId } from '@/lib/engine/catch';
import { seedFromString } from '@/lib/engine/daily';
import { cloneTeam } from '@/lib/engine/team';
import { SPECIES_DATA, SPECIES_IDS, createWildMon } from '@/lib/engine/wild';

/** Random legal action for the player, from what the battle offers. */
function randomAction(b: WildBattle, rng: PRNG): PlayerAction {
  const a = b.available();
  if (a.mode === 'switch') {
    const options = a.switches.filter((s) => !s.fainted && !s.active);
    return { kind: 'switch', slot: options[rng.random(options.length)].slot };
  }
  const roll = rng.random(10);
  if (roll < 3 && a.canThrow) {
    const balls = (Object.keys(a.balls) as BallId[]).filter(
      (k) => (a.balls[k] ?? 0) > 0
    );
    return { kind: 'ball', ball: balls[rng.random(balls.length)] };
  }
  if (roll < 4 && a.canSwitch) {
    const options = a.switches.filter((s) => !s.fainted && !s.active);
    return { kind: 'switch', slot: options[rng.random(options.length)].slot };
  }
  const moves = a.moves.filter((m) => !m.disabled);
  return { kind: 'move', slot: moves[rng.random(moves.length)].slot };
}

describe('fuzz: every Gen 3 species in a full battle', () => {
  it('runs to completion without engine errors', () => {
    const outcomes: Record<string, number> = {};
    for (const [i, id] of SPECIES_IDS.entries()) {
      const rng = new PRNG(seedFromString(`fuzz:${id}`));
      const level = 5 + rng.random(46);
      const wild = createWildMon(id, level, () => rng.random(65536), 0);
      const b = new WildBattle({
        seed: seedFromString(`fuzz-battle:${id}`),
        playerName: 'Fuzz',
        team: cloneTeam(),
        wild: wild.set,
        catchRate: SPECIES_DATA[id].catchRate,
        balls: {
          pokeball: 3,
          greatball: 2,
          ultraball: 2,
          timerball: 1,
          nestball: 1,
          netball: 1,
        },
      });
      const builder = new StepBuilder('Fuzz');
      const steps: Step[] = [];
      const log: string[] = [];
      const drain = () => {
        const lines = b.drainLog();
        log.push(...lines);
        steps.push(...builder.build(lines));
      };
      drain();
      let turns = 0;
      while (b.result().kind === 'ongoing' && turns < 60) {
        const res = b.choose(randomAction(b, rng));
        expect(res, `${id} (#${i + 1}) turn ${b.turn}`).toEqual({ ok: true });
        drain();
        turns++;
      }
      expect(log.some((l) => l.startsWith('|error|'))).toBe(false);
      steps.reduce(applyStep, EMPTY_SCENE);
      for (const step of steps) {
        for (const text of [
          ('text' in step && step.text) || '',
          step.kind === 'ball' ? step.resultText : '',
        ]) {
          expect(text, `${id}: ${text}`).not.toMatch(
            /opposing [A-Z]{2}|\*\*|\|\||%|undefined|^\[/
          );
        }
      }
      const kind = b.result().kind;
      outcomes[kind] = (outcomes[kind] ?? 0) + 1;
    }
    process.stdout.write(`\nfuzz outcomes: ${JSON.stringify(outcomes)}\n`);
  }, 120_000);
});
