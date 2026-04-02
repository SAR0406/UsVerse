/**
 * Unified diary storage service
 * Handles both local (IndexedDB) and cloud (Supabase) storage with automatic fallback
 */

import * as indexedDB from "./indexeddb";
import * as cloud from "./cloud";

export type StorageMode = "local" | "cloud";

export interface DiaryImage {
  id: string;
  noteId: string;
  caption: string;
  dataUrl?: string; // For local storage
  publicUrl?: string; // For cloud storage
  cloudPath?: string;
  storageMode: StorageMode;
  createdAt: number;
}

export interface UploadProgress {
  imageId: string;
  progress: number;
  status: "uploading" | "compressing" | "success" | "error";
  error?: string;
}

/**
 * Upload image with automatic fallback
 */
export async function uploadImage(
  file: File,
  userId: string,
  noteId: string,
  preferredMode: StorageMode,
  onProgress?: (progress: UploadProgress) => void
): Promise<DiaryImage> {
  const imageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Try cloud upload first if preferred
  if (preferredMode === "cloud") {
    try {
      onProgress?.({
        imageId,
        progress: 0,
        status: "compressing",
      });

      const result = await cloud.uploadImageToCloud(
        file,
        userId,
        noteId,
        (progress) => {
          onProgress?.({
            imageId,
            progress,
            status: "uploading",
          });
        }
      );

      if (result.success && result.publicUrl && result.path) {
        // Store metadata in IndexedDB for offline access
        const blob = file;
        await indexedDB.storeImage(imageId, noteId, blob, "");
        await indexedDB.markImageAsSynced(imageId);

        onProgress?.({
          imageId,
          progress: 100,
          status: "success",
        });

        return {
          id: imageId,
          noteId,
          caption: "",
          publicUrl: result.publicUrl,
          cloudPath: result.path,
          storageMode: "cloud",
          createdAt: Date.now(),
        };
      } else {
        // Cloud upload failed, fallback to local
        console.warn("Cloud upload failed, falling back to local storage:", result.error);
        return await uploadToLocal(file, imageId, noteId, result.error);
      }
    } catch (error) {
      console.error("Cloud upload error, falling back to local:", error);
      return await uploadToLocal(
        file,
        imageId,
        noteId,
        error instanceof Error ? error.message : "Cloud upload failed"
      );
    }
  }

  // Local storage
  return await uploadToLocal(file, imageId, noteId);
}

/**
 * Upload to local storage
 */
async function uploadToLocal(
  file: File,
  imageId: string,
  noteId: string,
  fallbackReason?: string
): Promise<DiaryImage> {
  const blob = file;
  await indexedDB.storeImage(imageId, noteId, blob, "");
  const dataUrl = await indexedDB.blobToDataURL(blob);

  if (fallbackReason) {
    console.info(`Saved locally: ${fallbackReason}`);
  }

  return {
    id: imageId,
    noteId,
    caption: "",
    dataUrl,
    storageMode: "local",
    createdAt: Date.now(),
  };
}

/**
 * Load images for a note
 */
export async function loadImages(noteId: string): Promise<DiaryImage[]> {
  const records = await indexedDB.getImagesByNoteId(noteId);

  return await Promise.all(
    records.map(async (record) => {
      const dataUrl = await indexedDB.blobToDataURL(record.blob);
      return {
        id: record.id,
        noteId: record.noteId,
        caption: record.caption,
        dataUrl,
        storageMode: record.uploadedToCloud ? "cloud" : "local",
        createdAt: record.createdAt,
      } as DiaryImage;
    })
  );
}

/**
 * Update image caption
 */
export async function updateCaption(imageId: string, caption: string): Promise<void> {
  await indexedDB.updateImageCaption(imageId, caption);
}

/**
 * Delete image
 */
export async function deleteImage(image: DiaryImage): Promise<void> {
  // Delete from cloud if applicable
  if (image.cloudPath) {
    await cloud.deleteImageFromCloud(image.cloudPath);
  }

  // Delete from IndexedDB
  await indexedDB.deleteImage(image.id);
}

/**
 * Delete all images for a note
 */
export async function deleteImagesForNote(noteId: string): Promise<void> {
  const images = await loadImages(noteId);

  // Delete cloud images
  await Promise.all(
    images
      .filter((img) => img.cloudPath)
      .map((img) => cloud.deleteImageFromCloud(img.cloudPath!))
  );

  // Delete from IndexedDB
  await indexedDB.deleteImagesByNoteId(noteId);
}

/**
 * Sync unsynced images to cloud (for future offline sync feature)
 */
export async function syncUnsyncedImages(userId: string): Promise<void> {
  const unsyncedImages = await indexedDB.getUnsyncedImages();

  for (const record of unsyncedImages) {
    try {
      const file = new File([record.blob], `${record.id}.jpg`, {
        type: record.blob.type,
      });

      const result = await cloud.uploadImageToCloud(
        file,
        userId,
        record.noteId
      );

      if (result.success) {
        await indexedDB.markImageAsSynced(record.id);
      }
    } catch (error) {
      console.error(`Failed to sync image ${record.id}:`, error);
    }
  }
}

export { StorageMode, validateImageFile } from "./cloud";
