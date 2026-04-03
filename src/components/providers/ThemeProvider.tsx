"use client";

/**
 * Theme Provider
 * Manages theme state and provides context for theme switching
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import type { ThemeMode, ThemePreferences } from "@/lib/theme/types";
import {
  applyTheme,
  getStoredPreferences,
  savePreferences,
  getDefaultPreferences,
  getContextualTheme,
  toggleLightDark,
  prefersSystemDark,
} from "@/lib/theme/utils";

interface ThemeContextValue {
  /** Current active theme */
  theme: ThemeMode;
  /** User's theme preferences */
  preferences: ThemePreferences;
  /** Set a new theme */
  setTheme: (theme: ThemeMode) => void;
  /** Toggle between light and dark */
  toggleTheme: () => void;
  /** Enable/disable contextual theming */
  setContextualEnabled: (enabled: boolean) => void;
  /** Enable/disable follow system preference */
  setFollowSystem: (follow: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const pathname = usePathname();
  const [preferences, setPreferences] = useState<ThemePreferences>(() => {
    return getStoredPreferences() ?? getDefaultPreferences();
  });
  const [theme, setThemeState] = useState<ThemeMode>(preferences.theme);

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Handle contextual theming based on route
  useEffect(() => {
    const contextualTheme = getContextualTheme(preferences, pathname);
    if (contextualTheme !== theme) {
      setThemeState(contextualTheme);
    }
  }, [pathname, preferences]);

  // Listen to system preference changes
  useEffect(() => {
    if (!preferences.followSystem) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "dark" : "romantic-dusk";
      setTheme(newTheme);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [preferences.followSystem]);

  // Set theme and save preferences
  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    const newPrefs: ThemePreferences = {
      ...preferences,
      theme: newTheme,
    };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  }, [preferences]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newTheme = toggleLightDark(theme);
    setTheme(newTheme);
  }, [theme, setTheme]);

  // Enable/disable contextual theming
  const setContextualEnabled = useCallback((enabled: boolean) => {
    const newPrefs: ThemePreferences = {
      ...preferences,
      contextualEnabled: enabled,
    };
    setPreferences(newPrefs);
    savePreferences(newPrefs);

    // Re-evaluate theme with new contextual setting
    if (enabled) {
      const contextualTheme = getContextualTheme(newPrefs, pathname);
      setThemeState(contextualTheme);
    }
  }, [preferences, pathname]);

  // Enable/disable follow system
  const setFollowSystem = useCallback((follow: boolean) => {
    const newPrefs: ThemePreferences = {
      ...preferences,
      followSystem: follow,
    };
    setPreferences(newPrefs);
    savePreferences(newPrefs);

    // Apply system preference if enabled
    if (follow) {
      const isDark = prefersSystemDark();
      const systemTheme = isDark ? "dark" : "romantic-dusk";
      setThemeState(systemTheme);
    }
  }, [preferences]);

  const value: ThemeContextValue = {
    theme,
    preferences,
    setTheme,
    toggleTheme,
    setContextualEnabled,
    setFollowSystem,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
