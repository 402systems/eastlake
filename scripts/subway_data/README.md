# Subway Game — Data Pipeline

One-time script that downloads MTA GTFS subway data and NYC borough boundary
polygons, then generates the static JSON files consumed by the game at
`apps/web/games/subway-game/public/data/`.

Pure Python stdlib — no virtualenv or dependencies required.

## Run

```bash
python3 scripts/subway_data/generate.py
```

The first run downloads and caches:
- the MTA GTFS subway feed (~5.6MB zip) into `.cache/gtfs_subway/`
- NYC borough boundary polygons into `.cache/boroughs.geojson`

Subsequent runs reuse the cache. Delete `scripts/subway_data/.cache/` to
force a re-download (e.g. after the MTA publishes a new schedule).

## Output

Written to `apps/web/games/subway-game/public/data/`:

- `lines.json` — index of all subway lines (id, name, color, station count)
- `lines/<id>.json` — per-line ordered station list with schematic x/y
  coordinates and borough
- `boroughs.json` — simplified borough outline paths + shared SVG viewBox

## Tuning the schematic layout

The script prints a per-line summary, flagging lines where multiple
segments deviate more than `SNAP_WARN_DEGREES` (20°) from their snapped
octant direction. If a line's map looks visually wrong (sharp unnecessary
zig-zags), try adjusting `MIN_STEP`, `ANCHOR_EVERY`, or `ANCHOR_WEIGHT` at
the top of `generate.py` and re-run.
