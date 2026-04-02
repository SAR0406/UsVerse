-- ============================================================
-- SETTINGS SYSTEM MIGRATION
-- Enterprise-grade user settings and preferences
-- ============================================================

-- ============================================================
-- USER SETTINGS
-- General user preferences (theme, UI, locale)
-- ============================================================
create table if not exists public.user_settings (
  user_id         uuid references auth.users(id) on delete cascade primary key,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null,

  -- Appearance
  theme           text default 'system' check (theme in ('light', 'dark', 'system')),
  accent_color    text default '#ff6b9d',
  ui_density      text default 'normal' check (ui_density in ('compact', 'normal', 'comfortable')),
  font_scale      numeric default 1.0 check (font_scale >= 0.8 and font_scale <= 1.4),

  -- Localization
  language        text default 'en',
  timezone        text default 'UTC',
  date_format     text default 'MM/DD/YYYY' check (date_format in ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')),
  time_format     text default '12h' check (time_format in ('12h', '24h'))
);

-- Auto-update updated_at on user_settings
create or replace trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- NOTIFICATION PREFERENCES
-- Granular notification settings
-- ============================================================
create table if not exists public.notification_preferences (
  user_id         uuid references auth.users(id) on delete cascade primary key,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null,

  -- Email notifications
  email_enabled   boolean default true,
  email_messages  boolean default true,
  email_daily     boolean default true,
  email_presence  boolean default true,
  email_notes     boolean default false,
  email_marketing boolean default false,

  -- Push notifications (structure for future)
  push_enabled    boolean default true,
  push_messages   boolean default true,
  push_presence   boolean default true,

  -- In-app notifications
  inapp_enabled   boolean default true,
  inapp_sound     boolean default true
);

create or replace trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- PRIVACY SETTINGS
-- Privacy and security preferences
-- ============================================================
create table if not exists public.privacy_settings (
  user_id                uuid references auth.users(id) on delete cascade primary key,
  created_at             timestamptz default now() not null,
  updated_at             timestamptz default now() not null,

  profile_visibility     text default 'couple_only' check (profile_visibility in ('public', 'private', 'couple_only')),
  show_activity_status   boolean default true,
  show_last_seen         boolean default true,
  allow_data_export      boolean default true,
  analytics_consent      boolean default true
);

create or replace trigger privacy_settings_updated_at
  before update on public.privacy_settings
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- AI PREFERENCES
-- AI model and behavior settings
-- ============================================================
create table if not exists public.ai_preferences (
  user_id              uuid references auth.users(id) on delete cascade primary key,
  created_at           timestamptz default now() not null,
  updated_at           timestamptz default now() not null,

  default_model        text default 'gpt-4',
  response_style       text default 'balanced' check (response_style in ('concise', 'balanced', 'detailed')),
  auto_save_suggestions boolean default true,
  use_for_enhancement  boolean default true,
  training_consent     boolean default false
);

create or replace trigger ai_preferences_updated_at
  before update on public.ai_preferences
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- USER SESSIONS
-- Track active user sessions for security
-- ============================================================
create table if not exists public.user_sessions (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  created_at      timestamptz default now() not null,
  last_active_at  timestamptz default now() not null,
  expires_at      timestamptz,

  device_name     text,
  device_type     text check (device_type in ('desktop', 'mobile', 'tablet', 'other')),
  browser         text,
  os              text,
  ip_address      inet,
  location        text,
  user_agent      text,

  is_current      boolean default false
);

create index idx_user_sessions_user_id on public.user_sessions(user_id);
create index idx_user_sessions_last_active on public.user_sessions(last_active_at desc);

-- ============================================================
-- API KEYS
-- User-generated API keys for programmatic access
-- ============================================================
create table if not exists public.api_keys (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  created_at      timestamptz default now() not null,

  key_name        text not null,
  key_prefix      text not null,
  key_hash        text not null,
  scopes          text[] default array[]::text[],

  last_used_at    timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,

  constraint unique_key_prefix unique (key_prefix)
);

create index idx_api_keys_user_id on public.api_keys(user_id);
create index idx_api_keys_prefix on public.api_keys(key_prefix);

-- ============================================================
-- AUDIT LOGS
-- Track important settings changes for security
-- ============================================================
create table if not exists public.audit_logs (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  created_at      timestamptz default now() not null,

  action_type     text not null check (action_type in (
    'settings_update',
    'password_change',
    'email_change',
    'profile_update',
    'session_terminated',
    'api_key_created',
    'api_key_revoked',
    'account_deletion_requested',
    'privacy_update'
  )),
  resource_type   text,
  resource_id     uuid,

  old_value       jsonb,
  new_value       jsonb,

  ip_address      inet,
  user_agent      text
);

create index idx_audit_logs_user_id on public.audit_logs(user_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index idx_audit_logs_action_type on public.audit_logs(action_type);

-- ============================================================
-- EXTEND PROFILES TABLE
-- Add username and bio fields
-- ============================================================
alter table public.profiles
  add column if not exists username text unique,
  add column if not exists bio text;

-- Add constraint for username format (alphanumeric, underscore, dash)
alter table public.profiles
  add constraint username_format check (
    username is null or username ~ '^[a-zA-Z0-9_-]{3,20}$'
  );

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- USER SETTINGS
alter table public.user_settings enable row level security;

create policy "Users can view own settings"
  on public.user_settings for select using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update using (auth.uid() = user_id);

-- NOTIFICATION PREFERENCES
alter table public.notification_preferences enable row level security;

create policy "Users can view own notification preferences"
  on public.notification_preferences for select using (auth.uid() = user_id);

create policy "Users can insert own notification preferences"
  on public.notification_preferences for insert with check (auth.uid() = user_id);

create policy "Users can update own notification preferences"
  on public.notification_preferences for update using (auth.uid() = user_id);

-- PRIVACY SETTINGS
alter table public.privacy_settings enable row level security;

create policy "Users can view own privacy settings"
  on public.privacy_settings for select using (auth.uid() = user_id);

create policy "Users can insert own privacy settings"
  on public.privacy_settings for insert with check (auth.uid() = user_id);

create policy "Users can update own privacy settings"
  on public.privacy_settings for update using (auth.uid() = user_id);

-- AI PREFERENCES
alter table public.ai_preferences enable row level security;

create policy "Users can view own AI preferences"
  on public.ai_preferences for select using (auth.uid() = user_id);

create policy "Users can insert own AI preferences"
  on public.ai_preferences for insert with check (auth.uid() = user_id);

create policy "Users can update own AI preferences"
  on public.ai_preferences for update using (auth.uid() = user_id);

-- USER SESSIONS
alter table public.user_sessions enable row level security;

create policy "Users can view own sessions"
  on public.user_sessions for select using (auth.uid() = user_id);

create policy "Users can insert own sessions"
  on public.user_sessions for insert with check (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.user_sessions for delete using (auth.uid() = user_id);

-- API KEYS
alter table public.api_keys enable row level security;

create policy "Users can view own API keys"
  on public.api_keys for select using (auth.uid() = user_id);

create policy "Users can insert own API keys"
  on public.api_keys for insert with check (auth.uid() = user_id);

create policy "Users can update own API keys"
  on public.api_keys for update using (auth.uid() = user_id);

create policy "Users can delete own API keys"
  on public.api_keys for delete using (auth.uid() = user_id);

-- AUDIT LOGS
alter table public.audit_logs enable row level security;

create policy "Users can view own audit logs"
  on public.audit_logs for select using (auth.uid() = user_id);

-- Note: Only backend can insert audit logs (no insert policy for users)

-- ============================================================
-- STORAGE BUCKET FOR AVATARS
-- ============================================================

-- Create avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- RLS policies for avatars bucket
create policy "Authenticated users can upload avatars"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can update own avatars"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own avatars"
  on storage.objects for delete
  using (
    bucket_id = 'avatars' and
    auth.role() = 'authenticated' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- SEED DEFAULT SETTINGS FOR EXISTING USERS
-- ============================================================

-- Insert default settings for existing users who don't have settings yet
insert into public.user_settings (user_id)
select id from auth.users
where id not in (select user_id from public.user_settings)
on conflict (user_id) do nothing;

insert into public.notification_preferences (user_id)
select id from auth.users
where id not in (select user_id from public.notification_preferences)
on conflict (user_id) do nothing;

insert into public.privacy_settings (user_id)
select id from auth.users
where id not in (select user_id from public.privacy_settings)
on conflict (user_id) do nothing;

insert into public.ai_preferences (user_id)
select id from auth.users
where id not in (select user_id from public.ai_preferences)
on conflict (user_id) do nothing;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to automatically create default settings for new users
create or replace function public.handle_new_user_settings()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  insert into public.notification_preferences (user_id) values (new.id) on conflict do nothing;
  insert into public.privacy_settings (user_id) values (new.id) on conflict do nothing;
  insert into public.ai_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- Trigger to create default settings when user signs up
create or replace trigger on_auth_user_created_settings
  after insert on auth.users
  for each row execute procedure public.handle_new_user_settings();
