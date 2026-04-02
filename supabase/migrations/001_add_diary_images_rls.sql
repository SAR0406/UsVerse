-- ============================================================
-- MIGRATION: Add Diary Images Storage RLS Policies
-- Run this migration in your Supabase SQL Editor
-- ============================================================

-- Step 1: Create the diary-images bucket (if not exists)
-- You need to do this via Supabase Dashboard > Storage or via SQL:
-- This should be run via the Supabase Dashboard Storage UI or using the storage API
-- For now, we'll document the command needed:

-- MANUAL STEP (Run in Supabase Dashboard > Storage):
-- 1. Go to Storage section
-- 2. Click "Create Bucket"
-- 3. Name: "diary-images"
-- 4. Public: false (private bucket)
-- 5. Create

-- Or use SQL (if your Supabase version supports it):
-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values (
--   'diary-images',
--   'diary-images',
--   false,
--   5242880, -- 5MB limit
--   array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
-- )
-- on conflict (id) do nothing;

-- Step 2: Enable RLS on storage.objects (should already be enabled)
alter table storage.objects enable row level security;

-- Step 3: Drop existing conflicting policies (if they exist)
drop policy if exists "Allow authenticated diary uploads" on storage.objects;
drop policy if exists "Allow read diary images" on storage.objects;
drop policy if exists "Allow diary file management" on storage.objects;
drop policy if exists "Allow diary file updates" on storage.objects;

-- Step 4: Create new policies for diary-images bucket

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

-- Step 5: Verify policies were created
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
from pg_policies
where tablename = 'objects'
  and schemaname = 'storage'
  and policyname like '%diary%'
order by policyname;

-- Expected output: 4 policies
-- 1. Authenticated users can upload diary images (INSERT)
-- 2. Authenticated users can read diary images (SELECT)
-- 3. Users can delete their own diary images (DELETE)
-- 4. Users can update their own diary images (UPDATE)

-- Migration complete!
-- Next steps:
-- 1. Ensure diary-images bucket exists in Storage
-- 2. Test upload with authenticated user
-- 3. Verify RLS blocks unauthenticated access
