import { Router, type IRequest } from 'itty-router';
import type { Env, PlayoffRound } from './types';
import { getUserId } from './auth';
import { createSupabaseClient, createServiceClient } from './supabase';
import { requireCommissioner } from './leagues';
import { fetchScoreboard, ESPN_SEASON_TYPE } from './espn';

export const simulateRouter = Router({ base: '/leagues' });

/**
 * POST /leagues/:id/simulate-week — commissioner-only, simulation leagues only.
 * Randomly resolves any game in the league's current week that doesn't have a
 * result yet. Safe to re-run: only touches games where winner_team_code IS NULL,
 * so it never clobbers an already-simulated or ESPN-final result.
 */
simulateRouter.post(
  '/:id/simulate-week',
  async (request: IRequest, env: Env) => {
    const userId = await getUserId(request, env);
    const supabase = createSupabaseClient(
      env,
      request.headers.get('Authorization')!.slice(7)
    );
    const { id } = request.params;
    await requireCommissioner(supabase, id, userId);

    const service = createServiceClient(env);
    const { data: league, error: leagueError } = await service
      .from('leagues')
      .select('id, is_simulation, current_week_id')
      .eq('id', id)
      .single();

    if (leagueError || !league)
      return Response.json({ error: 'League not found' }, { status: 404 });
    if (!league.is_simulation) {
      return Response.json(
        { error: 'simulate-week is only available for simulation leagues' },
        { status: 400 }
      );
    }
    if (!league.current_week_id) {
      return Response.json(
        { error: 'League has no current week set' },
        { status: 400 }
      );
    }

    const { data: games, error: gamesError } = await service
      .from('games')
      .select('id, home_team_code, away_team_code')
      .eq('week_id', league.current_week_id)
      .is('winner_team_code', null);

    if (gamesError)
      return Response.json({ error: gamesError.message }, { status: 500 });

    const resolved = [];
    for (const game of games ?? []) {
      const homeWins = Math.random() < 0.5;
      const winnerScore = 17 + Math.floor(Math.random() * 21); // 17-37
      const loserScore = Math.max(
        0,
        winnerScore - (3 + Math.floor(Math.random() * 18))
      );

      const update = {
        status: 'final' as const,
        is_simulated_result: true,
        winner_team_code: homeWins ? game.home_team_code : game.away_team_code,
        home_score: homeWins ? winnerScore : loserScore,
        away_score: homeWins ? loserScore : winnerScore,
      };

      const { error } = await service
        .from('games')
        .update(update)
        .eq('id', game.id);
      if (error)
        return Response.json({ error: error.message }, { status: 500 });
      resolved.push({ game_id: game.id, ...update });
    }

    return Response.json({ resolved });
  }
);

/** POST /leagues/:id/advance-week — commissioner-only: move current_week_id forward by sort_order. */
simulateRouter.post(
  '/:id/advance-week',
  async (request: IRequest, env: Env) => {
    const userId = await getUserId(request, env);
    const supabase = createSupabaseClient(
      env,
      request.headers.get('Authorization')!.slice(7)
    );
    const { id } = request.params;
    await requireCommissioner(supabase, id, userId);

    const service = createServiceClient(env);
    const { data: league, error: leagueError } = await service
      .from('leagues')
      .select('id, current_week_id')
      .eq('id', id)
      .single();
    if (leagueError || !league)
      return Response.json({ error: 'League not found' }, { status: 404 });

    const { data: currentWeek, error: currentWeekError } = await service
      .from('weeks')
      .select('sort_order')
      .eq('id', league.current_week_id)
      .single();
    if (currentWeekError || !currentWeek)
      return Response.json(
        { error: 'Current week not found' },
        { status: 404 }
      );

    const { data: nextWeek, error: nextWeekError } = await service
      .from('weeks')
      .select('id, phase, week_number, playoff_round')
      .eq('league_id', id)
      .gt('sort_order', currentWeek.sort_order)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (nextWeekError)
      return Response.json({ error: nextWeekError.message }, { status: 500 });

    if (!nextWeek) {
      return Response.json(
        {
          error:
            'No further week exists — call /playoffs/generate once the regular season is complete',
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await service
      .from('leagues')
      .update({ current_week_id: nextWeek.id })
      .eq('id', id);
    if (updateError)
      return Response.json({ error: updateError.message }, { status: 500 });

    return Response.json({ current_week: nextWeek });
  }
);

const PLAYOFF_ROUNDS: Array<{ round: PlayoffRound; espnWeek: number }> = [
  { round: 'wild_card', espnWeek: 1 },
  { round: 'divisional', espnWeek: 2 },
  { round: 'conference', espnWeek: 3 },
  { round: 'super_bowl', espnWeek: 5 }, // ESPN skips week 4 (Pro Bowl) in postseason numbering
];

/**
 * POST /leagues/:id/playoffs/generate — commissioner-only, one-time after the regular
 * season ends. Creates the four playoff-round `weeks` (sort_order continues from 18)
 * and pulls in any games ESPN already has for each round; the no-repeat team constraint
 * resets automatically since these rows have phase='playoff'. Re-run to pick up rounds
 * whose matchups weren't final yet on the first call (e.g. divisional before wild-card
 * finishes) — only inserts weeks/games that don't already exist.
 */
simulateRouter.post(
  '/:id/playoffs/generate',
  async (request: IRequest, env: Env) => {
    const userId = await getUserId(request, env);
    const supabase = createSupabaseClient(
      env,
      request.headers.get('Authorization')!.slice(7)
    );
    const { id } = request.params;
    await requireCommissioner(supabase, id, userId);

    const service = createServiceClient(env);
    const { data: league, error: leagueError } = await service
      .from('leagues')
      .select('id, season_year')
      .eq('id', id)
      .single();
    if (leagueError || !league)
      return Response.json({ error: 'League not found' }, { status: 404 });

    const results = [];
    for (const [index, { round, espnWeek }] of PLAYOFF_ROUNDS.entries()) {
      const sortOrder = 18 + index + 1;

      const { data: existingWeek } = await service
        .from('weeks')
        .select('id')
        .eq('league_id', id)
        .eq('phase', 'playoff')
        .eq('playoff_round', round)
        .maybeSingle();

      let weekId = existingWeek?.id as string | undefined;
      if (!weekId) {
        const { data: week, error: weekError } = await service
          .from('weeks')
          .insert({
            league_id: id,
            season_year: league.season_year,
            phase: 'playoff',
            playoff_round: round,
            espn_week_number: espnWeek,
            espn_season_type: ESPN_SEASON_TYPE.POSTSEASON,
            sort_order: sortOrder,
          })
          .select('id')
          .single();
        if (weekError)
          return Response.json({ error: weekError.message }, { status: 500 });
        weekId = week.id;
      }

      const games = await fetchScoreboard(
        league.season_year,
        ESPN_SEASON_TYPE.POSTSEASON,
        espnWeek
      );
      if (games.length > 0) {
        await service.from('games').upsert(
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

      results.push({ round, week_id: weekId, games_found: games.length });
    }

    return Response.json({ rounds: results });
  }
);
