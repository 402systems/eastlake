# Subway Game — Map Foundation & "Guess Line" Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared NYC subway map data pipeline and a mobile-first "Guess all stations on a line" game at `apps/web/games/subway-game`, following the design in `docs/superpowers/specs/2026-06-14-subway-game-design.md`.

**Architecture:** A one-time Python script (`scripts/subway_data/generate.py`, stdlib only) downloads MTA GTFS subway data and NYC borough boundary polygons, projects both into a shared SVG coordinate space, lays out each line as an octant-snapped schematic, and writes static JSON (`lines.json`, `lines/<id>.json`, `boroughs.json`) into the app's `public/data/`. The Next.js app (static export, following `soccer-xi`/`ipl-xi` conventions) picks a random line on `/game`, renders an SVG map (borough outlines + line schematic + station bullets), and accepts fuzzy-matched station-name guesses that progressively reveal the line.

**Tech Stack:** Python 3 stdlib for the data pipeline; Next.js (App Router, `output: 'export'`), React, TypeScript, Tailwind CSS v4 for the game.

---

## File Structure

**Data pipeline** (one-time, run manually):
- `scripts/subway_data/generate.py` — fetches GTFS + borough data, writes JSON into `apps/web/games/subway-game/public/data/`
- `scripts/subway_data/README.md` — usage docs
- `scripts/subway_data/.gitignore` — excludes `.cache/`

**Generated data** (output of `generate.py`, committed to the repo):
- `apps/web/games/subway-game/public/data/lines.json` — index of all 25 lines (id, name, color, stationCount)
- `apps/web/games/subway-game/public/data/lines/<id>.json` — per-line station list with schematic x/y + borough (25 files: A, B, C, D, E, F, G, J, L, M, N, Q, R, W, Z, GS, FS, H, 1, 2, 3, 4, 5, 6, 7)
- `apps/web/games/subway-game/public/data/boroughs.json` — simplified borough outlines + shared viewBox

**App scaffold:**
- `apps/web/games/subway-game/package.json`
- `apps/web/games/subway-game/next.config.js`
- `apps/web/games/subway-game/tsconfig.json`
- `apps/web/games/subway-game/eslint.config.mjs`
- `apps/web/games/subway-game/postcss.config.mjs`
- `apps/web/games/subway-game/app/layout.tsx`
- `apps/web/games/subway-game/app/globals.css`
- `apps/web/games/subway-game/app/page.tsx` — landing page
- `apps/web/games/subway-game/app/game/page.tsx` — game page (wires everything together)

**Game logic:**
- `apps/web/games/subway-game/lib/types.ts` — shared `Station`, `LineSummary`, `LineData`, `BoroughPath`, `BoroughsData` types
- `apps/web/games/subway-game/lib/data.ts` — `fetchLines`, `fetchLine`, `fetchBoroughs`
- `apps/web/games/subway-game/lib/matchStation.ts` — `normalizeStationName`, `matchGuess` (fuzzy guess matching)
- `apps/web/games/subway-game/lib/viewBox.ts` — `computeLineViewBox` (per-line viewBox auto-fit)

**Components:**
- `apps/web/games/subway-game/components/ProgressHeader.tsx` — line badge, found counter, Give Up, home link
- `apps/web/games/subway-game/components/GuessInput.tsx` — bottom-fixed text input + submit, shake on error
- `apps/web/games/subway-game/components/SubwayMap.tsx` — SVG map (boroughs + schematic + bullets + labels)
- `apps/web/games/subway-game/components/CompletionScreen.tsx` — final summary + Play Again / Home

**Modified:**
- `apps/web/core/home/app/page.tsx` — add "Subway Game" tile to the Games section

---

## Task 1: Data pipeline script

**Files:**
- Create: `scripts/subway_data/.gitignore`
- Create: `scripts/subway_data/README.md`
- Create: `scripts/subway_data/generate.py`

- [ ] **Step 1: Create `scripts/subway_data/.gitignore`**

```
.cache/
```

- [ ] **Step 2: Create `scripts/subway_data/README.md`**

```markdown
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
```

- [ ] **Step 3: Create `scripts/subway_data/generate.py`**

