import { Router, type IRequest } from 'itty-router';
import type { Env, NewFriend } from './types';
import { getUserId } from './auth';
import { createSupabaseClient } from './supabase';

const TABLE = 'personal_tracker_items';
const SELECT =
  'id, name, last_action, phone_number, birthday, groups, created_at';

export const friendsRouter = Router({ base: '/friends' });

/** GET /friends — list all friends */
friendsRouter.get('/', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );

  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
});

/** POST /friends — create a friend */
friendsRouter.post('/', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );
  const body: NewFriend = await request.json();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      name: body.name,
      phone_number: body.phone_number ?? null,
      birthday: body.birthday ?? null,
    })
    .select(SELECT)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
});

/** POST /friends/:id/hangout — record a hangout, optional body: { date: "YYYY-MM-DD" } */
friendsRouter.post('/:id/hangout', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );
  const { id } = request.params;

  let date = new Date().toISOString().split('T')[0];
  try {
    const body = await request.json() as { date?: string };
    if (body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) date = body.date;
  } catch { /* no body */ }

  const { error } = await supabase
    .from(TABLE)
    .update({ last_action: date })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ last_action: date });
});

/** DELETE /friends/:id — delete a friend */
friendsRouter.delete('/:id', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );
  const { id } = request.params;

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
});
