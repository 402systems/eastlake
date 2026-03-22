import { Router, type IRequest } from 'itty-router';
import { drizzle } from 'drizzle-orm/d1';
import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { eq, sql } from 'drizzle-orm';

const players = sqliteTable('players', {
  name: text('name'),
  team: text('team'),
  position: text('position'),
  ppg: real('ppg'),
});

export interface Env {
  DB: D1Database;
}

interface Player {
  name: string;
  team: string;
  position: string;
  ppg: number;
}

const router = Router();

router.post('/setup_table', async (_request: IRequest, env: Env) => {
  const db = drizzle(env.DB);
  await db.run(sql`
        CREATE TABLE IF NOT EXISTS players (
          name TEXT,
          team TEXT,
          position TEXT,
          ppg REAL
        )
      `);
  return new Response('Table created or already exists!');
});

router.post('/get_all_players', async (_request: IRequest, env: Env) => {
  const db = drizzle(env.DB);
  const result = await db.select().from(players).all();
  return new Response(JSON.stringify(result), {
    headers: { 'content-type': 'application/json' },
  });
});

router.post('/insert_player', async (request: IRequest, env: Env) => {
  const player: Player = await request.json();
  const db = drizzle(env.DB);
  const { name, team, position, ppg } = player;
  try {
    const newPlayer = await db
      .insert(players)
      .values({ name, team, position, ppg })
      .returning();
    return new Response(JSON.stringify(newPlayer), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.log(e);
    return new Response(`Error inserting`, {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
});

router.post('/delete_player', async (request: IRequest, env: Env) => {
  const player: Player = await request.json();
  const { name } = player;
  const db = drizzle(env.DB);
  try {
    await db.delete(players).where(eq(players.name, name));
    return new Response('Deleted', { status: 200 });
  } catch {
    return new Response('Not Found', { status: 500 });
  }
});

export default {
  fetch: router.handle,
};
