/**
 * Theme Utility Functions
 * Helper functions for theme management and application
 */

import { ROOM_THEMES, getThemeMetaColor } from "./config";
import type { RoomId, ThemeMode, ThemePreferences } from "./types";

const STORAGE_KEY = "usverse-theme-prefs";

/**
 * Apply theme to document
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof document === "undefined") return;

  document.documentElement.setAttribute("data-theme", theme);

  // Update theme-color meta tag
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", getThemeMetaColor(theme));
  }
}

/**
 * Get theme for a specific route/room
 */
export function getThemeForRoute(pathname: string): ThemeMode | null {
  // Extract room from pathname (e.g., "/dashboard" -> "dashboard")
  const segments = pathname.split("/").filter(Boolean);
  const room = segments[0] as RoomId;

  if (room && room in ROOM_THEMES) {
    return ROOM_THEMES[room];
  }

  return null;
}

/**
 * Get stored theme preferences
 */
export function getStoredPreferences(): ThemePreferences | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as ThemePreferences;
    }
  } catch (error) {
    console.error("Failed to parse theme preferences:", error);
  }

  return null;
}

/**
 * Save theme preferences
 */
export function savePreferences(prefs: ThemePreferences): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.error("Failed to save theme preferences:", error);
  }
}

/**
 * Get initial theme on page load
 * Priority: stored preference > system preference > default
 */
export function getInitialTheme(): ThemeMode {
  // Check for stored preference
  const prefs = getStoredPreferences();
  if (prefs?.theme) {
    return prefs.theme;
  }

  // Check system preference
  if (typeof window !== "undefined") {
    const darkPreferred = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return darkPreferred ? "dark" : "romantic-dusk";
  }

  return "romantic-dusk";
}

/**
 * Get default theme preferences
 */
export function getDefaultPreferences(): ThemePreferences {
  const darkPreferred =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return {
    theme: darkPreferred ? "dark" : "romantic-dusk",
    contextualEnabled: false, // Disabled by default, user can opt-in
    followSystem: true,
  };
}

/**
 * Determine if we should use contextual theming for current route
 */
export function shouldUseContextualTheme(
  prefs: ThemePreferences,
  pathname: string
): boolean {
  // Only use contextual if enabled and user is in a light theme
  if (!prefs.contextualEnabled) return false;

  const currentTheme = prefs.theme;
  const isDark = currentTheme === "dark" || currentTheme === "dark-void";

  // Contextual themes only apply to light mode
  return !isDark;
}

/**
 * Get the theme that should be applied for current context
 */
export function getContextualTheme(
  prefs: ThemePreferences,
  pathname: string
): ThemeMode {
  // Check if user has manual override for this room
  const room = pathname.split("/").filter(Boolean)[0] as RoomId;
  if (prefs.roomOverrides?.[room]) {
    return prefs.roomOverrides[room]!;
  }

  // Use contextual theme if enabled and in light mode
  if (shouldUseContextualTheme(prefs, pathname)) {
    const contextualTheme = getThemeForRoute(pathname);
    if (contextualTheme) {
      return contextualTheme;
    }
  }

  // Fall back to user's selected theme
  return prefs.theme;
}

/**
 * Toggle between light and dark mode
 */
export function toggleLightDark(currentTheme: ThemeMode): ThemeMode {
  const isDark = currentTheme === "dark" || currentTheme === "dark-void";
  return isDark ? "romantic-dusk" : "dark";
}

/**
 * Check if system prefers dark mode
 */
export function prefersSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
