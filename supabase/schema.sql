-- UsVerse Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- COUPLES
-- Connects two users as a couple (created before profiles to avoid forward refs)
-- ============================================================
create table if not exists public.couples (
  id               uuid default uuid_generate_v4() primary key,
  created_at       timestamptz default now() not null,
  user1_id         uuid references auth.users(id) on delete cascade not null,
  user2_id         uuid references auth.users(id) on delete set null,
  invite_code      text unique not null,
  anniversary_date date,
  meet_date        date
);

-- ============================================================
-- PROFILES
-- Extended user profiles (linked to auth.users)
-- couple_id FK added after couples table is created
-- ============================================================
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  created_at  timestamptz default now() not null,
  display_name text,
  avatar_url  text,
  couple_id   uuid references public.couples(id) on delete set null
);

-- ============================================================
-- MESSAGES
-- Private chat messages between the couple
-- ============================================================
create table if not exists public.messages (
  id           uuid default uuid_generate_v4() primary key,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null,
  couple_id    uuid references public.couples(id) on delete cascade not null,
  sender_id    uuid references auth.users(id) on delete cascade not null,
  content      text not null,
  message_type text default 'text' check (message_type in ('text', 'touch', 'presence', 'photo', 'video', 'voice', 'gif')),
  media_url    text,
  media_thumbnail_url text,
  media_duration integer,
  gif_url      text,
  reply_to_id  uuid references public.messages(id) on delete set null,
  edited       boolean default false,
  read_at      timestamptz,
  deleted_for_sender boolean default false,
  deleted_for_receiver boolean default false
);

