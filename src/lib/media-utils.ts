/**
 * Helper functions for handling media files with private storage buckets
 */

// Cache for signed URLs to avoid repeated API calls
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Get a signed URL for a media file from private storage
 * Caches the URL for 50 minutes (10 minutes before expiry)
 */
export async function getSignedMediaUrl(storagePath: string): Promise<string | null> {
  if (!storagePath) return null;

  // Check if it's already a signed URL or public URL
  if (storagePath.includes("token=") || storagePath.startsWith("http")) {
    return storagePath;
  }

  // Check cache first
  const cached = signedUrlCache.get(storagePath);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    // Extract just the path without the bucket URL
    const path = storagePath.includes("/storage/v1/object/")
      ? storagePath.split("/storage/v1/object/")[1].split("/").slice(1).join("/")
      : storagePath;

    const response = await fetch(
      `/api/media/signed-url?path=${encodeURIComponent(path)}`
    );

    if (!response.ok) {
      console.error("Failed to get signed URL:", await response.text());
      return null;
    }

    const data = await response.json();
    const signedUrl = data.signedUrl;

    // Cache for 50 minutes (URLs expire in 1 hour)
    signedUrlCache.set(storagePath, {
      url: signedUrl,
      expiresAt: Date.now() + 50 * 60 * 1000,
    });

    return signedUrl;
  } catch (error) {
    console.error("Error fetching signed URL:", error);
    return null;
  }
}

/**
 * Preload signed URLs for multiple media files
 */
export async function preloadSignedUrls(paths: string[]): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();

  await Promise.all(
    paths.map(async (path) => {
      if (path) {
        const signedUrl = await getSignedMediaUrl(path);
        if (signedUrl) {
          urlMap.set(path, signedUrl);
        }
      }
    })
  );

  return urlMap;
}

/**
 * Clear the signed URL cache (useful for testing or forced refresh)
 */
export function clearSignedUrlCache() {
  signedUrlCache.clear();
}
