"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sun, Moon, Monitor, Palette, ZoomIn, ZoomOut, Save, Loader2 } from "lucide-react";
import SettingsSection from "@/components/settings/SettingsSection";
import SettingsItem from "@/components/settings/SettingsItem";
import { motion } from "framer-motion";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const accentColors = [
  { value: "#ff6b9d", label: "Pink Blossom" },
  { value: "#9b6dff", label: "Purple Dream" },
  { value: "#ff9966", label: "Sunset Orange" },
  { value: "#66d9ff", label: "Sky Blue" },
  { value: "#66ff99", label: "Mint Green" },
  { value: "#ff6666", label: "Rose Red" },
];

const densityOptions = [
  { value: "compact", label: "Compact", description: "More content, less spacing" },
  { value: "normal", label: "Normal", description: "Balanced spacing" },
  { value: "comfortable", label: "Comfortable", description: "Spacious layout" },
];

export default function AppearanceSettingsPage() {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState("dark");
  const [accentColor, setAccentColor] = useState("#ff6b9d");
  const [uiDensity, setUiDensity] = useState("normal");
  const [fontScale, setFontScale] = useState(1.0);

  // Fetch settings
  const { isLoading } = useQuery({
    queryKey: ["userSettings"],
    queryFn: async () => {
      const res = await fetch("/api/settings/user");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setTheme(data.settings?.theme || "dark");
      setAccentColor(data.settings?.accent_color || "#ff6b9d");
      setUiDensity(data.settings?.ui_density || "normal");
      setFontScale(data.settings?.font_scale || 1.0);
      return data;
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: object) => {
      const res = await fetch("/api/settings/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update settings");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
      toast.success("Appearance settings updated!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", isDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

  const handleSave = () => {
    updateSettingsMutation.mutate({
      theme,
      accent_color: accentColor,
      ui_density: uiDensity,
      font_scale: fontScale,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theme Section */}
      <SettingsSection title="Theme" description="Choose your preferred color scheme">
        <div className="grid grid-cols-3 gap-3">
          {themes.map(({ value, label, icon: Icon }) => (
            <motion.button
              key={value}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                theme === value
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-purple-400/20 bg-[color:var(--surface-2)] hover:border-purple-400/40"
              }`}
            >
              <Icon className="w-6 h-6 text-[color:var(--foreground)]" />
              <span className="text-sm font-medium text-[color:var(--foreground)]">{label}</span>
            </motion.button>
          ))}
        </div>
      </SettingsSection>

      {/* Accent Color Section */}
      <SettingsSection title="Accent Color" description="Customize your accent color">
        <div className="grid grid-cols-6 gap-3">
          {accentColors.map(({ value, label }) => (
            <motion.button
              key={value}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAccentColor(value)}
              className={`w-12 h-12 rounded-full border-4 transition ${
                accentColor === value
                  ? "border-white shadow-lg"
                  : "border-transparent hover:border-white/50"
              }`}
              style={{ backgroundColor: value }}
              title={label}
            />
          ))}
        </div>
      </SettingsSection>

      {/* UI Density Section */}
      <SettingsSection title="UI Density" description="Control spacing and layout density">
        <div className="space-y-2">
          {densityOptions.map(({ value, label, description }) => (
            <motion.button
              key={value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setUiDensity(value)}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border transition text-left ${
                uiDensity === value
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-purple-400/20 bg-[color:var(--surface-2)] hover:border-purple-400/40"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                  uiDensity === value
                    ? "border-purple-500"
                    : "border-[color:var(--border)]"
                }`}
              >
                {uiDensity === value && (
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                )}
              </div>
              <div>
                <div className="font-medium text-[color:var(--foreground)]">{label}</div>
                <div className="text-sm text-[color:var(--text-soft)]">{description}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </SettingsSection>

      {/* Font Scale Section */}
      <SettingsSection title="Font Size" description="Adjust text size across the app">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <ZoomOut className="w-5 h-5 text-[color:var(--text-soft)]" />
            <input
              type="range"
              min="0.8"
              max="1.4"
              step="0.1"
              value={fontScale}
              onChange={(e) => setFontScale(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-[color:var(--surface-2)] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-purple-500 [&::-webkit-slider-thumb]:to-pink-500 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <ZoomIn className="w-5 h-5 text-[color:var(--text-soft)]" />
          </div>
          <div className="text-center">
            <span className="text-sm text-[color:var(--text-soft)]">
              Scale: {(fontScale * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </SettingsSection>

      {/* Save Button */}
      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateSettingsMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Save Appearance
        </motion.button>
      </div>
    </div>
  );
}
