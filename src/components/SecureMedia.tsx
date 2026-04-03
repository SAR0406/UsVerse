"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getSignedMediaUrl } from "@/lib/media-utils";
import { Loader2 } from "lucide-react";

interface SecureMediaImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
}

export function SecureMediaImage({ src, alt, width = 400, height = 300, className = "" }: SecureMediaImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUrl() {
      try {
        setLoading(true);
        setError(false);
        const url = await getSignedMediaUrl(src);
        if (mounted) {
          if (url) {
            setSignedUrl(url);
          } else {
            setError(true);
          }
        }
      } catch (err) {
        if (mounted) {
          console.error("Error loading media:", err);
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadUrl();

    return () => {
      mounted = false;
    };
  }, [src]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-lg animate-pulse ${className}`}
        style={{ width, height }}
        aria-label="Loading image"
      >
        <Loader2 className="w-6 h-6 animate-spin text-purple-400/70" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-red-900/20 rounded-lg text-red-400 text-sm ${className}`}
        style={{ width, height }}
        role="alert"
      >
        Failed to load image
      </div>
    );
  }

  return (
    <Image
      src={signedUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={false}
      loading="lazy"
      quality={85}
    />
  );
}

interface SecureMediaVideoProps {
  src: string;
  className?: string;
}

export function SecureMediaVideo({ src, className = "" }: SecureMediaVideoProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUrl() {
      try {
        setLoading(true);
        setError(false);
        const url = await getSignedMediaUrl(src);
        if (mounted) {
          if (url) {
            setSignedUrl(url);
          } else {
            setError(true);
          }
        }
      } catch (err) {
        if (mounted) {
          console.error("Error loading video:", err);
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadUrl();

    return () => {
      mounted = false;
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-lg p-8 animate-pulse ${className}`} aria-label="Loading video">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400/70" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`flex items-center justify-center bg-red-900/20 rounded-lg text-red-400 text-sm p-8 ${className}`} role="alert">
        Failed to load video
      </div>
    );
  }

  return <video src={signedUrl} controls className={className} preload="metadata" />;
}

interface SecureMediaAudioProps {
  src: string;
  className?: string;
}

export function SecureMediaAudio({ src, className = "" }: SecureMediaAudioProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUrl() {
      try {
        setLoading(true);
        setError(false);
        const url = await getSignedMediaUrl(src);
        if (mounted) {
          if (url) {
            setSignedUrl(url);
          } else {
            setError(true);
          }
        }
      } catch (err) {
        if (mounted) {
          console.error("Error loading audio:", err);
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadUrl();

    return () => {
      mounted = false;
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-purple-400 text-sm ${className}`} aria-label="Loading audio">
        <div className="w-4 h-4 bg-purple-400/30 rounded-full animate-pulse" />
        <span className="animate-pulse">Loading audio...</span>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`text-red-400 text-sm ${className}`} role="alert">
        Failed to load audio
      </div>
    );
  }

  return <audio src={signedUrl} controls className={className} preload="metadata" />;
}
