import { Router, type IRequest } from 'itty-router';
import type { Env } from './types';
import { friendsRouter } from './friends';
import { groupsRouter, deleteGroupFromAllFriends } from './groups';
import { eventsRouter } from './events';

const router = Router();

// CORS preflight
router.options('*', () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
);

// Friend CRUD
router.all('/friends/*', (request: IRequest, env: Env) =>
  friendsRouter.handle(request, env)
);

// Group membership on friends
router.all('/friends/*', (request: IRequest, env: Env) =>
  groupsRouter.handle(request, env)
);

// Events CRUD
router.all('/events/*', (request: IRequest, env: Env) =>
  eventsRouter.handle(request, env)
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
    const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
    try {
      const response = await router.handle(request, env, ctx);
      // Add CORS header to every response
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      return newResponse;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Internal server error';
      const status =
        message.includes('Authorization') || message.includes('token')
          ? 401
          : 500;
      return Response.json({ error: message }, { status, headers: corsHeaders });
    }
  },
} satisfies ExportedHandler<Env>;
