#!/usr/bin/env python3
"""
IPL data scraper for ipl-xi game.

Downloads ball-by-ball IPL match data from cricsheet.org, computes
per-player per-team per-season statistics, and classifies players into
5 roles:
  OPENER       - bats at positions 1-2
  MIDDLE_ORDER - bats at positions 3-4
  ALL_ROUNDER  - bats at positions 5-6
  SPIN_BOWLER  - primary spinner
  PACE_BOWLER  - primary pace bowler

Usage: python scrape.py
"""

import csv
import io
import json
import re
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path

CRICSHEET_URL = "https://cricsheet.org/downloads/ipl_csv2.zip"
OUTPUT_DIR = Path(__file__).parent.parent.parent / "apps/web/games/ipl-xi/public/data"

SEASON_YEAR = {"2007/08": "2008", "2009/10": "2010", "2020/21": "2020"}

TEAM_SLUGS = {
    "Mumbai Indians": "mi",
    "Chennai Super Kings": "csk",
    "Royal Challengers Bangalore": "rcb",
    "Royal Challengers Bengaluru": "rcb",
    "Kolkata Knight Riders": "kkr",
    "Delhi Daredevils": "dc",
    "Delhi Capitals": "dc",
    "Kings XI Punjab": "pbks",
    "Punjab Kings": "pbks",
    "Rajasthan Royals": "rr",
    "Deccan Chargers": "dcan",
    "Sunrisers Hyderabad": "srh",
    "Kochi Tuskers Kerala": "ktk",
    "Pune Warriors India": "pwi",
    "Pune Warriors": "pwi",
    "Rising Pune Supergiant": "rps",
    "Rising Pune Supergiants": "rps",
    "Gujarat Lions": "gl",
    "Gujarat Titans": "gt",
    "Lucknow Super Giants": "lsg",
}

TEAM_META = {
    "mi":   {"name": "Mumbai Indians",             "shortName": "MI",   "color": "#004BA0"},
    "csk":  {"name": "Chennai Super Kings",         "shortName": "CSK",  "color": "#F7B318"},
    "rcb":  {"name": "Royal Challengers Bangalore", "shortName": "RCB",  "color": "#C41E3A"},
    "kkr":  {"name": "Kolkata Knight Riders",       "shortName": "KKR",  "color": "#3A225D"},
    "dc":   {"name": "Delhi Capitals",              "shortName": "DC",   "color": "#17479E"},
    "pbks": {"name": "Punjab Kings",                "shortName": "PBKS", "color": "#E72C32"},
    "rr":   {"name": "Rajasthan Royals",            "shortName": "RR",   "color": "#254AA5"},
    "srh":  {"name": "Sunrisers Hyderabad",         "shortName": "SRH",  "color": "#F26522"},
    "dcan": {"name": "Deccan Chargers",             "shortName": "DCH",  "color": "#1C4E9D"},
    "ktk":  {"name": "Kochi Tuskers Kerala",        "shortName": "KTK",  "color": "#E87722"},
    "pwi":  {"name": "Pune Warriors India",         "shortName": "PWI",  "color": "#0070CF"},
    "gl":   {"name": "Gujarat Lions",               "shortName": "GL",   "color": "#FF6F00"},
    "rps":  {"name": "Rising Pune Supergiant",      "shortName": "RPS",  "color": "#7B1FA2"},
    "gt":   {"name": "Gujarat Titans",              "shortName": "GT",   "color": "#1C3E73"},
    "lsg":  {"name": "Lucknow Super Giants",        "shortName": "LSG",  "color": "#00A19D"},
}

