import { describe, expect, it } from 'vitest';

import { set, stable, wildBattle } from './helpers';

const p1 = (b: ReturnType<typeof wildBattle>) => b.battle.sides[0].active[0];
const p2 = (b: ReturnType<typeof wildBattle>) => b.battle.sides[1].active[0];

/** A harmless wild Pokémon so its own actions don't interfere. */
const splashWild = (over = {}) =>
  set('Magikarp', 5, ['splash'], { ability: 'Swift Swim', ...over });

function throwAndGetLog(
  b: ReturnType<typeof wildBattle>,
  ball: 'pokeball' | 'ultraball' = 'pokeball'
) {
  b.drainLog();
  const res = b.choose({ kind: 'ball', ball });
  expect(res).toEqual({ ok: true });
  return b.drainLog();
}

describe('ball throws bypass move restrictions', () => {
  const throwsCleanly = (log: string[]) => {
    expect(log.some((l) => l.startsWith('|ballthrow|p1a: '))).toBe(true);
    expect(log.some((l) => l.startsWith('|cant|p1a: '))).toBe(false);
    expect(log.some((l) => l.startsWith('|move|p1a: '))).toBe(false);
  };

  it('while asleep, without advancing the sleep counter', () => {
    const b = wildBattle({ wild: splashWild(), catchRate: 3 });
    p1(b).setStatus('slp');
    const before = { ...p1(b).statusState };
    expect(before.time).toBeGreaterThan(0);
    throwsCleanly(throwAndGetLog(b));
    expect(p1(b).status).toBe('slp');
    expect(p1(b).statusState.time).toBe(before.time);
  });

  it('while paralyzed', () => {
    const b = wildBattle({ wild: splashWild(), catchRate: 3 });
    p1(b).setStatus('par');
    throwsCleanly(throwAndGetLog(b));
  });

  it('while frozen', () => {
    const b = wildBattle({ wild: splashWild(), catchRate: 3 });
    p1(b).setStatus('frz');
    throwsCleanly(throwAndGetLog(b));
  });

  it('while confused, without advancing confusion', () => {
    const b = wildBattle({ wild: splashWild(), catchRate: 3 });
    p1(b).addVolatile('confusion');
    const time = p1(b).volatiles['confusion'].time;
    expect(time).toBeGreaterThan(0);
    throwsCleanly(throwAndGetLog(b));
    expect(p1(b).volatiles['confusion'].time).toBe(time);
  });

  it('while flinched', () => {
    const b = wildBattle({ wild: splashWild(), catchRate: 3 });
    p1(b).addVolatile('flinch');
    throwsCleanly(throwAndGetLog(b));
  });

  it('while taunted', () => {
    const b = wildBattle({ wild: splashWild(), catchRate: 3 });
    p1(b).addVolatile('taunt');
    throwsCleanly(throwAndGetLog(b));
  });

  it('while a move is disabled', () => {
    const b = wildBattle({
      wild: set('Kecleon', 20, ['disable', 'splash'], {
        ability: 'Color Change',
      }),
      catchRate: 3,
    });
    // Use Headbutt, then let Kecleon disable it.
    let disabled = false;
    for (let i = 0; i < 30 && !disabled; i++) {
      b.choose({ kind: 'move', slot: 4 }); // Tackle; Linoone outlevels Kecleon but won't KO quickly
      disabled = !!p1(b).volatiles['disable'];
      if (b.result().kind !== 'ongoing') break;
    }
    expect(disabled).toBe(true);
    throwsCleanly(throwAndGetLog(b));
  });

  it('while encored', () => {
    const b = wildBattle({ wild: splashWild(), catchRate: 3 });
    b.choose({ kind: 'move', slot: 3 }); // Growl, so Encore has a last move
    p1(b).addVolatile('encore');
    expect(p1(b).volatiles['encore']).toBeTruthy();
    const log = throwAndGetLog(b);
    throwsCleanly(log);
  });

  it('while choice-locked by Choice Band', () => {
    const b = wildBattle({
      wild: splashWild(),
      catchRate: 3,
      team: [
        set('Linoone', 30, ['headbutt', 'growl'], {
          ability: 'Pickup',
          item: 'Choice Band',
        }),
      ],
    });
    b.choose({ kind: 'move', slot: 2 }); // Growl locks in
    expect(b.available().moves.find((m) => m.id === 'headbutt')?.disabled).toBe(
      true
    );
    throwsCleanly(throwAndGetLog(b));
    // Still locked into Growl afterwards; the throw is not a move.
    expect(b.available().moves.find((m) => m.id === 'headbutt')?.disabled).toBe(
      true
    );
  });

  it('does not use PP or change the last move', () => {
    const b = wildBattle({ wild: splashWild(), catchRate: 3 });
    b.choose({ kind: 'move', slot: 3 });
    const pp = p1(b).moveSlots.map((s) => s.pp);
    const lastMove = p1(b).lastMove?.id;
    throwAndGetLog(b);
    expect(p1(b).moveSlots.map((s) => s.pp)).toEqual(pp);
    expect(p1(b).lastMove?.id).toBe(lastMove);
  });

  it('goes before the wild Pokémon, even a faster one using Quick Attack', () => {
    const b = wildBattle({
      wild: set('Taillow', 40, ['quickattack'], { ability: 'Guts' }),
      team: [set('Slakoth', 5, ['scratch'], { ability: 'Truant' })],
      catchRate: 3,
    });
    const log = throwAndGetLog(b);
    const throwIdx = log.findIndex((l) => l.startsWith('|ballthrow|'));
    const moveIdx = log.findIndex((l) => l.startsWith('|move|p2a: '));
    expect(throwIdx).toBeGreaterThanOrEqual(0);
    expect(moveIdx).toBeGreaterThan(throwIdx);
  });
});

