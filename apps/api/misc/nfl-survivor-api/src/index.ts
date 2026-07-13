import { Router, type IRequest } from 'itty-router';
import type { Env } from './types';
import { leaguesRouter } from './leagues';
import { membersRouter } from './members';
import { adminRouter } from './sync';
import { simulateRouter } from './simulate';
import { syncScores } from './espn';

const router = Router();

// CORS preflight
router.options(
  '*',
  () =>
    new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
);

router.get('/health', () => Response.json({ ok: true }));

// Each sub-router only returns a response for paths it recognizes (itty-router falls
// through to the next matching `router.all` when a handler returns undefined), so these
// can safely overlap on the shared `/leagues/*` prefix — order is need-first only.
router.post('/leagues', (request: IRequest, env: Env) =>
  leaguesRouter.handle(request, env)
);
router.all('/leagues/join', (request: IRequest, env: Env) =>
  membersRouter.handle(request, env)
);
router.all('/leagues/:id/members/*', (request: IRequest, env: Env) =>
  membersRouter.handle(request, env)
);
router.all('/leagues/:id/members', (request: IRequest, env: Env) =>
  membersRouter.handle(request, env)
);
router.all('/leagues/:id/simulate-week', (request: IRequest, env: Env) =>
  simulateRouter.handle(request, env)
);
router.all('/leagues/:id/advance-week', (request: IRequest, env: Env) =>
  simulateRouter.handle(request, env)
);
router.all('/leagues/:id/playoffs/*', (request: IRequest, env: Env) =>
  simulateRouter.handle(request, env)
);
router.all('/leagues/*', (request: IRequest, env: Env) =>
  leaguesRouter.handle(request, env)
);
router.all('/admin/*', (request: IRequest, env: Env) =>
  adminRouter.handle(request, env)
);

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
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      return newResponse;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Internal server error';
      const status =
        message.includes('Authorization') ||
        message.includes('token') ||
        message.includes('commissioner')
          ? 401
          : 500;
      return Response.json(
        { error: message },
        { status, headers: corsHeaders }
      );
    }
  },

  /** Cron Trigger: refresh live scores for all non-simulation leagues during game windows. */
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(syncScores(env));
  },
} satisfies ExportedHandler<Env>;
