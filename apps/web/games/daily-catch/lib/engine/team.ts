import type { PokemonSet } from '@pkmn/sim';

const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

function mon(
  species: string,
  ability: string,
  gender: 'M' | 'F',
  moves: string[]
): PokemonSet {
  return {
    name: species,
    species,
    level: 50,
    ability,
    item: '',
    nature: 'Hardy',
    gender,
    moves,
    evs: { ...evs },
    ivs: { ...ivs },
    happiness: 255,
  } as PokemonSet;
}

/**
 * The fixed MVP team (Gen 3-legal; see tests/team.test.ts). It deliberately
 * has no Roar, Whirlwind or Teleport, which would end a wild battle.
 */
export const SAMPLE_TEAM: readonly PokemonSet[] = [
  mon('Scyther', 'Swarm', 'M', [
    'falseswipe',
    'wingattack',
    'quickattack',
    'swordsdance',
  ]),
  mon('Parasect', 'Effect Spore', 'M', [
    'spore',
    'stunspore',
    'leechlife',
    'slash',
  ]),
  mon('Gardevoir', 'Synchronize', 'F', [
    'hypnosis',
    'psychic',
    'calmmind',
    'confusion',
  ]),
  mon('Swampert', 'Torrent', 'M', ['surf', 'mudshot', 'protect', 'takedown']),
  mon('Manectric', 'Static', 'M', [
    'thunderwave',
    'spark',
    'quickattack',
    'bite',
  ]),
  mon('Blaziken', 'Blaze', 'M', [
    'blazekick',
    'skyuppercut',
    'slash',
    'bulkup',
  ]),
];

export const cloneTeam = (): PokemonSet[] =>
  SAMPLE_TEAM.map((s) => ({
    ...s,
    moves: [...s.moves],
    evs: { ...s.evs },
    ivs: { ...s.ivs },
  }));
