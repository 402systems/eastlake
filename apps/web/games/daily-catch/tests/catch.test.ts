import { describe, expect, it } from 'vitest';

import {
  ballMultiplier,
  captureProbability,
  catchOdds,
  isqrt,
  shakeThreshold,
  throwBall,
  type BallId,
  type CatchContext,
  type CatchTarget,
} from '@/lib/engine/catch';

const ctx: CatchContext = {
  turnCounter: 0,
  alreadyCaught: false,
  underwater: false,
};
const target = (over: Partial<CatchTarget> = {}): CatchTarget => ({
  catchRate: 45,
  level: 20,
  hp: 100,
  maxHP: 100,
  status: '',
  types: ['Normal'],
  ...over,
});

/** Deterministic u16 source replaying a fixed list. */
const replay = (values: number[]) => {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error('random() called too many times');
    return values[i++];
  };
};

/** mulberry32, for Monte Carlo checks. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) & 0xffff;
  };
}

describe('isqrt', () => {
  it('floors like the GBA BIOS Sqrt', () => {
    expect(isqrt(0)).toBe(0);
    expect(isqrt(16711680)).toBe(4087);
    expect(isqrt(4087)).toBe(63);
    expect(isqrt(4096)).toBe(64);
    expect(isqrt(4095)).toBe(63);
    expect(isqrt(2 ** 32 - 1)).toBe(65535);
  });
});

describe('catchOdds (pokeemerald Cmd_handleballthrow)', () => {
  // Expected values computed independently from the C expression:
  // odds = (catchRate * mult / 10) * (maxHP*3 - hp*2) / (3*maxHP), then status.
  it.each([
    ['full HP, Poké Ball', target(), 'pokeball', 15],
    ['1 HP, Poké Ball', target({ hp: 1 }), 'pokeball', 44],
    ['1 HP, Ultra Ball', target({ hp: 1 }), 'ultraball', 89],
    ['catch rate 3, full HP', target({ catchRate: 3 }), 'pokeball', 1],
    ['asleep doubles', target({ status: 'slp' }), 'pokeball', 30],
    ['frozen doubles', target({ status: 'frz' }), 'pokeball', 30],
    ['paralysis x1.5 floored', target({ status: 'par' }), 'pokeball', 22],
    ['poison x1.5 floored', target({ status: 'psn' }), 'pokeball', 22],
    ['toxic x1.5 floored', target({ status: 'tox' }), 'pokeball', 22],
    [
      'burn, Great Ball, 13/57 HP',
      target({ hp: 13, maxHP: 57, status: 'brn' }),
      'greatball',
      84,
    ],
    [
      'catch rate 3, 1/300 HP, asleep, Ultra',
      target({ catchRate: 3, hp: 1, maxHP: 300, status: 'slp' }),
      'ultraball',
      10,
    ],
    [
      'catch rate 255, 1 HP, Ultra',
      target({ catchRate: 255, hp: 1 }),
      'ultraball',
      506,
    ],
  ] as const)('%s', (_label, t, ball, expected) => {
    expect(catchOdds(ball as BallId, t, ctx)).toBe(expected);
  });

  it('rejects impossible inputs', () => {
    expect(() => catchOdds('pokeball', target({ hp: 0 }), ctx)).toThrow();
    expect(() => catchOdds('pokeball', target({ hp: 101 }), ctx)).toThrow();
    expect(() =>
      catchOdds('pokeball', target({ catchRate: 0 }), ctx)
    ).toThrow();
  });
});

describe('ballMultiplier', () => {
  it('matches sBallCatchBonuses and the special balls', () => {
    const t = target();
    expect(ballMultiplier('pokeball', t, ctx)).toBe(10);
    expect(ballMultiplier('greatball', t, ctx)).toBe(15);
    expect(ballMultiplier('ultraball', t, ctx)).toBe(20);
    expect(ballMultiplier('luxuryball', t, ctx)).toBe(10);
    expect(ballMultiplier('premierball', t, ctx)).toBe(10);
  });

  it('Net Ball: 3x on Water or Bug', () => {
    expect(ballMultiplier('netball', target({ types: ['Water'] }), ctx)).toBe(
      30
    );
    expect(
      ballMultiplier('netball', target({ types: ['Bug', 'Flying'] }), ctx)
    ).toBe(30);
    expect(ballMultiplier('netball', target({ types: ['Grass'] }), ctx)).toBe(
      10
    );
  });

  it('Dive Ball: 3.5x only underwater', () => {
    expect(ballMultiplier('diveball', target(), ctx)).toBe(10);
    expect(
      ballMultiplier('diveball', target(), { ...ctx, underwater: true })
    ).toBe(35);
  });

  it('Nest Ball: 40 - level, minimum 10', () => {
    expect(ballMultiplier('nestball', target({ level: 1 }), ctx)).toBe(39);
    expect(ballMultiplier('nestball', target({ level: 30 }), ctx)).toBe(10);
    expect(ballMultiplier('nestball', target({ level: 31 }), ctx)).toBe(10);
    expect(ballMultiplier('nestball', target({ level: 29 }), ctx)).toBe(11);
    expect(ballMultiplier('nestball', target({ level: 50 }), ctx)).toBe(10);
  });

  it('Repeat Ball: 3x if already caught', () => {
    expect(ballMultiplier('repeatball', target(), ctx)).toBe(10);
    expect(
      ballMultiplier('repeatball', target(), { ...ctx, alreadyCaught: true })
    ).toBe(30);
  });

  it('Timer Ball: turn counter + 10, capped at 40, with u8 wraparound', () => {
    expect(
      ballMultiplier('timerball', target(), { ...ctx, turnCounter: 0 })
    ).toBe(10);
    expect(
      ballMultiplier('timerball', target(), { ...ctx, turnCounter: 29 })
    ).toBe(39);
    expect(
      ballMultiplier('timerball', target(), { ...ctx, turnCounter: 30 })
    ).toBe(40);
    expect(
      ballMultiplier('timerball', target(), { ...ctx, turnCounter: 200 })
    ).toBe(40);
    // u8 ballMultiplier: 250 + 10 = 260 -> 4 (the game's overflow).
    expect(
      ballMultiplier('timerball', target(), { ...ctx, turnCounter: 250 })
    ).toBe(4);
  });
});

describe('shakeThreshold', () => {
  it.each([
    [1, 16643],
    [15, 32767],
    [22, 36157],
    [30, 38835],
    [44, 43690],
    [63, 47661],
    [84, 49931],
    [89, 52428],
    [254, 65535],
  ])('odds %i -> %i', (odds, expected) => {
    expect(shakeThreshold(odds)).toBe(expected);
  });
});

describe('throwBall', () => {
  it('odds > 254 catches without consuming randomness', () => {
    const r = throwBall(
      'ultraball',
      target({ catchRate: 255, hp: 1 }),
      ctx,
      replay([])
    );
    expect(r).toEqual({ caught: true, shakes: 4 });
  });

  it('Master Ball always catches', () => {
    const r = throwBall(
      'masterball',
      target({ catchRate: 3 }),
      ctx,
      replay([])
    );
    expect(r).toEqual({ caught: true, shakes: 4 });
  });

  it('counts passed checks as shakes, stopping at the first failure', () => {
    // threshold for full-HP 45 Poké Ball is 32767: a check passes iff r < 32767.
    const t = target();
    expect(throwBall('pokeball', t, ctx, replay([32767]))).toEqual({
      caught: false,
      shakes: 0,
    });
    expect(throwBall('pokeball', t, ctx, replay([0, 40000]))).toEqual({
      caught: false,
      shakes: 1,
    });
    expect(throwBall('pokeball', t, ctx, replay([0, 1, 50000]))).toEqual({
      caught: false,
      shakes: 2,
    });
    expect(throwBall('pokeball', t, ctx, replay([0, 1, 2, 32767]))).toEqual({
      caught: false,
      shakes: 3,
    });
    expect(throwBall('pokeball', t, ctx, replay([0, 1, 2, 32766]))).toEqual({
      caught: true,
      shakes: 4,
    });
  });

  it('rejects non-u16 randomness', () => {
    expect(() => throwBall('pokeball', target(), ctx, () => 65536)).toThrow();
  });

  it('Monte Carlo matches the closed form (threshold/65536)^4', () => {
    const t = target({ hp: 30, status: 'par' });
    const rng = mulberry32(12345);
    const n = 200_000;
    let caught = 0;
    for (let i = 0; i < n; i++)
      if (throwBall('greatball', t, ctx, rng).caught) caught++;
    const p = captureProbability('greatball', t, ctx);
    const sd = Math.sqrt((p * (1 - p)) / n);
    expect(Math.abs(caught / n - p)).toBeLessThan(5 * sd);
  });
});
