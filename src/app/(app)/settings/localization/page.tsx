"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Globe, Clock, Calendar, Save, Loader2 } from "lucide-react";
import SettingsSection from "@/components/settings/SettingsSection";
import SettingsItem from "@/components/settings/SettingsItem";
import { motion } from "framer-motion";

const languages = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh", label: "中文" },
];

const timezones = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Australia/Sydney", label: "Sydney" },
];

const dateFormats = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "12/31/2024" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "31/12/2024" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2024-12-31" },
];

const timeFormats = [
  { value: "12h", label: "12-hour", example: "2:30 PM" },
  { value: "24h", label: "24-hour", example: "14:30" },
];

export default function LocalizationSettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    language: "en",
    timezone: "UTC",
    date_format: "MM/DD/YYYY",
    time_format: "12h",
  });

  const { isLoading } = useQuery({
    queryKey: ["userSettings"],
    queryFn: async () => {
      const res = await fetch("/api/settings/user");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettings({
        language: data.settings?.language || "en",
        timezone: data.settings?.timezone || "UTC",
        date_format: data.settings?.date_format || "MM/DD/YYYY",
        time_format: data.settings?.time_format || "12h",
      });
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: object) => {
      const res = await fetch("/api/settings/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
      toast.success("Localization settings updated!");
    },
    onError: () => toast.error("Failed to update settings"),
  });

  const handleSave = () => {
    updateMutation.mutate(settings);
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
      <SettingsSection title="Language" description="Choose your preferred language">
        <SettingsItem label="Display Language">
          <select
            value={settings.language}
            onChange={(e) => setSettings({ ...settings, language: e.target.value })}
            className="w-64 px-3 py-2 rounded-lg bg-[color:var(--surface-2)] border border-purple-400/20 text-[color:var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            {languages.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </SettingsItem>
      </SettingsSection>

      <SettingsSection title="Time Zone" description="Set your local time zone">
        <SettingsItem label="Time Zone">
          <select
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            className="w-64 px-3 py-2 rounded-lg bg-[color:var(--surface-2)] border border-purple-400/20 text-[color:var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            {timezones.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </SettingsItem>
      </SettingsSection>

      <SettingsSection title="Date & Time Format" description="Customize how dates and times appear">
        <SettingsItem label="Date Format">
          <select
            value={settings.date_format}
            onChange={(e) => setSettings({ ...settings, date_format: e.target.value })}
            className="w-64 px-3 py-2 rounded-lg bg-[color:var(--surface-2)] border border-purple-400/20 text-[color:var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            {dateFormats.map(({ value, label, example }) => (
              <option key={value} value={value}>
                {label} ({example})
              </option>
            ))}
          </select>
        </SettingsItem>

        <SettingsItem label="Time Format">
          <select
            value={settings.time_format}
            onChange={(e) => setSettings({ ...settings, time_format: e.target.value })}
            className="w-64 px-3 py-2 rounded-lg bg-[color:var(--surface-2)] border border-purple-400/20 text-[color:var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            {timeFormats.map(({ value, label, example }) => (
              <option key={value} value={value}>
                {label} ({example})
              </option>
            ))}
          </select>
        </SettingsItem>
      </SettingsSection>

      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-shadow disabled:opacity-50"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Save Settings
        </motion.button>
      </div>
    </div>
  );
}
