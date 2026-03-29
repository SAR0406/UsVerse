import { ServiceUnavailableError, ValidationError } from "@/lib/errors";
import type { GenerateSuggestionsInput } from "@/lib/schemas";

interface NimMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface NimChoice {
  message?: { content?: string };
}

interface NimChatResponse {
  choices?: NimChoice[];
}

const DEFAULT_NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_NIM_MODEL = "meta/llama-3.1-8b-instruct";
const DEFAULT_NIM_REQUEST_TIMEOUT_MS = 8_000;

function buildPrompt(input: GenerateSuggestionsInput): string {
  const lines = [
    "Generate concise and emotionally warm message suggestions for a long-distance couple.",
    "Return exactly one suggestion per line.",
    "No numbering, no bullet points, no quotes.",
    "Each suggestion must be <= 140 characters.",
    `Tone: ${input.tone}.`,
  ];

  if (input.recent_input) {
    lines.push(`User draft: ${input.recent_input}`);
  }
  if (input.context) {
    lines.push(`Context: ${input.context}`);
  }

  lines.push(`Number of suggestions: ${input.count}`);
  return lines.join("\n");
}

function parseSuggestions(raw: string, requestedCount: number): string[] {
  const suggestions = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*\d.)\s]+/, ""))
    .filter(Boolean)
    .slice(0, requestedCount);

  const unique = Array.from(new Set(suggestions));
  return unique;
}

export async function generateNimSuggestions(
  input: GenerateSuggestionsInput,
): Promise<string[]> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new ServiceUnavailableError("AI suggestions are not configured");
  }

  const baseUrl = process.env.NIM_BASE_URL ?? DEFAULT_NIM_BASE_URL;
  const model = process.env.NIM_CHAT_MODEL ?? DEFAULT_NIM_MODEL;
  const timeoutMs = Number(process.env.NIM_TIMEOUT_MS ?? DEFAULT_NIM_REQUEST_TIMEOUT_MS);
  const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const messages: NimMessage[] = [
    {
      role: "system",
      content:
        "You are a caring assistant for couples. Keep suggestions heartfelt, safe, and respectful.",
    },
    {
      role: "user",
      content: buildPrompt(input),
    },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 220,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new ServiceUnavailableError("AI model request failed");
    }

    const data = (await res.json()) as NimChatResponse;
    const content = data.choices?.[0]?.message?.content ?? "";
    const suggestions = parseSuggestions(content, input.count);

    if (suggestions.length === 0) {
      throw new ValidationError("No suggestions were generated");
    }

    return suggestions;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ServiceUnavailableError("AI service is temporarily unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
