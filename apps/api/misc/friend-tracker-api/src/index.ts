import { Router, type IRequest } from 'itty-router';
import type { Env } from './types';
import { friendsRouter } from './friends';
import { groupsRouter, deleteGroupFromAllFriends } from './groups';

const router = Router();

// Friend CRUD
router.all('/friends/*', (request: IRequest, env: Env) =>
  friendsRouter.handle(request, env)
);

// Group membership on friends
router.all('/friends/*', (request: IRequest, env: Env) =>
  groupsRouter.handle(request, env)
);

// Delete a group from all friends
router.delete('/groups/:groupName', (request: IRequest, env: Env) =>
  deleteGroupFromAllFriends(request, env, request.params.groupName)
);

// Fallback
router.all('*', () => new Response('Not found', { status: 404 }));

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      return await router.handle(request, env, ctx);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Internal server error';
      const status =
        message.includes('Authorization') || message.includes('token')
          ? 401
          : 500;
      return Response.json({ error: message }, { status });
    }
  },
} satisfies ExportedHandler<Env>;
