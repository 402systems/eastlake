# Subway Game — "Guess the Line" (Design Spec)

## Overview

A mobile-first NYC subway trivia game. The player is shown a random subway
line, rendered as a minimalist MTA-style schematic diagram over a monochrome
outline of NYC's boroughs, and types in station names to fill them in along
the line.

This spec covers the first sub-project: the shared map foundation plus
**Mode 1 — "Guess all stations on a line"**. Future modes (shortest path
between two stations; guess as many stations as possible city/borough-wide)
are out of scope here but will reuse the same data pipeline and map
components — see "Future Work" at the end.

## App Structure

A new app at `apps/web/games/subway-game` (`@eastlake/app-games-subway-game`),
following the soccer-xi/ipl-xi conventions:

- Next.js, `output: 'export'`, `basePath`/`NEXT_PUBLIC_BASE_PATH` for
  deployment under `/games/subway-game`
- Tailwind dark theme (`bg-slate-950` / near-black), `@eastlake/lib-core-ui`
  components where useful
- No automated test framework — consistent with other games in this monorepo

Routes:

- **`/`** — landing page: title, short blurb ("Name every stop on a random
  NYC subway line"), "Play →" button (mirrors soccer-xi's `app/page.tsx`)
- **`/game`** — the game itself: picks a random line, renders the map, guess
  input, progress header, and completion screen

A tile for "Subway Game" is added to the home page
(`apps/web/core/home/app/page.tsx`) under "Games", following the pattern used
when IPL XI was added.

## Data Pipeline

A one-time Python script in `scripts/subway_data/` (same pattern as
`scripts/soccer_xi`), run manually and committed as static JSON. No runtime
API calls.

### Sources (both public, no API key required)

- **MTA static GTFS feed** (`stops.txt`, `routes.txt`, `trips.txt`,
  `stop_times.txt`) — station names, lat/lon, ordered stop sequences per
  route, and official line colors (`route_color`)
- **NYC Open Data Borough Boundaries GeoJSON** — for the blueprint backdrop

### Shared projection

One linear lat/lon → x/y transform, calibrated to NYC's bounding box, applied
to *both* station coordinates and borough polygons. This guarantees a line's
stations land in the correct position relative to the borough backdrop.

### Schematic generation

For each of the ~24 subway services, the dominant trip pattern (most stops)
is taken as the canonical ordered station list. Walking consecutive stations:

1. Compute each segment's real-world bearing from projected lat/lon.
2. Snap the bearing to the nearest of 8 compass directions (45° increments).
3. Lay out schematic points along the snapped directions using a fixed
   inter-station step length, with periodic re-anchoring toward the true
   projected position to prevent long lines from drifting visually.

Borough polygons are simplified to low-poly outlines through the same
projection.

The script prints a per-line summary (station count, any large angle-snap
deviations) so output can be spot-checked and the snap parameters tuned for
lines that come out looking awkward (e.g. the 7, the G).

### Output files

Written to `apps/web/games/subway-game/public/data/`:

- **`lines.json`** — index used to pick a random line:
  ```json
  [{ "id": "L", "name": "14 St-Canarsie Local", "color": "#A7A9AC", "stationCount": 24 }]
  ```
- **`lines/<id>.json`** — full line data:
  ```json
  {
    "id": "L",
    "name": "14 St-Canarsie Local",
    "color": "#A7A9AC",
    "stations": [
      { "id": "L01", "name": "8 Av", "x": 120, "y": 340, "borough": "Manhattan" }
    ]
  }
  ```
- **`boroughs.json`** — backdrop outlines:
  ```json
  {
    "viewBox": "0 0 1000 1200",
    "boroughs": [{ "name": "Manhattan", "path": "M..." }]
  }
  ```

Station `id` = GTFS `stop_id`, `name` = GTFS `stop_name`. These names are the
canonical strings the fuzzy-matcher checks guesses against. The `borough`
field (determined via point-in-polygon against the borough boundaries) is
unused by Mode 1 but is cheap to compute now and feeds the Mode 3
borough-sweep follow-up.

## Map Rendering & Components

### `<SubwayMap>`

The core SVG. `viewBox` is auto-fit to the current line's station bounding
box plus padding, clamped to a minimum extent (e.g. ~25% of the full city
`viewBox` from `boroughs.json`) so short lines (like the 2-stop Franklin Ave
Shuttle) still show meaningful borough context instead of being cropped to
nearly nothing. Layers, back to front:

1. Borough outlines — 1px stroke `#283246`, no fill (blueprint style)
2. The line's full schematic path, drawn once in dim track gray `#475569`
3. Highlight segments redrawn in the line's official `route_color`, but only
   between **consecutive** guessed stations — progress visually "connects"
   as gaps fill in
4. Station bullets: hollow circle (gray stroke, unguessed) or filled circle
   in `route_color` (guessed)
5. Station name labels — rendered only next to guessed stations, to avoid
   clutter and spoilers on long lines

No line letter/number is repeated on every bullet (redundant for a
single-line view) — the line's identity lives once in `<ProgressHeader>`.

### `<ProgressHeader>`

Line badge (color swatch + name, e.g. "L · 14 St-Canarsie Local"), `X / Y`
found counter, "Give Up" button, back-to-home link. Fixed to the top of the
viewport.

### `<GuessInput>`

Text input + submit button, fixed to the bottom of the viewport
(mobile-keyboard friendly). Clears on each submit. Brief shake/error flash on
no-match.

### `<CompletionScreen>`

Shown when all stations are found, or "Give Up" is tapped: `X / Y` found,
elapsed time (a fun stat, not a score/timer mechanic), full station list with
any missed stations marked, "Play Again" and "Home" buttons.

## Game Flow & Fuzzy Matching

1. `/` → Play → `/game`
2. On mount, fetch `lines.json`, pick a random line (tracking lines used this
   session in a ref, like soccer-xi's `usedRef`, to avoid immediate repeats),
   then fetch `lines/<id>.json`
3. Render `<SubwayMap>` + `<ProgressHeader>` (starts at `0/N`) + `<GuessInput>`
4. On submit, normalize the guess and compare against the normalized,
   *unguessed* station names on the current line:
   - lowercase, trim, strip punctuation, collapse whitespace
   - normalize common MTA abbreviations both directions (St/Street,
     Av/Avenue, Sq/Square, Pkwy/Parkway, Blvd/Boulevard, Hts/Heights,
     Pl/Place, Ctr/Center, Jct/Junction)
   - strip ordinal suffixes from numbers ("42nd" → "42")
   - accept a match if the normalized guess equals, or is an unambiguous
     prefix/substring of, exactly one remaining station's normalized name
     (e.g. "times sq" → "Times Sq-42 St")
5. Match → mark the station guessed, update the map (bullet fills, adjacent
   segments connect if applicable), increment counter, clear input
6. No match → brief shake/error flash, clear input
7. Reaching `N/N`, or tapping "Give Up" at any time → `<CompletionScreen>`
8. "Play Again" picks a new random line (no repeats this session)

This matching logic is the most complex pure-logic piece of the app. No
automated tests are added (consistent with the rest of the monorepo); it
should be manually verified during implementation against a handful of known
abbreviation cases.

## Visual Design

- Background: `#0a0e17` (near-black)
- Borough outlines: 1px stroke `#283246`, no fill
- Inactive line track: `#475569`
- Guessed segments + filled bullets: the line's official `route_color`
- Unguessed bullets: hollow circle, gray stroke
- Guessed bullets: filled + station name label beside them, light text color

### Mobile layout

Fixed header (`<ProgressHeader>`) → SVG map filling the remaining viewport
(`viewBox` auto-fit per line, no pan/zoom for v1) → fixed bottom input bar
(`<GuessInput>`). Longer lines (e.g. the A, ~60 stops) render more "zoomed
out" than short ones (e.g. the G); this is acceptable for v1.

## Validation Approach

No automated tests, consistent with other games in this monorepo:

- The data-prep script prints a per-line summary for manual spot-checking of
  generated coordinates
- Frontend verification is manual: run the dev server, play through a short
  line and a long line, confirm the map renders sensibly, and confirm a
  handful of abbreviation cases match correctly
- Standard `pnpm lint` / `pnpm format:check` apply as usual

## Future Work (out of scope for this spec)

- **Mode 2 — Shortest path**: guess the quickest path between two stations.
  Reuses the same station/line data but needs a cross-line graph (transfer
  points) not built here.
- **Mode 3 — Borough/city sweep**: guess as many stations as possible in a
  borough or city-wide. Reuses `boroughs.json` and all `lines/<id>.json`
  files, rendered together on one map instead of a single line.
