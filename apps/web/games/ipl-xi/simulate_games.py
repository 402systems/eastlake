#!/usr/bin/env python3
"""
Simulate 50 IPL fantasy team-building games with random player picks.
"""
import json
import random
from pathlib import Path
from collections import defaultdict

DATA_DIR = Path("/Users/keshavc/projects/eastlake/apps/web/games/ipl-xi/public/data")

# Tier scale: avg percentile → tier score
def get_tier(avg_percentile):
    if avg_percentile >= 97:
        return 14
    elif avg_percentile >= 92:
        return 13
    elif avg_percentile >= 86:
        return 12
    elif avg_percentile >= 79:
        return 11
    elif avg_percentile >= 71:
        return 10
    elif avg_percentile >= 63:
        return 9
    elif avg_percentile >= 55:
        return 8
    elif avg_percentile >= 47:
        return 7
    elif avg_percentile >= 39:
        return 6
    elif avg_percentile >= 31:
        return 5
    elif avg_percentile >= 24:
        return 4
    elif avg_percentile >= 17:
        return 3
    elif avg_percentile >= 11:
        return 2
    elif avg_percentile >= 6:
        return 1
    else:
        return 0

def load_data():
    """Load teams and all squads."""
    with open(DATA_DIR / "teams.json") as f:
        teams = json.load(f)

    # Build list of available team-year combos
    team_year_combos = []
    for team in teams:
        for year in team["years"]:
            team_year_combos.append((team["id"], year))

    # Load all squads
    squads = {}
    for team_id, year in team_year_combos:
        try:
            with open(DATA_DIR / "squads" / f"{team_id}_{year}.json") as f:
                squads[(team_id, year)] = json.load(f)
        except FileNotFoundError:
            pass

    return team_year_combos, squads

def simulate_one_game(team_year_combos, squads):
    """
    Simulate one game:
    1. Pick 5 unique team-year combos
    2. Fill slots: OPENER, MIDDLE_ORDER, ALL_ROUNDER, SPIN_BOWLER, PACE_BOWLER
    3. For each squad, pick a random player for an unfilled slot
    4. Return average globalPercentile
    """
    slots_to_fill = {
        "OPENER",
        "MIDDLE_ORDER",
        "ALL_ROUNDER",
        "SPIN_BOWLER",
        "PACE_BOWLER",
    }

    picked_players = {}  # role -> player object

    # Try to fill all slots using random team-year combos
    available_combos = list(team_year_combos)
    random.shuffle(available_combos)

    combo_index = 0
    while slots_to_fill and combo_index < len(available_combos):
        combo = available_combos[combo_index]
        combo_index += 1

        if combo not in squads:
            continue

        squad = squads[combo]
        players = squad["players"]

        # Find players whose role can fill any unfilled slot
        eligible_players = [p for p in players if p["role"] in slots_to_fill]

        if not eligible_players:
            continue

        # Pick a random eligible player
        picked = random.choice(eligible_players)

        # Assign to their role (or pick a random matching slot if multiple available)
        slots_for_role = [s for s in slots_to_fill if s == picked["role"]]
        if slots_for_role:
            slot = slots_for_role[0]
            picked_players[slot] = picked
            slots_to_fill.remove(slot)

    # If we couldn't fill all slots, return None
    if slots_to_fill:
        return None

    # Compute average percentile
    percentiles = [p["globalPercentile"] for p in picked_players.values()]
    avg_percentile = sum(percentiles) / len(percentiles)

    return avg_percentile

def main():
    team_year_combos, squads = load_data()

    print(f"Total team-year combos: {len(team_year_combos)}")
    print(f"Total loaded squads: {len(squads)}")
    print()

    # Simulate 50 games
    avg_percentiles = []
    tier_scores = []

    for game_num in range(50):
        avg = simulate_one_game(team_year_combos, squads)
        if avg is not None:
            avg_percentiles.append(avg)
            tier = get_tier(avg)
            tier_scores.append(tier)

    print(f"Successful games: {len(avg_percentiles)}/50")
    print()

    # Distribution of tier scores
    tier_dist = defaultdict(int)
    for tier in tier_scores:
        tier_dist[tier] += 1

    print("TIER SCORE DISTRIBUTION (0-14):")
    for tier in sorted(tier_dist.keys()):
        print(f"  Tier {tier:2d}: {tier_dist[tier]:2d} games")
    print()

    # Distribution of avg percentile (bucketed by 10s)
    percentile_dist = defaultdict(int)
    for avg in avg_percentiles:
        bucket = int(avg // 10) * 10
        if bucket > 90:
            bucket = 90
        percentile_dist[bucket] += 1

    print("AVG PERCENTILE DISTRIBUTION (bucketed by 10s):")
    for bucket in sorted(percentile_dist.keys()):
        label = f"{bucket}-{bucket+9}" if bucket < 90 else "90-100"
        print(f"  {label}: {percentile_dist[bucket]:2d} games")
    print()

    # Stats
    min_avg = min(avg_percentiles)
    max_avg = max(avg_percentiles)
    mean_avg = sum(avg_percentiles) / len(avg_percentiles)

    print("STATISTICS:")
    print(f"  Min avg percentile:  {min_avg:.2f}")
    print(f"  Max avg percentile:  {max_avg:.2f}")
    print(f"  Mean avg percentile: {mean_avg:.2f}")

if __name__ == "__main__":
    main()