# Exact cricsheet player names that are spin bowlers.
# Gathered from inspecting generated squad data + known IPL history.
KNOWN_SPINNERS = {
    # Off-break / off-spin
    "R Ashwin", "Harbhajan Singh", "Washington Sundar", "Krishnappa Gowtham",
    "M Muralitharan", "SP Narine", "Varun Chakravarthy", "CV Varun",
    "M Siddharth", "Shoaib Malik", "Mohammad Hafeez", "M Hafeez",
    "Saeed Ajmal", "KP Appanna", "S Randiv", "SB Jakati",
    "Pawan Negi", "K Gowtham",
    # Leg-break / wrist-spin
    "YS Chahal", "A Mishra", "PP Chawla", "Rashid Khan",
    "Imran Tahir", "Kuldeep Yadav", "Ravi Bishnoi", "R Bishnoi",
    "A Zampa", "M Swepson", "Pravin Tambe", "PV Tambe",
    "Karn Sharma", "S Gopal", "Mujeeb Ur Rahman", "Noor Ahmad",
    "Sandeep Lamichhane", "S Lamichhane", "Ish Sodhi",
    "M Markande", "RD Chahar", "R Tewatia", "A Kumble",
    "SK Warne", "GB Hogg", "DJ Hogg", "PWH de Silva",
    "MJ Santner", "K Kartikeya",
    # Slow left-arm
    "RA Jadeja", "Axar Patel", "AR Patel", "PP Ojha",
    "M Kartik", "Murali Kartik", "KH Pandya", "Krunal Pandya",
    "Iqbal Abdulla", "S Ladda", "Shakib Al Hasan",
    "Moeen Ali", "MJ Ali",
}


# Batting all-rounders who bowl enough to trip the primary-bowler threshold
# but whose primary value is with the bat at positions 5-6.
KNOWN_BATTING_ALLROUNDERS = {
    "HH Pandya",   # Hardik Pandya — bats #5 for MI, bowls enough to trip the 8-over threshold
}

# Pace bowlers whose name might accidentally match a spinner rule
KNOWN_PACERS = {
    "MM Patel", "YK Pathan", "KA Pollard", "DJ Bravo", "Irfan Pathan",
    "IK Pathan", "RP Singh", "Z Khan", "A Nehra", "MG Johnson",
    "JJ Bumrah", "SL Malinga", "B Kumar", "Mohammed Shami", "Bhuvneshwar Kumar",
    "UT Yadav", "VR Aaron", "Dhawal Kulkarni", "DL Vettori",
}


def is_spinner(name: str, stumpings: int, total_overs: float) -> bool:
    """True if this bowler is a spinner."""
    if name in KNOWN_PACERS:
        return False
    # Stumpings from a bowler with meaningful overs strongly indicate spin
    if stumpings >= 2 and total_overs >= 6:
        return True
    if stumpings >= 1 and total_overs >= 12:
        return True
    # Exact name match against known spinners
    name_l = name.lower()
    for s in KNOWN_SPINNERS:
        if s.lower() == name_l:
            return True
    return False


def normalize_season(season: str) -> str:
    if season in SEASON_YEAR:
        return SEASON_YEAR[season]
    y = season.split("/")[0].strip()
    return y if y.isdigit() else ""


def slugify(name: str) -> str:
    s = re.sub(r"['\"]", "", name.lower())
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def _int(v) -> int:
    try:
        return int(v) if v and str(v).strip() else 0
    except Exception:
        return 0


