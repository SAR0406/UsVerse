/**
 * Supabase Cloud Storage service for diary images
 */

import { createClient } from "@/lib/supabase/client";
import imageCompression from "browser-image-compression";

const BUCKET_NAME = "diary-images";
const MAX_FILE_SIZE_MB = 5;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;

export interface CloudUploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "File must be an image" };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `File size must be less than ${MAX_FILE_SIZE_MB}MB` };
  }

  return { valid: true };
}

/**
 * Compress image before upload
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: MAX_FILE_SIZE_MB,
    maxWidthOrHeight: Math.max(MAX_WIDTH, MAX_HEIGHT),
    useWebWorker: true,
    fileType: file.type as "image/jpeg" | "image/png" | "image/webp",
  };

  try {
    const compressed = await imageCompression(file, options);
    return compressed;
  } catch (error) {
    console.error("Image compression failed:", error);
    // Return original if compression fails
    return file;
  }
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadImageToCloud(
  file: File,
  userId: string,
  noteId: string,
  onProgress?: (progress: number) => void
): Promise<CloudUploadResult> {
  const supabase = createClient();

  try {
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return {
        success: false,
        error: "Authentication required. Please log in again.",
      };
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Compress image
    const compressedFile = await compressImage(file);

    // Generate unique file path
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${userId}/${noteId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, compressedFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      // Check for RLS errors
      if (error.message.includes("row-level security") || error.message.includes("permission")) {
        return {
          success: false,
          error: "Permission error. Please ensure you're logged in with the correct account.",
        };
      }
      return {
        success: false,
        error: error.message || "Upload failed",
      };
    }

    // Return the storage path (not public URL) for private buckets
    if (onProgress) onProgress(100);

    return {
      success: true,
      path: data.path,
    };
  } catch (error) {
    console.error("Cloud upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete image from cloud storage
 */
export async function deleteImageFromCloud(path: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error("Cloud delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Cloud delete error:", error);
    return false;
  }
}

/**
 * Get signed URL for an image path (for private buckets)
 * Note: Use the SecureMediaImage component instead of calling this directly
 */
export async function getSignedUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }
}
