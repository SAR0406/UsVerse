# 🚀 Quick Setup: Diary Image Upload System

## TL;DR

1. Run SQL migration in Supabase
2. Create `diary-images` bucket
3. Test uploads!

---

## Step 1: Database Setup (5 minutes)

### Option A: Run Migration File

```bash
# Copy content from:
supabase/migrations/001_add_diary_images_rls.sql

# Paste into Supabase SQL Editor
# Click "Run"
```

### Option B: Use Updated Schema

```bash
# Copy content from:
supabase/schema.sql

# Paste into Supabase SQL Editor
# Click "Run"
```

---

## Step 2: Create Storage Bucket (2 minutes)

**In Supabase Dashboard:**

1. Navigate to **Storage** → **Create bucket**
2. Fill in:
   ```
   Bucket name: diary-images
   Public: false (IMPORTANT!)
   File size limit: 5242880 (5MB)
   Allowed types: image/jpeg, image/jpg, image/png, image/webp, image/gif
   ```
3. Click **Create**

---

## Step 3: Verify Setup (1 minute)

Run this in Supabase SQL Editor:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%diary%';
```

**Expected Output:**
```
✓ Authenticated users can upload diary images (INSERT)
✓ Authenticated users can read diary images (SELECT)
✓ Users can delete their own diary images (DELETE)
✓ Users can update their own diary images (UPDATE)
```

---

## Step 4: Test It! (2 minutes)

1. Log in to your app
2. Go to `/notes`
3. Create a new diary entry
4. Upload an image
5. ✅ Success!

---

## Troubleshooting

### Error: "row-level security policy"
- ✅ Run the SQL migration
- ✅ Ensure you're logged in
- ✅ Verify bucket name is exactly `diary-images`

### Images not uploading
- ✅ Check Supabase logs
- ✅ Verify bucket exists
- ✅ Ensure file is <5MB

---

## Features

✅ **Dual Storage**: Local (offline) or Cloud (Supabase)
✅ **Auto-Fallback**: Cloud → Local if upload fails
✅ **Drag & Drop**: Modern UX with react-dropzone
✅ **Auto-Compression**: Images compressed before upload
✅ **Secure**: RLS policies enforce user-based access
✅ **Mobile-Friendly**: Works on all devices

---

## Full Documentation

See [DIARY_IMAGE_UPLOAD.md](./DIARY_IMAGE_UPLOAD.md) for complete documentation.

---

**Time to Setup**: ~10 minutes
**Status**: Production Ready 🚀
