#!/usr/bin/env python3
"""
Soccer XI data pipeline.

Reads FIFA player CSVs (from Kaggle "FIFA 22 Complete Player Dataset") and
outputs JSON files consumed by the Next.js game.

Usage:
  python fetch_data.py --zip ~/Downloads/fifa-22-complete-player-dataset.zip

Output files (written to ../../apps/web/games/soccer-xi/public/data/):
  clubs.json
  squads/{clubId}_{era}.json   (e.g. real-madrid_2015-2019.json)
"""

import argparse
import csv
import io
import json
import random
import zipfile
from pathlib import Path

OUT_DIR = Path(__file__).parent / "../../apps/web/games/soccer-xi/public/data"

CLUBS = [
    # Premier League
    {"id": "arsenal",          "name": "Arsenal",             "league": "Premier League", "sofifa_id": 1,     "color": "#EF0107"},
    {"id": "aston-villa",      "name": "Aston Villa",         "league": "Premier League", "sofifa_id": 2,     "color": "#95BFE5"},
    {"id": "chelsea",          "name": "Chelsea",             "league": "Premier League", "sofifa_id": 5,     "color": "#034694"},
    {"id": "everton",          "name": "Everton",             "league": "Premier League", "sofifa_id": 7,     "color": "#003399"},
    {"id": "liverpool",        "name": "Liverpool",           "league": "Premier League", "sofifa_id": 9,     "color": "#C8102E"},
    {"id": "man-city",         "name": "Manchester City",     "league": "Premier League", "sofifa_id": 10,    "color": "#6CABDD"},
    {"id": "man-utd",          "name": "Manchester United",   "league": "Premier League", "sofifa_id": 11,    "color": "#DA291C"},
    {"id": "newcastle",        "name": "Newcastle United",    "league": "Premier League", "sofifa_id": 13,    "color": "#241F20"},
    {"id": "tottenham",        "name": "Tottenham Hotspur",   "league": "Premier League", "sofifa_id": 18,    "color": "#132257"},
    {"id": "west-ham",         "name": "West Ham United",     "league": "Premier League", "sofifa_id": 19,    "color": "#7A263A"},
    # La Liga
    {"id": "real-madrid",      "name": "Real Madrid",         "league": "La Liga",        "sofifa_id": 243,   "color": "#FEBE10"},
    {"id": "barcelona",        "name": "FC Barcelona",        "league": "La Liga",        "sofifa_id": 241,   "color": "#A50044"},
    {"id": "atletico-madrid",  "name": "Atlético Madrid",     "league": "La Liga",        "sofifa_id": 240,   "color": "#CB3524"},
    {"id": "sevilla",          "name": "Sevilla FC",          "league": "La Liga",        "sofifa_id": 481,   "color": "#D4AF37"},
    {"id": "valencia",         "name": "Valencia CF",         "league": "La Liga",        "sofifa_id": 461,   "color": "#FF7900"},
    {"id": "athletic-bilbao",  "name": "Athletic Club",       "league": "La Liga",        "sofifa_id": 448,   "color": "#EE2523"},
    {"id": "real-sociedad",    "name": "Real Sociedad",       "league": "La Liga",        "sofifa_id": 457,   "color": "#004C9C"},
    {"id": "villarreal",       "name": "Villarreal CF",       "league": "La Liga",        "sofifa_id": 483,   "color": "#FFE000"},
    {"id": "real-betis",       "name": "Real Betis",          "league": "La Liga",        "sofifa_id": 449,   "color": "#00954C"},
    {"id": "celta-vigo",       "name": "Celta Vigo",          "league": "La Liga",        "sofifa_id": 450,   "color": "#6BB4E6"},
    # Bundesliga
    {"id": "bayern",           "name": "FC Bayern München",   "league": "Bundesliga",     "sofifa_id": 21,    "color": "#DC052D"},
    {"id": "dortmund",         "name": "Borussia Dortmund",   "league": "Bundesliga",     "sofifa_id": 22,    "color": "#FDE100"},
    {"id": "leverkusen",       "name": "Bayer Leverkusen",    "league": "Bundesliga",     "sofifa_id": 32,    "color": "#E32221"},
    {"id": "rb-leipzig",       "name": "RB Leipzig",          "league": "Bundesliga",     "sofifa_id": 112172,"color": "#DD0741"},
    {"id": "gladbach",         "name": "Borussia M'gladbach", "league": "Bundesliga",     "sofifa_id": 23,    "color": "#000000"},
    {"id": "schalke",          "name": "Schalke 04",          "league": "Bundesliga",     "sofifa_id": 34,    "color": "#004D9D"},
    {"id": "frankfurt",        "name": "Eintracht Frankfurt",  "league": "Bundesliga",     "sofifa_id": 1824,  "color": "#E1000F"},
    {"id": "werder-bremen",    "name": "Werder Bremen",       "league": "Bundesliga",     "sofifa_id": 38,    "color": "#1D9053"},
    {"id": "stuttgart",        "name": "VfB Stuttgart",       "league": "Bundesliga",     "sofifa_id": 36,    "color": "#E32219"},
    {"id": "wolfsburg",        "name": "VfL Wolfsburg",       "league": "Bundesliga",     "sofifa_id": 175,   "color": "#65B32E"},
    # Serie A
    {"id": "juventus",         "name": "Juventus",            "league": "Serie A",        "sofifa_id": 45,    "color": "#000000"},
    {"id": "inter",            "name": "Inter Milan",         "league": "Serie A",        "sofifa_id": 44,    "color": "#010E80"},
    {"id": "ac-milan",         "name": "AC Milan",            "league": "Serie A",        "sofifa_id": 47,    "color": "#FB090B"},
    {"id": "napoli",           "name": "SSC Napoli",          "league": "Serie A",        "sofifa_id": 48,    "color": "#087FC1"},
    {"id": "roma",             "name": "AS Roma",             "league": "Serie A",        "sofifa_id": 52,    "color": "#8E1F2F"},
    {"id": "lazio",            "name": "SS Lazio",            "league": "Serie A",        "sofifa_id": 46,    "color": "#87D8F7"},
    {"id": "atalanta",         "name": "Atalanta BC",         "league": "Serie A",        "sofifa_id": 39,    "color": "#1E3F7A"},
    {"id": "fiorentina",       "name": "Fiorentina",          "league": "Serie A",        "sofifa_id": 110374,"color": "#4C2D8E"},
    {"id": "torino",           "name": "Torino FC",           "league": "Serie A",        "sofifa_id": 54,    "color": "#8B1C24"},
    {"id": "parma",            "name": "Parma Calcio",        "league": "Serie A",        "sofifa_id": 50,    "color": "#FFDD00"},
    # Ligue 1
    {"id": "psg",              "name": "Paris Saint-Germain", "league": "Ligue 1",        "sofifa_id": 73,    "color": "#004170"},
    {"id": "marseille",        "name": "Olympique Marseille", "league": "Ligue 1",        "sofifa_id": 219,   "color": "#2FAEE0"},
    {"id": "lyon",             "name": "Olympique Lyonnais",  "league": "Ligue 1",        "sofifa_id": 66,    "color": "#FF6600"},
    {"id": "monaco",           "name": "AS Monaco",           "league": "Ligue 1",        "sofifa_id": 69,    "color": "#E8192C"},
    {"id": "lille",            "name": "LOSC Lille",          "league": "Ligue 1",        "sofifa_id": 65,    "color": "#DA291C"},
    {"id": "nice",             "name": "OGC Nice",            "league": "Ligue 1",        "sofifa_id": 72,    "color": "#000000"},
    {"id": "rennes",           "name": "Stade Rennais",       "league": "Ligue 1",        "sofifa_id": 74,    "color": "#D60812"},
    {"id": "bordeaux",         "name": "Girondins Bordeaux",  "league": "Ligue 1",        "sofifa_id": 59,    "color": "#003DA5"},
    {"id": "saint-etienne",    "name": "AS Saint-Étienne",   "league": "Ligue 1",        "sofifa_id": 1819,  "color": "#007236"},
    {"id": "lens",             "name": "RC Lens",             "league": "Ligue 1",        "sofifa_id": 64,    "color": "#E30613"},
]

