/**
 * Turns Showdown protocol lines into a queue of presentation steps (text +
 * animation + scene update), and a pure reducer that applies them.
 *
 * Text comes from @pkmn/view's LogFormatter (Showdown's battle text), restyled
 * the Gen 3 way ("Wild ZIGZAGOON", names and moves in capitals), with the
 * messages that matter most (send-outs, ball throws) written by hand.
 */
import { Battle as ClientBattle } from '@pkmn/client';
import { Generations } from '@pkmn/data';
import { Protocol } from '@pkmn/protocol';
import { Dex } from '@pkmn/sim';
import { LogFormatter } from '@pkmn/view';

import { BALL_NAMES, BREAK_FREE_MESSAGES, type BallId } from '../engine/catch';

export type SideKey = 'player' | 'wild';

export interface MonView {
  ident: string;
  name: string;
  species: string;
  level: number;
  gender: '' | 'M' | 'F';
  shiny: boolean;
  hp: number;
  maxhp: number;
  status: string;
  fainted: boolean;
}

export interface Scene {
  player: MonView | null;
  wild: MonView | null;
  /** Whether the Pokémon is on the field (false while recalled / caught / fled). */
  playerVisible: boolean;
  wildVisible: boolean;
}

export const EMPTY_SCENE: Scene = {
  player: null,
  wild: null,
  playerVisible: false,
  wildVisible: false,
};

export type Step =
  | { kind: 'text'; text: string }
  | { kind: 'wildAppear'; mon: MonView; text: string }
  | { kind: 'recall'; text: string }
  | { kind: 'sendOut'; mon: MonView; text: string }
  | {
      kind: 'move';
      side: SideKey;
      target: SideKey | null;
      moveType: string;
      category: string;
      text: string;
    }
  | { kind: 'hp'; side: SideKey; hp: number; maxhp: number; text?: string }
  | { kind: 'status'; side: SideKey; status: string; text?: string }
  | { kind: 'faint'; side: SideKey; text?: string }
  | { kind: 'species'; side: SideKey; species: string; text?: string }
  | {
      kind: 'ball';
      ball: BallId;
      shakes: number;
      caught: boolean;
      throwText: string;
      resultText: string;
    }
  | { kind: 'flee'; side: SideKey; text?: string };

const gens = new Generations(Dex as never);
const gen3 = gens.get(3);

const sideOf = (ident: string): SideKey =>
  ident.startsWith('p1') ? 'player' : 'wild';

/** "96/96 par" | "0 fnt" -> hp, maxhp, status */
export function parseCondition(condition: string, prevMax = 0) {
  const [hpPart, status = ''] = condition.trim().split(' ');
  if (status === 'fnt' || hpPart === '0')
    return { hp: 0, maxhp: prevMax, status: '', fainted: true };
  const [hp, max] = hpPart.split('/').map(Number);
  return { hp, maxhp: max ?? prevMax, status, fainted: false };
}

/** "Linoone, L30, M, shiny" */
export function parseDetails(details: string) {
  const parts = details.split(', ');
  const species = parts[0];
  let level = 100;
  let gender: '' | 'M' | 'F' = '';
  let shiny = false;
  for (const p of parts.slice(1)) {
    if (/^L\d+$/.test(p)) level = Number(p.slice(1));
    else if (p === 'M' || p === 'F') gender = p;
    else if (p === 'shiny') shiny = true;
  }
  return { species, level, gender, shiny };
}

const GEN3_STATS: Record<string, string> = {
  Attack: 'ATTACK',
  Defense: 'DEFENSE',
  'Sp. Atk': 'SP. ATK',
  'Sp. Def': 'SP. DEF',
  'Special Attack': 'SP. ATK',
  'Special Defense': 'SP. DEF',
  Speed: 'SPEED',
  accuracy: 'accuracy',
  evasiveness: 'evasiveness',
};
const STAT_RE = Object.keys(GEN3_STATS).join('|').replace(/\./g, '\\.');

