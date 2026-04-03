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
      <div className={`flex items-center justify-center bg-purple-900/20 rounded-lg ${className}`} style={{ width, height }}>
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`flex items-center justify-center bg-red-900/20 rounded-lg text-red-400 text-sm ${className}`} style={{ width, height }}>
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
      unoptimized
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
      <div className={`flex items-center justify-center bg-purple-900/20 rounded-lg p-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`flex items-center justify-center bg-red-900/20 rounded-lg text-red-400 text-sm p-8 ${className}`}>
        Failed to load video
      </div>
    );
  }

  return <video src={signedUrl} controls className={className} />;
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
      <div className={`flex items-center gap-2 text-purple-400 text-sm ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading audio...
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`text-red-400 text-sm ${className}`}>
        Failed to load audio
      </div>
    );
  }

  return <audio src={signedUrl} controls className={className} />;
}
