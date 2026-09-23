/**
 * `gen3wild`: a Pokémon Showdown mod that layers Gen 3 wild-battle rules on
 * top of Showdown's `gen3` mod.
 *
 * - Ball throws: the player may choose `move throw<ballid>` (e.g.
 *   `move throwpokeball`). The throw is resolved before any move (bag items
 *   act first in Gen 3), skips every move-related check (sleep, paralysis,
 *   confusion, flinch, Taunt, Disable, Encore, Choice Band, PP, last move),
 *   and uses the Gen 3 capture algorithm in ./catch.ts.
 * - Roar / Whirlwind end a wild battle (with Gen 3's level check) instead of
 *   forcing a switch; Teleport lets the user flee (pokeemerald
 *   Cmd_forcerandomswitch / TryDoForceSwitchOut, BattleScript_EffectTeleport,
 *   IsRunningFromBattleImpossible).
 */
import { Dex, Side, toID } from '@pkmn/sim';
import type { Battle, ModData, Pokemon } from '@pkmn/sim';

import { throwBall, type BallId, type MajorStatus } from './catch';

export const MOD_ID = 'gen3wild';
export const FORMAT_NAME = '[Gen 3] Wild Catch';
export const FORMAT_ID = 'gen3wildcatch';

export const THROWABLE_BALLS: readonly BallId[] = [
  'pokeball',
  'greatball',
  'ultraball',
  'masterball',
  'netball',
  'nestball',
  'timerball',
  'repeatball',
  'luxuryball',
  'premierball',
  'diveball',
];

export const throwMoveId = (ball: BallId) => `throw${ball}`;

export function ballForMoveId(id: string): BallId | null {
  if (!id.startsWith('throw')) return null;
  const ball = id.slice('throw'.length) as BallId;
  return THROWABLE_BALLS.includes(ball) ? ball : null;
}

export type WildOutcome =
  | { kind: 'caught'; ball: BallId }
  /** Roar/Whirlwind/Teleport ended the battle. `by` is the side whose Pokémon used the move. */
  | { kind: 'fled'; by: 'p1' | 'p2'; move: string };

export interface WildBattleState {
  /** Remaining balls; only the player (p1) throws. */
  balls: Partial<Record<BallId, number>>;
  /** Catch rate of the wild species (from pokeemerald). */
  catchRate: number;
  /** For the Repeat Ball. */
  alreadyCaught: boolean;
  outcome: WildOutcome | null;
}

const states = new WeakMap<Battle, WildBattleState>();

export function attachWildState(battle: Battle, state: WildBattleState) {
  states.set(battle, state);
}

export function getWildState(battle: Battle): WildBattleState {
  const state = states.get(battle);
  if (!state) throw new Error('gen3wild: battle has no wild state attached');
  return state;
}

/** Whether `pokemon` can use the bag this turn (not locked into a move). */
export function canThrowBall(pokemon: Pokemon): boolean {
  return (
    pokemon.isActive &&
    !pokemon.fainted &&
    !pokemon.getLockedMove() &&
    !pokemon.getSemiLockedMove()
  );
}

/**
 * Gen 3 IsRunningFromBattleImpossible for `mon`.
 * Returns null when escape is possible, otherwise why it is not.
 */
export function escapeBlocker(
  mon: Pokemon
):
  | null
  | { kind: 'ability'; ability: string; source: Pokemon }
  | { kind: 'forbidden' } {
  if (mon.hasItem('smokeball')) return null;
  if (mon.hasAbility('runaway')) return null;
  for (const foe of mon.foes()) {
    if (foe.hasAbility('shadowtag')) {
      return { kind: 'ability', ability: 'Shadow Tag', source: foe };
    }
    if (
      !mon.hasAbility('levitate') &&
      !mon.hasType('Flying') &&
      foe.hasAbility('arenatrap')
    ) {
      return { kind: 'ability', ability: 'Arena Trap', source: foe };
    }
  }
  if (mon.hasType('Steel')) {
    for (const other of mon.battle.getAllActive()) {
      if (other !== mon && other.hasAbility('magnetpull')) {
        return { kind: 'ability', ability: 'Magnet Pull', source: other };
      }
    }
  }
  if (
    mon.volatiles['trapped'] ||
    mon.volatiles['partiallytrapped'] ||
    mon.volatiles['ingrain']
  ) {
    return { kind: 'forbidden' };
  }
  return null;
}

function endByFlee(
  battle: Battle,
  user: Pokemon,
  fleeing: Pokemon,
  move: string
) {
  const state = getWildState(battle);
  state.outcome = { kind: 'fled', by: user.side.id as 'p1' | 'p2', move };
  battle.add('wildflee', fleeing, move);
  battle.win();
}

function resolveThrow(battle: Battle, thrower: Pokemon, ball: BallId) {
  const state = getWildState(battle);
  const wild = thrower.side.foe.active[0];
  if (!wild || wild.fainted)
    throw new Error('gen3wild: no wild Pokémon to throw at');
  const count = state.balls[ball] ?? 0;
  if (count <= 0) throw new Error(`gen3wild: no ${ball} left`);
  state.balls[ball] = count - 1;

  const result = throwBall(
    ball,
    {
      catchRate: state.catchRate,
      level: wild.level,
      hp: wild.hp,
      maxHP: wild.maxhp,
      status: wild.status as MajorStatus,
      types: wild.getTypes(),
    },
    {
      // gBattleResults.battleTurnCounter is 0 during the first turn.
      turnCounter: Math.min(battle.turn - 1, 255),
      alreadyCaught: state.alreadyCaught,
      underwater: false,
    },
    () => battle.random(65536)
  );
  battle.add(
    'ballthrow',
    thrower,
    wild,
    ball,
    `${result.shakes}`,
    result.caught ? 'caught' : 'escaped'
  );
  if (result.caught) {
    state.outcome = { kind: 'caught', ball };
    battle.win(thrower.side);
  }
}

