-- NFL Survivor Pool — Supabase schema
-- Run this in Supabase Studio (SQL editor) against the shared eastlake project.
-- Mirrored in /SCHEMAS.md as the source-of-truth doc for coding agents.

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.week_phase AS ENUM ('regular', 'playoff');
CREATE TYPE public.playoff_round AS ENUM ('wild_card', 'divisional', 'conference', 'super_bowl');
CREATE TYPE public.game_status AS ENUM ('scheduled', 'in_progress', 'final');

-- ============================================================
-- LEAGUES
-- ============================================================
CREATE TABLE public.leagues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  commissioner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  season_year int NOT NULL,
  is_simulation boolean NOT NULL DEFAULT false,
  current_week_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leagues_pkey PRIMARY KEY (id)
);

-- ============================================================
-- WEEKS (spans regular season 1-18 and playoff rounds)
-- ============================================================
CREATE TABLE public.weeks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  season_year int NOT NULL,
  phase public.week_phase NOT NULL,
  week_number int NULL,
  playoff_round public.playoff_round NULL,
  espn_week_number int NULL,
  espn_season_type int NULL,
  sort_order int NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weeks_pkey PRIMARY KEY (id),
  CONSTRAINT weeks_phase_check CHECK (
    (phase = 'regular' AND week_number IS NOT NULL AND playoff_round IS NULL) OR
    (phase = 'playoff' AND playoff_round IS NOT NULL AND week_number IS NULL)
  ),
  CONSTRAINT weeks_league_sort_unique UNIQUE (league_id, sort_order)
);
CREATE INDEX weeks_league_id_idx ON public.weeks USING btree (league_id);

ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_current_week_fkey
  FOREIGN KEY (current_week_id) REFERENCES public.weeks(id) ON DELETE SET NULL;

-- ============================================================
-- TEAMS (static reference data)
-- ============================================================
CREATE TABLE public.teams (
  code text NOT NULL,
  name text NOT NULL,
  espn_id text NOT NULL,
  CONSTRAINT teams_pkey PRIMARY KEY (code)
);

-- ============================================================
-- GAMES (schedule + live/final results; writable only by the owning league's commissioner)
-- ============================================================
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
CREATE INDEX games_week_id_idx ON public.games USING btree (week_id);
CREATE INDEX games_kickoff_time_idx ON public.games USING btree (kickoff_time);

-- ============================================================
-- LEAGUE MEMBERS (user_id nullable — unclaimed / simulated seats)
-- ============================================================
CREATE TABLE public.league_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  username text NOT NULL,
  is_commissioner boolean NOT NULL DEFAULT false,
  is_simulated boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT league_members_pkey PRIMARY KEY (id),
  CONSTRAINT league_members_league_username_unique UNIQUE (league_id, username),
  CONSTRAINT league_members_league_user_unique UNIQUE (league_id, user_id)
);
CREATE INDEX league_members_league_id_idx ON public.league_members USING btree (league_id);
CREATE INDEX league_members_user_id_idx ON public.league_members USING btree (user_id);

-- ============================================================
-- PICKS (one pick per member per week; team-reuse enforced per phase)
-- ============================================================
CREATE TABLE public.picks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  league_member_id uuid NOT NULL REFERENCES public.league_members(id) ON DELETE CASCADE,
  week_id uuid NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team_code text NOT NULL REFERENCES public.teams(code),
  phase public.week_phase NOT NULL,
  is_correct boolean NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT picks_pkey PRIMARY KEY (id),
  CONSTRAINT picks_member_week_unique UNIQUE (league_member_id, week_id),
  CONSTRAINT picks_member_phase_team_unique UNIQUE (league_member_id, phase, team_code)
);
CREATE INDEX picks_week_id_idx ON public.picks USING btree (week_id);
CREATE INDEX picks_league_member_id_idx ON public.picks USING btree (league_member_id);