def download_cricsheet() -> bytes:
    print("Downloading IPL data from cricsheet.org…", flush=True)
    req = urllib.request.Request(CRICSHEET_URL, headers={"User-Agent": "ipl-xi/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        data = r.read()
    print(f"  {len(data)/1e6:.1f} MB downloaded", flush=True)
    return data


def parse_matches(zip_bytes: bytes) -> dict:
    stats = defaultdict(lambda: {
        "bat_innings": [],
        "bowl_spells": [],
        "matches_bat": set(),
        "matches_bowl": set(),
    })
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        csv_files = [n for n in zf.namelist() if n.endswith(".csv") and "info" not in n]
        print(f"  {len(csv_files)} match files", flush=True)
        for fname in csv_files:
            with zf.open(fname) as f:
                _parse_match(f.read().decode("utf-8", errors="replace"), stats)
    return stats


def _parse_match(content: str, stats: dict):
    rows = list(csv.DictReader(io.StringIO(content)))
    if not rows:
        return
    year = normalize_season(rows[0].get("season", "").strip())
    if not year:
        return
    match_id = rows[0].get("match_id", "") or str(abs(hash(content[:120])))

    # ── Pass 1: batting order per innings ──────────────────────────────────
    # key = (match_id, innings_num, batting_team_slug)
    order: dict = {}       # key → {player: position}
    counter: dict = {}     # key → int

    for row in rows:
        bat_slug = TEAM_SLUGS.get(row.get("batting_team", "").strip())
        if not bat_slug:
            continue
        inn = row.get("innings", "").strip()
        striker = row.get("striker", "").strip()
        if not inn or not striker:
            continue
        k = (match_id, inn, bat_slug)
        if k not in order:
            order[k] = {}
            counter[k] = 0
        if striker not in order[k]:
            counter[k] += 1
            # Cap at 11 — guard against super-over / data quirks
            order[k][striker] = min(counter[k], 11)

    # ── Pass 2: batting stats ──────────────────────────────────────────────
    bat_data: dict = defaultdict(lambda: {
        "seen": set(), "positions": [], "runs": 0,
        "balls": 0, "fours": 0, "sixes": 0, "dismissed": 0, "innings": 0,
    })

    for row in rows:
        bat_slug = TEAM_SLUGS.get(row.get("batting_team", "").strip())
        if not bat_slug:
            continue
        inn = row.get("innings", "").strip()
        striker = row.get("striker", "").strip()
        if not inn or not striker:
            continue

        wides = _int(row.get("wides", ""))
        noballs = _int(row.get("noballs", ""))
        runs_bat = _int(row.get("runs_off_bat", ""))
        extras = _int(row.get("extras", ""))
        is_legal = wides == 0 and noballs == 0
        dismissed = (
            row.get("player_dismissed", "").strip() == striker
            and bool(row.get("wicket_type", "").strip())
        )

        b = bat_data[(bat_slug, striker)]
        seen_key = (match_id, inn)
        if seen_key not in b["seen"]:
            b["seen"].add(seen_key)
            b["innings"] += 1
            pos = order.get((match_id, inn, bat_slug), {}).get(striker, 99)
            # Only trust position if it looks sane
            if 1 <= pos <= 11:
                b["positions"].append(pos)

        b["runs"] += runs_bat
        if is_legal:
            b["balls"] += 1
        if runs_bat == 4 and extras == 0:
            b["fours"] += 1
        if runs_bat == 6 and extras == 0:
            b["sixes"] += 1
        if dismissed:
            b["dismissed"] += 1

    for (bat_slug, pname), pd in bat_data.items():
        if pd["innings"] == 0:
            continue
        avg_pos = sum(pd["positions"]) / len(pd["positions"]) if pd["positions"] else 99.0
        stats[(bat_slug, year, pname)]["bat_innings"].append({
            "avg_pos": avg_pos,
            "runs": pd["runs"],
            "balls": pd["balls"],
            "fours": pd["fours"],
            "sixes": pd["sixes"],
            "innings": pd["innings"],
            "dismissed": pd["dismissed"],
        })
        stats[(bat_slug, year, pname)]["matches_bat"].add(match_id)

    # ── Pass 3: bowling stats ──────────────────────────────────────────────
    bowl_data: dict = defaultdict(lambda: [0, 0, 0, 0])  # balls, runs, wkts, stumpings

    for row in rows:
        bowl_slug = TEAM_SLUGS.get(row.get("bowling_team", "").strip())
        if not bowl_slug:
            continue
        bowler = row.get("bowler", "").strip()
        if not bowler:
            continue

        wides = _int(row.get("wides", ""))
        noballs = _int(row.get("noballs", ""))
        is_legal = wides == 0 and noballs == 0
        runs_bat = _int(row.get("runs_off_bat", ""))
        extras = _int(row.get("extras", ""))
        wkt_type = row.get("wicket_type", "").strip()
        non_bat = {"run out", "retired hurt", "retired out", "obstructing the field", ""}
        is_wkt = bool(wkt_type) and wkt_type not in non_bat and bool(row.get("player_dismissed", "").strip())

        d = bowl_data[(bowl_slug, bowler)]
        d[0] += 1 if is_legal else 0
        d[1] += runs_bat + extras
        d[2] += 1 if is_wkt else 0
        d[3] += 1 if wkt_type == "stumped" else 0

    for (bowl_slug, pname), (balls, runs, wkts, stumpings) in bowl_data.items():
        if balls < 6:
            continue
        stats[(bowl_slug, year, pname)]["bowl_spells"].append(
            {"balls": balls, "runs": runs, "wickets": wkts, "stumpings": stumpings}
        )
        stats[(bowl_slug, year, pname)]["matches_bowl"].add(match_id)


def classify_role(avg_bat_pos, total_innings, total_overs, stumpings, name, matches_bowl=0):
    """Assign one of the five game roles.

    Definition of an ALL_ROUNDER (and the batting roles in general): a player is
    defined by where they bat. Someone who bats in the top six is a batter —
    OPENER (1-2), MIDDLE_ORDER (3-4) or ALL_ROUNDER / finisher (5-6) — even if
    they roll their arm over for a few overs. Only a *frontline* bowler (one who
    carries a real bowling workload) is classified into a bowling slot. This
    stops part-time-bowling batters like KA Pollard from being miscast as pace
    bowlers just because they cleared a low season-overs threshold.
    """
    overs_per_bowl_match = total_overs / matches_bowl if matches_bowl else 0.0
    bats_top_six = total_innings >= 3 and avg_bat_pos <= 6.5

    # A frontline bowler carries a genuine workload — multiple overs every time
    # they bowl, across a meaningful season total. Part-time bowlers fall short.
    is_frontline_bowler = total_overs >= 20 and overs_per_bowl_match >= 2.0
    is_spin = is_spinner(name, stumpings, total_overs)
    # Named frontline spinners — the only top-six batters we keep as bowlers.
    # (is_spinner's stumping heuristic would otherwise sweep in part-time
    # spinners like Raina/Maxwell/Yuvraj who are really batters.)
    name_l = name.lower()
    is_named_spinner = any(s.lower() == name_l for s in KNOWN_SPINNERS)

    def position_role():
        if avg_bat_pos <= 2.5:
            return "OPENER"
        if avg_bat_pos <= 4.5:
            return "MIDDLE_ORDER"
        return "ALL_ROUNDER"

    def bowler_role():
        return "SPIN_BOWLER" if is_spin else "PACE_BOWLER"

    # Known batting all-rounders are always classified by their batting position.
    if name in KNOWN_BATTING_ALLROUNDERS and total_innings >= 3:
        return position_role()

    # A top-six batter is defined by their batting role — the part-time overs
    # they bowl do NOT demote them to a bowler (e.g. Pollard, Gayle, Raina,
    # Russell, Watson). The sole exception is a frontline *spinner* who bats up
    # the order (Jadeja, Axar, Narine, Krunal): a team genuinely fields them as
    # its spinner, and there's no batting-spin-allrounder slot to hold them.
    if bats_top_six:
        if is_named_spinner and is_frontline_bowler:
            return "SPIN_BOWLER"
        return position_role()

    # Not a top-six bat: classify as a bowler if they bowl enough.
    if is_frontline_bowler or total_overs >= 8 or total_overs >= 4:
        return bowler_role()

    return None


def aggregate_player(name: str, entries: dict):
    bat = entries["bat_innings"]
    bowl = entries["bowl_spells"]
    matches_bat = len(entries["matches_bat"])
    matches_bowl = len(entries["matches_bowl"])
    matches = max(matches_bat, matches_bowl)

    if matches < 5:
        return None

    # Batting
    total_runs = sum(b["runs"] for b in bat)
    total_balls = sum(b["balls"] for b in bat)
    total_innings = sum(b["innings"] for b in bat)
    total_dismissed = sum(b["dismissed"] for b in bat)
    avg_bat_pos = (
        sum(b["avg_pos"] * b["innings"] for b in bat) / total_innings
        if total_innings > 0 else 99.0
    )
    bat_avg = total_runs / total_dismissed if total_dismissed > 0 else (
        total_runs if total_innings > 0 else 0
    )
    bat_sr = total_runs / total_balls * 100 if total_balls > 0 else 0

    # Bowling
    total_bowl_balls = sum(b["balls"] for b in bowl)
    total_bowl_runs = sum(b["runs"] for b in bowl)
    total_wickets = sum(b["wickets"] for b in bowl)
    total_stumpings = sum(b["stumpings"] for b in bowl)
    total_overs = total_bowl_balls / 6
    economy = total_bowl_runs / total_overs if total_overs > 0 else 0
    bowl_avg = total_bowl_runs / total_wickets if total_wickets > 0 else 99.0

    role = classify_role(avg_bat_pos, total_innings, total_overs, total_stumpings, name, matches_bowl)
    if not role:
        return None

    rating = compute_rating(
        role, total_runs, total_innings, bat_avg, bat_sr,
        total_wickets, matches_bowl, economy, bowl_avg, total_overs,
    )

    result = {"id": slugify(name), "name": name, "role": role,
              "rating": rating, "matches": matches}

    if total_innings >= 3:
        result["runs"] = total_runs
        result["average"] = round(bat_avg, 1)
        result["strikeRate"] = round(bat_sr, 1)

    if total_overs >= 4:
        result["wickets"] = total_wickets
        result["economy"] = round(economy, 2)
        if total_wickets > 0:
            result["bowlingAverage"] = round(bowl_avg, 1)

    return result


def compute_rating(role, runs, innings, bat_avg, bat_sr,
                   wickets, matches_bowl, economy, bowl_avg, total_overs) -> int:

    def norm(v, lo, hi):
        return max(0.0, min(1.0, (v - lo) / (hi - lo) if hi != lo else 0.0))

    if role == "OPENER":
        rpi = runs / innings if innings > 0 else 0
        raw = norm(rpi, 5, 42) * 0.30 + norm(bat_avg, 10, 55) * 0.40 + norm(bat_sr, 100, 175) * 0.30

    elif role == "MIDDLE_ORDER":
        rpi = runs / innings if innings > 0 else 0
        raw = norm(rpi, 5, 38) * 0.28 + norm(bat_avg, 10, 50) * 0.36 + norm(bat_sr, 105, 170) * 0.36

    elif role == "ALL_ROUNDER":
        rpi = runs / innings if innings > 0 else 0
        bat_raw = norm(rpi, 3, 32) * 0.28 + norm(bat_avg, 8, 42) * 0.30 + norm(bat_sr, 115, 185) * 0.42
        if total_overs >= 6 and wickets > 0:
            wpm = wickets / matches_bowl if matches_bowl > 0 else 0
            bowl_raw = norm(wpm, 0, 1.5) * 0.45 + norm(economy, 11, 6) * 0.35 + norm(bowl_avg, 35, 15) * 0.20
            raw = bat_raw * 0.65 + bowl_raw * 0.35
        else:
            raw = bat_raw

    else:  # SPIN_BOWLER or PACE_BOWLER
        wpm = wickets / matches_bowl if matches_bowl > 0 else 0
        raw = norm(wpm, 0, 1.8) * 0.45 + norm(economy, 11, 6) * 0.30 + norm(bowl_avg, 40, 15) * 0.25

    return round(40 + raw * 58)


def build_squad(team_slug, year, players):
    ratings = [p["rating"] for p in players]
    return {
        "teamId": team_slug,
        "year": year,
        "label": f"{TEAM_META[team_slug]['name']} {year}",
        "players": players,
        "stats": {"min": min(ratings), "max": max(ratings),
                  "mean": round(sum(ratings) / len(ratings), 1)},
    }


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "squads").mkdir(exist_ok=True)

    zip_bytes = download_cricsheet()

    print("Parsing…", flush=True)
    raw = parse_matches(zip_bytes)
    print(f"  {len(raw)} player-team-year entries", flush=True)

    by_ty = defaultdict(list)
    for (team_slug, year, name), entries in raw.items():
        if team_slug not in TEAM_META:
            continue
        p = aggregate_player(name, entries)
        if p:
            by_ty[(team_slug, year)].append(p)

    REQUIRED = {"OPENER", "MIDDLE_ORDER", "ALL_ROUNDER", "SPIN_BOWLER", "PACE_BOWLER"}
    teams_seen = defaultdict(set)
    written = skipped = 0

    # First pass: filter valid squads and collect all players per role globally
    valid_squads = []
    global_ratings: dict = defaultdict(list)  # role -> [rating, ...]

    for (ts, yr), players in sorted(by_ty.items()):
        roles = {p["role"] for p in players}
        missing = REQUIRED - roles
        if missing:
            skipped += 1
            print(f"  SKIP {ts}_{yr}: missing {missing}", flush=True)
            continue
        valid_squads.append((ts, yr, players))
        for p in players:
            global_ratings[p["role"]].append(p["rating"])

    # Second pass: stamp global_percentile onto every player then write
    for role, ratings in global_ratings.items():
        ratings.sort()

    def global_pct(rating, role):
        ratings = global_ratings[role]
        n = len(ratings)
        if n <= 1:
            return 100
        below = sum(1 for r in ratings if r < rating)
        equal = sum(1 for r in ratings if r == rating)
        mid_rank = below + (equal - 1) / 2
        return round(mid_rank / (n - 1) * 100)

    for (ts, yr, players) in valid_squads:
        for p in players:
            p["globalPercentile"] = global_pct(p["rating"], p["role"])
        out = OUTPUT_DIR / "squads" / f"{ts}_{yr}.json"
        out.write_text(json.dumps(build_squad(ts, yr, players), indent=2))
        written += 1
        teams_seen[ts].add(int(yr))

    print(f"\n  Wrote {written} squad files  ({skipped} skipped)", flush=True)

    teams = [
        {"id": s, **{k: v for k, v in TEAM_META[s].items()}, "years": sorted(teams_seen[s])}
        for s in TEAM_META if s in teams_seen
    ]
    teams.sort(key=lambda t: t["name"])
    (OUTPUT_DIR / "teams.json").write_text(json.dumps(teams, indent=2))
    print(f"  teams.json: {len(teams)} teams", flush=True)

    # Build seasons.json: for each year, list teams with composite scores.
    # pctComposite = avg globalPercentile of best player per role — same scale
    # as the user's avg pick percentile, so simulation and tier score align.
    ROLES = ["OPENER", "MIDDLE_ORDER", "ALL_ROUNDER", "SPIN_BOWLER", "PACE_BOWLER"]
    seasons: dict = {}
    for (ts, yr, players) in valid_squads:
        best_ratings = []
        best_pcts = []
        for role in ROLES:
            role_players = [p for p in players if p["role"] == role]
            if role_players:
                best = max(role_players, key=lambda p: p["rating"])
                best_ratings.append(best["rating"])
                best_pcts.append(best["globalPercentile"])
        if len(best_ratings) < len(ROLES):
            continue
        seasons.setdefault(yr, []).append({
            "teamId": ts,
            "teamName": TEAM_META[ts]["name"],
            "shortName": TEAM_META[ts]["shortName"],
            "composite": round(sum(best_ratings) / len(best_ratings), 1),
            "pctComposite": round(sum(best_pcts) / len(best_pcts), 1),
        })
    # Sort each year's teams by composite desc
    for yr in seasons:
        seasons[yr].sort(key=lambda t: -t["composite"])
    (OUTPUT_DIR / "seasons.json").write_text(json.dumps(seasons, indent=2))
    print(f"  seasons.json: {len(seasons)} seasons", flush=True)
    print("Done!", flush=True)


if __name__ == "__main__":
    main()
