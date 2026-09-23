import { describe, expect, it } from 'vitest';

import {
  EMPTY_SCENE,
  StepBuilder,
  applyStep,
  hpBar,
  parseCondition,
  parseDetails,
  type Step,
} from '@/lib/anim/steps';

import { set, wildBattle } from './helpers';

const texts = (steps: Step[]) =>
  steps.flatMap((s) =>
    s.kind === 'ball'
      ? [s.throwText, s.resultText]
      : 'text' in s && s.text
        ? [s.text]
        : []
  );

describe('hpBar (GetHPBarLevel)', () => {
  it.each([
    [100, 100, 48, 'green'],
    [51, 100, 24, 'yellow'], // 24px is not > 24
    [52, 100, 24, 'yellow'],
    [53, 100, 25, 'green'],
    [20, 100, 9, 'red'], // 9px is not > 9
    [21, 100, 10, 'yellow'],
    [1, 500, 1, 'red'], // rounds up to 1px while alive
    [0, 100, 0, 'empty'],
  ])('%i/%i -> %ipx %s', (hp, max, px, color) => {
    expect(hpBar(hp, max)).toEqual({ pixels: px, color });
  });
});

describe('protocol parsing', () => {
  it('parses conditions and details', () => {
    expect(parseCondition('86/96 par')).toEqual({
      hp: 86,
      maxhp: 96,
      status: 'par',
      fainted: false,
    });
    expect(parseCondition('0 fnt', 96)).toEqual({
      hp: 0,
      maxhp: 96,
      status: '',
      fainted: true,
    });
    expect(parseDetails('Linoone, L30, M, shiny')).toEqual({
      species: 'Linoone',
      level: 30,
      gender: 'M',
      shiny: true,
    });
    expect(parseDetails('Magnemite, L20')).toEqual({
      species: 'Magnemite',
      level: 20,
      gender: '',
      shiny: false,
    });
  });
});

describe('StepBuilder', () => {
  it("capitalizes names before 's and restyles stat changes", () => {
    const b = wildBattle({
      wild: set('Magikarp', 5, ['splash'], { ability: 'Swift Swim' }),
      team: [set('Linoone', 30, ['growl', 'tailwhip'], { ability: 'Pickup' })],
      catchRate: 3,
    });
    const sb = new StepBuilder('Player');
    sb.build(b.drainLog());
    b.choose({ kind: 'move', slot: 1 });
    expect(texts(sb.build(b.drainLog()))).toContain(
      "Wild MAGIKARP's ATTACK fell!"
    );
  });

  it('opens with the wild Pokémon, then sends out the lead', () => {
    const b = wildBattle();
    const steps = new StepBuilder('Player').build(b.drainLog());
    expect(steps.map((s) => s.kind)).toEqual(['wildAppear', 'sendOut']);
    expect(texts(steps)).toEqual(['Wild ZIGZAGOON appeared!', 'Go! LINOONE!']);
  });

  it('writes Gen 3 style text for moves, status and ball throws', () => {
    const b = wildBattle({
      wild: set('Magikarp', 5, ['splash'], { ability: 'Swift Swim' }),
      team: [set('Linoone', 30, ['thunderwave'], { ability: 'Pickup' })],
      catchRate: 3,
    });
    const sb = new StepBuilder('Player');
    sb.build(b.drainLog());
    b.choose({ kind: 'move', slot: 1 });
    const t1 = texts(sb.build(b.drainLog()));
    expect(t1).toContain('LINOONE used THUNDER WAVE!');
    expect(t1.some((t) => t.startsWith('Wild MAGIKARP is paralyzed!'))).toBe(
      true
    );
    expect(t1.some((t) => t.startsWith('Wild MAGIKARP used SPLASH!'))).toBe(
      true
    );
    expect(t1.every((t) => !/Magikarp|Linoone/.test(t))).toBe(true);
    for (const t of t1) expect(t).not.toMatch(/opposing|\*\*|\(|%/);

    b.choose({ kind: 'ball', ball: 'pokeball' });
    const steps = sb.build(b.drainLog());
    const ball = steps.find((s) => s.kind === 'ball');
    expect(ball).toMatchObject({
      kind: 'ball',
      ball: 'pokeball',
      throwText: 'PLAYER used POKé BALL!',
    });
    if (ball?.kind === 'ball' && !ball.caught) {
      expect(ball.resultText).toBe(
        [
          'Oh, no! The POKéMON broke free!',
          'Aww! It appeared to be caught!',
          'Aargh! Almost had it!',
          'Shoot! It was so close, too!',
        ][ball.shakes]
      );
    }
  });

  it('tracks HP, faint and recall/send-out through the scene reducer', () => {
    const b = wildBattle({
      wild: set('Metagross', 70, ['meteormash'], { ability: 'Clear Body' }),
      team: [
        set('Wurmple', 2, ['stringshot'], { ability: 'Shield Dust' }),
        set('Linoone', 30, ['headbutt'], { ability: 'Pickup' }),
      ],
      catchRate: 3,
    });
    const sb = new StepBuilder('Player');
    let scene = sb.build(b.drainLog()).reduce(applyStep, EMPTY_SCENE);
    expect(scene.player?.name).toBe('Wurmple');
    expect(scene.wildVisible && scene.playerVisible).toBe(true);
    b.choose({ kind: 'move', slot: 1 });
    const steps = sb.build(b.drainLog());
    scene = steps.reduce(applyStep, scene);
    expect(steps.some((s) => s.kind === 'faint' && s.side === 'player')).toBe(
      true
    );
    expect(scene.player?.fainted).toBe(true);
    expect(scene.playerVisible).toBe(false);
    b.choose({ kind: 'switch', slot: 2 });
    const next = sb.build(b.drainLog());
    expect(next[0]).toMatchObject({ kind: 'sendOut', text: 'Go! LINOONE!' });
    expect(next.some((s) => s.kind === 'recall')).toBe(false); // fainted Pokémon aren't recalled
    scene = next.reduce(applyStep, scene);
    expect(scene.player?.name).toBe('Linoone');
    expect(scene.playerVisible).toBe(true);
  });

  it('recalls on a voluntary switch', () => {
    const b = wildBattle({
      wild: set('Magikarp', 5, ['splash'], { ability: 'Swift Swim' }),
      team: [
        set('Linoone', 30, ['growl'], { ability: 'Pickup' }),
        set('Wurmple', 5, ['tackle'], { ability: 'Shield Dust' }),
      ],
      catchRate: 3,
    });
    const sb = new StepBuilder('Player');
    sb.build(b.drainLog());
    b.choose({ kind: 'switch', slot: 2 });
    const t = texts(sb.build(b.drainLog()));
    expect(t.slice(0, 2)).toEqual(['LINOONE, come back!', 'Go! WURMPLE!']);
  });

  it('catch hides the wild Pokémon', () => {
    const b = wildBattle({ catchRate: 255, balls: { ultraball: 1 } });
    b.battle.sides[1].active[0].sethp(1);
    const sb = new StepBuilder('Player');
    let scene = sb.build(b.drainLog()).reduce(applyStep, EMPTY_SCENE);
    b.choose({ kind: 'ball', ball: 'ultraball' });
    const steps = sb.build(b.drainLog());
    expect(steps).toEqual([
      expect.objectContaining({
        kind: 'ball',
        caught: true,
        shakes: 4,
        resultText: 'Gotcha! ZIGZAGOON was caught!',
      }),
    ]);
    scene = steps.reduce(applyStep, scene);
    expect(scene.wildVisible).toBe(false);
  });
});