```python
from __future__ import annotations

import csv
import io
import json
import math
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
CACHE_DIR = SCRIPT_DIR / ".cache"
OUT_DIR = (
    SCRIPT_DIR.parent.parent
    / "apps"
    / "web"
    / "games"
    / "subway-game"
    / "public"
    / "data"
)

USER_AGENT = "Mozilla/5.0 (compatible; subway-game-data-pipeline)"

GTFS_URL = "https://rrgtfsfeeds.s3.amazonaws.com/gtfs_subway.zip"

BOROUGHS_URL = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1/query"
BOROUGHS_PARAMS = {
    "where": "STATE='36' AND COUNTY IN ('005','047','061','081','085')",
    "outFields": "STATE,COUNTY,NAME,BASENAME",
    "f": "geojson",
}

EXPRESS_VARIANTS = {"FX", "6X", "7X"}

BASENAME_TO_BOROUGH = {
    "Kings": "Brooklyn",
    "New York": "Manhattan",
    "Richmond": "Staten Island",
    "Queens": "Queens",
    "Bronx": "Bronx",
}

VIEWBOX_WIDTH = 1000.0
MIN_STEP = 12.0
ANCHOR_EVERY = 4
ANCHOR_WEIGHT = 0.35
SNAP_WARN_DEGREES = 20.0
DECIMATE_STEP = 10
DP_EPSILON = 2.0


def _download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req) as resp:
        return resp.read()


def fetch_gtfs() -> Path:
    extract_dir = CACHE_DIR / "gtfs_subway"
    if extract_dir.exists():
        return extract_dir
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    print("Downloading MTA GTFS subway feed...")
    data = _download(GTFS_URL)
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        zf.extractall(extract_dir)
    return extract_dir


def fetch_boroughs_geojson() -> dict:
    cache_file = CACHE_DIR / "boroughs.geojson"
    if cache_file.exists():
        return json.loads(cache_file.read_text())
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    print("Downloading NYC borough boundaries...")
    url = f"{BOROUGHS_URL}?{urllib.parse.urlencode(BOROUGHS_PARAMS)}"
    data = _download(url)
    cache_file.write_bytes(data)
    return json.loads(data)


# --- GTFS parsing ------------------------------------------------------


def load_stations(gtfs_dir: Path) -> tuple[dict[str, dict], dict[str, str]]:
    stations: dict[str, dict] = {}
    parent_of: dict[str, str] = {}
    with open(gtfs_dir / "stops.txt") as f:
        for row in csv.DictReader(f):
            if row["location_type"] == "1":
                stations[row["stop_id"]] = {
                    "name": row["stop_name"],
                    "lat": float(row["stop_lat"]),
                    "lon": float(row["stop_lon"]),
                }
            if row["parent_station"]:
                parent_of[row["stop_id"]] = row["parent_station"]
    return stations, parent_of


def load_routes(gtfs_dir: Path) -> list[dict]:
    routes = []
    with open(gtfs_dir / "routes.txt") as f:
        for row in csv.DictReader(f):
            if row["route_type"] != "1":
                continue
            if row["route_id"] in EXPRESS_VARIANTS:
                continue
            routes.append(
                {
                    "id": row["route_id"],
                    "name": row["route_long_name"],
                    "color": "#" + row["route_color"],
                }
            )
    return routes


def load_trip_to_route(gtfs_dir: Path, route_ids: set[str]) -> dict[str, str]:
    trip_to_route: dict[str, str] = {}
    with open(gtfs_dir / "trips.txt") as f:
        for row in csv.DictReader(f):
            if row["route_id"] in route_ids:
                trip_to_route[row["trip_id"]] = row["route_id"]
    return trip_to_route


def load_trip_stops(
    gtfs_dir: Path, trip_to_route: dict[str, str]
) -> dict[str, list[tuple[int, str]]]:
    trip_stops: dict[str, list[tuple[int, str]]] = {}
    with open(gtfs_dir / "stop_times.txt") as f:
        for row in csv.DictReader(f):
            tid = row["trip_id"]
            if tid in trip_to_route:
                trip_stops.setdefault(tid, []).append(
                    (int(row["stop_sequence"]), row["stop_id"])
                )
    return trip_stops


def dominant_sequence(
    route_id: str,
    trip_to_route: dict[str, str],
    trip_stops: dict[str, list[tuple[int, str]]],
    parent_of: dict[str, str],
) -> list[str]:
    best: list[str] = []
    for tid, route in trip_to_route.items():
        if route != route_id:
            continue
        stops = sorted(trip_stops.get(tid, []))
        seq: list[str] = []
        for _, sid in stops:
            pid = parent_of.get(sid, sid)
            if not seq or seq[-1] != pid:
                seq.append(pid)
        if len(seq) > len(best):
            best = seq
    return best


# --- projection ----------------------------------------------------------


def borough_bbox(geojson: dict) -> tuple[float, float, float, float]:
    lons: list[float] = []
    lats: list[float] = []
    for feat in geojson["features"]:
        geom = feat["geometry"]
        polys = (
            [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
        )
        for poly in polys:
            for ring in poly:
                for lon, lat in ring:
                    lons.append(lon)
                    lats.append(lat)
    return min(lons), max(lons), min(lats), max(lats)


class Projection:
    def __init__(self, lon_min: float, lon_max: float, lat_min: float, lat_max: float):
        self.lon_min = lon_min
        self.lon_max = lon_max
        self.lat_max = lat_max
        lat0 = (lat_min + lat_max) / 2
        self.cos_lat0 = math.cos(math.radians(lat0))
        self.scale = VIEWBOX_WIDTH / (lon_max - lon_min)
        self.height = (lat_max - lat_min) * self.scale / self.cos_lat0

    def project(self, lat: float, lon: float) -> tuple[float, float]:
        x = (lon - self.lon_min) * self.scale
        y = (self.lat_max - lat) * self.scale / self.cos_lat0
        return x, y

    @property
    def view_box(self) -> str:
        return f"0 0 {VIEWBOX_WIDTH:.1f} {self.height:.1f}"


# --- schematic layout ------------------------------------------------------


def snap_to_octant(dx: float, dy: float) -> tuple[float, float, float, float]:
    angle = math.degrees(math.atan2(dy, dx))
    snapped = round(angle / 45) * 45
    rad = math.radians(snapped)
    return math.cos(rad), math.sin(rad), angle, float(snapped)


def schematic_layout(
    raw_points: list[tuple[float, float]]
) -> tuple[list[tuple[float, float]], list[float]]:
    schem = [raw_points[0]]
    deviations: list[float] = []
    for i in range(1, len(raw_points)):
        dx = raw_points[i][0] - raw_points[i - 1][0]
        dy = raw_points[i][1] - raw_points[i - 1][1]
        dist = max(math.hypot(dx, dy), MIN_STEP)
        ux, uy, angle, snapped = snap_to_octant(dx, dy)
        deviations.append(abs(angle - snapped))
        nx = schem[i - 1][0] + ux * dist
        ny = schem[i - 1][1] + uy * dist
        if i % ANCHOR_EVERY == 0:
            nx = nx * (1 - ANCHOR_WEIGHT) + raw_points[i][0] * ANCHOR_WEIGHT
            ny = ny * (1 - ANCHOR_WEIGHT) + raw_points[i][1] * ANCHOR_WEIGHT
        schem.append((nx, ny))
    return schem, deviations


# --- borough polygons -------------------------------------------------


def point_in_ring(x: float, y: float, ring: list[tuple[float, float]]) -> bool:
    inside = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            x_intersect = x1 + (y - y1) / (y2 - y1) * (x2 - x1)
            if x < x_intersect:
                inside = not inside
    return inside


def perp_dist(
    pt: tuple[float, float], a: tuple[float, float], b: tuple[float, float]
) -> float:
    x, y = pt
    x1, y1 = a
    x2, y2 = b
    if (x1, y1) == (x2, y2):
        return math.hypot(x - x1, y - y1)
    num = abs((x2 - x1) * (y - y1) - (x1 - x) * (y2 - y1))
    den = math.hypot(x2 - x1, y2 - y1)
    return num / den


def douglas_peucker(
    points: list[tuple[float, float]], epsilon: float
) -> list[tuple[float, float]]:
    if len(points) < 3:
        return points
    dmax, index = 0.0, 0
    end = len(points) - 1
    for i in range(1, end):
        d = perp_dist(points[i], points[0], points[end])
        if d > dmax:
            index = i
            dmax = d
    if dmax > epsilon:
        left = douglas_peucker(points[: index + 1], epsilon)
        right = douglas_peucker(points[index:], epsilon)
        return left[:-1] + right
    return [points[0], points[end]]


def simplify_ring(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    decimated = points[::DECIMATE_STEP]
    if decimated[-1] != decimated[0]:
        decimated.append(decimated[0])
    return douglas_peucker(decimated, DP_EPSILON)


def ring_to_path(points: list[tuple[float, float]]) -> str:
    parts = [f"M {points[0][0]:.1f} {points[0][1]:.1f}"]
    for x, y in points[1:]:
        parts.append(f"L {x:.1f} {y:.1f}")
    parts.append("Z")
    return " ".join(parts)


# --- main ----------------------------------------------------------------


def main() -> None:
    gtfs_dir = fetch_gtfs()
    boroughs_geojson = fetch_boroughs_geojson()

    lon_min, lon_max, lat_min, lat_max = borough_bbox(boroughs_geojson)
    proj = Projection(lon_min, lon_max, lat_min, lat_max)

    stations, parent_of = load_stations(gtfs_dir)
    routes = load_routes(gtfs_dir)
    route_ids = {r["id"] for r in routes}

    trip_to_route = load_trip_to_route(gtfs_dir, route_ids)
    trip_stops = load_trip_stops(gtfs_dir, trip_to_route)

    borough_rings: dict[str, list[list[tuple[float, float]]]] = {}
    borough_paths: list[dict] = []
    for feat in boroughs_geojson["features"]:
        name = BASENAME_TO_BOROUGH[feat["properties"]["BASENAME"]]
        geom = feat["geometry"]
        polys = (
            [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
        )
        rings: list[list[tuple[float, float]]] = []
        for poly in polys:
            ring = [proj.project(lat, lon) for lon, lat in poly[0]]
            rings.append(ring)
        borough_rings.setdefault(name, []).extend(rings)
        for ring in rings:
            borough_paths.append({"name": name, "path": ring_to_path(simplify_ring(ring))})

    def borough_for(x: float, y: float) -> str:
        for name, rings in borough_rings.items():
            if any(point_in_ring(x, y, ring) for ring in rings):
                return name
        return "Unknown"

    (OUT_DIR / "lines").mkdir(parents=True, exist_ok=True)

    lines_index = []
    for route in routes:
        seq = dominant_sequence(route["id"], trip_to_route, trip_stops, parent_of)
        if not seq:
            print(f"WARNING: no trips found for route {route['id']}, skipping")
            continue

        raw_points = [proj.project(stations[sid]["lat"], stations[sid]["lon"]) for sid in seq]
        schem_points, deviations = schematic_layout(raw_points)

        line_stations = []
        for sid, (rx, ry), (sx, sy) in zip(seq, raw_points, schem_points):
            line_stations.append(
                {
                    "id": sid,
                    "name": stations[sid]["name"],
                    "x": round(sx, 1),
                    "y": round(sy, 1),
                    "borough": borough_for(rx, ry),
                }
            )

        line_data = {
            "id": route["id"],
            "name": route["name"],
            "color": route["color"],
            "stations": line_stations,
        }
        with open(OUT_DIR / "lines" / f"{route['id']}.json", "w") as f:
            json.dump(line_data, f, indent=2)

        lines_index.append(
            {
                "id": route["id"],
                "name": route["name"],
                "color": route["color"],
                "stationCount": len(line_stations),
            }
        )

        big_devs = sum(1 for d in deviations if d > SNAP_WARN_DEGREES)
        flag = f" -- {big_devs} segment(s) deviate >{SNAP_WARN_DEGREES:.0f} deg" if big_devs else ""
        print(f"{route['id']:>3s}  {route['name']:<40s} {len(line_stations):3d} stations{flag}")

    with open(OUT_DIR / "lines.json", "w") as f:
        json.dump(lines_index, f, indent=2)

    with open(OUT_DIR / "boroughs.json", "w") as f:
        json.dump({"viewBox": proj.view_box, "boroughs": borough_paths}, f, indent=2)

    print(f"\nWrote {len(lines_index)} lines to {OUT_DIR.resolve()}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Commit**

```bash
git add scripts/subway_data/
git commit -m "feat: add subway game data pipeline script"
```

---

## Task 2: Run the data pipeline and commit generated data

**Files:**
- Create: `apps/web/games/subway-game/public/data/lines.json`
- Create: `apps/web/games/subway-game/public/data/lines/<id>.json` (25 files)
- Create: `apps/web/games/subway-game/public/data/boroughs.json`

- [ ] **Step 1: Run the generator**

```bash
python3 scripts/subway_data/generate.py
```

This downloads the MTA GTFS feed (~5.6MB) and NYC borough boundaries on
first run (requires network access), caching both under
`scripts/subway_data/.cache/`. It then prints a per-line summary and
writes the output JSON.

Expected output (line order and counts are exact; the final path will
reflect your local checkout):

```
  A  8 Avenue Express                          59 stations -- 11 segment(s) deviate >20 deg
  C  8 Avenue Local                            40 stations -- 6 segment(s) deviate >20 deg
  E  8 Avenue Local                            32 stations -- 3 segment(s) deviate >20 deg
  B  6 Avenue Express                          37 stations -- 5 segment(s) deviate >20 deg
  D  6 Avenue Express                          41 stations -- 4 segment(s) deviate >20 deg
  F  Queens Blvd Express/6 Av Local            55 stations -- 6 segment(s) deviate >20 deg
  M  Queens Blvd Local/6 Av Local              36 stations -- 3 segment(s) deviate >20 deg
  G  Brooklyn-Queens Crosstown                 21 stations -- 1 segment(s) deviate >20 deg
  J  Nassau St Local                           30 stations -- 6 segment(s) deviate >20 deg
  Z  Nassau St Express                         21 stations -- 5 segment(s) deviate >20 deg
  L  14 St-Canarsie Local                      24 stations -- 2 segment(s) deviate >20 deg
  N  Broadway Local                            45 stations -- 5 segment(s) deviate >20 deg
  Q  Broadway Express                          34 stations -- 2 segment(s) deviate >20 deg
  R  Broadway Local                            45 stations -- 3 segment(s) deviate >20 deg
  W  Broadway Local                            44 stations -- 5 segment(s) deviate >20 deg
 GS  42 St Shuttle                              2 stations
 FS  Franklin Avenue Shuttle                    4 stations
  H  Rockaway Park Shuttle                      9 stations -- 4 segment(s) deviate >20 deg
  1  Broadway - 7 Avenue Local                 38 stations -- 3 segment(s) deviate >20 deg
  2  7 Avenue Express                          61 stations -- 8 segment(s) deviate >20 deg
  3  7 Avenue Express                          34 stations
  4  Lexington Avenue Express                  54 stations -- 2 segment(s) deviate >20 deg
  5  Lexington Avenue Express                  39 stations -- 2 segment(s) deviate >20 deg
  6  Lexington Avenue Local                    38 stations -- 2 segment(s) deviate >20 deg
  7  Flushing Local                            22 stations -- 3 segment(s) deviate >20 deg

