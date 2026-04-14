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
