import type { Env, GameStatus } from './types';
import { createServiceClient } from './supabase';

const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

/** ESPN's `seasontype`: 1 = preseason, 2 = regular season, 3 = postseason. */
export const ESPN_SEASON_TYPE = { REGULAR: 2, POSTSEASON: 3 } as const;

interface EspnCompetitor {
  homeAway: 'home' | 'away';
  team: { abbreviation: string };
  score?: string;
  winner?: boolean;
}

interface EspnEvent {
  id: string;
  date: string;
  competitions: Array<{
    competitors: EspnCompetitor[];
    status: { type: { completed: boolean; state: string } };
  }>;
}

export interface EspnGame {
  espnEventId: string;
  homeTeamCode: string;
  awayTeamCode: string;
  kickoffTime: string;
  status: GameStatus;
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamCode: string | null;
}

function mapStatus(state: string, completed: boolean): GameStatus {
  if (completed) return 'final';
  if (state === 'in') return 'in_progress';
  return 'scheduled';
}

/** Fetches one week's scoreboard (schedule + any live/final scores) from ESPN's public API. */
export async function fetchScoreboard(
  seasonYear: number,
  seasonType: number,
  week: number
): Promise<EspnGame[]> {
  const url = `${ESPN_SCOREBOARD_URL}?seasontype=${seasonType}&week=${week}&dates=${seasonYear}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'eastlake-nfl-survivor/1.0' },
  });
  if (!res.ok) {
    throw new Error(
      `ESPN scoreboard fetch failed: ${res.status} ${res.statusText}`
    );
  }
  const data = (await res.json()) as { events: EspnEvent[] };

  return data.events.map((event) => {
    const competition = event.competitions[0];
    const home = competition.competitors.find((c) => c.homeAway === 'home')!;
    const away = competition.competitors.find((c) => c.homeAway === 'away')!;
    const status = mapStatus(
      competition.status.type.state,
      competition.status.type.completed
    );
    const winner = competition.competitors.find((c) => c.winner === true);

    return {
      espnEventId: event.id,
      homeTeamCode: home.team.abbreviation,
      awayTeamCode: away.team.abbreviation,
      kickoffTime: event.date,
      status,
      homeScore: home.score ? Number(home.score) : null,
      awayScore: away.score ? Number(away.score) : null,
      winnerTeamCode:
        status === 'final' && winner ? winner.team.abbreviation : null,
    };
  });
}

/**
 * Refreshes scores/status/winner for games belonging to weeks that are still in play,
 * across every non-simulation league. Safe to call repeatedly (upserts by espn_event_id).
 */
export async function syncScores(env: Env): Promise<void> {
  const service = createServiceClient(env);

  const { data: weeks, error } = await service
    .from('weeks')
    .select(
      'id, season_year, espn_week_number, espn_season_type, leagues!inner(is_simulation)'
    )
    .eq('leagues.is_simulation', false)
    .not('espn_week_number', 'is', null);

  if (error || !weeks) return;

  for (const week of weeks) {
    const games = await fetchScoreboard(
      week.season_year,
      week.espn_season_type!,
      week.espn_week_number!
    );
    if (games.length === 0) continue;

    // Only touch games that aren't already final (a final result is immutable once
    // set by ESPN, except via the commissioner's explicit simulate-week override).
    await service.from('games').upsert(
      games.map((g) => ({
        week_id: week.id,
        espn_event_id: g.espnEventId,
        home_team_code: g.homeTeamCode,
        away_team_code: g.awayTeamCode,
        kickoff_time: g.kickoffTime,
        status: g.status,
        home_score: g.homeScore,
        away_score: g.awayScore,
        winner_team_code: g.winnerTeamCode,
      })),
      { onConflict: 'week_id,espn_event_id' }
    );
  }
}
