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
  message_type: z.enum(["text", "touch", "presence"]).default("text"),
  idempotency_key: idempotencyKey,
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;

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
  z.object({
    action: z.literal("join"),
    invite_code: z
      .string()
      .length(8, "Invite code must be exactly 8 characters")
      .regex(/^[A-Z0-9]+$/, "Invite code must be uppercase letters/numbers"),
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