-- Keep is_correct in sync with games.winner_team_code, including simulation re-resolution.
CREATE OR REPLACE FUNCTION public.sync_pick_correctness() RETURNS trigger AS $$
BEGIN
  IF NEW.winner_team_code IS NULL THEN
    UPDATE public.picks SET is_correct = NULL, updated_at = now() WHERE game_id = NEW.id;
  ELSE
    UPDATE public.picks
    SET is_correct = (team_code = NEW.winner_team_code), updated_at = now()
    WHERE game_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER games_sync_pick_correctness
AFTER UPDATE OF winner_team_code ON public.games
FOR EACH ROW EXECUTE FUNCTION public.sync_pick_correctness();

-- ============================================================
-- STANDINGS — computed on-the-fly (window functions), not stored counters.
-- Simulation mode re-resolves weeks; this always re-derives the correct totals
-- from current pick/game state instead of needing reverse-and-reapply logic.
-- ============================================================
CREATE OR REPLACE FUNCTION public.league_standings(p_league_id uuid)
RETURNS TABLE (
  league_member_id uuid,
  username text,
  win_points int,
  loss_points int,
  correct_picks int,
  incorrect_picks int
) AS $$
  WITH numbered_picks AS (
    SELECT
      p.league_member_id,
      p.is_correct,
      ROW_NUMBER() OVER (
        PARTITION BY p.league_member_id
        ORDER BY w.sort_order, p.submitted_at
      ) AS pick_seq
    FROM public.picks p
    JOIN public.weeks w ON w.id = p.week_id
    WHERE w.league_id = p_league_id AND p.is_correct IS NOT NULL
  ),
  ordered_picks AS (
    SELECT
      league_member_id,
      is_correct,
      pick_seq,
      MIN(CASE WHEN is_correct = false THEN pick_seq END)
        OVER (PARTITION BY league_member_id) AS first_loss_seq
    FROM numbered_picks
  )
  SELECT
    lm.id,
    lm.username,
    COALESCE(SUM(CASE
      WHEN op.is_correct = true AND (op.first_loss_seq IS NULL OR op.pick_seq < op.first_loss_seq) THEN 2
      WHEN op.is_correct = true THEN 1
      ELSE 0
    END), 0)::int AS win_points,
    COALESCE(SUM(CASE WHEN op.is_correct = false THEN 1 ELSE 0 END), 0)::int AS loss_points,
    COALESCE(SUM(CASE WHEN op.is_correct = true THEN 1 ELSE 0 END), 0)::int AS correct_picks,
    COALESCE(SUM(CASE WHEN op.is_correct = false THEN 1 ELSE 0 END), 0)::int AS incorrect_picks
  FROM public.league_members lm
  LEFT JOIN ordered_picks op ON op.league_member_id = lm.id
  WHERE lm.league_id = p_league_id
  GROUP BY lm.id, lm.username;
