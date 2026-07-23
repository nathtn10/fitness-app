-- =============================================================================
-- Fitness App — Supabase schema (reference DDL)
--
-- This is the contract counterpart to src/api/*. It defines the Postgres
-- tables, row-level security (RLS), and helper triggers the design in
-- BACKEND.md relies on. Column names are snake_case; the client adapter maps
-- them to the camelCase DTOs in src/api.
--
-- RLS is deny-by-default: every table enables RLS and only the policies below
-- grant access. Nothing is readable/writable without matching a policy.
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

-- Bump updated_at on every write. Used ONLY for server-owned tables (profiles).
-- Synced data tables are offline-first and CLIENT-authoritative: the client
-- supplies updated_at so last-write-wins works across devices, so those tables
-- deliberately do NOT use this trigger.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- Is the current user an accepted follower of :target (used by feed policies)?
create or replace function is_follower(target uuid) returns boolean as $$
  select exists (
    select 1 from follows
    where follower_id = auth.uid()
      and followee_id = target
      and status = 'accepted'
  );
$$ language sql stable security definer;

-- ---------------------------------------------------------------------------
-- Profiles & privacy
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null default 'Athlete',
  unit text not null default 'kg' check (unit in ('kg','lb')),
  bodyweight_kg numeric,
  weekly_set_targets jsonb not null default '{}',
  nutrition_goals jsonb not null default '{}',
  avatar_url text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table profiles enable row level security;

-- Anyone signed in can read a profile card (used for the social graph);
-- private-account details beyond the card are gated in the app/feed policies.
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_write on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create trigger profiles_touch before update on profiles
  for each row execute function set_updated_at();

create table privacy_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_visibility text not null default 'private'
    check (default_visibility in ('private','followers','public')),
  share_workouts boolean not null default false,
  share_activities boolean not null default false,
  share_nutrition boolean not null default false,
  share_steps boolean not null default false,
  discoverable boolean not null default true
);
alter table privacy_settings enable row level security;
create policy privacy_owner on privacy_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Shareable training data
--
-- Hybrid model: the full domain record lives in `data` jsonb (matches the
-- client's document model and makes whole-record sync trivial), while a few
-- extracted columns support feed rendering, leaderboards, and filtering.
-- ---------------------------------------------------------------------------

create table workout_sessions (
  id uuid primary key,                       -- client-generated (idempotent writes)
  user_id uuid not null references auth.users(id) on delete cascade,
  visibility text not null default 'private'
    check (visibility in ('private','followers','public')),
  started_at timestamptz not null,
  ended_at timestamptz,
  total_volume numeric not null default 0,
  working_sets int not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table workout_sessions enable row level security;
create index on workout_sessions (user_id, updated_at);
create index on workout_sessions (user_id, started_at desc);

-- Owner can do anything to their rows.
create policy ws_owner on workout_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Others can READ per visibility (public, or followers-only for accepted followers).
create policy ws_shared_read on workout_sessions for select to authenticated using (
  deleted_at is null and (
    visibility = 'public'
    or (visibility = 'followers' and is_follower(user_id))
  )
);

create table activities (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  visibility text not null default 'private'
    check (visibility in ('private','followers','public')),
  type text not null check (type in ('run','ride','walk','hike')),
  started_at timestamptz not null,
  distance_m numeric not null default 0,
  moving_s int not null default 0,
  elevation_m numeric not null default 0,
  calories int not null default 0,
  data jsonb not null,                       -- includes the GPS track
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table activities enable row level security;
create index on activities (user_id, updated_at);
create policy act_owner on activities for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy act_shared_read on activities for select to authenticated using (
  deleted_at is null and (
    visibility = 'public'
    or (visibility = 'followers' and is_follower(user_id))
  )
);

create table meals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  visibility text not null default 'private'
    check (visibility in ('private','followers','public')),
  logged_at timestamptz not null,
  type text not null check (type in ('breakfast','lunch','dinner','snack')),
  name text not null default '',
  calories int not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  data jsonb not null,                       -- ingredients
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table meals enable row level security;
create index on meals (user_id, updated_at);
create policy meals_owner on meals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy meals_shared_read on meals for select to authenticated using (
  deleted_at is null and (
    visibility = 'public'
    or (visibility = 'followers' and is_follower(user_id))
  )
);

-- ---------------------------------------------------------------------------
-- Private-only data (never shared through visibility; owner-only RLS)
-- ---------------------------------------------------------------------------

create table progress_photos (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  taken_at timestamptz not null,
  bodyweight_kg numeric,
  note text,
  storage_path text not null,                -- private bucket: {user_id}/{id}.jpg
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table progress_photos enable row level security;
create policy photos_owner on progress_photos for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table gyms (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_m int not null default 120,
  place_id text,                             -- geohash-derived shared place key
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table gyms enable row level security;
create policy gyms_owner on gyms for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table gym_visits (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  gym_id uuid not null references gyms(id) on delete cascade,
  place_id text,
  arrived_at timestamptz not null,
  departed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table gym_visits enable row level security;
create index on gym_visits (user_id, updated_at);
create policy visits_owner on gym_visits for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table daily_activity (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  steps int not null default 0,
  active_kcal int not null default 0,
  distance_m numeric not null default 0,
  source text not null check (source in ('healthkit','googlefit','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, date, source)
);
alter table daily_activity enable row level security;
create index on daily_activity (user_id, updated_at);
create policy steps_owner on daily_activity for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Gym busyness (anonymized, crowd-aggregated)
--
-- A scheduled Edge Function rolls gym_visits up into per-place, per-slot
-- occupancy. Only aggregates with >= K distinct contributors are exposed, so
-- no individual's presence can be inferred (k-anonymity).
-- ---------------------------------------------------------------------------

create table gym_busyness (
  place_id text not null,
  day_of_week int not null check (day_of_week between 0 and 6),
  hour int not null check (hour between 0 and 23),
  score numeric not null,                    -- 0..1 relative to the place's peak
  contributors int not null,
  updated_at timestamptz not null default now(),
  primary key (place_id, day_of_week, hour)
);
alter table gym_busyness enable row level security;
-- Read-only to all authenticated users; only the aggregation job (service role) writes.
create policy busyness_read on gym_busyness for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Social graph
-- ---------------------------------------------------------------------------

create table follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
alter table follows enable row level security;
-- You can see follow edges you're part of.
create policy follows_visible on follows for select to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid());
-- You can create/remove your own outgoing follow; the followee can accept.
create policy follows_manage on follows for all to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid())
  with check (follower_id = auth.uid() or followee_id = auth.uid());

create table feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('workout','activity','pr','photo','note')),
  ref_id uuid,
  caption text,
  visibility text not null default 'followers'
    check (visibility in ('private','followers','public')),
  created_at timestamptz not null default now()
);
alter table feed_posts enable row level security;
create index on feed_posts (user_id, created_at desc);
create policy posts_owner on feed_posts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy posts_shared_read on feed_posts for select to authenticated using (
  visibility = 'public'
  or (visibility = 'followers' and is_follower(user_id))
);

create table post_reactions (
  post_id uuid not null references feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);
alter table post_reactions enable row level security;
create policy reactions_read on post_reactions for select to authenticated using (true);
create policy reactions_write on post_reactions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);
alter table post_comments enable row level security;
create index on post_comments (post_id, created_at);
create policy comments_read on post_comments for select to authenticated using (true);
create policy comments_write on post_comments for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage (configured in the Supabase dashboard / storage API, shown for ref)
--
--   bucket: progress-photos (private)
--   policy: a user may read/write only objects under a prefix equal to their
--           uid, e.g. storage.foldername(name)[1] = auth.uid()::text
--   Photos are EXIF-stripped client-side before upload; viewing uses
--   short-lived signed URLs.
-- ---------------------------------------------------------------------------

-- On new auth user, seed a profile + privacy row (attach to auth.users via trigger).
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, username)
    values (new.id, 'user_' || substr(new.id::text, 1, 8));
  insert into privacy_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
