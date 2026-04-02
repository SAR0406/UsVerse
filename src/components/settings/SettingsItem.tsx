"use client";

interface SettingsItemProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export default function SettingsItem({ label, description, children }: SettingsItemProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <label className="text-sm font-medium text-[color:var(--foreground)] block">
          {label}
        </label>
        {description && (
          <p className="text-xs text-[color:var(--text-soft)] mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}