/** Showdown phrasing -> Gen 3 phrasing. */
const GEN3_WORDING: [RegExp, string | ((...m: string[]) => string)][] = [
  [
    new RegExp(`'s (${STAT_RE}) rose drastically!`),
    (_, s) => `'s ${GEN3_STATS[s]} sharply rose!`,
  ],
  [
    new RegExp(`'s (${STAT_RE}) rose sharply!`),
    (_, s) => `'s ${GEN3_STATS[s]} sharply rose!`,
  ],
  [new RegExp(`'s (${STAT_RE}) rose!`), (_, s) => `'s ${GEN3_STATS[s]} rose!`],
  [
    new RegExp(`'s (${STAT_RE}) fell severely!`),
    (_, s) => `'s ${GEN3_STATS[s]} harshly fell!`,
  ],
  [
    new RegExp(`'s (${STAT_RE}) fell harshly!`),
    (_, s) => `'s ${GEN3_STATS[s]} harshly fell!`,
  ],
  [new RegExp(`'s (${STAT_RE}) fell!`), (_, s) => `'s ${GEN3_STATS[s]} fell!`],
  [
    new RegExp(`'s (${STAT_RE}) won't go any higher!`),
    (_, s) => `'s ${GEN3_STATS[s]} won't go higher!`,
  ],
  [
    new RegExp(`'s (${STAT_RE}) won't go any lower!`),
    (_, s) => `'s ${GEN3_STATS[s]} won't go lower!`,
  ],
  [/^The Pokémon was hit (\d+) times?!$/, 'Hit $1 time(s)!'],
  [/^The sunlight turned harsh!$/, 'The sunlight got bright!'],
  [/^A critical hit!$/, 'A critical hit!'],
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class StepBuilder {
  private readonly tracker = new ClientBattle(gens);
  private readonly formatter = new LogFormatter('p1', this.tracker);
  private readonly names = new Set<string>();
  private readonly moveNames = new Set<string>();
  private readonly playerName: string;
  private active: Partial<Record<SideKey, MonView>> = {};
  private started = false;
  /** The player's first send-out waits for "Wild X appeared!", as in the games. */
  private deferredSendOut: Step | null = null;

  constructor(playerName: string) {
    this.playerName = playerName;
  }

  private monFromSwitch(
    ident: string,
    details: string,
    condition: string
  ): MonView {
    const d = parseDetails(details);
    const c = parseCondition(condition);
    const name = ident.replace(/^p\d[a-z]?: /, '');
    this.names.add(name);
    return {
      ident: ident.replace(/^(p\d)[a-z]:/, '$1:'),
      name,
      species: d.species,
      level: d.level,
      gender: d.gender,
      shiny: d.shiny,
      hp: c.hp,
      maxhp: c.maxhp,
      status: c.status,
      fainted: c.fainted,
    };
  }

  /** Name as the Gen 3 games print it. */
  private displayName(side: SideKey, name: string) {
    return side === 'wild' ? `Wild ${name.toUpperCase()}` : name.toUpperCase();
  }

  /** Restyle Showdown text as Gen 3 text; returns one entry per message. */
  private restyle(text: string): string[] {
    const words = [...this.names, ...this.moveNames]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegExp);
    const wordsRe = words.length
      ? new RegExp(`(?<![\\w'’])(${words.join('|')})(?!\\w)`, 'g')
      : null;
    const namesRe = this.names.size
      ? new RegExp(
          `\\b[Tt]he opposing (${[...this.names].map(escapeRegExp).join('|')})\\b`,
          'g'
        )
      : null;
    return (
      text
        .split('\n')
        .map((l) => l.trim())
        // Drop HP-percentage notes, turn headers and ability pop-ups ("[X's Ability]").
        .filter(
          (l) =>
            l &&
            !l.startsWith('(') &&
            !l.startsWith('==') &&
            !/^\[.*\]$/.test(l)
        )
        .map((l) => {
          let out = l
            .replace(/\*\*(.+?)\*\*/g, (_, m: string) => m.toUpperCase())
            .replace(/\|\|/g, '');
          if (namesRe) out = out.replace(namesRe, 'Wild $1');
          if (this.active.wild)
            out = out.replace(
              /\b[Tt]he opposing team\b/g,
              `Wild ${this.active.wild.name}'s team`
            );
          for (const [re, to] of GEN3_WORDING)
            out =
              typeof to === 'string'
                ? out.replace(re, to)
                : out.replace(re, to);
          if (wordsRe) out = out.replace(wordsRe, (w) => w.toUpperCase());
          return out;
        })
    );
  }

  /** Convert new protocol lines into steps. */
  build(lines: string[]): Step[] {
    const steps: Step[] = [];
    const say = (texts: string[]) => {
      for (const text of texts) steps.push({ kind: 'text', text });
    };

    for (const line of lines) {
      if (!line.startsWith('|') || line === '|' || line.startsWith('|t:|'))
        continue;
      const { args, kwArgs } = Protocol.parseBattleLine(line);
      const raw = line.slice(1).split('|');
      const cmd = raw[0];
      // Custom messages from the gen3wild mod aren't known to the formatter.
      const formatted =
        cmd === 'ballthrow' || cmd === 'wildflee'
          ? []
          : this.restyle(this.formatter.formatText(args, kwArgs));
      this.tracker.add(args, kwArgs);

      switch (cmd) {
        case 'switch':
        case 'drag': {
          const mon = this.monFromSwitch(raw[1], raw[2], raw[3]);
          const side = sideOf(raw[1]);
          if (side === 'wild') {
            this.active.wild = mon;
            steps.push({
              kind: 'wildAppear',
              mon,
              text: `${this.displayName('wild', mon.name)} appeared!`,
            });
            if (this.deferredSendOut) {
              steps.push(this.deferredSendOut);
              this.deferredSendOut = null;
            }
          } else {
            const prev = this.active.player;
            if (prev && !prev.fainted && this.started) {
              steps.push({
                kind: 'recall',
                text: `${prev.name.toUpperCase()}, come back!`,
              });
            }
            this.active.player = mon;
            const sendOut: Step = {
              kind: 'sendOut',
              mon,
              text: `Go! ${mon.name.toUpperCase()}!`,
            };
            if (!this.active.wild) this.deferredSendOut = sendOut;
            else steps.push(sendOut);
          }
          break;
        }
        case 'move': {
          const side = sideOf(raw[1]);
          const move = gen3.moves.get(raw[2]);
          if (move) this.moveNames.add(move.name);
          const target = raw[3] ? sideOf(raw[3]) : null;
          const [text, ...rest] = formatted;
          steps.push({
            kind: 'move',
            side,
            target: kwArgs && 'miss' in kwArgs ? null : target,
            moveType: move?.type ?? 'Normal',
            category: move?.category ?? 'Status',
            text: text ?? '',
          });
          say(rest);
          break;
        }
        case '-damage':
        case '-heal':
        case '-sethp': {
          const side = sideOf(raw[1]);
          const cur = this.active[side];
          const c = parseCondition(raw[2], cur?.maxhp ?? 0);
          if (cur) {
            cur.hp = c.hp;
            if (c.maxhp) cur.maxhp = c.maxhp;
          }
          steps.push({
            kind: 'hp',
            side,
            hp: c.hp,
            maxhp: c.maxhp || cur?.maxhp || 1,
          });
          say(formatted);
          break;
        }
        case '-status': {
          const side = sideOf(raw[1]);
          const cur = this.active[side];
          if (cur) cur.status = raw[2];
          steps.push({ kind: 'status', side, status: raw[2] });
          say(formatted);
          break;
        }
        case '-curestatus': {
          const side = sideOf(raw[1]);
          const cur = this.active[side];
          if (cur) cur.status = '';
          steps.push({ kind: 'status', side, status: '' });
          say(formatted);
          break;
        }
        case '-cureteam': {
          const side = sideOf(raw[1]);
          const cur = this.active[side];
          if (cur) cur.status = '';
          steps.push({ kind: 'status', side, status: '' });
          say(formatted);
          break;
        }
        case 'faint': {
          const side = sideOf(raw[1]);
          const cur = this.active[side];
          if (cur) {
            cur.fainted = true;
            cur.hp = 0;
          }
          steps.push({ kind: 'faint', side });
          say(formatted);
          break;
        }
        case '-formechange':
        case 'detailschange': {
          const side = sideOf(raw[1]);
          const species = raw[2].split(', ')[0];
          const cur = this.active[side];
          if (cur) cur.species = species;
          steps.push({ kind: 'species', side, species });
          say(formatted);
          break;
        }
        case '-transform': {
          const side = sideOf(raw[1]);
          const into = this.tracker.getPokemon(raw[2] as Protocol.PokemonIdent);
          const species =
            into?.speciesForme ?? raw[2].replace(/^p\d[a-z]?: /, '');
          const cur = this.active[side];
          if (cur) cur.species = species;
          steps.push({ kind: 'species', side, species });
          say(formatted);
          break;
        }
        case 'ballthrow': {
          const ball = raw[3] as BallId;
          const shakes = Number(raw[4]);
          const caught = raw[5] === 'caught';
          const wildName = this.active.wild?.name.toUpperCase() ?? 'POKéMON';
          steps.push({
            kind: 'ball',
            ball,
            shakes,
            caught,
            throwText: `${this.playerName.toUpperCase()} used ${BALL_NAMES[ball]}!`,
            resultText: caught
              ? `Gotcha! ${wildName} was caught!`
              : BREAK_FREE_MESSAGES[shakes],
          });
          break;
        }
        case 'wildflee': {
          const side = sideOf(raw[1]);
          const move = raw[2];
          const name = this.active[side]?.name.toUpperCase() ?? '';
          const text =
            move === 'Teleport'
              ? `${side === 'wild' ? `Wild ${name}` : name} fled from battle!`
              : side === 'wild'
                ? `Wild ${name} fled!`
                : `${name} was forced out of the battle!`;
          steps.push({ kind: 'flee', side, text });
          break;
        }
        case 'start':
          this.started = true;
          break;
        case 'turn':
        case 'upkeep':
        case 'win':
        case 'tie':
        case 'player':
        case 'teamsize':
        case 'gametype':
        case 'gen':
        case 'tier':
        case 'rule':
        case 'split':
          break;
        default:
          say(formatted);
      }
    }
    return steps;
  }
}

