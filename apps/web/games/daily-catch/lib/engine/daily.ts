/**
 * The daily challenge: everything is derived deterministically from the
 * local calendar date, so every player gets the same target, balls and
 * battle RNG on a given day.
 */
import { Dex, PRNG } from '@pkmn/sim';

import type { Seed } from './battle';
import type { BallId } from './catch';
import { SPECIES_IDS, createWildMon, speciesData, type WildMon } from './wild';

export interface DailyChallenge {
  key: string;
  speciesId: string;
  level: number;
  wild: WildMon;
  catchRate: number;
  balls: Partial<Record<BallId, number>>;
  /** Showdown PRNG seed for the battle itself. */
  battleSeed: Seed;
}

const gen3 = Dex.mod('gen3');

/** Local date as YYYY-MM-DD. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** cyrb128-style string hash -> four 16-bit words (a Gen 5 RNG seed). */
export function seedFromString(input: string): Seed {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < input.length; i++) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  const words = [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0];
  return `${words[0] >>> 16},${words[0] & 0xffff},${words[1] >>> 16},${words[1] & 0xffff}`;
}

/** Evolutions that don't happen by level (stones, trade, friendship...) get this floor. */
const NON_LEVEL_EVOLUTION_FLOOR = 20;
const MIN_WILD_LEVEL = 5;
/**
 * The daily target is well above the player's level-50 team, so it is bulky,
 * hits hard, and is hard to knock out by accident.
 */
export const DAILY_MIN_LEVEL = 60;
export const MAX_WILD_LEVEL = 70;

/** The lowest level at which this species could plausibly be met. */
export function minimumLevel(speciesId: string): number {
  let min = MIN_WILD_LEVEL;
  let species = gen3.species.get(speciesId);
  while (species.prevo) {
    const prevo = gen3.species.get(species.prevo);
    // Baby Pokémon introduced after Gen 3 (e.g. Chingling) don't count.
    if (!prevo.exists || prevo.num > 386) break;
    const needed = species.evoType
      ? NON_LEVEL_EVOLUTION_FLOOR
      : (species.evoLevel ?? NON_LEVEL_EVOLUTION_FLOOR);
    min = Math.max(min, needed);
    species = prevo;
  }
  return Math.min(min, MAX_WILD_LEVEL);
}

const SPECIAL_BALLS: readonly BallId[] = ['netball', 'nestball', 'timerball'];

export function dailyChallenge(key: string): DailyChallenge {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key))
    throw new Error(`Invalid date key ${key}`);
  return challengeFor(key);
}

/** A one-off encounter with a random Pokémon, level and bag (not the daily one). */
export function randomChallenge(): DailyChallenge {
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  return challengeFor(
    `random:${bytes[0].toString(36)}${bytes[1].toString(36)}`
  );
}

/** Everything about a challenge is derived deterministically from its key. */
function challengeFor(key: string): DailyChallenge {
  const rng = new PRNG(seedFromString(`target:${key}`));
  const int = (lo: number, hi: number) => rng.random(lo, hi + 1);

  const speciesId = SPECIES_IDS[rng.random(SPECIES_IDS.length)];
  const level = int(
    Math.max(minimumLevel(speciesId), DAILY_MIN_LEVEL),
    MAX_WILD_LEVEL
  );
  const otId = ((rng.random(65536) << 16) | rng.random(65536)) >>> 0;
  const wild = createWildMon(speciesId, level, () => rng.random(65536), otId);

  const balls: Partial<Record<BallId, number>> = {
    pokeball: int(3, 6),
    greatball: int(0, 3),
    ultraball: int(0, 2),
  };
  if (rng.random(2))
    balls[SPECIAL_BALLS[rng.random(SPECIAL_BALLS.length)]] = int(1, 2);
  for (const ball of Object.keys(balls) as BallId[])
    if (!balls[ball]) delete balls[ball];

  return {
    key,
    speciesId,
    level,
    wild,
    catchRate: speciesData(speciesId).catchRate,
    balls,
    battleSeed: seedFromString(`battle:${key}`),
  };
}
