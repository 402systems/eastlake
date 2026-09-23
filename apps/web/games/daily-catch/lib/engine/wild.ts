/**
 * Gen 3 wild Pokémon generation, following pokeemerald's CreateWildMon /
 * CreateMonWithNature / CreateBoxMon / GiveBoxMonInitialMoveset, without
 * lead-Pokémon effects (Synchronize, Cute Charm) and without held items.
 */
import { Dex } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';

import learnsetsJson from '../data/level-up-learnsets.json';
import speciesJson from '../data/species.json';

export interface Gen3SpeciesData {
  catchRate: number;
  /** 0 = always male, 254 = always female, 255 = genderless, else female iff (pid & 0xFF) < ratio. */
  genderRatio: number;
  abilities: string[];
  friendship: number;
}

export const SPECIES_DATA = speciesJson as Record<string, Gen3SpeciesData>;
const LEARNSETS = learnsetsJson as unknown as Record<
  string,
  [number, string][]
>;

/** Showdown species IDs in National Dex order (#1-386). */
export const SPECIES_IDS: readonly string[] = Object.keys(SPECIES_DATA);

const gen3 = Dex.mod('gen3');

export const NATURES = [
  'Hardy',
  'Lonely',
  'Brave',
  'Adamant',
  'Naughty',
  'Bold',
  'Docile',
  'Relaxed',
  'Impish',
  'Lax',
  'Timid',
  'Hasty',
  'Serious',
  'Jolly',
  'Naive',
  'Modest',
  'Mild',
  'Quiet',
  'Bashful',
  'Rash',
  'Calm',
  'Gentle',
  'Sassy',
  'Careful',
  'Quirky',
] as const;

export function speciesData(id: string): Gen3SpeciesData {
  const data = SPECIES_DATA[id];
  if (!data) throw new Error(`No Gen 3 data for species ${id}`);
  return data;
}

/** GiveBoxMonInitialMoveset: the moves a wild Pokémon of this level knows. */
export function initialMoveset(speciesId: string, level: number): string[] {
  const learnset = LEARNSETS[speciesId];
  if (!learnset) throw new Error(`No Gen 3 learnset for ${speciesId}`);
  const moves: string[] = [];
  for (const [moveLevel, move] of learnset) {
    if (moveLevel > level) break;
    if (moves.includes(move)) continue; // MON_ALREADY_KNOWS_MOVE
    if (moves.length < 4) moves.push(move);
    else {
      moves.shift(); // DeleteFirstMoveAndGiveMoveToBoxMon
      moves.push(move);
    }
  }
  return moves;
}

export interface WildMon {
  set: PokemonSet;
  personality: number;
  shiny: boolean;
}

/**
 * Create a wild Pokémon. `random16` must return uniform integers in
 * [0, 65535] (the game's Random()); `otId` is the player's 32-bit trainer ID
 * (used only for shininess).
 */
export function createWildMon(
  speciesId: string,
  level: number,
  random16: () => number,
  otId: number
): WildMon {
  const species = gen3.species.get(speciesId);
  if (!species.exists || species.num < 1 || species.num > 386) {
    throw new Error(`Not a Gen 3 species: ${speciesId}`);
  }
  if (!Number.isInteger(level) || level < 1 || level > 100)
    throw new Error(`Invalid level ${level}`);
  const data = speciesData(species.id);

  // PickWildMonNature: Random() % NUM_NATURES
  const nature = random16() % 25;
  // CreateMonWithNature: reroll personality until it has that nature.
  let pid: number;
  do {
    pid = (random16() | (random16() << 16)) >>> 0;
  } while (pid % 25 !== nature);

  // CreateBoxMon, USE_RANDOM_IVS: two Random() calls, 5 bits per stat.
  const a = random16();
  const b = random16();
  const ivs = {
    hp: a & 31,
    atk: (a >> 5) & 31,
    def: (a >> 10) & 31,
    spe: b & 31,
    spa: (b >> 5) & 31,
    spd: (b >> 10) & 31,
  };

  const ratio = data.genderRatio;
  const gender =
    ratio === 255
      ? 'N'
      : ratio === 0
        ? 'M'
        : ratio === 254
          ? 'F'
          : ratio > (pid & 0xff)
            ? 'F'
            : 'M';
  const ability =
    data.abilities[1] && pid & 1 ? data.abilities[1] : data.abilities[0];
  const shiny =
    ((otId >>> 16) ^ (otId & 0xffff) ^ (pid >>> 16) ^ (pid & 0xffff)) >>> 0 < 8;

  // Emerald's Deoxys is always in its Speed Forme.
  const battleSpecies = species.id === 'deoxys' ? 'Deoxys-Speed' : species.name;

  return {
    personality: pid,
    shiny,
    set: {
      name: species.name,
      species: battleSpecies,
      level,
      moves: initialMoveset(species.id, level),
      ability,
      item: '',
      nature: NATURES[nature],
      gender,
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs,
      happiness: data.friendship,
      shiny,
    } as PokemonSet,
  };
}
