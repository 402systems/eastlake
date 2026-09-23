# Daily Catch

One wild Gen 3 Pokémon a day. Battle it and try to catch it. Everyone gets the same target, the same bag of Poké Balls and the same battle RNG on a given (local) date. Progress is saved per day in `localStorage`. Reloading replays your saved actions, so you can't reroll a bad throw.

## How it works

| Piece                                                                 | Source                                                                                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Battle mechanics                                                      | [`@pkmn/sim`](https://www.npmjs.com/package/@pkmn/sim) (Pokémon Showdown's simulator, MIT), `gen3` mod                       |
| Wild-battle rules                                                     | `lib/engine/mod.ts`: a `gen3wild` mod layered on `gen3`                                                                      |
| Catch formula                                                         | `lib/engine/catch.ts`: integer-exact port of pokeemerald `Cmd_handleballthrow`                                               |
| Wild Pokémon                                                          | `lib/engine/wild.ts`: pokeemerald `CreateWildMon` (nature, personality, IVs, gender, ability, shininess, initial moveset)    |
| Catch rates, gender ratios, abilities, friendship, level-up learnsets | `lib/data/*.json`, extracted from [pret/pokeemerald](https://github.com/pret/pokeemerald) and cross-checked against Showdown |
| Battle text                                                           | `@pkmn/view`'s `LogFormatter`, restyled to Gen 3 wording (`lib/anim/steps.ts`)                                               |
| Sprites                                                               | Showdown's Gen 3 sprites via `@pkmn/img` (hotlinked; personal use)                                                           |
| Animations                                                            | Our own Web Animations API code (`lib/anim/animations.ts`)                                                                   |

Gen 3 details the `gen3wild` mod adds on top of Showdown:

- **Ball throws** happen before any move. They ignore sleep, paralysis, confusion, flinching, Taunt, Disable, Encore and Choice Band. They use no PP and don't count as the last move. Balls aren't available while you're locked into a move (Outrage, recharging, charging).
- **Roar/Whirlwind** end the battle instead of forcing a switch. That includes the level check (`TryDoForceSwitchOut`), and Suction Cups and Ingrain still block them.
- **Teleport** lets its user flee. It's blocked by trapping moves, Shadow Tag, Arena Trap and Magnet Pull, following `IsRunningFromBattleImpossible`.
- **No PP Ups**: every move has its base PP.
- **Wild move choice** is uniformly random among usable moves. That matches the game's reroll-until-valid behavior.
- The HP bar drains 1 of 48 pixels per frame, with Gen 3 color thresholds (`GetHPBarLevel`).

## MVP limitations

- The player team is a fixed, Gen 3-legal sample (`lib/engine/team.ts`). Random teams come later.
- The daily target's level is random between 60 and 70 (above the team's level 50, and never below its evolution level). Wild Pokémon hold no items.
- There are no bag items other than balls, no running, no lead-Pokémon effects (Synchronize, Cute Charm) and no sound.
- Emerald's Deoxys is always in its Speed Forme.

## Scripts

```sh
pnpm dev                                  # http://localhost:3000 (dev builds accept ?date=YYYY-MM-DD)
pnpm test                                 # vitest: formula, engine, wild generation, text, 386-species fuzz
node scripts/extract-species-data.mjs     # regenerate lib/data from pokeemerald (fails on any mismatch)
```