Wrote 25 lines to /path/to/frontend/apps/web/games/subway-game/public/data
```

The "deviate >20 deg" counts are diagnostic only (printed by the script
to flag lines whose schematic layout may look visually awkward) — they
do not indicate an error. No tuning is required for this plan; if a
future pass wants tighter schematic lines for `7` or `G`, adjust
`MIN_STEP`/`ANCHOR_EVERY`/`ANCHOR_WEIGHT` in `generate.py` and re-run.

- [ ] **Step 2: Verify output file counts**

```bash
ls apps/web/games/subway-game/public/data/
ls apps/web/games/subway-game/public/data/lines/ | wc -l
```

Expected: `boroughs.json`, `lines.json`, and `lines/` are listed; the
second command prints `25`.

- [ ] **Step 3: Spot-check a generated line file**

```bash
python3 -c "
import json
data = json.load(open('apps/web/games/subway-game/public/data/lines/L.json'))
print(data['id'], data['name'], data['color'], len(data['stations']))
print(data['stations'][0])
print(data['stations'][-1])
"
```

Expected:

```
L 14 St-Canarsie Local #7C858C 24
{'id': 'L29', 'name': 'Canarsie-Rockaway Pkwy', 'x': 639.0, 'y': 639.9, 'borough': 'Brooklyn'}
{'id': 'L01', 'name': '8 Av', 'x': 468.1, 'y': 398.3, 'borough': 'Manhattan'}
```

- [ ] **Step 4: Commit generated data**

```bash
git add apps/web/games/subway-game/public/data/
git commit -m "feat: generate subway game map data"
```

---

## Task 3: App scaffold

**Files:**
- Create: `apps/web/games/subway-game/package.json`
- Create: `apps/web/games/subway-game/next.config.js`
- Create: `apps/web/games/subway-game/tsconfig.json`
- Create: `apps/web/games/subway-game/eslint.config.mjs`
- Create: `apps/web/games/subway-game/postcss.config.mjs`
- Create: `apps/web/games/subway-game/app/globals.css`
- Create: `apps/web/games/subway-game/app/layout.tsx`
- Create: `apps/web/games/subway-game/app/page.tsx`

- [ ] **Step 1: Create `apps/web/games/subway-game/package.json`**

```json
{
  "name": "@eastlake/app-games-subway-game",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md,css}\" --ignore-path ../../../../.prettierignore",
    "format:fix": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md,css}\" --ignore-path ../../../../.prettierignore"
  },
  "dependencies": {
    "@eastlake/lib-core-ui": "workspace:*",
    "@tailwindcss/postcss": "^4.1.18",
    "next": "latest",
    "postcss": "^8.5.6",
    "react": "latest",
    "react-dom": "latest",
    "tailwindcss": "^4.1.18"
  },
  "devDependencies": {
    "@eastlake/lib-core-eslint": "workspace:*",
    "@eastlake/lib-core-tsconfig": "workspace:*",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "typescript": "latest"
  }
}
```

- [ ] **Step 2: Create `apps/web/games/subway-game/next.config.js`**

```javascript
import process from 'node:process';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@eastlake/lib/core/ui'],
  reactStrictMode: true,
  output: 'export',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

