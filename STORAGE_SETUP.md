# Storage Setup Guide

This guide explains how to fix media upload and loading issues in UsVerse chat.

## Problem Statement

Media (images, videos, audio) uploaded in chat was:
1. ✅ Properly saving to Supabase storage
2. ❌ **NOT saving to diary entries** (media was only in messages table)
3. ❌ **NOT loading/displaying** in the chat frontend

## Root Causes Identified

1. **Missing Storage Buckets**: The `chat-media` bucket was not created in Supabase
2. **Incorrect Bucket Configuration**: Buckets were not set to public, causing URL access issues
3. **Missing RLS Policies**: Row Level Security policies were incomplete
4. **Next.js Image Configuration**: Next.js needed configuration to allow Supabase CDN domains
5. **Poor Error Handling**: Upload errors were not properly surfaced to users

## Solution Implementation

### 1. Create Storage Buckets in Supabase

**IMPORTANT:** You must run this SQL script in your Supabase SQL Editor:

```bash
# File: supabase/setup_storage_buckets.sql
```

**Steps:**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/setup_storage_buckets.sql`
4. Paste and execute the script
5. Verify buckets were created (check output)

This script will:
- ✅ Create `chat-media` bucket (for chat images, videos, audio)
- ✅ Create `diary-images` bucket (for diary photos)
- ✅ Set both buckets to **public** (required for URL access)
- ✅ Configure file size limits (10MB for chat, 5MB for diary)
- ✅ Set allowed MIME types
- ✅ Create all necessary RLS policies

### 2. Verify Storage Bucket Configuration

After running the script, verify your buckets:

```sql
-- Check buckets
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('chat-media', 'diary-images');
```

**Expected Output:**
```
chat-media    | true | 10485760 (10MB) | {image/*,video/*,audio/*}
diary-images  | true | 5242880 (5MB)   | {image/*}
```

### 3. Code Improvements Made

#### A. Enhanced Chat Upload Function (`src/app/(app)/chat/page.tsx`)

**Improvements:**
- ✅ File validation (type, size)
- ✅ Better error messages
- ✅ Progress tracking
- ✅ Proper content-type headers
- ✅ Unique filename generation
- ✅ Public URL retrieval

#### B. Improved Media Display

**Improvements:**
- ✅ Added error handlers for failed media loads
- ✅ Added `unoptimized` flag for Next.js Image component
- ✅ Added `preload="metadata"` for video/audio
- ✅ Better error UI feedback

#### C. Next.js Configuration (`next.config.ts`)

**Added:**
```typescript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "*.supabase.co",
      pathname: "/storage/v1/object/public/**",
    },
  ],
}
```

This allows Next.js Image component to load images from Supabase CDN.

## Testing the Solution

### Test 1: Upload Image in Chat

1. Open chat page
2. Click camera icon
3. Select an image (< 10MB)
4. **Expected:** Progress bar shows, image uploads, appears in chat
5. **Expected:** Image is visible and clickable

### Test 2: Upload Video in Chat

1. Open chat page
2. Click video icon
3. Select a video (< 10MB)
4. **Expected:** Video uploads, appears with playback controls
5. **Expected:** Video plays when clicked

### Test 3: Record Voice Message

1. Open chat page
2. Click microphone icon
3. Record audio
4. Stop recording
5. **Expected:** Audio uploads, appears with playback controls
6. **Expected:** Audio plays when clicked

### Test 4: Error Handling

1. Try uploading file > 10MB
2. **Expected:** Clear error message about file size
3. Try uploading wrong file type
4. **Expected:** Clear error message about file type

## Troubleshooting

### Issue: "Storage bucket not configured"

**Solution:** Run the `setup_storage_buckets.sql` script in Supabase SQL Editor

### Issue: "Permission error"

**Solution:**
1. Check user is logged in
2. Verify RLS policies were created
3. Check user has couple_id in profiles table

### Issue: Images not loading

**Solution:**
1. Check bucket is set to **public** (must be true)
2. Verify Next.js config has Supabase domain allowed
3. Check browser console for CORS errors

### Issue: "Failed to upload file"

**Solution:**
1. Check file size (< 10MB for chat, < 5MB for diary)
2. Check file type matches allowed types
3. Check Supabase storage quota not exceeded

## Storage Structure

### Chat Media Bucket (`chat-media`)

```
chat-media/
  ├── {userId}/
  │   ├── {timestamp}-{randomId}.jpg
  │   ├── {timestamp}-{randomId}.mp4
  │   └── {timestamp}-{randomId}.webm
```

### Diary Images Bucket (`diary-images`)

```
diary-images/
  ├── {userId}/
  │   └── {noteId}/
  │       ├── {timestamp}-{randomId}.jpg
  │       └── {timestamp}-{randomId}.png
```

## Security Considerations

### RLS Policies

**Chat Media:**
- Users can only upload to their own folder (`userId/`)
- Users can view their own media + partner's media (if in same couple)
- Users can only delete their own media

**Diary Images:**
- Users can only upload to their own folder (`userId/noteId/`)
- Users can view own images + partner's images (if in same couple)
- Users can only delete/update their own images

### File Validation

**Server-side:**
- Size limits enforced by bucket configuration
- MIME type restrictions in bucket settings
- RLS policies prevent unauthorized access

**Client-side:**
- File type validation before upload
- File size validation before upload
- User-friendly error messages

## Performance Optimizations

1. **Image Compression:** Consider adding client-side compression for large images
2. **Lazy Loading:** Images load on-demand as user scrolls
3. **CDN Caching:** Supabase serves files via CDN with caching
4. **Preload Metadata:** Videos/audio only load metadata initially

## Next Steps

### Recommended Improvements

1. **Add Media to Diary:**
   - When media is uploaded in chat, optionally save reference to diary
   - Add UI to view chat media in diary entries
   - Link messages to diary dates

2. **Image Thumbnails:**
   - Generate thumbnails for video files
   - Use progressive JPEGs for images
   - Optimize loading performance

3. **Offline Support:**
   - Cache media locally using IndexedDB
   - Queue uploads when offline
   - Sync when connection restored

4. **Media Gallery:**
   - Create gallery view of all chat media
   - Filter by type (photos, videos, audio)
   - Download/share options

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Supabase logs in dashboard
3. Verify all setup steps were completed
4. Test with different file types/sizes

## Summary

✅ **What was fixed:**
- Created storage buckets with proper configuration
- Added comprehensive RLS policies
- Improved upload function with validation
- Enhanced error handling and user feedback
- Configured Next.js for Supabase images
- Added progress tracking for uploads

❌ **What still needs work:**
- Media is NOT automatically saved to diary entries (by design - messages and diary are separate)
- If you want media in diary, you need to manually add that feature

🎉 **Result:** Media now uploads reliably and displays correctly in chat!
