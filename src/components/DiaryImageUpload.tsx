/**
 * Enhanced Diary Image Upload Component
 * Supports dual storage modes with react-dropzone
 */

"use client";

import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, Upload, Cloud, HardDrive, X, Loader2 } from "lucide-react";
import type { StorageMode } from "@/lib/storage/diary-storage";

interface ImageUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  storageMode: StorageMode;
  onStorageModeChange: (mode: StorageMode) => void;
  uploading?: boolean;
  disabled?: boolean;
}

export function ImageUploadZone({
  onFilesSelected,
  storageMode,
  onStorageModeChange,
  uploading = false,
  disabled = false,
}: ImageUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!disabled && acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [disabled, onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    multiple: true,
    disabled: disabled || uploading,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  return (
    <div className="space-y-3">
      {/* Storage Mode Selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--diary-text-tertiary)" }}>
          Upload Mode:
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onStorageModeChange("local")}
            disabled={disabled || uploading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-all ${
              storageMode === "local"
                ? "bg-blue-500/20 border-blue-500 text-blue-600"
                : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
            }`}
            style={{
              border: `1.5px solid ${storageMode === "local" ? "var(--diary-accent)" : "var(--diary-border)"}`,
            }}
          >
            <HardDrive className="w-3 h-3" />
            <span>Local Storage</span>
            {storageMode === "local" && <span className="text-xs">●</span>}
          </button>
          <button
            type="button"
            onClick={() => onStorageModeChange("cloud")}
            disabled={disabled || uploading}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-all ${
              storageMode === "cloud"
                ? "bg-purple-500/20 border-purple-500 text-purple-600"
                : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
            }`}
            style={{
              border: `1.5px solid ${storageMode === "cloud" ? "var(--diary-accent)" : "var(--diary-border)"}`,
            }}
          >
            <Cloud className="w-3 h-3" />
            <span>Cloud Upload</span>
            {storageMode === "cloud" && <span className="text-xs">●</span>}
          </button>
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer ${
          isDragActive
            ? "border-blue-400 bg-blue-50/50 scale-[1.02]"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/30"
        } ${disabled || uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        style={{
          borderColor: isDragActive ? "var(--diary-accent)" : "rgba(200,144,96,0.2)",
        }}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--diary-accent)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--diary-text-primary)" }}>
                Uploading images...
              </p>
            </>
          ) : isDragActive ? (
            <>
              <Upload className="w-8 h-8" style={{ color: "var(--diary-accent)" }} />
              <p className="text-sm font-medium" style={{ color: "var(--diary-text-primary)" }}>
                Drop images here
              </p>
            </>
          ) : (
            <>
              <ImagePlus className="w-8 h-8" style={{ color: "var(--diary-accent)", opacity: 0.6 }} />
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: "var(--diary-text-primary)" }}>
                  Drag & drop images here
                </p>
                <p className="text-xs" style={{ color: "var(--diary-text-tertiary)" }}>
                  or click to browse • Max 5MB per image
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--diary-text-tertiary)" }}>
                {storageMode === "cloud" ? (
                  <>
                    <Cloud className="w-3 h-3" />
                    <span>Uploading to cloud storage</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3 h-3" />
                    <span>Saving locally (offline-ready)</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info message */}
      <div className="text-xs px-2" style={{ color: "var(--diary-text-tertiary)" }}>
        {storageMode === "cloud" ? (
          <p>
            ☁️ <strong>Cloud mode:</strong> Images will be uploaded to Supabase Storage. Falls back to local
            storage if upload fails.
          </p>
        ) : (
          <p>
            💾 <strong>Local mode:</strong> Images are stored offline in your browser. Works without internet.
          </p>
        )}
      </div>
    </div>
  );
}

interface ImageGalleryProps {
  images: Array<{
    id: string;
    dataUrl?: string;
    publicUrl?: string;
    caption: string;
    storageMode: StorageMode;
  }>;
  onCaptionChange: (id: string, caption: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export function ImageGallery({ images, onCaptionChange, onDelete, disabled = false }: ImageGalleryProps) {
  if (images.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-4">
      {images.map((img) => (
        <div key={img.id} className="diary-polaroid group relative">
          <div className="diary-tape diary-tape-top" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.dataUrl || img.publicUrl}
            alt={img.caption || "Memory"}
            className="diary-polaroid-photo"
          />
          <input
            type="text"
            value={img.caption}
            onChange={(e) => onCaptionChange(img.id, e.target.value)}
            placeholder="Caption…"
            className="diary-polaroid-caption-input"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => onDelete(img.id)}
            disabled={disabled}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-400/80 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
            title="Remove photo"
          >
            <X className="w-3 h-3" />
          </button>
          {/* Storage mode indicator */}
          <div
            className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1"
            style={{
              background: img.storageMode === "cloud" ? "rgba(139, 92, 246, 0.85)" : "rgba(59, 130, 246, 0.85)",
              color: "white",
            }}
          >
            {img.storageMode === "cloud" ? (
              <>
                <Cloud className="w-2 h-2" />
                Cloud
              </>
            ) : (
              <>
                <HardDrive className="w-2 h-2" />
                Local
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
