import { Router, type IRequest } from 'itty-router';
import type { Env } from './types';
import { getUserId } from './auth';
import { createSupabaseClient } from './supabase';

const TABLE = 'personal_tracker_items';

export const groupsRouter = Router({ base: '/friends' });

/** PUT /friends/:id/groups/:groupName — add friend to group */
groupsRouter.put(
  '/:id/groups/:groupName',
  async (request: IRequest, env: Env) => {
    const userId = await getUserId(request, env);
    const supabase = createSupabaseClient(
      env,
      request.headers.get('Authorization')!.slice(7)
    );
    const { id, groupName } = request.params;

    const { data: friend, error: fetchError } = await supabase
      .from(TABLE)
      .select('groups')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !friend) {
      return Response.json({ error: 'Friend not found' }, { status: 404 });
    }

    const current: string[] = friend.groups ?? [];
    if (current.includes(groupName)) {
      return Response.json({ groups: current });
    }

    const updated = [...current, groupName];
    const { error } = await supabase
      .from(TABLE)
      .update({ groups: updated })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ groups: updated });
  }
);

/** DELETE /friends/:id/groups/:groupName — remove friend from group */
groupsRouter.delete(
  '/:id/groups/:groupName',
  async (request: IRequest, env: Env) => {
    const userId = await getUserId(request, env);
    const supabase = createSupabaseClient(
      env,
      request.headers.get('Authorization')!.slice(7)
    );
    const { id, groupName } = request.params;

    const { data: friend, error: fetchError } = await supabase
      .from(TABLE)
      .select('groups')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !friend) {
      return Response.json({ error: 'Friend not found' }, { status: 404 });
    }

    const current: string[] = friend.groups ?? [];
    const updated = current.filter((g) => g !== groupName);

    const { error } = await supabase
      .from(TABLE)
      .update({ groups: updated })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ groups: updated });
  }
);

/** DELETE /groups/:groupName — remove a group from all friends. Called from main router. */
export async function deleteGroupFromAllFriends(
  request: IRequest,
  env: Env,
  groupName: string
): Promise<Response> {
  const userId = await getUserId(request, env);
  const supabase = createSupabaseClient(
    env,
    request.headers.get('Authorization')!.slice(7)
  );

  const { data: friendsWithGroup, error: fetchError } = await supabase
    .from(TABLE)
    .select('id, groups')
    .eq('user_id', userId)
    .contains('groups', [groupName]);

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  if (friendsWithGroup) {
    for (const friend of friendsWithGroup) {
      const updated = (friend.groups as string[]).filter(
        (g) => g !== groupName
      );
      await supabase
        .from(TABLE)
        .update({ groups: updated })
        .eq('id', friend.id)
        .eq('user_id', userId);
    }
  }

  return new Response(null, { status: 204 });
}
