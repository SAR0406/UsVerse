/**
 * Theme Configuration
 * Room-to-theme mappings and theme metadata for the UsVerse palette system
 */

import type { LightTheme, RoomId, ThemeMetadata, ThemeMode } from "./types";

/**
 * Room-to-Theme Mapping
 * Maps app routes/rooms to their contextual light themes
 */
export const ROOM_THEMES: Record<RoomId, LightTheme> = {
  // Romantic Dusk - Signature palette for core features
  dashboard: "romantic-dusk",
  chat: "romantic-dusk",
  presence: "romantic-dusk",

  // Wisteria Dream - Sacred, introspective spaces
  notes: "wisteria-dream",

  // Golden Hour - Warm, ritual moments
  countdown: "golden-hour",
  daily: "golden-hour",

  // Mint Garden - Light, playful spaces
  play: "mint-garden",

  // Blush Cream - Creative and entertainment
  bloom: "blush-cream",
  cinema: "blush-cream",
};

/**
 * Theme Metadata
 * Display information for each theme
 */
export const THEME_METADATA: Record<ThemeMode, ThemeMetadata> = {
  // Light Themes
  "romantic-dusk": {
    id: "romantic-dusk",
    name: "Romantic Dusk",
    description: "Warm pinks on barely-pink white, like golden hour light on skin",
    emoji: "🌅",
    previewColors: {
      primary: "#ff6b9d",
      secondary: "#ffab76",
      background: "#fff8fb",
    },
    bestFor: ["Home", "Love Feed", "Presence", "Shared Moments"],
  },

  "golden-hour": {
    id: "golden-hour",
    name: "Golden Hour",
    description: "Mocha Mousse elegance with amber warmth and domestic coziness",
    emoji: "☕",
    previewColors: {
      primary: "#ef9f27",
      secondary: "#d85a30",
      background: "#fffaf5",
    },
    bestFor: ["Countdown", "Daily Rituals", "Morning Greetings"],
  },

  "mint-garden": {
    id: "mint-garden",
    name: "Mint Garden",
    description: "Aqua and sand tones that feel light, inviting, and easier on the eyes",
    emoji: "🌿",
    previewColors: {
      primary: "#5bc0be",
      secondary: "#6fffe9",
      background: "#f8fefb",
    },
    bestFor: ["Garden", "Play", "Games", "Pet Care"],
  },

  "wisteria-dream": {
    id: "wisteria-dream",
    name: "Wisteria Dream",
    description: "Soft lavender through deep violet, delicate and imaginative",
    emoji: "💜",
    previewColors: {
      primary: "#9d84b7",
      secondary: "#c9ada7",
      background: "#faf7fe",
    },
    bestFor: ["Diary", "Memory Wall", "Sticker Studio", "Private Spaces"],
  },

  "blush-cream": {
    id: "blush-cream",
    name: "Blush Cream",
    description: "Warm cream with dusty rose, elegant and timelessly romantic",
    emoji: "🌸",
    previewColors: {
      primary: "#d4a5a5",
      secondary: "#b88b8d",
      background: "#fffcf8",
    },
    bestFor: ["Bloom", "Cinema", "Settings", "Celebrations"],
  },

  // Legacy light theme (alias to romantic-dusk)
  light: {
    id: "light",
    name: "Light Mode",
    description: "Classic light mode (same as Romantic Dusk)",
    emoji: "☀️",
    previewColors: {
      primary: "#ff6b9d",
      secondary: "#ffab76",
      background: "#fff8fb",
    },
    bestFor: ["All features"],
  },

  // Dark Themes
  dark: {
    id: "dark",
    name: "Dark Mode",
    description: "Original romantic dark cosmos where love glows",
    emoji: "🌙",
    previewColors: {
      primary: "#ff6b9d",
      secondary: "#c8b6e2",
      background: "#0d0720",
    },
    bestFor: ["All features", "Night time", "Low light"],
  },

  "dark-void": {
    id: "dark-void",
    name: "Dark Void",
    description: "Deeper, richer darkness with enhanced contrast",
    emoji: "🌌",
    previewColors: {
      primary: "#ff6b9d",
      secondary: "#a888ca",
      background: "#050212",
    },
    bestFor: ["All features", "Pure darkness", "OLED screens"],
  },
};

/**
 * Get light themes only (for theme picker)
 */
export const LIGHT_THEMES: LightTheme[] = [
  "romantic-dusk",
  "golden-hour",
  "mint-garden",
  "wisteria-dream",
  "blush-cream",
];

/**
 * Get theme metadata color for UI
 */
export function getThemeMetaColor(theme: ThemeMode): string {
  const metadata = THEME_METADATA[theme];
  return metadata?.previewColors.background || "#fff8fb";
}
