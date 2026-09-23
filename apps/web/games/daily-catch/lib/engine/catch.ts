/**
 * Gen 3 capture algorithm, ported integer-exact from pokeemerald
 * (pret/pokeemerald, src/battle_script_commands.c, Cmd_handleballthrow).
 *
 * All arithmetic mirrors the C source: u32 `odds`, u8 ball multiplier,
 * truncating integer division, and the GBA BIOS integer square root.
 */

export type BallId =
  | 'pokeball'
  | 'greatball'
  | 'ultraball'
  | 'masterball'
  | 'netball'
  | 'nestball'
  | 'timerball'
  | 'repeatball'
  | 'luxuryball'
  | 'premierball'
  | 'diveball';

export const BALL_NAMES: Record<BallId, string> = {
  pokeball: 'POKé BALL',
  greatball: 'GREAT BALL',
  ultraball: 'ULTRA BALL',
  masterball: 'MASTER BALL',
  netball: 'NET BALL',
  nestball: 'NEST BALL',
  timerball: 'TIMER BALL',
  repeatball: 'REPEAT BALL',
  luxuryball: 'LUXURY BALL',
  premierball: 'PREMIER BALL',
  diveball: 'DIVE BALL',
};

export type MajorStatus = '' | 'slp' | 'frz' | 'psn' | 'tox' | 'brn' | 'par';

export interface CatchTarget {
  /** Species catch rate (1-255). */
  catchRate: number;
  level: number;
  hp: number;
  maxHP: number;
  status: MajorStatus;
  types: readonly string[];
}

export interface CatchContext {
  /** gBattleResults.battleTurnCounter: 0 on the first turn, +1 per completed turn, saturating at 255. */
  turnCounter: number;
  /** Whether the species is already registered as caught (Repeat Ball). */
  alreadyCaught: boolean;
  /** Whether the battle takes place underwater (Dive Ball). */
  underwater: boolean;
}

/** Number of shake checks that must pass for a capture (BALL_3_SHAKES_SUCCESS). */
export const SHAKES_SUCCESS = 4;

export interface CatchResult {
  caught: boolean;
  /** 0-3 wobbles shown when the Pokémon breaks free; 4 when caught (3 wobbles + click). */
  shakes: number;
}

/** A source of u16 random numbers, equivalent to the game's Random(). */
export type RandomU16 = () => number;

const u8 = (n: number) => n & 0xff;

/** Floor integer square root, matching the GBA BIOS Sqrt SWI. */
export function isqrt(n: number): number {
  if (!Number.isInteger(n) || n < 0)
    throw new Error(`isqrt: invalid input ${n}`);
  let x = Math.floor(Math.sqrt(n));
  // Correct any floating-point error so that x*x <= n < (x+1)*(x+1).
  while (x * x > n) x--;
  while ((x + 1) * (x + 1) <= n) x++;
  return x;
}

/** Ball multiplier in tenths (10 = 1x). Master Ball is handled separately. */
export function ballMultiplier(
  ball: BallId,
  target: CatchTarget,
  ctx: CatchContext
): number {
  switch (ball) {
    case 'pokeball':
      return 10;
    case 'greatball':
      return 15;
    case 'ultraball':
      return 20;
    case 'netball':
      return target.types.includes('Water') || target.types.includes('Bug')
        ? 30
        : 10;
    case 'diveball':
      return ctx.underwater ? 35 : 10;
    case 'nestball': {
      if (target.level >= 40) return 10;
      const m = u8(40 - target.level);
      return m <= 9 ? 10 : m;
    }
    case 'repeatball':
      return ctx.alreadyCaught ? 30 : 10;
    case 'timerball': {
      const m = u8(ctx.turnCounter + 10);
      return m > 40 ? 40 : m;
    }
    case 'luxuryball':
    case 'premierball':
      return 10;
    case 'masterball':
      // Unused: the Master Ball always catches.
      return 10;
  }
}

/** The modified catch rate `odds` before the shake computation. */
export function catchOdds(
  ball: BallId,
  target: CatchTarget,
  ctx: CatchContext
): number {
  const { catchRate, hp, maxHP, status } = target;
  if (!Number.isInteger(catchRate) || catchRate < 1 || catchRate > 255) {
    throw new Error(`catchOdds: invalid catch rate ${catchRate}`);
  }
  if (!Number.isInteger(maxHP) || maxHP < 1) {
    throw new Error(`catchOdds: invalid max HP ${maxHP}`);
  }
  if (!Number.isInteger(hp) || hp < 1 || hp > maxHP) {
    throw new Error(`catchOdds: invalid HP ${hp}/${maxHP}`);
  }
  const mult = ballMultiplier(ball, target, ctx);
  let odds = Math.trunc(
    (Math.trunc((catchRate * mult) / 10) * (maxHP * 3 - hp * 2)) / (3 * maxHP)
  );
  if (status === 'slp' || status === 'frz') odds *= 2;
  if (
    status === 'psn' ||
    status === 'tox' ||
    status === 'brn' ||
    status === 'par'
  ) {
    odds = Math.trunc((odds * 15) / 10);
  }
  return odds >>> 0;
}

/** Threshold each u16 random roll must be below for a shake check to pass. */
export function shakeThreshold(odds: number): number {
  if (odds <= 0) return 0;
  return Math.trunc(1048560 / isqrt(isqrt(Math.trunc(16711680 / odds))));
}

/**
 * Resolve a ball throw. `random` must return uniformly distributed integers
 * in [0, 65535]; it is only called when shake checks are needed, and at most
 * SHAKES_SUCCESS times, exactly like the game.
 */
export function throwBall(
  ball: BallId,
  target: CatchTarget,
  ctx: CatchContext,
  random: RandomU16
): CatchResult {
  if (ball === 'masterball') return { caught: true, shakes: SHAKES_SUCCESS };
  const odds = catchOdds(ball, target, ctx);
  if (odds > 254) return { caught: true, shakes: SHAKES_SUCCESS };
  const threshold = shakeThreshold(odds);
  let shakes = 0;
  while (shakes < SHAKES_SUCCESS) {
    const r = random();
    if (!Number.isInteger(r) || r < 0 || r > 0xffff) {
      throw new Error(`throwBall: random() returned non-u16 ${r}`);
    }
    if (!(r < threshold)) break;
    shakes++;
  }
  return { caught: shakes === SHAKES_SUCCESS, shakes };
}

/** Exact capture probability for a throw (for UI/testing). */
export function captureProbability(
  ball: BallId,
  target: CatchTarget,
  ctx: CatchContext
): number {
  if (ball === 'masterball') return 1;
  const odds = catchOdds(ball, target, ctx);
  if (odds > 254) return 1;
  const p = Math.min(shakeThreshold(odds), 65536) / 65536;
  return p ** SHAKES_SUCCESS;
}

/** Gen 3 break-free messages indexed by shake count (gBallEscapeStringIds). */
export const BREAK_FREE_MESSAGES = [
  'Oh, no! The POKéMON broke free!',
  'Aww! It appeared to be caught!',
  'Aargh! Almost had it!',
  'Shoot! It was so close, too!',
] as const;