$$ LANGUAGE sql STABLE SECURITY INVOKER;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_league_member(p_league_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = p_league_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_league_commissioner(p_league_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.league_members
    WHERE league_id = p_league_id AND user_id = auth.uid() AND is_commissioner = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- teams: public read for any authenticated user; static reference data, no writes needed via the API
CREATE POLICY teams_select ON public.teams FOR SELECT TO authenticated USING (true);

-- leagues: members (or the commissioner) can read
CREATE POLICY leagues_select ON public.leagues FOR SELECT TO authenticated
  USING (public.is_league_member(id) OR commissioner_id = auth.uid());

-- leagues: any authenticated user can create a league naming themselves commissioner
CREATE POLICY leagues_insert_self ON public.leagues FOR INSERT TO authenticated
  WITH CHECK (commissioner_id = auth.uid());

-- leagues: the commissioner can update their own league (invite code regen, current_week_id advance)
CREATE POLICY leagues_update_commissioner ON public.leagues FOR UPDATE TO authenticated
  USING (commissioner_id = auth.uid()) WITH CHECK (commissioner_id = auth.uid());

-- weeks: readable by league members
CREATE POLICY weeks_select ON public.weeks FOR SELECT TO authenticated
  USING (public.is_league_member(league_id));

-- weeks: the commissioner can create/update weeks in their own league (ESPN sync, playoff generation)
CREATE POLICY weeks_insert_commissioner ON public.weeks FOR INSERT TO authenticated
  WITH CHECK (public.is_league_commissioner(league_id));
CREATE POLICY weeks_update_commissioner ON public.weeks FOR UPDATE TO authenticated
  USING (public.is_league_commissioner(league_id)) WITH CHECK (public.is_league_commissioner(league_id));

-- games: readable by members of the owning league
CREATE POLICY games_select ON public.games FOR SELECT TO authenticated
  USING (public.is_league_member((SELECT league_id FROM public.weeks WHERE id = games.week_id)));

-- games: the commissioner can create/update games in their own league's weeks (ESPN sync, simulate-week)
CREATE POLICY games_insert_commissioner ON public.games FOR INSERT TO authenticated
  WITH CHECK (public.is_league_commissioner((SELECT league_id FROM public.weeks WHERE id = games.week_id)));
CREATE POLICY games_update_commissioner ON public.games FOR UPDATE TO authenticated
  USING (public.is_league_commissioner((SELECT league_id FROM public.weeks WHERE id = games.week_id)))
  WITH CHECK (public.is_league_commissioner((SELECT league_id FROM public.weeks WHERE id = games.week_id)));

-- league_members: members can see the roster of their own league
CREATE POLICY league_members_select ON public.league_members FOR SELECT TO authenticated
  USING (public.is_league_member(league_id));

-- league_members: a user can always see their own row directly, checked against the
-- row's own user_id column rather than via is_league_member()'s self-query against this
-- same table. Needed because INSERT ... RETURNING (what supabase-js's .insert().select()
-- always does) re-checks SELECT visibility on the row it just wrote — for the very first
-- member inserted into a brand-new league (the commissioner seating themselves), that
-- self-query can't see the row it's in the middle of creating, so without this policy
-- league creation fails with "new row violates row-level security policy" even though
-- the INSERT itself was authorized.
CREATE POLICY league_members_select_own ON public.league_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- league_members: a user may only update their own seat (e.g. change username)
CREATE POLICY league_members_update_self ON public.league_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- league_members: the commissioner can seed simulated seats, and can seat themselves
-- when a league they just created doesn't have a member row yet
CREATE POLICY league_members_insert_commissioner ON public.league_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.leagues WHERE id = league_id AND commissioner_id = auth.uid())
  );

-- league_members: the commissioner can remove/reset a seat in their own league
CREATE POLICY league_members_delete_commissioner ON public.league_members FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.leagues WHERE id = league_id AND commissioner_id = auth.uid())
  );

-- Joining a league by invite code needs to look up a league before the caller is a member
-- (leagues_select can't allow that — it would expose every league to every user). This
-- SECURITY DEFINER function is the one narrow, purpose-built bypass instead of a blanket
-- service-role key: it can only create/claim a seat for the CALLING user (auth.uid()),
-- nothing else.
CREATE OR REPLACE FUNCTION public.join_league(p_invite_code text, p_username text)
RETURNS public.league_members AS $$
DECLARE
  v_league_id uuid;
  v_member public.league_members;
BEGIN
  SELECT id INTO v_league_id FROM public.leagues WHERE invite_code = upper(p_invite_code);
  IF v_league_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT * INTO v_member FROM public.league_members
    WHERE league_id = v_league_id AND user_id = auth.uid();
  IF FOUND THEN
    RETURN v_member;
  END IF;

  UPDATE public.league_members
    SET user_id = auth.uid()
    WHERE league_id = v_league_id AND username = p_username AND user_id IS NULL
    RETURNING * INTO v_member;
  IF FOUND THEN
    RETURN v_member;
  END IF;

  INSERT INTO public.league_members (league_id, user_id, username)
    VALUES (v_league_id, auth.uid(), p_username)
    RETURNING * INTO v_member;
  RETURN v_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- picks: a member can always read their own picks
CREATE POLICY picks_select_own ON public.picks FOR SELECT TO authenticated
  USING (league_member_id IN (SELECT id FROM public.league_members WHERE user_id = auth.uid()));

-- picks: another member's pick is visible only once that specific game has kicked off
-- (Postgres OR-combines permissive SELECT policies, so this adds to picks_select_own)
CREATE POLICY picks_select_others_post_kickoff ON public.picks FOR SELECT TO authenticated
  USING (
    public.is_league_member((SELECT league_id FROM public.weeks WHERE id = picks.week_id))
    AND EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = picks.game_id AND g.kickoff_time <= now()
    )
  );

