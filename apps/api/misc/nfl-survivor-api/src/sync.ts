import { Router, type IRequest } from 'itty-router';
import type { Env, GameStatus } from './types';
import { getUserId } from './auth';
import { createSupabaseClient } from './supabase';
import { requireCommissioner } from './leagues';
import { fetchScoreboard, syncScores, ESPN_SEASON_TYPE } from './espn';

export const adminRouter = Router({ base: '/admin' });

const REGULAR_SEASON_WEEKS = 18;

/**
 * POST /admin/sync-schedule — body: { league_id }. Creates the 18 regular-season
 * `weeks` rows (if missing) and upserts their `games` from ESPN. Commissioner-triggered,
 * one-time per league (safe to re-run — upserts by week_number / espn_event_id).
 * Runs entirely under the caller's own JWT — `weeks`/`games` writes are authorized by
 * the `*_insert_commissioner`/`*_update_commissioner` RLS policies.
 *
 * Batches every Supabase call across all 18 weeks (one select, one bulk insert, one bulk
 * upsert) instead of looping per-week — Cloudflare Workers caps a single invocation at 50
 * subrequests, and the naive per-week version (~4 requests × 18 weeks) blew well past that.
 * The 18 ESPN scoreboard fetches themselves can't be batched (one request per week is
 * ESPN's own API shape), so keeping every other call to a handful is what keeps this under
 * budget: ~6 Supabase calls + 18 ESPN fetches ≈ 24 total, vs. ~77 before.
 */
adminRouter.post('/sync-schedule', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );
  const body: { league_id: string } = await request.json();
  if (!body.league_id)
    return Response.json({ error: 'league_id is required' }, { status: 400 });

  await requireCommissioner(supabase, body.league_id, userId);

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, season_year, current_week_id')
    .eq('id', body.league_id)
    .single();
  if (leagueError || !league)
    return Response.json({ error: 'League not found' }, { status: 404 });

  const { data: existingWeeks, error: existingWeeksError } = await supabase
    .from('weeks')
    .select('id, week_number')
    .eq('league_id', league.id)
    .eq('phase', 'regular');
  if (existingWeeksError)
    return Response.json(
      { error: existingWeeksError.message },
      { status: 500 }
    );

  const weekIdByNumber = new Map<number, string>(
    (existingWeeks ?? []).map((w) => [w.week_number as number, w.id])
  );

  const missingWeekNumbers = Array.from(
    { length: REGULAR_SEASON_WEEKS },
    (_, i) => i + 1
  ).filter((n) => !weekIdByNumber.has(n));

  if (missingWeekNumbers.length > 0) {
    const { data: insertedWeeks, error: insertWeeksError } = await supabase
      .from('weeks')
      .insert(
        missingWeekNumbers.map((weekNumber) => ({
          league_id: league.id,
          season_year: league.season_year,
          phase: 'regular' as const,
          week_number: weekNumber,
          espn_week_number: weekNumber,
          espn_season_type: ESPN_SEASON_TYPE.REGULAR,
          sort_order: weekNumber,
        }))
      )
      .select('id, week_number');
    if (insertWeeksError)
      return Response.json(
        { error: insertWeeksError.message },
        { status: 500 }
      );
    for (const w of insertedWeeks ?? []) {
      weekIdByNumber.set(w.week_number as number, w.id);
    }
  }

  const allGames: Array<{
    week_id: string;
    espn_event_id: string;
    home_team_code: string;
    away_team_code: string;
    kickoff_time: string;
    status: GameStatus;
    home_score: number | null;
    away_score: number | null;
    winner_team_code: string | null;
  }> = [];

  for (let weekNumber = 1; weekNumber <= REGULAR_SEASON_WEEKS; weekNumber++) {
    const weekId = weekIdByNumber.get(weekNumber)!;
    const games = await fetchScoreboard(
      league.season_year,
      ESPN_SEASON_TYPE.REGULAR,
      weekNumber
    );
    for (const g of games) {
      allGames.push({
        week_id: weekId,
        espn_event_id: g.espnEventId,
        home_team_code: g.homeTeamCode,
        away_team_code: g.awayTeamCode,
        kickoff_time: g.kickoffTime,
        status: g.status,
        home_score: g.homeScore,
        away_score: g.awayScore,
        winner_team_code: g.winnerTeamCode,
      });
    }
  }

  if (allGames.length > 0) {
    const { error: gamesError } = await supabase
      .from('games')
      .upsert(allGames, { onConflict: 'week_id,espn_event_id' });
    if (gamesError)
      return Response.json({ error: gamesError.message }, { status: 500 });
  }

  // Point the league at week 1 if it doesn't have a current week yet.
  if (!league.current_week_id) {
    const firstWeekId = weekIdByNumber.get(1);
    if (firstWeekId) {
      await supabase
        .from('leagues')
        .update({ current_week_id: firstWeekId })
        .eq('id', league.id);
    }
  }

  return Response.json({
    synced: true,
    weeks_created: missingWeekNumbers.length,
  });
});

/**
 * POST /admin/sync-scores — body: { league_id }. Commissioner-triggered live-score
 * refresh for their own league, run under their own JWT (see espn.ts — no cron/global
 * sync path exists, since that would need a credential with no single commissioner
 * behind it; refreshing is a manual "Refresh scores" button in the commissioner panel).
 */
adminRouter.post('/sync-scores', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );
  const body: { league_id: string } = await request.json();
  if (!body.league_id)
    return Response.json({ error: 'league_id is required' }, { status: 400 });

  await requireCommissioner(supabase, body.league_id, userId);
  await syncScores(supabase, body.league_id);
  return Response.json({ synced: true });
});
