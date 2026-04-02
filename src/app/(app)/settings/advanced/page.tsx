"use client";

import { Code2, Terminal, FileJson, Bug } from "lucide-react";
import SettingsSection from "@/components/settings/SettingsSection";
import SettingsItem from "@/components/settings/SettingsItem";
import ToggleSwitch from "@/components/settings/ToggleSwitch";
import { useState } from "react";

export default function AdvancedSettingsPage() {
  const [debugMode, setDebugMode] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Developer Tools"
        description="Advanced settings for developers"
      >
        <SettingsItem
          label="Debug Mode"
          description="Enable verbose logging and debugging features"
        >
          <ToggleSwitch checked={debugMode} onChange={setDebugMode} />
        </SettingsItem>
        <SettingsItem
          label="Show Console Logs"
          description="Display console output in the UI"
        >
          <ToggleSwitch checked={showLogs} onChange={setShowLogs} />
        </SettingsItem>
      </SettingsSection>

      <SettingsSection title="API Keys" description="Manage your API keys (Coming Soon)">
        <div className="p-6 text-center text-[color:var(--text-soft)] border border-dashed border-purple-400/30 rounded-xl">
          <Code2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>API key management will be available soon</p>
        </div>
      </SettingsSection>

      <SettingsSection title="Webhooks" description="Configure webhooks (Coming Soon)">
        <div className="p-6 text-center text-[color:var(--text-soft)] border border-dashed border-purple-400/30 rounded-xl">
          <Terminal className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Webhook configuration coming soon</p>
        </div>
      </SettingsSection>
    </div>
  );
}
