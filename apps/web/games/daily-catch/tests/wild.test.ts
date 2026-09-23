import { Dex, PRNG } from '@pkmn/sim';
import { describe, expect, it } from 'vitest';

import type { Seed } from '@/lib/engine/battle';
import {
  DAILY_MIN_LEVEL,
  MAX_WILD_LEVEL,
  dailyChallenge,
  dateKey,
  minimumLevel,
  randomChallenge,
  seedFromString,
} from '@/lib/engine/daily';
import {
  NATURES,
  SPECIES_DATA,
  SPECIES_IDS,
  createWildMon,
  initialMoveset,
} from '@/lib/engine/wild';

describe('initialMoveset (GiveBoxMonInitialMoveset)', () => {
  it('keeps the last four level-up moves, in table order', () => {
    // Bulbasaur: Tackle 1, Growl 4, Leech Seed 7, Vine Whip 10, Poison Powder 15, Sleep Powder 15, Razor Leaf 20
    expect(initialMoveset('bulbasaur', 3)).toEqual(['tackle']);
    expect(initialMoveset('bulbasaur', 10)).toEqual([
      'tackle',
      'growl',
      'leechseed',
      'vinewhip',
    ]);
    expect(initialMoveset('bulbasaur', 15)).toEqual([
      'leechseed',
      'vinewhip',
      'poisonpowder',
      'sleeppowder',
    ]);
    expect(initialMoveset('bulbasaur', 20)).toEqual([
      'vinewhip',
      'poisonpowder',
      'sleeppowder',
      'razorleaf',
    ]);
  });

  it('skips moves it already knows (Ivysaur relearns Growl at 4)', () => {
    expect(initialMoveset('ivysaur', 4)).toEqual([
      'tackle',
      'growl',
      'leechseed',
    ]);
  });

  it('gives every species at every level 1-4 moves that exist in Gen 3', () => {
    const gen3 = Dex.mod('gen3');
    for (const id of SPECIES_IDS) {
      for (const level of [1, 5, 25, 50, 100]) {
        const moves = initialMoveset(id, level);
        expect(moves.length, `${id} L${level}`).toBeGreaterThan(0);
        expect(moves.length).toBeLessThanOrEqual(4);
        expect(new Set(moves).size).toBe(moves.length);
        for (const m of moves) expect(gen3.moves.get(m).exists, m).toBe(true);
      }
    }
  });
});

describe('createWildMon', () => {
  const rng = (seed: Seed) => {
    const prng = new PRNG(seed);
    return () => prng.random(65536);
  };

  it('derives nature, gender and ability from the personality value', () => {
    for (let i = 0; i < 200; i++) {
      const w = createWildMon(
        'heracross',
        20,
        rng(`${i + 1},2,3,4`),
        0x12345678
      );
      expect(NATURES[w.personality % 25]).toBe(w.set.nature);
      expect(w.set.gender).toBe(
        (w.personality & 0xff) < SPECIES_DATA.heracross.genderRatio ? 'F' : 'M'
      );
      expect(w.set.ability).toBe(w.personality & 1 ? 'Guts' : 'Swarm');
      for (const v of Object.values(w.set.ivs)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(31);
      }
      expect(w.set.evs).toEqual({
        hp: 0,
        atk: 0,
        def: 0,
        spa: 0,
        spd: 0,
        spe: 0,
      });
      expect(w.set.item).toBe('');
    }
  });

  it('handles fixed genders and single abilities', () => {
    expect(createWildMon('nidoranm', 5, rng('9,9,9,9'), 0).set.gender).toBe(
      'M'
    );
    expect(createWildMon('chansey', 20, rng('9,9,9,9'), 0).set.gender).toBe(
      'F'
    );
    expect(createWildMon('magnemite', 20, rng('9,9,9,9'), 0).set.gender).toBe(
      'N'
    );
    expect(createWildMon('zigzagoon', 5, rng('9,9,9,9'), 0).set.ability).toBe(
      'Pickup'
    );
  });

  it('uses base friendship and Emerald Deoxys', () => {
    expect(createWildMon('chansey', 20, rng('1,1,1,1'), 0).set.happiness).toBe(
      140
    );
    expect(createWildMon('deoxys', 30, rng('1,1,1,1'), 0).set.species).toBe(
      'Deoxys-Speed'
    );
  });

  it('marks shininess from trainer ID and personality', () => {
    for (let i = 0; i < 50; i++) {
      const w = createWildMon('zigzagoon', 5, rng(`${i},5,6,7`), 0xabcdef01);
      const otId = 0xabcdef01;
      const x =
        (otId >>> 16) ^
        (otId & 0xffff) ^
        (w.personality >>> 16) ^
        (w.personality & 0xffff);
      expect(w.shiny).toBe(x < 8);
      expect(!!w.set.shiny).toBe(w.shiny);
    }
  });
});