-- picks: submit only your own pick, only before that game's kickoff
CREATE POLICY picks_insert_own ON public.picks FOR INSERT TO authenticated
  WITH CHECK (
    league_member_id IN (SELECT id FROM public.league_members WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.games g WHERE g.id = picks.game_id AND g.kickoff_time > now())
  );

-- picks: the commissioner of a SIMULATION league can insert a pick on behalf of any
-- member of that league (needed so "Simulate week" can auto-generate random picks for
-- simulated members, who have no real user_id and can never submit their own via
-- picks_insert_own). Scoped to is_simulation = true so this has no effect on real
-- leagues, and to leagues this specific caller commissions — not a blanket bypass.
CREATE POLICY picks_insert_commissioner_simulation ON public.picks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.league_members lm
      JOIN public.leagues l ON l.id = lm.league_id
      WHERE lm.id = picks.league_member_id
      AND l.commissioner_id = auth.uid()
      AND l.is_simulation = true
    )
  );

-- picks: edit only your own pick, and only if BOTH the currently-picked game and the
-- newly-picked game haven't kicked off yet — USING guards the old row (so a pick tied
-- to an already-started game can never be touched again, even to switch to a later
-- game), WITH CHECK guards the new row (so you can't newly lock in an already-started
-- game either).
CREATE POLICY picks_update_own ON public.picks FOR UPDATE TO authenticated
  USING (
    league_member_id IN (SELECT id FROM public.league_members WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.games g WHERE g.id = picks.game_id AND g.kickoff_time > now())
  )
  WITH CHECK (
    league_member_id IN (SELECT id FROM public.league_members WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.games g WHERE g.id = picks.game_id AND g.kickoff_time > now())
  );

-- ============================================================
-- SEED: 32 NFL teams (code = ESPN abbreviation, espn_id = ESPN numeric team id)
-- ============================================================
INSERT INTO public.teams (code, name, espn_id) VALUES
  ('ARI', 'Arizona Cardinals', '22'),
  ('ATL', 'Atlanta Falcons', '1'),
  ('BAL', 'Baltimore Ravens', '33'),
  ('BUF', 'Buffalo Bills', '2'),
  ('CAR', 'Carolina Panthers', '29'),
  ('CHI', 'Chicago Bears', '3'),
  ('CIN', 'Cincinnati Bengals', '4'),
  ('CLE', 'Cleveland Browns', '5'),
  ('DAL', 'Dallas Cowboys', '6'),
  ('DEN', 'Denver Broncos', '7'),
  ('DET', 'Detroit Lions', '8'),
  ('GB', 'Green Bay Packers', '9'),
  ('HOU', 'Houston Texans', '34'),
  ('IND', 'Indianapolis Colts', '11'),
  ('JAX', 'Jacksonville Jaguars', '30'),
  ('KC', 'Kansas City Chiefs', '12'),
  ('LAC', 'Los Angeles Chargers', '24'),
  ('LAR', 'Los Angeles Rams', '14'),
  ('LV', 'Las Vegas Raiders', '13'),
  ('MIA', 'Miami Dolphins', '15'),
  ('MIN', 'Minnesota Vikings', '16'),
  ('NE', 'New England Patriots', '17'),
  ('NO', 'New Orleans Saints', '18'),
  ('NYG', 'New York Giants', '19'),
  ('NYJ', 'New York Jets', '20'),
  ('PHI', 'Philadelphia Eagles', '21'),
  ('PIT', 'Pittsburgh Steelers', '23'),
  ('SEA', 'Seattle Seahawks', '26'),
  ('SF', 'San Francisco 49ers', '25'),
  ('TB', 'Tampa Bay Buccaneers', '27'),
  ('TEN', 'Tennessee Titans', '10'),
  ('WSH', 'Washington Commanders', '28');
