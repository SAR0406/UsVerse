-- ============================================================
-- STORAGE BUCKET SETUP
-- Run this script in your Supabase SQL Editor to create the
-- required storage buckets and their policies
-- ============================================================

-- Create storage bucket for chat media (photos, videos, voice messages)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  true, -- Make public so URLs work without signed URLs
  10485760, -- 10MB limit
  array['image/*', 'video/*', 'audio/*']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/*', 'video/*', 'audio/*'];

-- Create storage bucket for diary images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diary-images',
  'diary-images',
  true, -- Make public so URLs work without signed URLs
  5242880, -- 5MB limit
  array['image/*']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/*'];

-- Enable RLS on storage.objects (should already be enabled)
alter table storage.objects enable row level security;

-- ============================================================
-- STORAGE POLICIES FOR CHAT-MEDIA BUCKET
-- ============================================================

-- Drop existing policies if they exist
drop policy if exists "Couple members can upload media" on storage.objects;
drop policy if exists "Couple members can view their media" on storage.objects;
drop policy if exists "Users can delete their own media" on storage.objects;

-- Policy 1: Allow authenticated users to upload media (INSERT)
-- Only to their own folder (user_id matches first folder in path)
create policy "Couple members can upload media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'chat-media'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy 2: Allow authenticated users to view media (SELECT)
-- Users can view their own media OR their partner's media (if in same couple)
create policy "Couple members can view their media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'chat-media'
    and (
      -- Own media
      auth.uid()::text = (storage.foldername(name))[1]
      or
      -- Partner's media (if in same couple)
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

-- Policy 3: Allow users to delete their own media (DELETE)
create policy "Users can delete their own media"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'chat-media'
    and auth.uid() is not null
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- STORAGE POLICIES FOR DIARY-IMAGES BUCKET
-- ============================================================

-- Drop existing policies if they exist
drop policy if exists "Authenticated users can upload diary images" on storage.objects;
drop policy if exists "Authenticated users can read diary images" on storage.objects;
drop policy if exists "Users can delete their own diary images" on storage.objects;
drop policy if exists "Users can update their own diary images" on storage.objects;

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

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check if buckets were created
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('chat-media', 'diary-images');

-- Check if policies were created
select schemaname, tablename, policyname, permissive, roles, cmd, qual
from pg_policies
where tablename = 'objects'
  and (
    policyname like '%chat-media%'
    or policyname like '%diary%'
    or policyname like '%media%'
  )
order by policyname;