describe('daily challenge', () => {
  it('formats local dates', () => {
    expect(dateKey(new Date(2026, 8, 7))).toBe('2026-09-07');
    expect(dateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('is the same for the same date and differs across dates', () => {
    const a = dailyChallenge('2026-09-17');
    expect(dailyChallenge('2026-09-17')).toEqual(a);
    const others = ['2026-09-18', '2026-09-19', '2026-09-20'].map(
      (k) => dailyChallenge(k).speciesId
    );
    expect(new Set([a.speciesId, ...others]).size).toBeGreaterThan(1);
    expect(seedFromString('battle:2026-09-17')).not.toBe(
      seedFromString('battle:2026-09-18')
    );
  });

  it('produces valid challenges across a year of dates', () => {
    const seen = new Set<string>();
    const start = new Date(2026, 0, 1);
    for (let i = 0; i < 366; i++) {
      const key = dateKey(
        new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      );
      const c = dailyChallenge(key);
      seen.add(c.speciesId);
      expect(SPECIES_IDS).toContain(c.speciesId);
      expect(c.level).toBeGreaterThanOrEqual(minimumLevel(c.speciesId));
      expect(c.level).toBeGreaterThanOrEqual(DAILY_MIN_LEVEL);
      expect(c.level).toBeLessThanOrEqual(MAX_WILD_LEVEL);
      expect(c.catchRate).toBe(SPECIES_DATA[c.speciesId].catchRate);
      const total = Object.values(c.balls).reduce((n, v) => n + (v ?? 0), 0);
      expect(total).toBeGreaterThanOrEqual(3);
      for (const v of Object.values(c.balls)) expect(v).toBeGreaterThan(0);
      expect(c.battleSeed).toMatch(/^\d+,\d+,\d+,\d+$/);
    }
    expect(seen.size).toBeGreaterThan(150);
  });

  it('random encounters vary and follow the same rules', () => {
    const species = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const c = randomChallenge();
      species.add(c.speciesId);
      expect(c.key).toMatch(/^random:/);
      expect(c.level).toBeGreaterThanOrEqual(DAILY_MIN_LEVEL);
      expect(c.level).toBeLessThanOrEqual(MAX_WILD_LEVEL);
      expect(Object.keys(c.balls).length).toBeGreaterThan(0);
    }
    expect(species.size).toBeGreaterThan(20);
  });

  it('respects evolution levels', () => {
    expect(minimumLevel('bulbasaur')).toBe(5);
    expect(minimumLevel('ivysaur')).toBe(16);
    expect(minimumLevel('venusaur')).toBe(32);
    expect(minimumLevel('vileplume')).toBe(21); // Oddish->Gloom 21, Gloom->Vileplume by stone (20)
    expect(minimumLevel('chimecho')).toBe(5); // Chingling is Gen 4
    expect(minimumLevel('dragonite')).toBe(55); // Dragonair->Dragonite at 55
  });
});
