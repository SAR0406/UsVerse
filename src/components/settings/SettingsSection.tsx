"use client";

import { motion } from "framer-motion";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <motion.div
      className="glass-card border border-purple-400/20 rounded-2xl p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="border-b border-purple-400/20 pb-4">
        <h2 className="text-xl font-semibold text-[color:var(--foreground)]">{title}</h2>
        {description && (
          <p className="text-sm text-[color:var(--text-soft)] mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}
