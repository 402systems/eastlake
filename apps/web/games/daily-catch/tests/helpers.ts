import type { PokemonSet } from '@pkmn/sim';

import '@/lib/engine/mod';
import { WildBattle, type WildBattleConfig } from '@/lib/engine/battle';

const zero = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const max = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

export function set(
  species: string,
  level: number,
  moves: string[],
  over: Partial<PokemonSet> = {}
): PokemonSet {
  return {
    name: species,
    species,
    level,
    moves,
    item: '',
    ability: '',
    nature: 'Hardy',
    gender: '',
    evs: { ...zero },
    ivs: { ...max },
    ...over,
  } as PokemonSet;
}

export function wildBattle(over: Partial<WildBattleConfig> = {}): WildBattle {
  return new WildBattle({
    seed: '1,2,3,4',
    playerName: 'Player',
    team: [
      set('Linoone', 30, ['headbutt', 'sandattack', 'growl', 'tackle'], {
        ability: 'Pickup',
      }),
    ],
    wild: set('Zigzagoon', 5, ['tackle', 'growl'], { ability: 'Pickup' }),
    catchRate: 255,
    balls: { pokeball: 5 },
    ...over,
  });
}

/** Protocol lines without timestamps, for stable comparisons. */
export const stable = (lines: string[]) =>
  lines.filter((l) => !l.startsWith('|t:|'));
