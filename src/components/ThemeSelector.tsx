"use client";

/**
 * Theme Selector Component
 * Visual theme picker with preview cards and settings
 */

import { useState } from "react";
import { X, Palette, Check, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { THEME_METADATA, LIGHT_THEMES } from "@/lib/theme/config";
import { isLightTheme, isDarkTheme, type ThemeMode } from "@/lib/theme/types";

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeSelector({ isOpen, onClose }: ThemeSelectorProps) {
  const { theme, preferences, setTheme, setContextualEnabled, setFollowSystem } = useTheme();
  const [previewTheme, setPreviewTheme] = useState<ThemeMode | null>(null);

  const currentIsLight = isLightTheme(theme);
  const currentIsDark = isDarkTheme(theme);

  const handleThemeClick = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    setPreviewTheme(null);
  };

  const handlePreviewEnter = (newTheme: ThemeMode) => {
    setPreviewTheme(newTheme);
  };

  const handlePreviewLeave = () => {
    setPreviewTheme(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-selector-title"
      >
        <div className="glass-card m-4 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Palette className="w-6 h-6 text-[color:var(--accent)]" />
              <h2
                id="theme-selector-title"
                className="text-2xl font-bold text-[color:var(--foreground)]"
              >
                Theme Selector
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[color:var(--surface-2)] transition-colors"
              aria-label="Close theme selector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-3">
              Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleThemeClick("romantic-dusk")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  currentIsLight
                    ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--foreground)]"
                    : "border-[color:var(--border)] text-[color:var(--text-soft)] hover:border-[color:var(--accent)]"
                }`}
              >
                <Sun className="w-4 h-4" />
                <span className="font-medium">Light</span>
              </button>
              <button
                onClick={() => handleThemeClick("dark")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                  currentIsDark
                    ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--foreground)]"
                    : "border-[color:var(--border)] text-[color:var(--text-soft)] hover:border-[color:var(--accent)]"
                }`}
              >
                <Moon className="w-4 h-4" />
                <span className="font-medium">Dark</span>
              </button>
            </div>
          </div>

          {/* Light Themes */}
          {currentIsLight && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-3">
                Light Themes
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LIGHT_THEMES.map((themeId) => {
                  const metadata = THEME_METADATA[themeId];
                  const isActive = theme === themeId;

                  return (
                    <button
                      key={themeId}
                      onClick={() => handleThemeClick(themeId)}
                      onMouseEnter={() => handlePreviewEnter(themeId)}
                      onMouseLeave={handlePreviewLeave}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        isActive
                          ? "border-[color:var(--accent)] ring-2 ring-[color:var(--accent)]/20"
                          : "border-[color:var(--border)] hover:border-[color:var(--accent)]"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{metadata.emoji}</span>
                          <span className="font-semibold text-[color:var(--foreground)]">
                            {metadata.name}
                          </span>
                        </div>
                        {isActive && (
                          <Check className="w-5 h-5 text-[color:var(--accent)]" />
                        )}
                      </div>
                      <p className="text-xs text-[color:var(--text-soft)] mb-3">
                        {metadata.description}
                      </p>
                      <div className="flex gap-2">
                        <div
                          className="w-8 h-8 rounded-full border border-[color:var(--border)]"
                          style={{ backgroundColor: metadata.previewColors.primary }}
                          aria-label="Primary color"
                        />
                        <div
                          className="w-8 h-8 rounded-full border border-[color:var(--border)]"
                          style={{ backgroundColor: metadata.previewColors.secondary }}
                          aria-label="Secondary color"
                        />
                        <div
                          className="w-8 h-8 rounded-full border border-[color:var(--border)]"
                          style={{ backgroundColor: metadata.previewColors.background }}
                          aria-label="Background color"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dark Themes */}
          {currentIsDark && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-3">
                Dark Themes
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["dark", "dark-void"] as const).map((themeId) => {
                  const metadata = THEME_METADATA[themeId];
                  const isActive = theme === themeId;

                  return (
                    <button
                      key={themeId}
                      onClick={() => handleThemeClick(themeId)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        isActive
                          ? "border-[color:var(--accent)] ring-2 ring-[color:var(--accent)]/20"
                          : "border-[color:var(--border)] hover:border-[color:var(--accent)]"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{metadata.emoji}</span>
                          <span className="font-semibold text-[color:var(--foreground)]">
                            {metadata.name}
                          </span>
                        </div>
                        {isActive && (
                          <Check className="w-5 h-5 text-[color:var(--accent)]" />
                        )}
                      </div>
                      <p className="text-xs text-[color:var(--text-soft)] mb-3">
                        {metadata.description}
                      </p>
                      <div className="flex gap-2">
                        <div
                          className="w-8 h-8 rounded-full border border-[color:var(--border)]"
                          style={{ backgroundColor: metadata.previewColors.primary }}
                          aria-label="Primary color"
                        />
                        <div
                          className="w-8 h-8 rounded-full border border-[color:var(--border)]"
                          style={{ backgroundColor: metadata.previewColors.secondary }}
                          aria-label="Secondary color"
                        />
                        <div
                          className="w-8 h-8 rounded-full border border-[color:var(--border)]"
                          style={{ backgroundColor: metadata.previewColors.background }}
                          aria-label="Background color"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="pt-4 border-t border-[color:var(--border)]">
            <label className="block text-sm font-semibold text-[color:var(--text-soft)] mb-3">
              Settings
            </label>

            {/* Contextual Theming (Light mode only) */}
            {currentIsLight && (
              <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-[color:var(--surface-2)] cursor-pointer transition-colors mb-2">
                <input
                  type="checkbox"
                  checked={preferences.contextualEnabled}
                  onChange={(e) => setContextualEnabled(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[color:var(--border)] text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
                />
                <div>
                  <div className="text-sm font-medium text-[color:var(--foreground)]">
                    Use contextual themes
                  </div>
                  <div className="text-xs text-[color:var(--text-soft)]">
                    Automatically change themes based on the room you're in (e.g., Wisteria Dream for Diary, Golden Hour for Countdown)
                  </div>
                </div>
              </label>
            )}

            {/* Follow System */}
            <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-[color:var(--surface-2)] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={preferences.followSystem}
                onChange={(e) => setFollowSystem(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[color:var(--border)] text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
              />
              <div>
                <div className="text-sm font-medium text-[color:var(--foreground)]">
                  Follow system preference
                </div>
                <div className="text-xs text-[color:var(--text-soft)]">
                  Automatically switch between light and dark based on your system settings
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </>
  );
}
