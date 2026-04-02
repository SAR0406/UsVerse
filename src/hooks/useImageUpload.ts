/**
 * React hook for diary image uploads
 */

"use client";

import { useState, useCallback } from "react";
import * as diaryStorage from "@/lib/storage/diary-storage";
import type { StorageMode, DiaryImage, UploadProgress } from "@/lib/storage/diary-storage";

interface UseImageUploadOptions {
  userId: string;
  noteId: string;
  storageMode: StorageMode;
}

interface UseImageUploadReturn {
  images: DiaryImage[];
  uploading: boolean;
  uploadProgress: Record<string, UploadProgress>;
  error: string | null;
  uploadImage: (file: File) => Promise<void>;
  uploadMultiple: (files: File[]) => Promise<void>;
  updateCaption: (imageId: string, caption: string) => Promise<void>;
  deleteImage: (imageId: string) => Promise<void>;
  loadImages: () => Promise<void>;
  clearError: () => void;
}

export function useImageUpload({
  userId,
  noteId,
  storageMode,
}: UseImageUploadOptions): UseImageUploadReturn {
  const [images, setImages] = useState<DiaryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    if (!noteId) return;
    try {
      const loaded = await diaryStorage.loadImages(noteId);
      setImages(loaded);
      setError(null);
    } catch (err) {
      console.error("Failed to load images:", err);
      setError("Failed to load images");
    }
  }, [noteId]);

  const uploadImage = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);

      try {
        const validation = diaryStorage.validateImageFile(file);
        if (!validation.valid) {
          setError(validation.error || "Invalid file");
          return;
        }

        const image = await diaryStorage.uploadImage(
          file,
          userId,
          noteId,
          storageMode,
          (progress) => {
            setUploadProgress((prev) => ({
              ...prev,
              [progress.imageId]: progress,
            }));

            if (progress.status === "error") {
              setError(progress.error || "Upload failed");
            }
          }
        );

        setImages((prev) => [...prev, image]);

        // Clear progress after success
        setTimeout(() => {
          setUploadProgress((prev) => {
            const next = { ...prev };
            delete next[image.id];
            return next;
          });
        }, 1000);

        // Show notification if fallback occurred
        if (image.storageMode === "local" && storageMode === "cloud") {
          setError("Cloud upload failed, saved locally instead");
          setTimeout(() => setError(null), 5000);
        }
      } catch (err) {
        console.error("Upload error:", err);
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [userId, noteId, storageMode]
  );

  const uploadMultiple = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        await uploadImage(file);
      }
    },
    [uploadImage]
  );

  const updateCaption = useCallback(async (imageId: string, caption: string) => {
    try {
      await diaryStorage.updateCaption(imageId, caption);
      setImages((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, caption } : img))
      );
      setError(null);
    } catch (err) {
      console.error("Failed to update caption:", err);
      setError("Failed to update caption");
    }
  }, []);

  const deleteImage = useCallback(async (imageId: string) => {
    try {
      const image = images.find((img) => img.id === imageId);
      if (image) {
        await diaryStorage.deleteImage(image);
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        setError(null);
      }
    } catch (err) {
      console.error("Failed to delete image:", err);
      setError("Failed to delete image");
    }
  }, [images]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    images,
    uploading,
    uploadProgress,
    error,
    uploadImage,
    uploadMultiple,
    updateCaption,
    deleteImage,
    loadImages,
    clearError,
  };
}
