import { Router, type IRequest } from 'itty-router';
import type { Env, JoinLeagueBody } from './types';
import { getUserId } from './auth';
import { createSupabaseClient } from './supabase';
import { requireCommissioner } from './leagues';

export const membersRouter = Router({ base: '/leagues' });

/**
 * POST /leagues/join — claim an unclaimed seat matching `username`, or create a new
 * seat, in the league identified by `invite_code`. The caller isn't a member yet (so
 * can't read the league by code under `leagues_select` RLS), so the lookup/claim/create
 * logic runs inside the `join_league` SECURITY DEFINER function, scoped to auth.uid().
 */
membersRouter.post('/join', async (request: IRequest, env: Env) => {
  await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );
  const body: JoinLeagueBody = await request.json();

  if (!body.invite_code || !body.username) {
    return Response.json(
      { error: 'invite_code and username are required' },
      { status: 400 }
    );
  }

  const { data: member, error: joinError } = await supabase.rpc('join_league', {
    p_invite_code: body.invite_code,
    p_username: body.username,
  });

  if (joinError) {
    const message = joinError.message.includes('Invalid invite code')
      ? 'Invalid invite code'
      : joinError.message.includes('duplicate')
        ? 'That username is already taken in this league'
        : joinError.message;
    return Response.json({ error: message }, { status: 400 });
  }

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, is_simulation, season_year')
    .eq('id', member.league_id)
    .single();
  if (leagueError)
    return Response.json({ error: leagueError.message }, { status: 500 });

  return Response.json({ league, member });
});

/** GET /leagues/:id/members — list the league roster (RLS-safe) */
membersRouter.get('/:id/members', async (request: IRequest, env: Env) => {
  await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );
  const { id } = request.params;

  const { data, error } = await supabase
    .from('league_members')
    .select('id, username, is_commissioner, is_simulated, user_id, joined_at')
    .eq('league_id', id)
    .order('joined_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
});

/** POST /leagues/:id/members/simulated — commissioner seeds fake members for solo testing */
membersRouter.post(
  '/:id/members/simulated',
  async (request: IRequest, env: Env) => {
    const userId = await getUserId(request, env);
    const supabase = createSupabaseClient(
      env,
      request.headers.get('Authorization')!.slice(7)
    );
    const { id } = request.params;
    await requireCommissioner(supabase, id, userId);

    const body: { usernames: string[] } = await request.json();
    if (!Array.isArray(body.usernames) || body.usernames.length === 0) {
      return Response.json(
        { error: 'usernames must be a non-empty array' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('league_members')
      .insert(
        body.usernames.map((username) => ({
          league_id: id,
          username,
          is_simulated: true,
        }))
      )
      .select();

    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json(data, { status: 201 });
  }
);

/** DELETE /leagues/:id/members/:memberId — commissioner removes or resets a seat */
membersRouter.delete(
  '/:id/members/:memberId',
  async (request: IRequest, env: Env) => {
    const userId = await getUserId(request, env);
    const supabase = createSupabaseClient(
      env,
      request.headers.get('Authorization')!.slice(7)
    );
    const { id, memberId } = request.params;
    await requireCommissioner(supabase, id, userId);

    const { error } = await supabase
      .from('league_members')
      .delete()
      .eq('id', memberId)
      .eq('league_id', id);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return new Response(null, { status: 204 });
  }
);
