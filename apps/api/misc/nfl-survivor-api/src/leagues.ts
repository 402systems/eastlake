import { Router, type IRequest } from 'itty-router';
import type { Env, NewLeague } from './types';
import { getUserId } from './auth';
import { createSupabaseClient, createServiceClient } from './supabase';

export const leaguesRouter = Router({ base: '/leagues' });

function randomInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

/** Checks that userId is the commissioner of leagueId, throws otherwise. */
export async function requireCommissioner(
  supabase: ReturnType<typeof createSupabaseClient>,
  leagueId: string,
  userId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('league_members')
    .select('is_commissioner')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .single();

  if (error || !data?.is_commissioner) {
    throw new Error('Only the commissioner can perform this action');
  }
}

/** POST /leagues — create a league; creator becomes commissioner with their own seat */
leaguesRouter.post('/', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const body: NewLeague & { username: string } = await request.json();

  if (!body.name || !body.season_year || !body.username) {
    return Response.json(
      { error: 'name, season_year, and username are required' },
      { status: 400 }
    );
  }

  // League creation happens before the creator has a league_members row, so RLS on
  // `leagues` (which checks membership) can't cover the INSERT — use the service client,
  // but the actor is the authenticated user themselves creating their own league.
  const service = createServiceClient(env);

  const { data: league, error: leagueError } = await service
    .from('leagues')
    .insert({
      name: body.name,
      commissioner_id: userId,
      invite_code: randomInviteCode(),
      season_year: body.season_year,
      is_simulation: body.is_simulation ?? false,
    })
    .select()
    .single();

  if (leagueError)
    return Response.json({ error: leagueError.message }, { status: 500 });

  const { data: member, error: memberError } = await service
    .from('league_members')
    .insert({
      league_id: league.id,
      user_id: userId,
      username: body.username,
      is_commissioner: true,
    })
    .select()
    .single();

  if (memberError)
    return Response.json({ error: memberError.message }, { status: 500 });

  return Response.json({ league, member }, { status: 201 });
});

/** GET /leagues/:id/invite — get the current invite code + shareable link */
leaguesRouter.get('/:id/invite', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );
  const { id } = request.params;

  await requireCommissioner(supabase, id, userId);

  const { data, error } = await supabase
    .from('leagues')
    .select('invite_code')
    .eq('id', id)
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ invite_code: data.invite_code });
});

/** POST /leagues/:id/invite — regenerate the invite code */
leaguesRouter.post('/:id/invite', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );
  const { id } = request.params;

  await requireCommissioner(supabase, id, userId);

  const service = createServiceClient(env);
  const { data, error } = await service
    .from('leagues')
    .update({ invite_code: randomInviteCode() })
    .eq('id', id)
    .select('invite_code')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ invite_code: data.invite_code });
});
