# Supabase Database Schemas

These are the Supabase table definitions used across projects. They live in Supabase (not in code), so this file is the source of truth for coding agents.

---

## Friend Tracker (`apps/mobile/misc/friend-tracker` + `apps/api/misc/friend-tracker-api`)

```sql
CREATE TABLE public.personal_tracker_items (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  last_action date NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  phone_number text NULL,
  birthday date NULL,
  groups text[] NOT NULL DEFAULT '{}'::text[],
  CONSTRAINT personal_tracker_items_pkey PRIMARY KEY (id),
  CONSTRAINT personal_tracker_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX personal_tracker_items_user_id_idx ON public.personal_tracker_items USING btree (user_id);

CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  date date NOT NULL,
  created_at timestamptz NULL DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.event_friends (
  event_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  CONSTRAINT event_friends_pkey PRIMARY KEY (event_id, friend_id),
  CONSTRAINT event_friends_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT event_friends_friend_id_fkey FOREIGN KEY (friend_id) REFERENCES personal_tracker_items(id) ON DELETE CASCADE
);
```

## NFL Survivor (`apps/web/misc/nfl-survivor` + `apps/api/misc/nfl-survivor-api`)

Full DDL (tables, RLS policies, `league_standings()` function, 32-team seed) lives at
`apps/api/misc/nfl-survivor-api/sql/schema.sql` — run it once in Supabase Studio. Summary:

```sql
CREATE TYPE public.week_phase AS ENUM ('regular', 'playoff');
CREATE TYPE public.playoff_round AS ENUM ('wild_card', 'divisional', 'conference', 'super_bowl');
CREATE TYPE public.game_status AS ENUM ('scheduled', 'in_progress', 'final');

CREATE TABLE public.leagues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  commissioner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  season_year int NOT NULL,
  is_simulation boolean NOT NULL DEFAULT false,
  current_week_id uuid NULL REFERENCES public.weeks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leagues_pkey PRIMARY KEY (id)
);

CREATE TABLE public.weeks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  season_year int NOT NULL,
  phase public.week_phase NOT NULL,
  week_number int NULL,               -- 1-18, regular season only
  playoff_round public.playoff_round NULL,
  espn_week_number int NULL,
  espn_season_type int NULL,
  sort_order int NOT NULL,            -- one global chronological order per league
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weeks_pkey PRIMARY KEY (id),
  CONSTRAINT weeks_league_sort_unique UNIQUE (league_id, sort_order)
);

CREATE TABLE public.teams (
  code text NOT NULL,                 -- ESPN abbreviation, e.g. 'KC'
  name text NOT NULL,
  espn_id text NOT NULL,
  CONSTRAINT teams_pkey PRIMARY KEY (code)
);

CREATE TABLE public.games (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  espn_event_id text NOT NULL,
  home_team_code text NOT NULL REFERENCES public.teams(code),
  away_team_code text NOT NULL REFERENCES public.teams(code),
  kickoff_time timestamptz NOT NULL,
  status public.game_status NOT NULL DEFAULT 'scheduled',
  home_score int NULL,
  away_score int NULL,
  winner_team_code text NULL REFERENCES public.teams(code),
  is_simulated_result boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT games_pkey PRIMARY KEY (id),
  CONSTRAINT games_week_espn_event_unique UNIQUE (week_id, espn_event_id)
);
-- games/weeks/teams: SELECT-only RLS for league members; writes are service-role only
-- (ESPN sync + commissioner simulate/advance actions in the nfl-survivor-api worker).

CREATE TABLE public.league_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable: unclaimed/simulated seats
  username text NOT NULL,
  is_commissioner boolean NOT NULL DEFAULT false,
  is_simulated boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT league_members_pkey PRIMARY KEY (id),
  CONSTRAINT league_members_league_username_unique UNIQUE (league_id, username),
  CONSTRAINT league_members_league_user_unique UNIQUE (league_id, user_id)
);

CREATE TABLE public.picks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  league_member_id uuid NOT NULL REFERENCES public.league_members(id) ON DELETE CASCADE,
  week_id uuid NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team_code text NOT NULL REFERENCES public.teams(code),
  phase public.week_phase NOT NULL,   -- denormalized from weeks.phase
  is_correct boolean NULL,            -- kept in sync by trigger on games.winner_team_code
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT picks_pkey PRIMARY KEY (id),
  CONSTRAINT picks_member_week_unique UNIQUE (league_member_id, week_id),
  -- no-repeat-team rule, scoped per phase (resets at playoffs):
  CONSTRAINT picks_member_phase_team_unique UNIQUE (league_member_id, phase, team_code)
);
-- picks RLS: own picks always readable/writable (pre-kickoff only for writes); other
-- members' picks for a game become readable only once that game's kickoff_time has passed.

-- league_standings(p_league_id) — SQL function, computed on-the-fly via window functions
-- ordered by weeks.sort_order. Win points: 2 per correct pick until a member's first-ever
-- loss (chronologically), then 1 per correct pick after. Loss points: 1 per incorrect pick,
-- always. Not stored as incremental counters, since simulation mode re-resolves weeks.
```

## Bingo Board (`apps/mobile/misc/bingo-board`)

```sql
CREATE TABLE public.bingo_boards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NULL,
  grid_data jsonb NOT NULL,
  created_at timestamptz NULL DEFAULT now(),
  CONSTRAINT bingo_boards_pkey PRIMARY KEY (id),
  CONSTRAINT bingo_boards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
```
