import { Router, type IRequest } from 'itty-router';
import type { Env, JoinLeagueBody } from './types';
import { getUserId } from './auth';
import { createSupabaseClient, createServiceClient } from './supabase';
import { requireCommissioner } from './leagues';

export const membersRouter = Router({ base: '/leagues' });

/**
 * POST /leagues/join — claim an unclaimed seat matching `username`, or create a new
 * seat, in the league identified by `invite_code`. No league_members INSERT policy
 * exists for `authenticated`, and the caller isn't a member yet (can't read the league
 * by code under RLS either), so this whole flow runs through the service client.
 */
membersRouter.post('/join', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const body: JoinLeagueBody = await request.json();

  if (!body.invite_code || !body.username) {
    return Response.json(
      { error: 'invite_code and username are required' },
      { status: 400 }
    );
  }

  const service = createServiceClient(env);

  const { data: league, error: leagueError } = await service
    .from('leagues')
    .select('id, name, is_simulation, season_year')
    .eq('invite_code', body.invite_code.toUpperCase())
    .single();

  if (leagueError || !league) {
    return Response.json({ error: 'Invalid invite code' }, { status: 404 });
  }

  // Idempotent: already a member of this league? Return the existing seat.
  const { data: existing } = await service
    .from('league_members')
    .select('*')
    .eq('league_id', league.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return Response.json({ league, member: existing });
  }

  // Claim an unclaimed seat with a matching username (commissioner pre-seeded it), if any.
  const { data: unclaimed } = await service
    .from('league_members')
    .select('*')
    .eq('league_id', league.id)
    .eq('username', body.username)
    .is('user_id', null)
    .maybeSingle();

  if (unclaimed) {
    const { data: claimed, error: claimError } = await service
      .from('league_members')
      .update({ user_id: userId })
      .eq('id', unclaimed.id)
      .select()
      .single();

    if (claimError)
      return Response.json({ error: claimError.message }, { status: 500 });
    return Response.json({ league, member: claimed });
  }

  // Otherwise create a brand new seat.
  const { data: created, error: createError } = await service
    .from('league_members')
    .insert({ league_id: league.id, user_id: userId, username: body.username })
    .select()
    .single();

  if (createError) {
    const message = createError.message.includes('duplicate')
      ? 'That username is already taken in this league'
      : createError.message;
    return Response.json({ error: message }, { status: 400 });
  }

  return Response.json({ league, member: created }, { status: 201 });
});

/** GET /leagues/:id/members — list the league roster (RLS-safe, no service client needed) */
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

    const service = createServiceClient(env);
    const { data, error } = await service
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

    const service = createServiceClient(env);
    const { error } = await service
      .from('league_members')
      .delete()
      .eq('id', memberId)
      .eq('league_id', id);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return new Response(null, { status: 204 });
  }
);
