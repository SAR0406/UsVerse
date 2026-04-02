"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Shield,
  Bell,
  Palette,
  Bot,
  Globe,
  Code,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

const settingsSections = [
  {
    title: "Personal",
    items: [
      { href: "/settings/account", label: "Account", icon: User },
      { href: "/settings/privacy", label: "Privacy & Security", icon: Shield },
      { href: "/settings/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Preferences",
    items: [
      { href: "/settings/appearance", label: "Appearance", icon: Palette },
      { href: "/settings/ai", label: "AI Settings", icon: Bot },
      { href: "/settings/localization", label: "Localization", icon: Globe },
    ],
  },
  {
    title: "Advanced",
    items: [{ href: "/settings/advanced", label: "Developer", icon: Code }],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold gradient-text">Settings</h1>
        <p className="text-[color:var(--text-soft)] mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar Navigation */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav className="glass-card border border-purple-400/20 rounded-2xl p-4 space-y-6">
            {settingsSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--text-whisper)] mb-2 px-3">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href;
                    return (
                      <Link key={href} href={href}>
                        <motion.div
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative overflow-hidden ${
                            isActive
                              ? "text-[color:var(--foreground)]"
                              : "text-[color:var(--text-soft)] hover:text-[color:var(--foreground)]"
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl"
                              layoutId="activeTab"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            />
                          )}
                          <Icon className="w-4 h-4 relative z-10" />
                          <span className="flex-1 relative z-10">{label}</span>
                          {isActive && (
                            <ChevronRight className="w-4 h-4 relative z-10" />
                          )}
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