- [ ] **Step 3: Create `apps/web/games/subway-game/tsconfig.json`**

```json
{
  "extends": "@eastlake/lib-core-tsconfig/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"],
      "@eastlake/core-ui/*": ["../../../../libs/core/ui/src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `apps/web/games/subway-game/eslint.config.mjs`**

```javascript
import { defineConfig } from 'eslint/config';
import { nextConfig } from '@eastlake/lib-core-eslint';

export default defineConfig([...nextConfig]);
```

- [ ] **Step 5: Create `apps/web/games/subway-game/postcss.config.mjs`**

```javascript
export { default } from '@eastlake/lib-core-ui/postcss.config'
```

- [ ] **Step 6: Create `apps/web/games/subway-game/app/globals.css`**

```css
@import 'tailwindcss';

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20%,
  60% {
    transform: translateX(-6px);
  }
  40%,
  80% {
    transform: translateX(6px);
  }
}

.shake {
  animation: shake 0.3s ease-in-out;
}
```

- [ ] **Step 7: Create `apps/web/games/subway-game/app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Subway Game',
  description: 'Name every stop on a random NYC subway line',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create `apps/web/games/subway-game/app/page.tsx`**

```tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-tight text-white">
          Subway <span className="text-amber-400">Game</span>
        </h1>
        <p className="mt-3 max-w-xs text-sm text-slate-400">
          Name every stop on a random NYC subway line. Type station names to
          fill in the map before you run out of guesses.
        </p>
      </div>
      <Link
        href="/game"
        className="rounded-2xl bg-amber-500 px-10 py-4 text-lg font-black text-white shadow-lg shadow-amber-900/40 transition-colors hover:bg-amber-400"
      >
        Play →
      </Link>
    </main>
  );
}
```

