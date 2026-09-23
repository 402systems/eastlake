// Extracts Gen 3 data that Showdown doesn't carry from the pokeemerald
// decompilation (https://github.com/pret/pokeemerald):
//
//   lib/data/species.json              species id -> { catchRate, genderRatio, abilities, friendship }
//   lib/data/level-up-learnsets.json   species id -> [[level, move id], ...] in game order
//
// Everything is cross-checked against Showdown's Gen 3 data (@pkmn/sim): base
// stats, types, abilities, and that every level-up move is a known Gen 3
// level-up move at or below that level. The script fails loudly on any mismatch or gap.
//
// Usage: node scripts/extract-species-data.mjs [dir containing the .h files]

/* global process, console, fetch */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Dex } from '@pkmn/sim';
import * as prettier from 'prettier';

const BASE =
  'https://raw.githubusercontent.com/pret/pokeemerald/master/src/data/pokemon';
const FILES = [
  'species_info.h',
  'level_up_learnsets.h',
  'level_up_learnset_pointers.h',
];

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, '..', 'lib', 'data');

async function load(name) {
  if (process.argv[2]) return readFileSync(join(process.argv[2], name), 'utf8');
  const res = await fetch(`${BASE}/${name}`);
  if (!res.ok) throw new Error(`Fetching ${name}: HTTP ${res.status}`);
  return res.text();
}
const [speciesInfo, learnsetsSrc, pointersSrc] = await Promise.all(
  FILES.map(load)
);

const toID = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const typeName = (t) => t.charAt(0) + t.slice(1).toLowerCase();
/** pokeemerald move constants whose names differ from Showdown's. */
const MOVE_RENAMES = { SMELLING_SALT: 'smellingsalts' };

const gen3 = Dex.mod('gen3');
const errors = [];

/** SPECIES_FOO -> Showdown species (Gen 3, national dex 1-386), or null. */
function speciesFor(rawName) {
  if (
    rawName.startsWith('OLD_UNOWN') ||
    rawName === 'EGG' ||
    rawName === 'NONE'
  )
    return null;
  if (/^UNOWN_[A-Z]+$/.test(rawName)) return null; // cosmetic Unown forms share Unown's data
  const species = gen3.species.get(toID(rawName));
  if (
    !species?.exists ||
    species.num < 1 ||
    species.num > 386 ||
    species.forme
  ) {
    errors.push(`No Gen 3 Showdown species for SPECIES_${rawName}`);
    return null;
  }
  return species;
}

// --- Species data (and stat/type/ability cross-check) ---------------------------

/** pokeemerald genderRatio: 0 = always male, 254 = always female, 255 = genderless. */
function parseGenderRatio(body) {
  const m = body.match(/\.genderRatio\s*=\s*([A-Z_]+(?:\(([\d.]+)\))?)/);
  if (!m) return undefined;
  if (m[1] === 'MON_MALE') return 0;
  if (m[1] === 'MON_FEMALE') return 254;
  if (m[1] === 'MON_GENDERLESS') return 255;
  // #define PERCENT_FEMALE(percent) min(254, ((percent * 255) / 100)), truncated to u8
  if (m[1].startsWith('PERCENT_FEMALE'))
    return Math.min(254, Math.trunc((Number(m[2]) * 255) / 100));
  return undefined;
}

const speciesData = {};
const blockRe =
  /\[SPECIES_([A-Z0-9_]+)\]\s*=\s*\n\s*\{\n([\s\S]*?)\n {4}\},?\n/g;
const field = (body, name) => {
  const m = body.match(new RegExp(`\\.${name}\\s*=\\s*(\\d+)`));
  return m ? Number(m[1]) : undefined;
};