describe('ball availability', () => {
  it('is refused while locked into a multi-turn move', () => {
    const b = wildBattle({
      wild: splashWild({ level: 40 }),
      team: [set('Dratini', 30, ['outrage'], { ability: 'Shed Skin' })],
      catchRate: 3,
    });
    b.choose({ kind: 'move', slot: 1 });
    if (p1(b).volatiles['lockedmove']) {
      expect(b.available().canThrow).toBe(false);
      const res = b.choose({ kind: 'ball', ball: 'pokeball' });
      expect(res.ok).toBe(false);
    } else {
      throw new Error('expected Outrage to lock Dratini in');
    }
  });

  it('is refused while recharging', () => {
    const b = wildBattle({
      wild: splashWild({ level: 100 }),
      team: [set('Linoone', 30, ['hyperbeam'], { ability: 'Pickup' })],
      catchRate: 3,
      seed: '5,6,7,8',
    });
    for (let i = 0; i < 10 && !p1(b).volatiles['mustrecharge']; i++)
      b.choose({ kind: 'move', slot: 1 });
    expect(p1(b).volatiles['mustrecharge']).toBeTruthy();
    expect(b.available().canThrow).toBe(false);
    expect(b.choose({ kind: 'ball', ball: 'pokeball' }).ok).toBe(false);
  });

  it('is refused when out of that ball', () => {
    const b = wildBattle({
      wild: splashWild(),
      catchRate: 3,
      balls: { pokeball: 1 },
    });
    expect(b.choose({ kind: 'ball', ball: 'pokeball' })).toEqual({ ok: true });
    expect(b.balls.pokeball).toBe(0);
    expect(b.available().canThrow).toBe(false);
    const res = b.choose({ kind: 'ball', ball: 'pokeball' });
    expect(res.ok).toBe(false);
    expect(b.choose({ kind: 'ball', ball: 'ultraball' }).ok).toBe(false);
  });

  it('cannot be used by the wild side', () => {
    const b = wildBattle({ wild: splashWild(), catchRate: 3 });
    // The wild side has already chosen for this turn; undo and try a throw.
    b.battle.sides[1].clearChoice();
    expect(b.battle.choose('p2', 'move throwpokeball')).toBe(false);
  });
});