/** Scene reducer: the visual state after a step has fully played. */
export function applyStep(scene: Scene, step: Step): Scene {
  switch (step.kind) {
    case 'wildAppear':
      return { ...scene, wild: { ...step.mon }, wildVisible: true };
    case 'recall':
      return { ...scene, playerVisible: false };
    case 'sendOut':
      return { ...scene, player: { ...step.mon }, playerVisible: true };
    case 'hp': {
      const key = step.side;
      const mon = scene[key];
      if (!mon) return scene;
      return { ...scene, [key]: { ...mon, hp: step.hp, maxhp: step.maxhp } };
    }
    case 'status': {
      const mon = scene[step.side];
      if (!mon) return scene;
      return { ...scene, [step.side]: { ...mon, status: step.status } };
    }
    case 'faint': {
      const mon = scene[step.side];
      if (!mon) return scene;
      const next = {
        ...scene,
        [step.side]: { ...mon, hp: 0, fainted: true, status: '' },
      };
      return step.side === 'wild'
        ? { ...next, wildVisible: false }
        : { ...next, playerVisible: false };
    }
    case 'species': {
      const mon = scene[step.side];
      if (!mon) return scene;
      return { ...scene, [step.side]: { ...mon, species: step.species } };
    }
    case 'ball':
      return step.caught ? { ...scene, wildVisible: false } : scene;
    case 'flee':
      return step.side === 'wild'
        ? { ...scene, wildVisible: false }
        : { ...scene, playerVisible: false };
    default:
      return scene;
  }
}

/** Gen 3 HP bar: 48 pixels; green > 24px, yellow > 9px, else red (GetHPBarLevel). */
export function hpBar(
  hp: number,
  maxhp: number
): { pixels: number; color: 'green' | 'yellow' | 'red' | 'empty' } {
  if (maxhp <= 0) return { pixels: 0, color: 'empty' };
  if (hp >= maxhp) return { pixels: 48, color: 'green' };
  let pixels = Math.trunc((hp * 48) / maxhp);
  if (pixels === 0 && hp > 0) pixels = 1;
  const color =
    pixels > 24
      ? 'green'
      : pixels > 9
        ? 'yellow'
        : pixels > 0
          ? 'red'
          : 'empty';
  return { pixels, color };
}
