"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shield, Eye, Download, BarChart, Loader2 } from "lucide-react";
import SettingsSection from "@/components/settings/SettingsSection";
import SettingsItem from "@/components/settings/SettingsItem";
import ToggleSwitch from "@/components/settings/ToggleSwitch";
import { motion } from "framer-motion";

const visibilityOptions = [
  { value: "public", label: "Public", description: "Visible to everyone" },
  { value: "couple_only", label: "Couple Only", description: "Only visible to your partner" },
  { value: "private", label: "Private", description: "Only visible to you" },
];

export default function PrivacySettingsPage() {
  const queryClient = useQueryClient();
  const [privacy, setPrivacy] = useState({
    profile_visibility: "couple_only",
    show_activity_status: true,
    show_last_seen: true,
    allow_data_export: true,
    analytics_consent: true,
  });

  const { isLoading } = useQuery({
    queryKey: ["privacySettings"],
    queryFn: async () => {
      const res = await fetch("/api/settings/privacy");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setPrivacy(data.privacy);
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: object) => {
      const res = await fetch("/api/settings/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["privacySettings"] });
      toast.success("Privacy settings updated!");
    },
    onError: () => toast.error("Failed to update settings"),
  });

  const handleToggle = (key: string, value: boolean) => {
    const updated = { ...privacy, [key]: value };
    setPrivacy(updated);
    updateMutation.mutate({ [key]: value });
  };

  const handleVisibilityChange = (value: string) => {
    setPrivacy({ ...privacy, profile_visibility: value });
    updateMutation.mutate({ profile_visibility: value });
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
      <SettingsSection
        title="Profile Visibility"
        description="Control who can see your profile"
      >
        <div className="space-y-2">
          {visibilityOptions.map(({ value, label, description }) => (
            <motion.button
              key={value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleVisibilityChange(value)}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border transition text-left ${
                privacy.profile_visibility === value
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-purple-400/20 bg-[color:var(--surface-2)] hover:border-purple-400/40"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                  privacy.profile_visibility === value
                    ? "border-purple-500"
                    : "border-[color:var(--border)]"
                }`}
              >
                {privacy.profile_visibility === value && (
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

      <SettingsSection title="Activity & Status" description="Control your online presence">
        <SettingsItem
          label="Show Activity Status"
          description="Let your partner know when you're online"
        >
          <ToggleSwitch
            checked={privacy.show_activity_status}
            onChange={(v) => handleToggle("show_activity_status", v)}
          />
        </SettingsItem>
        <SettingsItem
          label="Show Last Seen"
          description="Display when you were last active"
        >
          <ToggleSwitch
            checked={privacy.show_last_seen}
            onChange={(v) => handleToggle("show_last_seen", v)}
          />
        </SettingsItem>
      </SettingsSection>

      <SettingsSection title="Data & Privacy" description="Manage your data">
        <SettingsItem
          label="Allow Data Export"
          description="Enable GDPR-compliant data export"
        >
          <ToggleSwitch
            checked={privacy.allow_data_export}
            onChange={(v) => handleToggle("allow_data_export", v)}
          />
        </SettingsItem>
        <SettingsItem
          label="Analytics"
          description="Help us improve with anonymous usage data"
        >
          <ToggleSwitch
            checked={privacy.analytics_consent}
            onChange={(v) => handleToggle("analytics_consent", v)}
          />
        </SettingsItem>
      </SettingsSection>

      <SettingsSection title="Export Your Data" description="Download all your data">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600/20 text-purple-200 border border-purple-400/30 text-sm font-medium hover:bg-purple-600/30 transition"
        >
          <Download className="w-4 h-4" />
          Download My Data
        </motion.button>
      </SettingsSection>
    </div>
  );
}
