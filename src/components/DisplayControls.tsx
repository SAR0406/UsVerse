"use client";

import { Bell, BellOff, Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { ThemeSelector } from "@/components/ThemeSelector";
import { THEME_METADATA } from "@/lib/theme/config";

export default function DisplayControls() {
  const { theme } = useTheme();
  const [notificationState, setNotificationState] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);

  useEffect(() => {
    if (typeof window.Notification !== "undefined") {
      setNotificationState(window.Notification.permission);
    } else {
      setNotificationState("unsupported");
    }
  }, []);

  async function enableNotifications() {
    if (typeof window.Notification === "undefined") {
      setNotificationState("unsupported");
      return;
    }
    setBusy(true);
    try {
      const permission = await window.Notification.requestPermission();
      setNotificationState(permission);
      if (permission === "granted") {
        window.dispatchEvent(
          new CustomEvent("usverse:notification-drop", {
            detail: { x: 0.82, y: 0.08 },
          })
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const notifLabel =
    notificationState === "granted"
      ? "Notifications on"
      : notificationState === "denied"
        ? "Notifications blocked"
        : notificationState === "unsupported"
          ? "Not supported"
          : "Enable notifications";

  const themeMetadata = THEME_METADATA[theme];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-4">
        <button
          type="button"
          onClick={() => setThemeSelectorOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-[color:var(--border)] text-[color:var(--text-soft)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--surface-2)] transition-all"
          aria-label="Open theme selector"
        >
          <span className="text-base">{themeMetadata.emoji}</span>
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">{themeMetadata.name}</span>
        </button>

      <button
        type="button"
        onClick={enableNotifications}
        disabled={busy || notificationState === "unsupported" || notificationState === "granted"}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-[color:var(--border)] text-[color:var(--text-soft)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--surface-2)] transition-all disabled:opacity-55"
        aria-label={notifLabel}
      >
        {notificationState === "granted" ? (
          <Bell className="w-4 h-4" />
        ) : (
          <BellOff className="w-4 h-4" />
        )}
        <span>{notifLabel}</span>
      </button>
      </div>

      <ThemeSelector isOpen={themeSelectorOpen} onClose={() => setThemeSelectorOpen(false)} />
    </>
  );
}
