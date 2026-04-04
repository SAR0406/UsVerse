"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Brain, Zap, Save, Loader2 } from "lucide-react";
import SettingsSection from "@/components/settings/SettingsSection";
import SettingsItem from "@/components/settings/SettingsItem";
import ToggleSwitch from "@/components/settings/ToggleSwitch";
import { motion } from "framer-motion";

const responseStyles = [
  { value: "concise", label: "Concise", description: "Brief, to-the-point responses" },
  { value: "balanced", label: "Balanced", description: "Mix of detail and brevity" },
  { value: "detailed", label: "Detailed", description: "Comprehensive explanations" },
];

export default function AISettingsPage() {
  const queryClient = useQueryClient();
  const [aiPrefs, setAiPrefs] = useState({
    default_model: "gpt-4",
    response_style: "balanced",
    auto_save_suggestions: true,
    use_for_enhancement: true,
    training_consent: false,
  });

  const { isLoading } = useQuery({
    queryKey: ["aiPreferences"],
    queryFn: async () => {
      const res = await fetch("/api/settings/ai");
      if (!res.ok) throw new Error("Failed to fetch preferences");
      const data = await res.json();
      setAiPrefs(data.aiPreferences);
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: object) => {
      const res = await fetch("/api/settings/ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiPreferences"] });
      toast.success("AI preferences updated!");
    },
    onError: () => toast.error("Failed to update preferences"),
  });

  const handleToggle = (key: string, value: boolean) => {
    const updated = { ...aiPrefs, [key]: value };
    setAiPrefs(updated);
    updateMutation.mutate({ [key]: value });
  };

  const handleStyleChange = (value: string) => {
    setAiPrefs({ ...aiPrefs, response_style: value });
    updateMutation.mutate({ response_style: value });
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
      <SettingsSection title="AI Response Style" description="How AI suggestions should respond">
        <div className="space-y-2">
          {responseStyles.map(({ value, label, description }) => (
            <motion.button
              key={value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleStyleChange(value)}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border transition text-left ${
                aiPrefs.response_style === value
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-purple-400/20 bg-[color:var(--surface-2)] hover:border-purple-400/40"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                  aiPrefs.response_style === value
                    ? "border-purple-500"
                    : "border-[color:var(--border)]"
                }`}
              >
                {aiPrefs.response_style === value && (
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

      <SettingsSection title="AI Features" description="Enable or disable AI-powered features">
        <SettingsItem
          label="Auto-save Suggestions"
          description="Automatically save AI suggestions for reuse"
        >
          <ToggleSwitch
            checked={aiPrefs.auto_save_suggestions}
            onChange={(v) => handleToggle("auto_save_suggestions", v)}
          />
        </SettingsItem>
        <SettingsItem
          label="Message Enhancement"
          description="Use AI to enhance your messages"
        >
          <ToggleSwitch
            checked={aiPrefs.use_for_enhancement}
            onChange={(v) => handleToggle("use_for_enhancement", v)}
          />
        </SettingsItem>
        <SettingsItem
          label="Training Consent"
          description="Allow anonymized data for AI training"
        >
          <ToggleSwitch
            checked={aiPrefs.training_consent}
            onChange={(v) => handleToggle("training_consent", v)}
          />
        </SettingsItem>
      </SettingsSection>
    </div>
  );
}