- [ ] **Step 9: Install dependencies**

```bash
pnpm install
```

Run from the repo root. This links the new `@eastlake/app-games-subway-game`
workspace package (auto-discovered via the `apps/**` glob in
`pnpm-workspace.yaml`) and updates `pnpm-lock.yaml`.

- [ ] **Step 10: Commit**

```bash
git add apps/web/games/subway-game/package.json apps/web/games/subway-game/next.config.js \
  apps/web/games/subway-game/tsconfig.json apps/web/games/subway-game/eslint.config.mjs \
  apps/web/games/subway-game/postcss.config.mjs apps/web/games/subway-game/app pnpm-lock.yaml
git commit -m "feat: scaffold subway game app"
```

---

## Task 4: Shared types and data fetchers

**Files:**
- Create: `apps/web/games/subway-game/lib/types.ts`
- Create: `apps/web/games/subway-game/lib/data.ts`

- [ ] **Step 1: Create `apps/web/games/subway-game/lib/types.ts`**

```typescript
export interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  borough: string;
}

export interface LineSummary {
  id: string;
  name: string;
  color: string;
  stationCount: number;
}

export interface LineData {
  id: string;
  name: string;
  color: string;
  stations: Station[];
}

export interface BoroughPath {
  name: string;
  path: string;
}

export interface BoroughsData {
  viewBox: string;
  boroughs: BoroughPath[];
}
```

- [ ] **Step 2: Create `apps/web/games/subway-game/lib/data.ts`**

```typescript
import type { LineSummary, LineData, BoroughsData } from './types';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export async function fetchLines(): Promise<LineSummary[]> {
  const res = await fetch(`${BASE}/data/lines.json`);
  if (!res.ok) throw new Error('Failed to load lines');
  return res.json();
}

export async function fetchLine(id: string): Promise<LineData> {
  const res = await fetch(`${BASE}/data/lines/${id}.json`);
  if (!res.ok) throw new Error(`Failed to load line ${id}`);
  return res.json();
}

export async function fetchBoroughs(): Promise<BoroughsData> {
  const res = await fetch(`${BASE}/data/boroughs.json`);
  if (!res.ok) throw new Error('Failed to load boroughs');
  return res.json();
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/games/subway-game/lib/types.ts apps/web/games/subway-game/lib/data.ts
git commit -m "feat: add subway game data types and fetchers"
```

---

## Task 5: Fuzzy station name matching

**Files:**
- Create: `apps/web/games/subway-game/lib/matchStation.ts`
- Create (temporary, deleted in this task): `apps/web/games/subway-game/lib/verify.ts`

- [ ] **Step 1: Create `apps/web/games/subway-game/lib/matchStation.ts`**

```typescript
import type { Station } from './types';

const ABBREVIATIONS: Record<string, string> = {
  st: 'street',
  av: 'avenue',
  ave: 'avenue',
  sq: 'square',
  pkwy: 'parkway',
  blvd: 'boulevard',
  hts: 'heights',
  pl: 'place',
  ctr: 'center',
  jct: 'junction',
};

const ORDINAL_RE = /^(\d+)(st|nd|rd|th)$/;

export function normalizeStationName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const ordinalMatch = token.match(ORDINAL_RE);
      const base = ordinalMatch ? ordinalMatch[1] : token;
      return ABBREVIATIONS[base] ?? base;
    })
    .join(' ');
}

export function matchGuess(guess: string, stations: Station[]): Station | null {
  const normalizedGuess = normalizeStationName(guess);
  if (normalizedGuess.length === 0) return null;

  const matches = stations.filter((station) =>
    normalizeStationName(station.name).includes(normalizedGuess)
  );

  return matches.length === 1 ? matches[0] : null;
}
```

- [ ] **Step 2: Create temporary `apps/web/games/subway-game/lib/verify.ts`**

This is a one-time manual verification script per the spec's "Validation
Approach" (no automated test framework in this monorepo). It exercises
the abbreviation, ordinal-stripping, prefix/substring, and ambiguity
rules against a small hand-picked set of real MTA station names.

