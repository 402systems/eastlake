import { Battle, extractChannelMessages } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';

import type { BallId } from './catch';
import {
  FORMAT_ID,
  attachWildState,
  canThrowBall,
  getWildState,
  throwMoveId,
  type WildBattleState,
} from './mod';
import { chooseWildMove } from './wildAI';

/** Showdown PRNG seed, e.g. "1,2,3,4" (Gen 5 RNG). */
export type Seed = `${number},${string}`;

export interface WildBattleConfig {
  seed: Seed;
  playerName: string;
  team: PokemonSet[];
  wild: PokemonSet;
  catchRate: number;
  balls: Partial<Record<BallId, number>>;
  alreadyCaught?: boolean;
}

export type PlayerAction =
  | { kind: 'move'; /** 1-based move slot */ slot: number }
  | {
      kind: 'switch';
      /** 1-based position in the request's party order */ slot: number;
    }
  | { kind: 'ball'; ball: BallId };

export type BattleResult =
  | { kind: 'ongoing' }
  | { kind: 'caught'; ball: BallId }
  | { kind: 'wildFainted' }
  | { kind: 'whiteout' }
  | { kind: 'fled'; by: 'p1' | 'p2'; move: string }
  | { kind: 'draw' };

export type FinalResult = Exclude<BattleResult, { kind: 'ongoing' }>;

export interface MoveOption {
  slot: number;
  name: string;
  id: string;
  pp: number | undefined;
  maxpp: number | undefined;
  disabled: boolean;
}

export interface SwitchOption {
  slot: number;
  name: string;
  species: string;
  level: number;
  condition: string;
  active: boolean;
  fainted: boolean;
}

export interface AvailableActions {
  /** 'move': full choice; 'switch': must replace a fainted Pokémon; 'none': waiting/ended. */
  mode: 'move' | 'switch' | 'none';
  moves: MoveOption[];
  switches: SwitchOption[];
  canSwitch: boolean;
  canThrow: boolean;
  balls: Partial<Record<BallId, number>>;
}

export class WildBattle {
  readonly battle: Battle;
  private readonly state: WildBattleState;
  private logCursor = 0;

  constructor(config: WildBattleConfig) {
    this.battle = new Battle({
      formatid: FORMAT_ID as never,
      seed: config.seed,
    });
    this.state = {
      balls: { ...config.balls },
      catchRate: config.catchRate,
      alreadyCaught: !!config.alreadyCaught,
      outcome: null,
    };
    attachWildState(this.battle, this.state);
    this.battle.setPlayer('p1', { name: config.playerName, team: config.team });
    this.battle.setPlayer('p2', { name: 'Wild', team: [config.wild] });
    this.advanceWild();
  }

  get balls(): Readonly<Partial<Record<BallId, number>>> {
    return getWildState(this.battle).balls;
  }

  get turn(): number {
    return this.battle.turn;
  }

  /** New omniscient protocol lines since the last call. */
  drainLog(): string[] {
    const fresh = this.battle.log.slice(this.logCursor);
    this.logCursor = this.battle.log.length;
    if (!fresh.length) return [];
    return extractChannelMessages(fresh.join('\n'), [-1])[-1];
  }

  result(): BattleResult {
    if (!this.battle.ended) return { kind: 'ongoing' };
    const outcome = this.state.outcome;
    if (outcome?.kind === 'caught')
      return { kind: 'caught', ball: outcome.ball };
    if (outcome?.kind === 'fled')
      return { kind: 'fled', by: outcome.by, move: outcome.move };
    if (this.battle.sides[1].pokemon[0].fainted) return { kind: 'wildFainted' };
    if (this.battle.sides[0].pokemon.every((p) => p.fainted))
      return { kind: 'whiteout' };
    return { kind: 'draw' };
  }

  available(): AvailableActions {
    const side = this.battle.sides[0];
    const request = this.battle.ended ? null : side.activeRequest;
    const balls = { ...this.state.balls };
    const none: AvailableActions = {
      mode: 'none',
      moves: [],
      switches: [],
      canSwitch: false,
      canThrow: false,
      balls,
    };
    if (!request || request.wait || request.teamPreview) return none;

    const switches: SwitchOption[] = request.side.pokemon.map((p, i) => ({
      slot: i + 1,
      name: p.ident.replace(/^p1: /, ''),
      species: p.details.split(',')[0],
      level: Number(/, L(\d+)/.exec(p.details)?.[1] ?? 100),
      condition: p.condition,
      active: p.active,
      fainted: p.condition.endsWith(' fnt'),
    }));

    if (request.forceSwitch) {
      return { ...none, mode: 'switch', switches, canSwitch: true };
    }

    const [active] = request.active;
    const moves: MoveOption[] = active.moves.map((m, i) => ({
      slot: i + 1,
      name: m.move,
      id: m.id,
      pp: m.pp,
      maxpp: m.maxpp,
      disabled: !!m.disabled,
    }));
    const hasBalls = Object.values(balls).some((n) => (n ?? 0) > 0);
    return {
      mode: 'move',
      moves,
      switches,
      canSwitch:
        !active.trapped && switches.some((s) => !s.active && !s.fainted),
      canThrow: hasBalls && canThrowBall(side.active[0]),
      balls,
    };
  }

  /** Submit the player's action; the wild Pokémon's move is chosen automatically. */
  choose(action: PlayerAction): { ok: true } | { ok: false; error: string } {
    if (this.battle.ended) return { ok: false, error: 'The battle is over.' };
    const choice =
      action.kind === 'move'
        ? `move ${action.slot}`
        : action.kind === 'switch'
          ? `switch ${action.slot}`
          : `move ${throwMoveId(action.ball)}`;
    const side = this.battle.sides[0];
    if (!this.battle.choose('p1', choice)) {
      const error = side.choice.error || `Invalid choice: ${choice}`;
      return { ok: false, error };
    }
    this.advanceWild();
    return { ok: true };
  }

  /** If the wild side owes a decision, make it (the turn then runs). */
  private advanceWild() {
    if (this.battle.ended) return;
    const wildSide = this.battle.sides[1];
    const request = wildSide.activeRequest;
    if (!request || request.wait || wildSide.isChoiceDone()) return;
    const choice = chooseWildMove(this.battle);
    if (!this.battle.choose('p2', choice)) {
      throw new Error(
        `Wild choice rejected: ${choice}: ${wildSide.choice.error}`
      );
    }
  }
}