-- ============================================================
-- MESSAGE REACTIONS
-- Reactions to messages (like Instagram heart, laugh, etc.)
-- ============================================================
create table if not exists public.message_reactions (
  id           uuid default uuid_generate_v4() primary key,
  created_at   timestamptz default now() not null,
  message_id   uuid references public.messages(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  reaction     text not null check (reaction in ('heart', 'laugh', 'sad', 'wow', 'angry', 'thumbs_up', 'fire', 'clap')),
  unique (message_id, user_id)
);

-- ============================================================
-- CHAT THEMES
-- Custom chat themes and colors for each couple
-- ============================================================
create table if not exists public.chat_themes (
  couple_id    uuid references public.couples(id) on delete cascade primary key,
  created_at   timestamptz default now() not null,
  updated_at   timestamptz default now() not null,
  theme_name   text default 'gradient_purple',
  primary_color text default '#9b6dff',
  secondary_color text default '#ff6b9d',
  bubble_style text default 'rounded' check (bubble_style in ('rounded', 'sharp', 'minimal')),
  custom_emoji text
);

-- ============================================================
-- DAILY ANSWERS
-- Answers to daily questions by couple members
-- ============================================================
create table if not exists public.daily_answers (
  id          uuid default uuid_generate_v4() primary key,
  created_at  timestamptz default now() not null,
  question_id text not null,
  couple_id   uuid references public.couples(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  answer      text not null,
  unique (question_id, couple_id, user_id)
);

-- ============================================================
-- SHARED NOTES
-- Shared diary entries
-- ============================================================
create table if not exists public.shared_notes (
  id          uuid default uuid_generate_v4() primary key,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  couple_id   uuid references public.couples(id) on delete cascade not null,
  author_id   uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  content     text default ''
);

-- Auto-update updated_at on shared_notes
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger shared_notes_updated_at
  before update on public.shared_notes
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- PRESENCE EVENTS
-- Thinking of you, silent mode, heartbeat, etc.
-- ============================================================
create table if not exists public.presence_events (
  id          uuid default uuid_generate_v4() primary key,
  created_at  timestamptz default now() not null,
  couple_id   uuid references public.couples(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  event_type  text not null check (event_type in (
    'thinking_of_you',
    'silent_mode',
    'studying',
    'sleeping',
    'missing_you',
    'heartbeat'
  )),
  message     text
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Only couple members can access their data
-- ============================================================

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.chat_themes enable row level security;
alter table public.daily_answers enable row level security;
alter table public.shared_notes enable row level security;
alter table public.presence_events enable row level security;

-- PROFILES policies
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Users can see their partner's profile
create policy "Couple members can see partner profile"
  on public.profiles for select using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

-- COUPLES policies
create policy "Couple members can view couple"
  on public.couples for select using (
    user1_id = auth.uid() or user2_id = auth.uid()
  );

create policy "Users can create couple"
  on public.couples for insert with check (user1_id = auth.uid());

create policy "Couple members can update couple"
  on public.couples for update using (
    user1_id = auth.uid() or user2_id = auth.uid()
  );

-- Allow any authenticated user to join an incomplete couple
-- (set themselves as user2 when user2_id is currently null)
create policy "Anyone can join incomplete couple"
  on public.couples for update
  using (user2_id is null)
  with check (user2_id = auth.uid());

-- Allow anyone to read couple by invite_code (for joining)
create policy "Anyone can read couple by invite code"
  on public.couples for select using (true);

-- MESSAGES policies
create policy "Couple members can view messages"
  on public.messages for select using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Couple members can send messages"
  on public.messages for insert with check (
    sender_id = auth.uid() and
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Senders can delete own messages"
  on public.messages for delete using (sender_id = auth.uid());

create policy "Couple members can update messages"
  on public.messages for update using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

-- MESSAGE REACTIONS policies
create policy "Couple members can view reactions"
  on public.message_reactions for select using (
    message_id in (
      select id from public.messages
      where couple_id in (
        select id from public.couples
        where user1_id = auth.uid() or user2_id = auth.uid()
      )
    )
  );

create policy "Users can add reactions"
  on public.message_reactions for insert with check (
    user_id = auth.uid() and
    message_id in (
      select id from public.messages
      where couple_id in (
        select id from public.couples
        where user1_id = auth.uid() or user2_id = auth.uid()
      )
    )
  );

create policy "Users can delete their own reactions"
  on public.message_reactions for delete using (user_id = auth.uid());

-- CHAT THEMES policies
create policy "Couple members can view their theme"
  on public.chat_themes for select using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Couple members can create their theme"
  on public.chat_themes for insert with check (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Couple members can update their theme"
  on public.chat_themes for update using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

-- DAILY ANSWERS policies
create policy "Couple members can view daily answers"
  on public.daily_answers for select using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Users can insert own daily answer"
  on public.daily_answers for insert with check (
    user_id = auth.uid() and
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Users can update own daily answer"
  on public.daily_answers for update using (user_id = auth.uid());

-- SHARED NOTES policies
create policy "Couple members can view shared notes"
  on public.shared_notes for select using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Couple members can create shared notes"
  on public.shared_notes for insert with check (
    author_id = auth.uid() and
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Note authors can update their notes"
  on public.shared_notes for update using (author_id = auth.uid());

create policy "Note authors can delete their notes"
  on public.shared_notes for delete using (author_id = auth.uid());

-- PRESENCE EVENTS policies
create policy "Couple members can view presence events"
  on public.presence_events for select using (
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

create policy "Couple members can insert presence events"
  on public.presence_events for insert with check (
    user_id = auth.uid() and
    couple_id in (
      select id from public.couples
      where user1_id = auth.uid() or user2_id = auth.uid()
    )
  );

-- ============================================================
-- TRIGGER: Auto-create profile on user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- REALTIME
-- Enable realtime for the tables that need it
-- ============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_reactions;
alter publication supabase_realtime add table public.presence_events;
alter publication supabase_realtime add table public.daily_answers;
alter publication supabase_realtime add table public.shared_notes;
alter publication supabase_realtime add table public.chat_themes;

-- ============================================================
-- STORAGE BUCKETS
-- Configure storage buckets for media uploads
-- ============================================================

-- Create storage bucket for chat media (photos, videos, voice messages)
-- Run this in the Supabase Dashboard or via SQL:
-- insert into storage.buckets (id, name, public) values ('chat-media', 'chat-media', false);
-- insert into storage.buckets (id, name, public) values ('diary-images', 'diary-images', false);

-- Enable RLS on storage.objects (should already be enabled, but ensuring it)
alter table storage.objects enable row level security;

-- Storage policies for chat-media bucket
-- Note: These need to be run after the bucket is created
create policy "Couple members can upload media"
  on storage.objects for insert with check (
    bucket_id = 'chat-media' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Couple members can view their media"
  on storage.objects for select using (
    bucket_id = 'chat-media' and
    (
      auth.uid()::text = (storage.foldername(name))[1] or
      exists (
        select 1 from public.couples
        where (user1_id = auth.uid() or user2_id = auth.uid())
          and (user1_id::text = (storage.foldername(name))[1] or user2_id::text = (storage.foldername(name))[1])
      )
    )
  );

create policy "Users can delete their own media"
  on storage.objects for delete using (
    bucket_id = 'chat-media' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- STORAGE POLICIES FOR DIARY-IMAGES BUCKET
-- ============================================================

-- Policy 1: Allow authenticated users to upload images (INSERT)
-- Only to their own folder (user_id matches first folder in path)
create policy "Authenticated users can upload diary images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'diary-images'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy 2: Allow authenticated users to read images (SELECT)
-- Users can read their own images OR their partner's images
create policy "Authenticated users can read diary images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'diary-images'
    and (
      -- Own images
      auth.uid()::text = (storage.foldername(name))[1]
      or
      -- Partner's images (if in same couple)
      exists (
        select 1
        from public.couples
        where (user1_id = auth.uid() or user2_id = auth.uid())
          and (
            user1_id::text = (storage.foldername(name))[1]
            or user2_id::text = (storage.foldername(name))[1]
          )
      )
    )
  );

-- Policy 3: Allow users to delete their own images (DELETE)
create policy "Users can delete their own diary images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'diary-images'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy 4: Allow users to update their own images (UPDATE)
create policy "Users can update their own diary images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'diary-images'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'diary-images'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );
