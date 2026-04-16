import { Router, type IRequest } from 'itty-router';
import type { Env, NewEvent } from './types';
import { getUserId } from './auth';
import { createSupabaseClient } from './supabase';

const TABLE = 'events';
const SELECT = 'id, name, date, created_at, event_friends(friend_id)';

export const eventsRouter = Router({ base: '/events' });

/** GET /events — list all events for the user */
eventsRouter.get('/', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );

  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT)
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
});

/** GET /events/:id — get a single event with its friends */
eventsRouter.get('/:id', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );
  const { id } = request.params;

  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT)
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(data);
});

/** POST /events — create an event */
eventsRouter.post('/', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );
  const body: NewEvent = await request.json();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ user_id: userId, name: body.name, date: body.date })
    .select(SELECT)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
});

/** PUT /events/:id — update event name/date */
eventsRouter.put('/:id', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );
  const { id } = request.params;
  const body: Partial<NewEvent> = await request.json();

  const { data, error } = await supabase
    .from(TABLE)
    .update({ name: body.name, date: body.date })
    .eq('id', id)
    .eq('user_id', userId)
    .select(SELECT)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(data);
});

/** DELETE /events/:id — delete an event */
eventsRouter.delete('/:id', async (request: IRequest, env: Env) => {
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

/** POST /events/:id/friends — add friends to an event */
eventsRouter.post('/:id/friends', async (request: IRequest, env: Env) => {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );
  const { id } = request.params;
  const body: { friend_ids: string[] } = await request.json();

  // Verify event belongs to user
  const { data: event } = await supabase
    .from(TABLE)
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!event) return Response.json({ error: 'Not found' }, { status: 404 });

  const rows = body.friend_ids.map((friend_id) => ({ event_id: id, friend_id }));
  const { error } = await supabase
    .from('event_friends')
    .upsert(rows, { onConflict: 'event_id,friend_id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Return updated event
  const { data, error: fetchError } = await supabase
    .from(TABLE)
    .select(SELECT)
    .eq('id', id)
    .single();

  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });
  return Response.json(data);
});

/** DELETE /events/:id/friends/:friendId — remove a friend from an event */
eventsRouter.delete(
  '/:id/friends/:friendId',
  async (request: IRequest, env: Env) => {
    const userId = await getUserId(request, env);
    const supabase = createSupabaseClient(
      env,
      request.headers.get('Authorization')!.slice(7)
    );
    const { id, friendId } = request.params;

    // Verify event belongs to user
    const { data: event } = await supabase
      .from(TABLE)
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!event) return Response.json({ error: 'Not found' }, { status: 404 });

    const { error } = await supabase
      .from('event_friends')
      .delete()
      .eq('event_id', id)
      .eq('friend_id', friendId);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return new Response(null, { status: 204 });
  }
);
