# Soccer XI — Data Pipeline

Scrapes sofifa.com for historical FIFA player ratings and outputs JSON files
consumed by the Next.js game at `apps/web/games/soccer-xi`.

## Setup

```bash
cd scripts/soccer_xi
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python fetch_data.py
```

Output files are written to `apps/web/games/soccer-xi/public/data/squads/`.
The run takes ~10 minutes (polite 1-2s delay per request, 50 clubs × 4 eras with sofifa data).

## What gets scraped

- Eras with sofifa data: **2005–09, 2010–14, 2015–19, 2020–24** (4 eras × 50 clubs = 200 files)
- Eras **1990–94, 1995–99, 2000–04**: placeholder files written; sofifa doesn't have this data.
  To backfill these, manually create squad JSON files following the schema below.

## Manual backfill for pre-2005 eras

Create `apps/web/games/soccer-xi/public/data/squads/{clubId}_{era}.json`:

```json
{
  "clubId": "real-madrid",
  "era": "2000-2004",
  "label": "2000–04",
  "players": [
    {
      "id": "zidane",
      "name": "Zinedine Zidane",
      "position": "CAM",
      "positionGroup": "MID",
      "rating": 96,
      "nationality": "France",
      "photoUrl": ""
    }
  ],
  "stats": {}
}
```

The `stats` block (distribution data) is auto-computed by the game client on the fly
when the precomputed block is empty.

## Troubleshooting

- **403 errors**: sofifa has bot protection. Add a longer sleep, rotate User-Agent, or
  use a residential proxy. The script already includes randomized 1-2s delays.
- **Wrong sofifa IDs**: verify at `https://sofifa.com/teams` — search for the club and
  check the URL (e.g., `/team/243/real-madrid/`). Update `CLUBS` in `fetch_data.py`.
- **Wrong version IDs**: visit `https://sofifa.com/players?tm=243`, click "Update" dropdown,
  select the FIFA version, and read `?r=XXXXXX` from the URL.
