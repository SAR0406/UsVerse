"use client";

import { Bell, BellOff, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "usverse-theme";

function getThemeMetaColor(theme: ThemeMode) {
  return theme === "dark" ? "#0d0720" : "#fff8fb";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", getThemeMetaColor(theme));
}

export default function DisplayControls() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [notificationState, setNotificationState] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const darkPreferred = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme: ThemeMode =
      saved === "light" || saved === "dark" ? saved : darkPreferred ? "dark" : "light";
    setTheme(initialTheme);
    applyTheme(initialTheme);

    if (typeof window.Notification !== "undefined") {
      setNotificationState(window.Notification.permission);
    } else {
      setNotificationState("unsupported");
    }
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

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

  return (
    <div className="flex items-center gap-2 mt-2 md:mt-4">
      <button
        type="button"
        onClick={toggleTheme}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-purple-500/20 text-purple-200/80 hover:text-purple-200 hover:bg-white/5 transition-all"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        <span>{theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</span>
      </button>

      <button
        type="button"
        onClick={enableNotifications}
        disabled={busy || notificationState === "unsupported" || notificationState === "granted"}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-purple-500/20 text-purple-200/70 hover:text-purple-200 hover:bg-white/5 transition-all disabled:opacity-55"
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
  );
}