describe('capture outcomes', () => {
  it('catches immediately when odds exceed 254, before the wild moves', () => {
    const b = wildBattle({ catchRate: 255, balls: { ultraball: 1 } });
    p2(b).sethp(1);
    const log = throwAndGetLog(b, 'ultraball');
    expect(log.find((l) => l.startsWith('|ballthrow|'))).toBe(
      '|ballthrow|p1a: Linoone|p2a: Zigzagoon|ultraball|4|caught'
    );
    expect(log.some((l) => l.startsWith('|move|p2a: '))).toBe(false);
    expect(b.result()).toEqual({ kind: 'caught', ball: 'ultraball' });
    expect(b.available().mode).toBe('none');
    expect(b.choose({ kind: 'move', slot: 1 }).ok).toBe(false);
  });

  it('a failed throw still lets end-of-turn effects (poison) happen', () => {
    const b = wildBattle({ wild: splashWild(), catchRate: 3 });
    p2(b).setStatus('psn');
    const log = throwAndGetLog(b);
    expect(log.find((l) => l.startsWith('|ballthrow|'))).toMatch(/\|escaped$/);
    expect(log.some((l) => l.startsWith('|move|p2a: Magikarp|Splash'))).toBe(
      true
    );
    expect(
      log.some((l) => /^\|-damage\|p2a: Magikarp\|.*\|\[from\] psn$/.test(l))
    ).toBe(true);
  });

  it('knocking out the wild Pokémon fails the challenge', () => {
    const b = wildBattle({ wild: splashWild({ level: 2 }), catchRate: 3 });
    for (let i = 0; i < 10 && b.result().kind === 'ongoing'; i++)
      b.choose({ kind: 'move', slot: 1 });
    expect(b.result()).toEqual({ kind: 'wildFainted' });
  });

  it('losing every Pokémon is a whiteout', () => {
    const b = wildBattle({
      wild: set('Metagross', 70, ['meteormash'], { ability: 'Clear Body' }),
      team: [set('Wurmple', 2, ['stringshot'], { ability: 'Shield Dust' })],
      catchRate: 3,
    });
    for (let i = 0; i < 10 && b.result().kind === 'ongoing'; i++)
      b.choose({ kind: 'move', slot: 1 });
    expect(b.result()).toEqual({ kind: 'whiteout' });
  });

  it('asks for a replacement after the active Pokémon faints, and refuses throws then', () => {
    const b = wildBattle({
      wild: set('Metagross', 70, ['meteormash'], { ability: 'Clear Body' }),
      team: [
        set('Wurmple', 2, ['stringshot'], { ability: 'Shield Dust' }),
        set('Linoone', 30, ['headbutt'], { ability: 'Pickup' }),
      ],
      catchRate: 3,
    });
    b.choose({ kind: 'move', slot: 1 });
    const avail = b.available();
    expect(avail.mode).toBe('switch');
    expect(avail.canThrow).toBe(false);
    expect(b.choose({ kind: 'ball', ball: 'pokeball' }).ok).toBe(false);
    const target = avail.switches.find((s) => !s.fainted && !s.active)!;
    expect(b.choose({ kind: 'switch', slot: target.slot })).toEqual({
      ok: true,
    });
    expect(b.available().mode).toBe('move');
    expect(p1(b).species.name).toBe('Linoone');
  });

  it('is deterministic for a given seed', () => {
    const run = () => {
      const b = wildBattle({
        wild: set('Zigzagoon', 12, ['tackle', 'growl', 'tailwhip', 'headbutt']),
        catchRate: 255,
      });
      const log: string[] = [];
      for (let i = 0; i < 6 && b.result().kind === 'ongoing'; i++) {
        b.choose(
          i % 2 ? { kind: 'ball', ball: 'pokeball' } : { kind: 'move', slot: 3 }
        );
        log.push(...b.drainLog());
      }
      return stable(log);
    };
    expect(run()).toEqual(run());
  });
});