```typescript
import { matchGuess } from './matchStation.ts';
import type { Station } from './types.ts';

const stations: Station[] = [
  { id: '1', name: '14 St-Union Sq', x: 0, y: 0, borough: 'Manhattan' },
  { id: '2', name: '23 St', x: 0, y: 0, borough: 'Manhattan' },
  { id: '3', name: 'Times Sq-42 St', x: 0, y: 0, borough: 'Manhattan' },
  { id: '4', name: 'Grand Central-42 St', x: 0, y: 0, borough: 'Manhattan' },
  { id: '5', name: 'Atlantic Av-Barclays Ctr', x: 0, y: 0, borough: 'Brooklyn' },
  { id: '6', name: 'Jackson Hts-Roosevelt Av', x: 0, y: 0, borough: 'Queens' },
  { id: '7', name: 'Eastchester-Dyre Av', x: 0, y: 0, borough: 'Bronx' },
];

const cases: [string, string | null][] = [
  ['14 st-union sq', '1'],
  ['Union Sq', '1'],
  ['23rd street', '2'],
  ['times sq', '3'],
  ['42 st', null],
  ['atlantic av', '5'],
  ['barclays ctr', '5'],
  ['jackson heights', '6'],
  ['roosevelt ave', '6'],
  ['dyre avenue', '7'],
  ['nonexistent station', null],
];

let pass = 0;
for (const [guess, expectedId] of cases) {
  const result = matchGuess(guess, stations);
  const resultId = result ? result.id : null;
  const ok = resultId === expectedId;
  if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  "${guess}" -> ${resultId} (expected ${expectedId})`);
}
console.log(`\n${pass}/${cases.length} PASS`);
```

- [ ] **Step 3: Run the verification script**

```bash
cd apps/web/games/subway-game
node lib/verify.ts
```

Expected output:

```
PASS  "14 st-union sq" -> 1 (expected 1)
PASS  "Union Sq" -> 1 (expected 1)
PASS  "23rd street" -> 2 (expected 2)
PASS  "times sq" -> 3 (expected 3)
PASS  "42 st" -> null (expected null)
PASS  "atlantic av" -> 5 (expected 5)
PASS  "barclays ctr" -> 5 (expected 5)
PASS  "jackson heights" -> 6 (expected 6)
PASS  "roosevelt ave" -> 6 (expected 6)
PASS  "dyre avenue" -> 7 (expected 7)
PASS  "nonexistent station" -> null (expected null)

11/11 PASS
```

- [ ] **Step 4: Delete the temporary verification script**

```bash
rm apps/web/games/subway-game/lib/verify.ts
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/games/subway-game/lib/matchStation.ts
git commit -m "feat: add fuzzy station name matching"
```

---

## Task 6: Per-line viewBox computation

**Files:**
- Create: `apps/web/games/subway-game/lib/viewBox.ts`

- [ ] **Step 1: Create `apps/web/games/subway-game/lib/viewBox.ts`**

```typescript
const PADDING = 60;
const MIN_EXTENT_RATIO = 0.25;

