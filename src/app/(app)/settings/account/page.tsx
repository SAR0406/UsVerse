"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { User, Mail, Lock, Trash2, Save, Loader2, Camera } from "lucide-react";
import SettingsSection from "@/components/settings/SettingsSection";
import SettingsItem from "@/components/settings/SettingsItem";
import { motion } from "framer-motion";

export default function AccountSettingsPage() {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Fetch profile
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await fetch("/api/settings/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setDisplayName(data.profile?.display_name || "");
      setUsername(data.profile?.username || "");
      setBio(data.profile?.bio || "");
      return data;
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: object) => {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSaveProfile = () => {
    const updates: Record<string, string> = {};
    if (displayName !== profileData?.profile?.display_name) updates.display_name = displayName;
    if (username !== profileData?.profile?.username) updates.username = username;
    if (bio !== profileData?.profile?.bio) updates.bio = bio;

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      return;
    }

    updateProfileMutation.mutate(updates);
  };

  const handleUpdatePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    updatePasswordMutation.mutate({ current_password: currentPassword, new_password: newPassword });
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
      {/* Profile Section */}
      <SettingsSection
        title="Profile Information"
        description="Update your personal information and profile details"
      >
        {/* Avatar */}
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
              {displayName?.[0]?.toUpperCase() || <User className="w-10 h-10" />}
            </div>
            <button className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 text-white" />
            </button>
          </div>
          <div>
            <h3 className="font-medium text-[color:var(--foreground)]">Profile Picture</h3>
            <p className="text-sm text-[color:var(--text-soft)]">Click to upload a new avatar</p>
          </div>
        </div>

        {/* Display Name */}
        <SettingsItem label="Display Name" description="Your name as it appears to others">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-64 px-3 py-2 rounded-lg bg-[color:var(--surface-2)] border border-purple-400/20 text-[color:var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            placeholder="Your name"
          />
        </SettingsItem>

        {/* Username */}
        <SettingsItem
          label="Username"
          description="Unique identifier, 3-20 characters"
        >
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="w-64 px-3 py-2 rounded-lg bg-[color:var(--surface-2)] border border-purple-400/20 text-[color:var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            placeholder="username"
          />
        </SettingsItem>

        {/* Bio */}
        <SettingsItem label="Bio" description="Tell your partner about yourself (160 characters max)">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            className="w-64 px-3 py-2 rounded-lg bg-[color:var(--surface-2)] border border-purple-400/20 text-[color:var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
            placeholder="Write something about yourself..."
          />
        </SettingsItem>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-purple-400/20">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-purple-500/30 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateProfileMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </motion.button>
        </div>
      </SettingsSection>

      {/* Email Section */}
      <SettingsSection title="Email Address" description="Manage your email address">
        <SettingsItem
          label="Current Email"
          description="Your verified email address"
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[color:var(--surface-2)] border border-purple-400/20 text-sm">
            <Mail className="w-4 h-4 text-[color:var(--text-soft)]" />
            <span className="text-[color:var(--foreground)]">
              {profileData?.profile?.id ? "email@example.com" : "Not set"}
            </span>
          </div>
        </SettingsItem>
      </SettingsSection>

      {/* Password Section */}
      <SettingsSection title="Password" description="Update your password">
        <SettingsItem label="Current Password">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-64 px-3 py-2 rounded-lg bg-[color:var(--surface-2)] border border-purple-400/20 text-[color:var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            placeholder="Enter current password"
          />
        </SettingsItem>

        <SettingsItem label="New Password">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-64 px-3 py-2 rounded-lg bg-[color:var(--surface-2)] border border-purple-400/20 text-[color:var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            placeholder="Enter new password (min 8 chars)"
          />
        </SettingsItem>

        <SettingsItem label="Confirm Password">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-64 px-3 py-2 rounded-lg bg-[color:var(--surface-2)] border border-purple-400/20 text-[color:var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            placeholder="Confirm new password"
          />
        </SettingsItem>

        <div className="flex justify-end pt-4 border-t border-purple-400/20">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUpdatePassword}
            disabled={updatePasswordMutation.isPending || !currentPassword || !newPassword}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600/20 text-purple-200 border border-purple-400/30 font-medium text-sm hover:bg-purple-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updatePasswordMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            Update Password
          </motion.button>
        </div>
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection title="Danger Zone" description="Irreversible actions">
        <SettingsItem
          label="Delete Account"
          description="Permanently delete your account and all data"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-sm font-medium hover:bg-red-500/20 transition"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </motion.button>
        </SettingsItem>
      </SettingsSection>
    </div>
  );
}
