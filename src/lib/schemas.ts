/**
 * Central Zod validation schemas for every API surface.
 * Validation happens at the HTTP boundary — handlers receive already-typed data.
 */

import { z } from "zod";

// ─── Common helpers ────────────────────────────────────────────────────────

/** ISO 8601 date (YYYY-MM-DD) */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

/** Optional idempotency key — max 128 chars */
const idempotencyKey = z.string().max(128).optional();

/** Cursor-based pagination query params */
export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ─── Messages ──────────────────────────────────────────────────────────────

export const SendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(4_000, "Message too long"),
  message_type: z.enum(["text", "touch", "presence", "photo", "video", "voice", "gif"]).default("text"),
  media_url: z.string().url().optional(),
  media_thumbnail_url: z.string().url().optional(),
  media_duration: z.number().int().positive().optional(),
  gif_url: z.string().url().optional(),
  reply_to_id: z.string().uuid().optional(),
  idempotency_key: idempotencyKey,
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;

export const EditMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(4_000, "Message too long"),
});

export type EditMessageInput = z.infer<typeof EditMessageSchema>;

export const AddReactionSchema = z.object({
  reaction: z.enum(["heart", "laugh", "sad", "wow", "angry", "thumbs_up", "fire", "clap"]),
});

export type AddReactionInput = z.infer<typeof AddReactionSchema>;

// ─── Presence ──────────────────────────────────────────────────────────────

export const PRESENCE_TYPES = [
  "thinking_of_you",
  "silent_mode",
  "studying",
  "sleeping",
  "missing_you",
  "heartbeat",
] as const;

export const SendPresenceSchema = z.object({
  event_type: z.enum(PRESENCE_TYPES),
  message: z.string().trim().max(160, "Message too long").optional(),
  idempotency_key: idempotencyKey,
});

export type SendPresenceInput = z.infer<typeof SendPresenceSchema>;

// ─── Daily question ────────────────────────────────────────────────────────

export const SaveDailyAnswerSchema = z.object({
  question_id: z
    .string()
    .regex(/^q-\d+$/, "Invalid question_id format"),
  answer: z
    .string()
    .min(1, "Answer cannot be empty")
    .max(5_000, "Answer too long"),
});

export type SaveDailyAnswerInput = z.infer<typeof SaveDailyAnswerSchema>;

// ─── Notes ─────────────────────────────────────────────────────────────────

export const CreateNoteSchema = z.object({
  title: z
    .string()
    .min(1, "Title cannot be empty")
    .max(200, "Title too long"),
  content: z.string().max(10_000, "Content too long").default(""),
});

export const UpdateNoteSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().max(10_000).optional(),
  })
  .refine((d) => d.title !== undefined || d.content !== undefined, {
    message: "At least one field (title or content) must be provided",
  });

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;

// ─── Couple ────────────────────────────────────────────────────────────────

export const CoupleActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create") }),
  z.object({ action: z.literal("leave") }),
  z.object({
    action: z.literal("join"),
    invite_code: z
      .string()
      .trim()
      .length(8, "Invite code must be exactly 8 characters")
      .regex(/^[A-Za-z0-9]+$/, "Invite code must be letters/numbers")
      .transform((code) => code.toUpperCase()),
  }),
]);

export type CoupleActionInput = z.infer<typeof CoupleActionSchema>;

// ─── Countdown ─────────────────────────────────────────────────────────────

export const UpdateCountdownSchema = z
  .object({
    meet_date: isoDate.nullable().optional(),
    anniversary_date: isoDate.nullable().optional(),
  })
  .refine(
    (d) => d.meet_date !== undefined || d.anniversary_date !== undefined,
    { message: "At least one date field must be provided" },
  );

export type UpdateCountdownInput = z.infer<typeof UpdateCountdownSchema>;

// ─── AI suggestions ──────────────────────────────────────────────────────────

export const SuggestionToneSchema = z.enum([
  "romantic",
  "supportive",
  "playful",
  "calm",
]);

export const GenerateSuggestionsSchema = z.object({
  recent_input: z
    .string()
    .trim()
    .max(500, "recent_input too long")
    .optional(),
  context: z
    .string()
    .trim()
    .max(1_000, "context too long")
    .optional(),
  tone: SuggestionToneSchema.default("romantic"),
  count: z.coerce.number().int().min(1).max(6).default(4),
});

export type SuggestionTone = z.infer<typeof SuggestionToneSchema>;
export type GenerateSuggestionsInput = z.infer<typeof GenerateSuggestionsSchema>;

// ─── Settings ──────────────────────────────────────────────────────────────

// Profile settings
export const UpdateProfileSchema = z.object({
  display_name: z.string().trim().min(1).max(50).optional(),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .optional(),
  bio: z.string().trim().max(160).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// User settings
export const UpdateUserSettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional(),
  ui_density: z.enum(["compact", "normal", "comfortable"]).optional(),
  font_scale: z.number().min(0.8).max(1.4).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  date_format: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]).optional(),
  time_format: z.enum(["12h", "24h"]).optional(),
});

export type UpdateUserSettingsInput = z.infer<typeof UpdateUserSettingsSchema>;

// Notification preferences
export const UpdateNotificationPreferencesSchema = z.object({
  email_enabled: z.boolean().optional(),
  email_messages: z.boolean().optional(),
  email_daily: z.boolean().optional(),
  email_presence: z.boolean().optional(),
  email_notes: z.boolean().optional(),
  email_marketing: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  push_messages: z.boolean().optional(),
  push_presence: z.boolean().optional(),
  inapp_enabled: z.boolean().optional(),
  inapp_sound: z.boolean().optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<typeof UpdateNotificationPreferencesSchema>;

// Privacy settings
export const UpdatePrivacySettingsSchema = z.object({
  profile_visibility: z.enum(["public", "private", "couple_only"]).optional(),
  show_activity_status: z.boolean().optional(),
  show_last_seen: z.boolean().optional(),
  allow_data_export: z.boolean().optional(),
  analytics_consent: z.boolean().optional(),
});

export type UpdatePrivacySettingsInput = z.infer<typeof UpdatePrivacySettingsSchema>;

// AI preferences
export const UpdateAIPreferencesSchema = z.object({
  default_model: z.string().optional(),
  response_style: z.enum(["concise", "balanced", "detailed"]).optional(),
  auto_save_suggestions: z.boolean().optional(),
  use_for_enhancement: z.boolean().optional(),
  training_consent: z.boolean().optional(),
});

export type UpdateAIPreferencesInput = z.infer<typeof UpdateAIPreferencesSchema>;

// Password update
export const UpdatePasswordSchema = z.object({
  current_password: z.string().min(6, "Password must be at least 6 characters"),
  new_password: z.string().min(8, "New password must be at least 8 characters"),
});

export type UpdatePasswordInput = z.infer<typeof UpdatePasswordSchema>;

// Email change
export const RequestEmailChangeSchema = z.object({
  new_email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password is required"),
});

export type RequestEmailChangeInput = z.infer<typeof RequestEmailChangeSchema>;

// API key creation
export const CreateAPIKeySchema = z.object({
  key_name: z.string().trim().min(1).max(50),
  scopes: z.array(z.string()).default([]),
  expires_in_days: z.number().int().min(1).max(365).optional(),
});

export type CreateAPIKeyInput = z.infer<typeof CreateAPIKeySchema>;