for (const [, rawName, body] of speciesInfo.matchAll(blockRe)) {
  const species = speciesFor(rawName);
  if (!species) continue;
  const catchRate = field(body, 'catchRate');
  const stats = {
    hp: field(body, 'baseHP'),
    atk: field(body, 'baseAttack'),
    def: field(body, 'baseDefense'),
    spa: field(body, 'baseSpAttack'),
    spd: field(body, 'baseSpDefense'),
    spe: field(body, 'baseSpeed'),
  };
  const typesMatch = body.match(
    /\.types\s*=\s*\{\s*TYPE_([A-Z]+)\s*,\s*TYPE_([A-Z]+)\s*\}/
  );
  const genderRatio = parseGenderRatio(body);
  // STANDARD_FRIENDSHIP is 70 (include/constants/pokemon.h).
  const friendshipMatch = body.match(
    /\.friendship\s*=\s*(STANDARD_FRIENDSHIP|\d+)/
  );
  const friendship =
    friendshipMatch &&
    (friendshipMatch[1] === 'STANDARD_FRIENDSHIP'
      ? 70
      : Number(friendshipMatch[1]));
  const abilitiesMatch = body.match(
    /\.abilities\s*=\s*\{\s*ABILITY_([A-Z_]+)\s*,\s*ABILITY_([A-Z_]+)\s*\}/
  );
  if (
    catchRate === undefined ||
    !typesMatch ||
    genderRatio === undefined ||
    !abilitiesMatch ||
    friendship === null
  ) {
    errors.push(`Could not parse SPECIES_${rawName}`);
    continue;
  }
  for (const [k, v] of Object.entries(stats)) {
    if (species.baseStats[k] !== v) {
      errors.push(
        `${species.name} ${k}: pokeemerald ${v} vs Showdown ${species.baseStats[k]}`
      );
    }
  }
  const types = [
    ...new Set([typeName(typesMatch[1]), typeName(typesMatch[2])]),
  ];
  if (types.join('/') !== species.types.join('/')) {
    errors.push(
      `${species.name} types: pokeemerald ${types} vs Showdown ${species.types}`
    );
  }
  // Some species list the same ability twice (e.g. Flygon); that's one ability.
  const abilities = [...new Set([abilitiesMatch[1], abilitiesMatch[2]])]
    .filter((a) => a !== 'NONE')
    .map((a) => gen3.abilities.get(toID(a)));
  for (const a of abilities)
    if (!a.exists) errors.push(`${species.name}: unknown ability ${a.name}`);
  const psAbilities = [species.abilities[0], species.abilities[1]].filter(
    Boolean
  );
  if (abilities.map((a) => a.name).join('/') !== psAbilities.join('/')) {
    errors.push(
      `${species.name} abilities: pokeemerald ${abilities.map((a) => a.name)} vs Showdown ${psAbilities}`
    );
  }
  const psGender =
    species.gender === 'N'
      ? 255
      : species.gender === 'M'
        ? 0
        : species.gender === 'F'
          ? 254
          : null;
  if (psGender !== null && psGender !== genderRatio) {
    errors.push(
      `${species.name} gender: pokeemerald ${genderRatio} vs Showdown ${species.gender}`
    );
  }
  if (psGender === null && (genderRatio === 0 || genderRatio >= 254)) {
    errors.push(
      `${species.name} gender: pokeemerald ${genderRatio} vs Showdown mixed`
    );
  }
  speciesData[species.id] = {
    catchRate,
    genderRatio,
    abilities: abilities.map((a) => a.name),
    friendship,
  };
}

// --- Level-up learnsets --------------------------------------------------------

const arrays = new Map();
const arrayRe =
  /static const u16 (s\w+LevelUpLearnset)\[\] = \{([\s\S]*?)LEVEL_UP_END/g;
for (const [, name, body] of learnsetsSrc.matchAll(arrayRe)) {
  const entries = [
    ...body.matchAll(/LEVEL_UP_MOVE\(\s*(\d+),\s*MOVE_([A-Z0-9_]+)\)/g),
  ].map(([, level, move]) => [Number(level), move]);
  arrays.set(name, entries);
}

const learnsets = {};
for (const [, rawName, arrayName] of pointersSrc.matchAll(
  /\[SPECIES_([A-Z0-9_]+)\]\s*=\s*(s\w+LevelUpLearnset)/g
)) {
  const species = speciesFor(rawName);
  if (!species) continue;
  const entries = arrays.get(arrayName);
  if (!entries?.length) {
    errors.push(`${species.name}: learnset ${arrayName} missing or empty`);
    continue;
  }
  const psLearnset = gen3.species.getLearnsetData(species.id).learnset ?? {};
  learnsets[species.id] = entries.map(([level, rawMove]) => {
    const move = gen3.moves.get(MOVE_RENAMES[rawMove] ?? toID(rawMove));
    if (!move.exists || move.gen > 3) {
      errors.push(`${species.name}: unknown Gen 3 move MOVE_${rawMove}`);
      return [level, toID(rawMove)];
    }
    // Showdown keeps only the earliest Gen 3 level across RSE/FRLG, so require
    // a Gen 3 level-up source at or below the Emerald level.
    const sources = psLearnset[move.id] ?? [];
    const psLevels = sources
      .filter((s) => s.startsWith('3L'))
      .map((s) => Number(s.slice(2)));
    if (!psLevels.some((l) => l <= level)) {
      errors.push(
        `${species.name}: ${move.name} at L${level} not in Showdown (${sources.filter((s) => s.startsWith('3')).join(',') || 'none'})`
      );
    }
    return [level, move.id];
  });
}

// --- Completeness ---------------------------------------------------------------

for (let num = 1; num <= 386; num++) {
  const species = gen3.species.all().find((s) => s.num === num && !s.forme);
  if (!species) errors.push(`Showdown has no base species #${num}`);
  else {
    if (!(species.id in speciesData))
      errors.push(`Missing species data for ${species.name}`);
    if (!(species.id in learnsets))
      errors.push(`Missing learnset for ${species.name}`);
  }
}

if (errors.length) {
  console.error(`${errors.length} problem(s):\n${errors.join('\n')}`);
  process.exit(1);
}

const byDex = (obj) =>
  Object.fromEntries(
    Object.entries(obj).sort(
      ([a], [b]) => gen3.species.get(a).num - gen3.species.get(b).num
    )
  );

mkdirSync(dataDir, { recursive: true });
/** Write JSON formatted with the repo's Prettier config, so format:check passes. */
async function writeJson(file, value) {
  const path = join(dataDir, file);
  const options = (await prettier.resolveConfig(path)) ?? {};
  const text = await prettier.format(JSON.stringify(value), {
    ...options,
    filepath: path,
  });
  writeFileSync(path, text);
}

await writeJson('species.json', byDex(speciesData));
await writeJson('level-up-learnsets.json', byDex(learnsets));
console.log(
  `Wrote ${Object.keys(speciesData).length} species and ${Object.keys(learnsets).length} learnsets to ${dataDir}`
);
