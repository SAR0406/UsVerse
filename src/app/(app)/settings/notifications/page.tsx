"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Bell, Smartphone, Volume2, Save, Loader2 } from "lucide-react";
import SettingsSection from "@/components/settings/SettingsSection";
import SettingsItem from "@/components/settings/SettingsItem";
import ToggleSwitch from "@/components/settings/ToggleSwitch";
import { motion } from "framer-motion";

export default function NotificationsSettingsPage() {
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState({
    email_enabled: true,
    email_messages: true,
    email_daily: true,
    email_presence: true,
    email_notes: false,
    email_marketing: false,
    push_enabled: true,
    push_messages: true,
    push_presence: true,
    inapp_enabled: true,
    inapp_sound: true,
  });

  const { isLoading } = useQuery({
    queryKey: ["notificationPreferences"],
    queryFn: async () => {
      const res = await fetch("/api/settings/notifications");
      if (!res.ok) throw new Error("Failed to fetch preferences");
      const data = await res.json();
      setPrefs(data.preferences);
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: object) => {
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationPreferences"] });
      toast.success("Notification preferences updated!");
    },
    onError: () => toast.error("Failed to update preferences"),
  });

  const handleToggle = (key: string, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    updateMutation.mutate({ [key]: value });
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
        title="Email Notifications"
        description="Control which emails you receive"
      >
        <SettingsItem
          label="Enable Email Notifications"
          description="Master toggle for all email notifications"
        >
          <ToggleSwitch
            checked={prefs.email_enabled}
            onChange={(v) => handleToggle("email_enabled", v)}
          />
        </SettingsItem>
        <SettingsItem label="New Messages" description="When you receive a new message">
          <ToggleSwitch
            checked={prefs.email_messages}
            onChange={(v) => handleToggle("email_messages", v)}
            disabled={!prefs.email_enabled}
          />
        </SettingsItem>
        <SettingsItem label="Daily Questions" description="Daily question reminders">
          <ToggleSwitch
            checked={prefs.email_daily}
            onChange={(v) => handleToggle("email_daily", v)}
            disabled={!prefs.email_enabled}
          />
        </SettingsItem>
        <SettingsItem label="Presence Updates" description="Partner presence changes">
          <ToggleSwitch
            checked={prefs.email_presence}
            onChange={(v) => handleToggle("email_presence", v)}
            disabled={!prefs.email_enabled}
          />
        </SettingsItem>
        <SettingsItem label="Shared Notes" description="Updates to shared diary entries">
          <ToggleSwitch
            checked={prefs.email_notes}
            onChange={(v) => handleToggle("email_notes", v)}
            disabled={!prefs.email_enabled}
          />
        </SettingsItem>
        <SettingsItem label="Marketing Emails" description="Product updates and tips">
          <ToggleSwitch
            checked={prefs.email_marketing}
            onChange={(v) => handleToggle("email_marketing", v)}
            disabled={!prefs.email_enabled}
          />
        </SettingsItem>
      </SettingsSection>

      <SettingsSection
        title="Push Notifications"
        description="Real-time notifications on your device"
      >
        <SettingsItem label="Enable Push Notifications">
          <ToggleSwitch
            checked={prefs.push_enabled}
            onChange={(v) => handleToggle("push_enabled", v)}
          />
        </SettingsItem>
        <SettingsItem label="Messages">
          <ToggleSwitch
            checked={prefs.push_messages}
            onChange={(v) => handleToggle("push_messages", v)}
            disabled={!prefs.push_enabled}
          />
        </SettingsItem>
        <SettingsItem label="Presence">
          <ToggleSwitch
            checked={prefs.push_presence}
            onChange={(v) => handleToggle("push_presence", v)}
            disabled={!prefs.push_enabled}
          />
        </SettingsItem>
      </SettingsSection>

      <SettingsSection
        title="In-App Notifications"
        description="Notifications within the app"
      >
        <SettingsItem label="Enable In-App Notifications">
          <ToggleSwitch
            checked={prefs.inapp_enabled}
            onChange={(v) => handleToggle("inapp_enabled", v)}
          />
        </SettingsItem>
        <SettingsItem label="Sound Effects">
          <ToggleSwitch
            checked={prefs.inapp_sound}
            onChange={(v) => handleToggle("inapp_sound", v)}
            disabled={!prefs.inapp_enabled}
          />
        </SettingsItem>
      </SettingsSection>
    </div>
  );
}