const gen3Actions = Dex.mod('gen3').data.Scripts.actions ?? {};
if ('runMove' in gen3Actions) {
  // Our override delegates to BattleActions.prototype.runMove; if the gen3 mod
  // ever customises runMove we must delegate to that instead.
  throw new Error('gen3wild: gen3 mod overrides runMove; update the delegate');
}
const baseChooseMove = Side.prototype.chooseMove;

const moves: NonNullable<ModData['Moves']> = {};
for (const ball of THROWABLE_BALLS) {
  moves[throwMoveId(ball)] = {
    num: -1,
    name: `Throw ${ball}`,
    accuracy: true,
    basePower: 0,
    category: 'Status',
    pp: 1,
    // Bag actions happen before every move in Gen 3.
    priority: 7,
    flags: {},
    target: 'normal',
    type: '???',
    isNonstandard: 'Custom',
  };
}

Object.assign(moves, {
  roar: {
    inherit: true,
    forceSwitch: false,
    onTryHit(this: Battle, target: Pokemon, source: Pokemon, move: unknown) {
      // Suction Cups / Ingrain (their DragOut handlers print the message).
      if (!this.runEvent('DragOut', target, source, move as never)) return null;
    },
    onHit(this: Battle, target: Pokemon, source: Pokemon) {
      return wildForceOut(this, target, source, 'Roar');
    },
  },
  whirlwind: {
    inherit: true,
    forceSwitch: false,
    onTryHit(this: Battle, target: Pokemon, source: Pokemon, move: unknown) {
      if (!this.runEvent('DragOut', target, source, move as never)) return null;
    },
    onHit(this: Battle, target: Pokemon, source: Pokemon) {
      return wildForceOut(this, target, source, 'Whirlwind');
    },
  },
  teleport: {
    inherit: true,
    target: 'self',
    onTry(this: Battle, source: Pokemon) {
      const blocker = escapeBlocker(source);
      if (!blocker) return;
      if (blocker.kind === 'ability') {
        this.add(
          '-fail',
          source,
          'move: Teleport',
          `[from] ability: ${blocker.ability}`,
          `[of] ${blocker.source}`
        );
        return null;
      }
      return false;
    },
    onHit(this: Battle, pokemon: Pokemon) {
      endByFlee(this, pokemon, pokemon, 'Teleport');
    },
  },
});

/** pokeemerald TryDoForceSwitchOut, wild-battle branch. */
function wildForceOut(
  battle: Battle,
  target: Pokemon,
  source: Pokemon,
  move: string
) {
  if (source.level < target.level) {
    const random = battle.random(256);
    const roll = ((random * (source.level + target.level)) >> 8) + 1;
    if (roll <= Math.floor(target.level / 4)) return false;
  }
  endByFlee(battle, source, target, move);
}

const modData = {
  Scripts: {
    inherit: 'gen3',
    gen: 3,
    // Showdown assumes 3 PP Ups on every move; wild Pokémon (and our sample
    // team) have none, so PP is the move's base PP.
    calculatePP(move: { pp: number }) {
      return move.pp;
    },
    actions: {
      inherit: true,
      runMove(
        this: { battle: Battle },
        moveOrMoveName: { id: string } | string,
        pokemon: Pokemon,
        ...rest: unknown[]
      ) {
        const id =
          typeof moveOrMoveName === 'string'
            ? toID(moveOrMoveName)
            : moveOrMoveName.id;
        const ball = ballForMoveId(id);
        if (ball) return resolveThrow(this.battle, pokemon, ball);
        const base = Object.getPrototypeOf(this).runMove as (
          ...args: unknown[]
        ) => unknown;
        return base.call(this, moveOrMoveName, pokemon, ...rest);
      },
    },
    side: {
      chooseMove(
        this: Side,
        moveText?: string | number,
        targetLoc?: number,
        event?: string
      ) {
        const ball =
          typeof moveText === 'string' ? ballForMoveId(toID(moveText)) : null;
        if (!ball) {
          return (baseChooseMove as (...args: unknown[]) => boolean).call(
            this,
            moveText,
            targetLoc,
            event
          );
        }
        if (this.id !== 'p1')
          return this.emitChoiceError(
            `Can't throw: only the player can throw balls`
          );
        if (this.requestState !== 'move') {
          return this.emitChoiceError(
            `Can't throw: You need a ${this.requestState} response`
          );
        }
        const index = this.getChoiceIndex();
        if (index >= this.active.length) {
          return this.emitChoiceError(
            `Can't throw: You sent more choices than unfainted Pokémon.`
          );
        }
        const pokemon = this.active[index];
        if (!canThrowBall(pokemon)) {
          return this.emitChoiceError(
            `Can't throw: ${pokemon.name} must continue its move`
          );
        }
        if ((getWildState(this.battle).balls[ball] ?? 0) <= 0) {
          return this.emitChoiceError(`Can't throw: no ${ball} left`);
        }
        this.choice.actions.push({
          choice: 'move',
          pokemon,
          targetLoc: 0,
          moveid: throwMoveId(ball),
        } as never);
        return true;
      },
    },
  },
  Moves: moves,
  Formats: [
    {
      name: FORMAT_NAME,
      mod: MOD_ID,
      ruleset: [],
    },
  ],
};

function register() {
  if (MOD_ID in Dex.dexes) return;
  const { Formats, ...data } = modData;
  Dex.mod(MOD_ID, data as unknown as ModData);
  if (!Dex.formats.get(FORMAT_ID).exists) {
    Dex.formats.extend(Formats as never);
  }
}

register();