describe('Gen 3 wild-battle move effects', () => {
  it('Roar from a higher-level Pokémon ends the battle', () => {
    const b = wildBattle({
      team: [set('Poochyena', 30, ['roar'], { ability: 'Run Away' })],
      wild: splashWild({ level: 5 }),
      catchRate: 3,
    });
    b.choose({ kind: 'move', slot: 1 });
    expect(b.result()).toEqual({ kind: 'fled', by: 'p1', move: 'Roar' });
    expect(
      b.drainLog().some((l) => l.startsWith('|wildflee|p2a: Magikarp|Roar'))
    ).toBe(true);
  });

  it('Roar fails against Suction Cups', () => {
    const b = wildBattle({
      team: [set('Poochyena', 30, ['roar'], { ability: 'Run Away' })],
      wild: set('Lileep', 5, ['constrict'], { ability: 'Suction Cups' }),
      catchRate: 3,
    });
    b.choose({ kind: 'move', slot: 1 });
    expect(b.result()).toEqual({ kind: 'ongoing' });
    expect(b.drainLog().some((l) => l.includes('Suction Cups'))).toBe(true);
  });

  it('Whirlwind from a lower-level Pokémon sometimes fails (level roll)', () => {
    let fled = 0;
    let failed = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const b = wildBattle({
        seed: `${seed},${seed * 7},${seed * 13},${seed * 31}`,
        team: [set('Pidgey', 5, ['whirlwind'], { ability: 'Keen Eye' })],
        wild: splashWild({ level: 100 }),
        catchRate: 3,
      });
      b.choose({ kind: 'move', slot: 1 });
      if (b.result().kind === 'fled') fled++;
      else failed++;
    }
    // Fails iff ((r * 105) >> 8) + 1 <= 25, i.e. r <= 60 of 256: ~24% fail.
    expect(fled).toBeGreaterThan(0);
    expect(failed).toBeGreaterThan(0);
  });

  it('a wild Teleport ends the battle', () => {
    const b = wildBattle({
      wild: set('Abra', 5, ['teleport'], { ability: 'Synchronize' }),
      catchRate: 3,
    });
    b.choose({ kind: 'move', slot: 3 });
    expect(b.result()).toEqual({ kind: 'fled', by: 'p2', move: 'Teleport' });
  });

  it('Teleport fails under Mean Look', () => {
    const b = wildBattle({
      team: [
        set('Umbreon', 30, ['meanlook', 'growl'], { ability: 'Synchronize' }),
      ],
      wild: set('Abra', 5, ['teleport'], { ability: 'Synchronize' }),
      catchRate: 3,
    });
    // Umbreon (L30) outspeeds Abra (L5), so Mean Look lands before Teleport.
    expect(p1(b).getStat('spe')).toBeGreaterThan(p2(b).getStat('spe'));
    b.choose({ kind: 'move', slot: 1 });
    expect(p2(b).volatiles['trapped']).toBeTruthy();
    expect(b.result()).toEqual({ kind: 'ongoing' });
    b.choose({ kind: 'move', slot: 2 });
    expect(b.result()).toEqual({ kind: 'ongoing' });
  });

  it('Teleport fails against Shadow Tag', () => {
    const b = wildBattle({
      team: [set('Wobbuffet', 30, ['counter'], { ability: 'Shadow Tag' })],
      wild: set('Abra', 5, ['teleport'], { ability: 'Synchronize' }),
      catchRate: 3,
    });
    b.choose({ kind: 'move', slot: 1 });
    expect(b.result()).toEqual({ kind: 'ongoing' });
    expect(b.drainLog().some((l) => l.includes('Shadow Tag'))).toBe(true);
  });
});

describe('wild move choice', () => {
  it('never picks a move with no PP and uses Struggle when nothing is left', () => {
    const b = wildBattle({
      wild: set('Magikarp', 30, ['splash', 'tackle'], {
        ability: 'Swift Swim',
      }),
      team: [set('Shuckle', 50, ['withdraw'], { ability: 'Sturdy' })],
      catchRate: 3,
    });
    const splash = p2(b).moveSlots[0];
    splash.pp = 0;
    const log: string[] = [];
    for (let i = 0; i < 5; i++) {
      b.choose({ kind: 'move', slot: 1 });
      log.push(...b.drainLog());
    }
    expect(log.some((l) => l.startsWith('|move|p2a: Magikarp|Splash'))).toBe(
      false
    );
    expect(log.some((l) => l.startsWith('|move|p2a: Magikarp|Tackle'))).toBe(
      true
    );
    // The wild has already picked this turn's move; Struggle is chosen from the next turn on.
    p2(b).moveSlots[1].pp = 0;
    const after: string[] = [];
    for (let i = 0; i < 2; i++) {
      b.choose({ kind: 'move', slot: 1 });
      after.push(...b.drainLog());
    }
    expect(
      after.some((l) => l.startsWith('|move|p2a: Magikarp|Struggle'))
    ).toBe(true);
  });

  it('picks uniformly among usable moves', () => {
    const counts: Record<string, number> = {};
    for (let seed = 1; seed <= 400; seed++) {
      const b = wildBattle({
        seed: `${seed},${seed * 3},${seed * 5},${seed * 11}`,
        wild: set(
          'Zigzagoon',
          5,
          ['growl', 'tailwhip', 'sandattack', 'splash'],
          { ability: 'Pickup' }
        ),
        team: [set('Shuckle', 50, ['withdraw'], { ability: 'Sturdy' })],
        catchRate: 3,
      });
      b.choose({ kind: 'move', slot: 1 });
      const line = b.drainLog().find((l) => l.startsWith('|move|p2a: '))!;
      const move = line.split('|')[3];
      counts[move] = (counts[move] ?? 0) + 1;
    }
    expect(Object.keys(counts).sort()).toEqual([
      'Growl',
      'Sand Attack',
      'Splash',
      'Tail Whip',
    ]);
    for (const n of Object.values(counts)) expect(n).toBeGreaterThan(60); // expected 100 each
  });
});

describe('PP', () => {
  it('uses base PP (no PP Ups)', () => {
    const b = wildBattle();
    expect(b.available().moves.map((m) => [m.id, m.maxpp])).toEqual([
      ['headbutt', 15],
      ['sandattack', 15],
      ['growl', 40],
      ['tackle', 35],
    ]);
  });
});
