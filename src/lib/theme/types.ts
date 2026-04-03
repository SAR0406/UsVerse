/**
 * Theme System Types
 * Defines all theme-related types for the UsVerse color palette system
 */

/** Light theme palette options */
export type LightTheme =
  | "romantic-dusk"   // Signature palette - warm pinks
  | "golden-hour"     // Mocha Mousse - amber/terracotta
  | "mint-garden"     // Aqua & sand tones
  | "wisteria-dream"  // Soft lavender monochrome
  | "blush-cream";    // Warm cream with dusty rose

/** Dark theme options */
export type DarkTheme =
  | "dark"       // Original dark mode
  | "dark-void"; // Enhanced deeper dark mode

/** All available theme modes */
export type ThemeMode = LightTheme | DarkTheme | "light";

/** App route/room identifiers */
export type RoomId =
  | "dashboard"
  | "chat"
  | "notes"
  | "bloom"
  | "cinema"
  | "play"
  | "countdown"
  | "daily"
  | "presence";

/** Check if theme is a light theme */
export function isLightTheme(theme: ThemeMode): theme is LightTheme | "light" {
  return (
    theme === "romantic-dusk" ||
    theme === "golden-hour" ||
    theme === "mint-garden" ||
    theme === "wisteria-dream" ||
    theme === "blush-cream" ||
    theme === "light"
  );
}

/** Check if theme is a dark theme */
export function isDarkTheme(theme: ThemeMode): theme is DarkTheme {
  return theme === "dark" || theme === "dark-void";
}

/** Theme metadata for display */
export interface ThemeMetadata {
  id: ThemeMode;
  name: string;
  description: string;
  emoji: string;
  previewColors: {
    primary: string;
    secondary: string;
    background: string;
  };
  bestFor: string[];
}

/** Theme preferences stored in localStorage */
export interface ThemePreferences {
  /** Current active theme */
  theme: ThemeMode;
  /** Whether to use contextual room-based themes */
  contextualEnabled: boolean;
  /** Whether to follow system preference */
  followSystem: boolean;
  /** Manual override for specific room (when contextual is enabled) */
  roomOverrides?: Partial<Record<RoomId, ThemeMode>>;
}