export function computeLineViewBox(
  stations: { x: number; y: number }[],
  cityViewBox: string
): string {
  const [, , cityWidthStr, cityHeightStr] = cityViewBox.split(' ');
  const cityWidth = parseFloat(cityWidthStr);
  const cityHeight = parseFloat(cityHeightStr);

  const xs = stations.map((s) => s.x);
  const ys = stations.map((s) => s.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const minWidth = cityWidth * MIN_EXTENT_RATIO;
  const minHeight = cityHeight * MIN_EXTENT_RATIO;

  const width = Math.max(maxX - minX + PADDING * 2, minWidth);
  const height = Math.max(maxY - minY + PADDING * 2, minHeight);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const x = centerX - width / 2;
  const y = centerY - height / 2;

  return `${x.toFixed(1)} ${y.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/games/subway-game/lib/viewBox.ts
git commit -m "feat: add per-line viewBox computation"
```

---

## Task 7: Map and UI components

**Files:**
- Create: `apps/web/games/subway-game/components/SubwayMap.tsx`
- Create: `apps/web/games/subway-game/components/ProgressHeader.tsx`
- Create: `apps/web/games/subway-game/components/GuessInput.tsx`
- Create: `apps/web/games/subway-game/components/CompletionScreen.tsx`

- [ ] **Step 1: Create `apps/web/games/subway-game/components/SubwayMap.tsx`**

```tsx
import type { BoroughsData, LineData } from '@/lib/types';
import { computeLineViewBox } from '@/lib/viewBox';

const BOROUGH_STROKE = '#283246';
const TRACK_COLOR = '#475569';
const BULLET_RADIUS = 4;
const GUESSED_BULLET_RADIUS = 5;
const LABEL_OFFSET = 8;

interface SubwayMapProps {
  line: LineData;
  boroughs: BoroughsData;
  guessedIds: Set<string>;
}

export function SubwayMap({ line, boroughs, guessedIds }: SubwayMapProps) {
  const viewBox = computeLineViewBox(line.stations, boroughs.viewBox);
  const trackPath = line.stations
    .map((s, i) => `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y}`)
    .join(' ');

  return (
    <svg
      viewBox={viewBox}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {boroughs.boroughs.map((borough, i) => (
        <path
          key={`${borough.name}-${i}`}
          d={borough.path}
          stroke={BOROUGH_STROKE}
          strokeWidth={1}
          fill="none"
        />
      ))}

      <path
        d={trackPath}
        stroke={TRACK_COLOR}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {line.stations.slice(0, -1).map((station, i) => {
        const next = line.stations[i + 1];
        if (!guessedIds.has(station.id) || !guessedIds.has(next.id)) return null;
        return (
          <line
            key={`seg-${station.id}-${next.id}`}
            x1={station.x}
            y1={station.y}
            x2={next.x}
            y2={next.y}
            stroke={line.color}
            strokeWidth={4}
            strokeLinecap="round"
          />
        );
      })}

      {line.stations.map((station) => {
        const guessed = guessedIds.has(station.id);
        return (
          <g key={station.id}>
            <circle
              cx={station.x}
              cy={station.y}
              r={guessed ? GUESSED_BULLET_RADIUS : BULLET_RADIUS}
              fill={guessed ? line.color : '#0a0e17'}
              stroke={guessed ? line.color : '#94a3b8'}
              strokeWidth={2}
            />
            {guessed && (
              <text
                x={station.x + LABEL_OFFSET}
                y={station.y}
                fill="#e2e8f0"
                fontSize={10}
                dominantBaseline="middle"
              >
                {station.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Create `apps/web/games/subway-game/components/ProgressHeader.tsx`**

```tsx
import Link from 'next/link';
import type { LineData } from '@/lib/types';

interface ProgressHeaderProps {
  line: LineData;
  foundCount: number;
  totalCount: number;
  onGiveUp: () => void;
}

export function ProgressHeader({
  line,
  foundCount,
  totalCount,
  onGiveUp,
}: ProgressHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-[#0a0e17] px-4 py-3">
      <Link href="/" className="text-sm text-slate-500 transition-colors hover:text-white">
        ← Home
      </Link>
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-4 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: line.color }}
        />
        <span className="truncate text-sm font-bold text-white">
          {line.id} · {line.name}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-sm text-slate-400">
          {foundCount} / {totalCount}
        </span>
        <button
          onClick={onGiveUp}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700"
        >
          Give Up
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create `apps/web/games/subway-game/components/GuessInput.tsx`**

```tsx
interface GuessInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  error: boolean;
}

export function GuessInput({ value, onChange, onSubmit, error }: GuessInputProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={`flex shrink-0 gap-2 border-t border-slate-800 bg-[#0a0e17] px-4 py-3 ${
        error ? 'shake' : ''
      }`}
    >
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter a station name"
        className={`flex-1 rounded-lg border bg-slate-900 px-4 py-3 text-base text-white placeholder-slate-500 outline-none ${
          error ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
        }`}
      />
      <button
        type="submit"
        className="rounded-lg bg-blue-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-400"
      >
        Guess
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create `apps/web/games/subway-game/components/CompletionScreen.tsx`**

```tsx
import Link from 'next/link';
import type { LineData } from '@/lib/types';

interface CompletionScreenProps {
  line: LineData;
  guessedIds: Set<string>;
  elapsedMs: number;
  onPlayAgain: () => void;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function CompletionScreen({
  line,
  guessedIds,
  elapsedMs,
  onPlayAgain,
}: CompletionScreenProps) {
  const found = guessedIds.size;
  const total = line.stations.length;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center px-4 py-8">
      <div className="mb-2 text-center">
        <h2 className="text-2xl font-black text-white">
          {found === total ? 'All stations found!' : 'Game over'}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          <span
            className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
            style={{ backgroundColor: line.color }}
          />
          {line.id} · {line.name}
        </p>
      </div>

      <div className="my-6 flex gap-8 text-center">
        <div>
          <div className="text-3xl font-black text-white">
            {found} / {total}
          </div>
          <div className="text-xs tracking-wide text-slate-500 uppercase">Found</div>
        </div>
        <div>
          <div className="text-3xl font-black text-white">{formatElapsed(elapsedMs)}</div>
          <div className="text-xs tracking-wide text-slate-500 uppercase">Time</div>
        </div>
      </div>

      <ul className="mb-6 w-full divide-y divide-slate-800 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50">
        {line.stations.map((station) => {
          const isFound = guessedIds.has(station.id);
          return (
            <li
              key={station.id}
              className={`flex items-center justify-between px-4 py-2 text-sm ${
                isFound ? 'text-white' : 'text-slate-500'
              }`}
            >
              <span>{station.name}</span>
              <span>{isFound ? '✓' : '—'}</span>
            </li>
          );
        })}
      </ul>

      <div className="flex w-full gap-3">
        <Link
          href="/"
          className="flex-1 rounded-lg bg-slate-800 px-5 py-3 text-center text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700"
        >
          Home
        </Link>
        <button
          onClick={onPlayAgain}
          className="flex-1 rounded-lg bg-blue-500 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-400"
        >
          Play Again
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/games/subway-game/components/
git commit -m "feat: add subway game map and UI components"
```

---

## Task 8: Game page

**Files:**
- Create: `apps/web/games/subway-game/app/game/page.tsx`

- [ ] **Step 1: Create `apps/web/games/subway-game/app/game/page.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBoroughs, fetchLine, fetchLines } from '@/lib/data';
import { matchGuess } from '@/lib/matchStation';
import type { BoroughsData, LineData, LineSummary } from '@/lib/types';
import { ProgressHeader } from '@/components/ProgressHeader';
import { GuessInput } from '@/components/GuessInput';
import { SubwayMap } from '@/components/SubwayMap';
import { CompletionScreen } from '@/components/CompletionScreen';

const ERROR_FLASH_MS = 300;

export default function GamePage() {
  const [lines, setLines] = useState<LineSummary[] | null>(null);
  const [boroughs, setBoroughs] = useState<BoroughsData | null>(null);
  const [line, setLine] = useState<LineData | null>(null);
  const [guessedIds, setGuessedIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const usedRef = useRef(new Set<string>());
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pickLine = useCallback(async (allLines: LineSummary[]) => {
    let pool = allLines.filter((l) => !usedRef.current.has(l.id));
    if (pool.length === 0) {
      usedRef.current.clear();
      pool = allLines;
    }
    const choice = pool[Math.floor(Math.random() * pool.length)];
    usedRef.current.add(choice.id);

    const lineData = await fetchLine(choice.id);
    setLine(lineData);
    setGuessedIds(new Set());
    setInput('');
    setError(false);
    setDone(false);
    setStartTime(Date.now());
    setElapsedMs(0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [linesData, boroughsData] = await Promise.all([fetchLines(), fetchBoroughs()]);
      if (cancelled) return;
      setLines(linesData);
      setBoroughs(boroughsData);
      await pickLine(linesData);
      if (cancelled) return;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pickLine]);

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const handleSubmit = useCallback(() => {
    if (!line) return;

    const unguessed = line.stations.filter((s) => !guessedIds.has(s.id));
    const match = matchGuess(input, unguessed);

    if (match) {
      const next = new Set(guessedIds);
      next.add(match.id);
      setGuessedIds(next);
      setInput('');
      if (next.size === line.stations.length) {
        setElapsedMs(Date.now() - startTime);
        setDone(true);
      }
    } else {
      setInput('');
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      setError(true);
      errorTimeoutRef.current = setTimeout(() => setError(false), ERROR_FLASH_MS);
    }
  }, [line, guessedIds, input, startTime]);

  const handleGiveUp = useCallback(() => {
    setElapsedMs(Date.now() - startTime);
    setDone(true);
  }, [startTime]);

  const handlePlayAgain = useCallback(async () => {
    if (!lines) return;
    setLoading(true);
    await pickLine(lines);
    setLoading(false);
  }, [lines, pickLine]);

  if (loading || !line || !boroughs) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0e17]">
        <p className="text-slate-400">Loading...</p>
      </main>
    );
  }

  if (done) {
    return (
      <CompletionScreen
        line={line}
        guessedIds={guessedIds}
        elapsedMs={elapsedMs}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a0e17]">
      <ProgressHeader
        line={line}
        foundCount={guessedIds.size}
        totalCount={line.stations.length}
        onGiveUp={handleGiveUp}
      />
      <div className="flex-1 overflow-hidden">
        <SubwayMap line={line} boroughs={boroughs} guessedIds={guessedIds} />
      </div>
      <GuessInput value={input} onChange={setInput} onSubmit={handleSubmit} error={error} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/games/subway-game/app/game/
git commit -m "feat: wire up subway game play loop"
```

---

## Task 9: Add home page tile

**Files:**
- Modify: `apps/web/core/home/app/page.tsx`

- [ ] **Step 1: Add the `TrainFront` icon import**

In `apps/web/core/home/app/page.tsx`, find:

```typescript
import { Gamepad2, Wrench, Target, PartyPopper, Trophy } from 'lucide-react';
```

Replace with:

```typescript
import { Gamepad2, Wrench, Target, PartyPopper, Trophy, TrainFront } from 'lucide-react';
```

- [ ] **Step 2: Add the Subway Game tile**

In the same file, find the "IPL XI" entry in the `apps` array:

```typescript
  {
    name: 'IPL XI',
    description:
      'Build your all-time IPL dream team — random squads, one pick per role, score by percentile',
    href: '/games/ipl-xi',
    icon: <Trophy className="h-8 w-8" />,
    gradient: 'from-blue-500 to-indigo-600',
    category: 'games',
  },
```

Insert a new entry immediately after it:

```typescript
  {
    name: 'IPL XI',
    description:
      'Build your all-time IPL dream team — random squads, one pick per role, score by percentile',
    href: '/games/ipl-xi',
    icon: <Trophy className="h-8 w-8" />,
    gradient: 'from-blue-500 to-indigo-600',
    category: 'games',
  },
  {
    name: 'Subway Game',
    description:
      'Name every stop on a random NYC subway line — fuzzy match station names against a live schematic map',
    href: '/games/subway-game',
    icon: <TrainFront className="h-8 w-8" />,
    gradient: 'from-amber-500 to-red-600',
    category: 'games',
  },
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/core/home/app/page.tsx
git commit -m "feat: add Subway Game tile to home page"
```

---

## Task 10: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

```bash
pnpm --filter @eastlake/app-games-subway-game dev
```

- [ ] **Step 2: Verify the landing page**

Open `http://localhost:3000/` in a browser. Confirm the "Subway Game"
title, blurb, and "Play →" button render, and clicking "Play →"
navigates to `/game`.

- [ ] **Step 3: Play through a short line**

Reload `/game` until a short line is picked (`GS` · 42 St Shuttle, 2
stations, or `FS` · Franklin Avenue Shuttle, 4 stations) — the
`<ProgressHeader>` badge shows the line id and name. Confirm:

- The map renders the borough outlines and the line's full track in gray,
  with hollow bullets at each station.
- Even for a 2-station line, the map shows meaningful borough context
  (not zoomed in to a single point) — this exercises the
  `MIN_EXTENT_RATIO` clamp in `computeLineViewBox`.
- Typing a correct station name (e.g. for `GS`, "Times Sq" or "Grand
  Central") and submitting fills that station's bullet with the line
  color, shows its label, and increments the `X / Y` counter.
- Typing a station name with an MTA abbreviation (e.g. "42 st" for a
  station named "...-42 St", if unambiguous on this line) also matches.
- Typing a garbage string (e.g. "asdfasdf") triggers the shake/red-border
  error flash on `<GuessInput>` and clears the input.
- Finding all stations transitions to `<CompletionScreen>` showing "All
  stations found!", the `X / Y` and elapsed time stats, and the full
  station list with all rows checked.
- "Play Again" loads a different line (not immediately the same one,
  thanks to `usedRef`).

- [ ] **Step 4: Play through a long line**

Reload `/game` until a long line is picked (e.g. `A`, 59 stations, or `2`,
61 stations). Confirm:

- The map renders without errors and the full schematic track is visible
  within the viewBox.
- Guessing two *consecutive* stations on the line connects them with a
  colored segment (the highlight layer in `<SubwayMap>`).
- Tapping "Give Up" mid-game jumps straight to `<CompletionScreen>`,
  showing "Game over", the partial `X / Y`, and the station list with
  unfound stations marked `—`.

- [ ] **Step 5: Lint and format check**

```bash
pnpm --filter @eastlake/app-games-subway-game lint
pnpm --filter @eastlake/app-games-subway-game format:check
```

`lint` should pass with no errors. The repo's shared Prettier config uses
`prettier-plugin-tailwindcss`, which reorders Tailwind classes and wraps
lines at 80 chars — `format:check` may flag the hand-written `className`
strings and generated JSON in this plan. If it does, run:

```bash
pnpm --filter @eastlake/app-games-subway-game format:fix
git add -A
git commit -m "chore: apply prettier formatting"
```

- [ ] **Step 6: Stop the dev server**

Press `Ctrl+C` in the terminal running `pnpm dev`.

---