# Each era maps to the best available FIFA CSV version.
# FIFA 15 = released Sep 2014, good proxy for 2010-14 era peak.
# FIFA 19 = released Sep 2018, good proxy for 2015-19 era peak.
# FIFA 22 = released Oct 2021, good proxy for 2020-24 era peak.
ERAS = [
    {"era": "2015", "label": "2015", "csv": "players_15.csv"},
    {"era": "2019", "label": "2019", "csv": "players_19.csv"},
    {"era": "2022", "label": "2022", "csv": "players_22.csv"},
]

NATIONS = [
    # South America
    {"id": "argentina",      "name": "Argentina",      "nation_team_id": 1369,   "flag": "🇦🇷"},
    {"id": "brazil",         "name": "Brazil",          "nation_team_id": 1370,   "flag": "🇧🇷"},
    # Europe - top
    {"id": "england",        "name": "England",         "nation_team_id": 1318,   "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
    {"id": "france",         "name": "France",          "nation_team_id": 1335,   "flag": "🇫🇷"},
    {"id": "germany",        "name": "Germany",         "nation_team_id": 1337,   "flag": "🇩🇪"},
    {"id": "spain",          "name": "Spain",           "nation_team_id": 1362,   "flag": "🇪🇸"},
    {"id": "italy",          "name": "Italy",           "nation_team_id": 1343,   "flag": "🇮🇹"},
    {"id": "netherlands",    "name": "Netherlands",     "nation_team_id": 105035, "flag": "🇳🇱"},
    {"id": "portugal",       "name": "Portugal",        "nation_team_id": 1354,   "flag": "🇵🇹"},
    {"id": "belgium",        "name": "Belgium",         "nation_team_id": 1325,   "flag": "🇧🇪"},
    # Europe - rest
    {"id": "denmark",        "name": "Denmark",         "nation_team_id": 1331,   "flag": "🇩🇰"},
    {"id": "sweden",         "name": "Sweden",          "nation_team_id": 1363,   "flag": "🇸🇪"},
    {"id": "poland",         "name": "Poland",          "nation_team_id": 1353,   "flag": "🇵🇱"},
    {"id": "czech-republic", "name": "Czech Republic",  "nation_team_id": 1330,   "flag": "🇨🇿"},
    {"id": "russia",         "name": "Russia",          "nation_team_id": 1357,   "flag": "🇷🇺"},
    {"id": "greece",         "name": "Greece",          "nation_team_id": 1338,   "flag": "🇬🇷"},
    {"id": "austria",        "name": "Austria",         "nation_team_id": 1322,   "flag": "🇦🇹"},
    {"id": "scotland",       "name": "Scotland",        "nation_team_id": 1359,   "flag": "🏴󠁧󠁢󠁳󠁣󠁴󠁿"},
    {"id": "wales",          "name": "Wales",           "nation_team_id": 1367,   "flag": "🏴󠁧󠁢󠁷󠁬󠁳󠁿"},
    {"id": "norway",         "name": "Norway",          "nation_team_id": 1352,   "flag": "🇳🇴"},
    # North America
    {"id": "usa",            "name": "United States",   "nation_team_id": 1387,   "flag": "🇺🇸"},
    {"id": "mexico",         "name": "Mexico",          "nation_team_id": 1386,   "flag": "🇲🇽"},
    # Oceania
    {"id": "australia",      "name": "Australia",       "nation_team_id": 1415,   "flag": "🇦🇺"},
]

GK_POSITIONS  = {"GK"}
DEF_POSITIONS = {"CB", "LB", "RB", "LWB", "RWB", "SW"}
MID_POSITIONS = {"CM", "CDM", "CAM", "LM", "RM", "DM", "AM"}
FWD_POSITIONS = {"ST", "CF", "LW", "RW", "SS", "RS", "LS", "RF", "LF"}

def pos_group(position: str) -> str:
    p = position.upper().strip()
    if p in GK_POSITIONS:  return "GK"
    if p in DEF_POSITIONS: return "DEF"
    if p in MID_POSITIONS: return "MID"
    if p in FWD_POSITIONS: return "FWD"
    if "GK" in p or "KEEPER" in p: return "GK"
    if any(x in p for x in ["BACK", "CB", "DEF"]): return "DEF"
    if any(x in p for x in ["MID", "CM", "DM", "AM"]): return "MID"
    return "FWD"


def load_csv_from_zip(zf: zipfile.ZipFile, filename: str) -> list[dict]:
    with zf.open(filename) as f:
        text = io.TextIOWrapper(f, encoding="utf-8")
        return list(csv.DictReader(text))


def build_nation_index(rows: list[dict]) -> dict[int, list[dict]]:
    """Group players by nation_team_id."""
    index: dict[int, list[dict]] = {}
    for row in rows:
        raw_id = row.get("nation_team_id", "").strip()
        if not raw_id:
            continue
        try:
            nation_id = int(float(raw_id))
        except ValueError:
            continue
        nation_pos = row.get("nation_position", "").strip()
        pos_raw = nation_pos if nation_pos and nation_pos.upper() != "SUB" else row.get("player_positions", "").split(",")[0].strip()
        player = parse_player(row, position_override=pos_raw)
        if player:
            index.setdefault(nation_id, []).append(player)
    return index


def build_squad_index(rows: list[dict]) -> dict[int, list[dict]]:
    """Group players by club sofifa_id."""
    index: dict[int, list[dict]] = {}
    for row in rows:
        raw_id = row.get("club_team_id", "").strip()
        if not raw_id:
            continue
        try:
            club_id = int(float(raw_id))
        except ValueError:
            continue
        player = parse_player(row)
        if player:
            index.setdefault(club_id, []).append(player)
    return index


def parse_player(row: dict, position_override: str = ""):
    try:
        sofifa_id = row.get("sofifa_id", "").strip()
        name = row.get("short_name", "").strip()
        long_name = row.get("long_name", "").strip()
        positions_raw = row.get("player_positions", "").strip()
        overall = int(row.get("overall", 0))
        nationality = row.get("nationality_name", "").strip()
        photo_url = row.get("player_face_url", "").strip()

        if not name or not overall:
            return None

        primary_pos = position_override or (positions_raw.split(",")[0].strip() if positions_raw else "MID")

        return {
            "id": sofifa_id or name.lower().replace(" ", "-"),
            "name": long_name or name,
            "position": primary_pos,
            "positionGroup": pos_group(primary_pos),
            "rating": overall,
            "nationality": nationality,
            "photoUrl": photo_url,
        }
    except Exception:
        return None


def compute_squad_stats(players: list[dict]) -> dict:
    by_group = {"GK": [], "DEF": [], "MID": [], "FWD": []}
    for p in players:
        g = p.get("positionGroup", "MID")
        if g in by_group:
            by_group[g].append(p["rating"])

    if (len(by_group["GK"]) < 1 or len(by_group["DEF"]) < 4
            or len(by_group["MID"]) < 3 or len(by_group["FWD"]) < 3):
        all_ratings = [p["rating"] for p in players]
        if not all_ratings:
            return {"min": 60, "max": 99, "mean": 75, "samples": []}
        avg = sum(all_ratings) / len(all_ratings)
        return {"min": min(all_ratings), "max": max(all_ratings), "mean": avg, "samples": []}

    samples = []
    for _ in range(5000):
        lineup = (
            [random.choice(by_group["GK"])]
            + random.sample(by_group["DEF"], 4)
            + random.sample(by_group["MID"], 3)
            + random.sample(by_group["FWD"], 3)
        )
        samples.append(sum(lineup) / 11)

    samples.sort()
    return {
        "min": samples[0],
        "max": samples[-1],
        "mean": sum(samples) / len(samples),
        "p10": samples[int(len(samples) * 0.10)],
        "p25": samples[int(len(samples) * 0.25)],
        "p50": samples[int(len(samples) * 0.50)],
        "p75": samples[int(len(samples) * 0.75)],
        "p90": samples[int(len(samples) * 0.90)],
        "samples": samples[::50],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", required=True, help="Path to fifa-22-complete-player-dataset.zip")
    args = parser.parse_args()

    zip_path = Path(args.zip).expanduser()
    if not zip_path.exists():
        raise SystemExit(f"Zip not found: {zip_path}")

    out_dir = OUT_DIR.resolve()
    squads_dir = out_dir / "squads"
    squads_dir.mkdir(parents=True, exist_ok=True)

    # Write clubs.json
    clubs_out = [{k: v for k, v in c.items() if k != "sofifa_id"} for c in CLUBS]
    (out_dir / "clubs.json").write_text(json.dumps(clubs_out, indent=2, ensure_ascii=False))
    print(f"Wrote clubs.json ({len(clubs_out)} clubs)")

    with zipfile.ZipFile(zip_path) as zf:
        available = set(zf.namelist())

        # Load each unique CSV once — build both club and nation indexes
        csv_cache: dict[str, dict[int, list[dict]]] = {}
        nation_cache: dict[str, dict[int, list[dict]]] = {}
        for era_def in ERAS:
            csv_name = era_def["csv"]
            if csv_name and csv_name not in csv_cache:
                if csv_name not in available:
                    print(f"WARNING: {csv_name} not found in zip, skipping")
                    continue
                print(f"Loading {csv_name}...")
                rows = load_csv_from_zip(zf, csv_name)
                csv_cache[csv_name] = build_squad_index(rows)
                nation_cache[csv_name] = build_nation_index(rows)
                print(f"  Loaded {sum(len(v) for v in csv_cache[csv_name].values())} club players, "
                      f"{sum(len(v) for v in nation_cache[csv_name].values())} nation players")

    for club in CLUBS:
        club_id = club["id"]
        sofifa_id = club["sofifa_id"]
        print(f"\n{club['name']}")

        for era_def in ERAS:
            era = era_def["era"]
            csv_name = era_def["csv"]
            out_file = squads_dir / f"{club_id}_{era}.json"

            if out_file.exists():
                print(f"  {era}: already exists, skipping")
                continue

            if not csv_name or csv_name not in csv_cache:
                payload = {
                    "clubId": club_id, "era": era, "label": era_def["label"],
                    "players": [], "stats": {},
                    "note": "Era predates available data. Add players manually.",
                }
                out_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
                print(f"  {era}: no data — wrote placeholder")
                continue

            players = csv_cache[csv_name].get(sofifa_id, [])
            players_sorted = sorted(players, key=lambda p: p["rating"], reverse=True)
            stats = compute_squad_stats(players_sorted)
            payload = {
                "clubId": club_id, "era": era, "label": era_def["label"],
                "players": players_sorted, "stats": stats,
            }
            out_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
            print(f"  {era}: {len(players_sorted)} players, avg={stats.get('mean', 0):.1f}")

    # ── Nations ───────────────────────────────────────────────────────────────
    nations_dir = out_dir / "nations"
    nations_dir.mkdir(parents=True, exist_ok=True)

    nations_out = [{k: v for k, v in n.items() if k != "nation_team_id"} for n in NATIONS]
    (out_dir / "nations.json").write_text(json.dumps(nations_out, indent=2, ensure_ascii=False))
    print(f"\nWrote nations.json ({len(nations_out)} nations)")

    for nation in NATIONS:
        nation_id = nation["id"]
        team_id = nation["nation_team_id"]
        print(f"\n{nation['flag']} {nation['name']}")

        for era_def in ERAS:
            era = era_def["era"]
            csv_name = era_def["csv"]
            out_file = nations_dir / f"{nation_id}_{era}.json"

            if out_file.exists():
                print(f"  {era}: already exists, skipping")
                continue

            if not csv_name or csv_name not in nation_cache:
                payload = {
                    "clubId": nation_id, "era": era, "label": era_def["label"],
                    "players": [], "stats": {},
                    "note": "Era predates available data.",
                }
                out_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
                print(f"  {era}: no data — wrote placeholder")
                continue

            players = nation_cache[csv_name].get(team_id, [])
            players_sorted = sorted(players, key=lambda p: p["rating"], reverse=True)
            stats = compute_squad_stats(players_sorted)
            payload = {
                "clubId": nation_id, "era": era, "label": era_def["label"],
                "players": players_sorted, "stats": stats,
            }
            out_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
            print(f"  {era}: {len(players_sorted)} players, avg={stats.get('mean', 0):.1f}")

    print("\nDone!")


if __name__ == "__main__":
    main()
