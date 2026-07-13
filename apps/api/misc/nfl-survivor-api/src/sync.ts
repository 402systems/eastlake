import { Router, type IRequest } from 'itty-router';
import type { Env } from './types';
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
    .select('id, season_year')
    .eq('id', body.league_id)
    .single();
  if (leagueError || !league)
    return Response.json({ error: 'League not found' }, { status: 404 });

  const createdWeeks: unknown[] = [];

  for (let weekNumber = 1; weekNumber <= REGULAR_SEASON_WEEKS; weekNumber++) {
    const { data: existingWeek } = await supabase
      .from('weeks')
      .select('id')
      .eq('league_id', league.id)
      .eq('phase', 'regular')
      .eq('week_number', weekNumber)
      .maybeSingle();

    let weekId = existingWeek?.id as string | undefined;
    if (!weekId) {
      const { data: week, error: weekError } = await supabase
        .from('weeks')
        .insert({
          league_id: league.id,
          season_year: league.season_year,
          phase: 'regular',
          week_number: weekNumber,
          espn_week_number: weekNumber,
          espn_season_type: ESPN_SEASON_TYPE.REGULAR,
          sort_order: weekNumber,
        })
        .select('id')
        .single();
      if (weekError)
        return Response.json({ error: weekError.message }, { status: 500 });
      weekId = week.id;
      createdWeeks.push(week);
    }

    const games = await fetchScoreboard(
      league.season_year,
      ESPN_SEASON_TYPE.REGULAR,
      weekNumber
    );
    if (games.length > 0) {
      await supabase.from('games').upsert(
        games.map((g) => ({
          week_id: weekId,
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

  // Point the league at week 1 if it doesn't have a current week yet.
  const { data: leagueRow } = await supabase
    .from('leagues')
    .select('current_week_id')
    .eq('id', league.id)
    .single();
  if (!leagueRow?.current_week_id) {
    const { data: firstWeek } = await supabase
      .from('weeks')
      .select('id')
      .eq('league_id', league.id)
      .eq('week_number', 1)
      .single();
    if (firstWeek) {
      await supabase
        .from('leagues')
        .update({ current_week_id: firstWeek.id })
        .eq('id', league.id);
    }
  }

  return Response.json({ synced: true, weeks_created: createdWeeks.length });
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
