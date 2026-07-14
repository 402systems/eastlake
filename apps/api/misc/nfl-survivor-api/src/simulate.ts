import { Router, type IRequest } from 'itty-router';
import type { Env, PlayoffRound } from './types';
import { getUserId } from './auth';
import { createSupabaseClient } from './supabase';
import { requireCommissioner } from './leagues';
import { fetchScoreboard, ESPN_SEASON_TYPE } from './espn';

export const simulateRouter = Router({ base: '/leagues' });

/**
 * POST /leagues/:id/simulate-week — commissioner-only, simulation leagues only.
 * Auto-generates a random (unused-this-phase) pick for any member who doesn't have
 * one yet for the current week — mainly for simulated members, who have no real user
 * to click pick buttons, but also covers the commissioner's own seat as a convenience
 * for fast-forwarding through weeks solo — then randomly resolves any game in the
 * week that doesn't have a result yet. Safe to re-run: only touches games where
 * winner_team_code IS NULL and members who don't already have a pick, so it never
 * clobbers an already-simulated/ESPN-final result or a pick someone already made.
 * Runs under the caller's own JWT — `games_update_commissioner` and
 * `picks_insert_commissioner_simulation` RLS authorize the writes.
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

    const { data: league, error: leagueError } = await supabase
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
    const weekId = league.current_week_id;

    const { data: week, error: weekError } = await supabase
      .from('weeks')
      .select('phase')
      .eq('id', weekId)
      .single();
    if (weekError || !week)
      return Response.json(
        { error: 'Current week not found' },
        { status: 404 }
      );

    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id, home_team_code, away_team_code')
      .eq('week_id', weekId)
      .is('winner_team_code', null);

    if (gamesError)
      return Response.json({ error: gamesError.message }, { status: 500 });

    const { data: members, error: membersError } = await supabase
      .from('league_members')
      .select('id')
      .eq('league_id', id);
    if (membersError)
      return Response.json({ error: membersError.message }, { status: 500 });

    const { data: existingPicks, error: existingPicksError } = await supabase
      .from('picks')
      .select('league_member_id')
      .eq('week_id', weekId);
    if (existingPicksError)
      return Response.json(
        { error: existingPicksError.message },
        { status: 500 }
      );

    const membersWithPicks = new Set(
      (existingPicks ?? []).map((p) => p.league_member_id)
    );
    const membersNeedingPicks = (members ?? []).filter(
      (m) => !membersWithPicks.has(m.id)
    );

    let picksGenerated = 0;

    if (membersNeedingPicks.length > 0 && (games ?? []).length > 0) {
      const { data: usedTeamRows, error: usedTeamsError } = await supabase
        .from('picks')
        .select('league_member_id, team_code')
        .eq('phase', week.phase)
        .in(
          'league_member_id',
          membersNeedingPicks.map((m) => m.id)
        );
      if (usedTeamsError)
        return Response.json(
          { error: usedTeamsError.message },
          { status: 500 }
        );

      const usedTeamsByMember = new Map<string, Set<string>>();
      for (const row of usedTeamRows ?? []) {
        if (!usedTeamsByMember.has(row.league_member_id)) {
          usedTeamsByMember.set(row.league_member_id, new Set());
        }
        usedTeamsByMember.get(row.league_member_id)!.add(row.team_code);
      }

      const teamGamePairs = (games ?? []).flatMap((g) => [
        { gameId: g.id, teamCode: g.home_team_code },
        { gameId: g.id, teamCode: g.away_team_code },
      ]);

      const generatedPicks = membersNeedingPicks
        .map((member) => {
          const used = usedTeamsByMember.get(member.id) ?? new Set<string>();
          const available = teamGamePairs.filter((p) => !used.has(p.teamCode));
          if (available.length === 0) return null; // no unused team left this phase
          const choice =
            available[Math.floor(Math.random() * available.length)];
          return {
            league_member_id: member.id,
            week_id: weekId,
            game_id: choice.gameId,
            team_code: choice.teamCode,
            phase: week.phase,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      if (generatedPicks.length > 0) {
        const { error: insertPicksError } = await supabase
          .from('picks')
          .insert(generatedPicks);
        if (insertPicksError)
          return Response.json(
            { error: insertPicksError.message },
            { status: 500 }
          );
        picksGenerated = generatedPicks.length;
      }
    }

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

      const { error } = await supabase
        .from('games')
        .update(update)
        .eq('id', game.id);
      if (error)
        return Response.json({ error: error.message }, { status: 500 });
      resolved.push({ game_id: game.id, ...update });
    }

    return Response.json({ resolved, picks_generated: picksGenerated });
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

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, current_week_id')
      .eq('id', id)
      .single();
    if (leagueError || !league)
      return Response.json({ error: 'League not found' }, { status: 404 });

    const { data: currentWeek, error: currentWeekError } = await supabase
      .from('weeks')
      .select('sort_order')
      .eq('id', league.current_week_id)
      .single();
    if (currentWeekError || !currentWeek)
      return Response.json(
        { error: 'Current week not found' },
        { status: 404 }
      );

    const { data: nextWeek, error: nextWeekError } = await supabase
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

    const { error: updateError } = await supabase
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

    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id, season_year')
      .eq('id', id)
      .single();
    if (leagueError || !league)
      return Response.json({ error: 'League not found' }, { status: 404 });

    const results = [];
    for (const [index, { round, espnWeek }] of PLAYOFF_ROUNDS.entries()) {
      const sortOrder = 18 + index + 1;

      const { data: existingWeek } = await supabase
        .from('weeks')
        .select('id')
        .eq('league_id', id)
        .eq('phase', 'playoff')
        .eq('playoff_round', round)
        .maybeSingle();

      let weekId = existingWeek?.id as string | undefined;
      if (!weekId) {
        const { data: week, error: weekError } = await supabase
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

      results.push({ round, week_id: weekId, games_found: games.length });
    }

    return Response.json({ rounds: results });
  }
);
