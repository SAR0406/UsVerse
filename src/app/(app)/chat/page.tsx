"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Bot, MessageCircle, Heart, LogIn } from "lucide-react";
import type { Message, Profile } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

const DEFAULT_AI_SUGGESTIONS = [
  "I've been thinking about you all day ☁️",
  "Remember that time we laughed until we cried? I miss that.",
  "If I could teleport anywhere right now, you know where I'd be.",
  "I was looking at our old photos… I smiled so wide.",
  "What's one thing you wish we could do together right now?",
  "I love the version of me that exists when I'm with you.",
  "The sky looks beautiful today. I wish you could see it too.",
  "You make ordinary moments feel extraordinary.",
];

type CoupleApiData = {
  couple: { id: string } | null;
  partner: Partial<Profile> | null;
  inviteCode: string | null;
};

export default function ChatPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [partner, setPartner] = useState<Partial<Profile> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>(
    DEFAULT_AI_SUGGESTIONS
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Load couple state + messages (never auto-creates) ──────────────────
  const loadCoupleAndMessages = useCallback(async () => {
    setPageError(null);
    const coupleRes = await fetch("/api/couple");
    const coupleJson = (await coupleRes.json()) as {
      data?: CoupleApiData;
      error?: { message?: string };
    };
    if (!coupleRes.ok) {
      throw new Error(coupleJson.error?.message ?? "Failed to load your connection");
    }
    const coupleData = coupleJson.data;

    if (!coupleData?.couple) {
      // No couple yet — show the onboarding screen
      setCoupleId(null);
      setInviteCode(null);
      setPartner(null);
      setMessages([]);
      return;
    }

    setCoupleId(coupleData.couple.id);
    if (coupleData.inviteCode) setInviteCode(coupleData.inviteCode);
    else setInviteCode(null);
    if (coupleData.partner) setPartner(coupleData.partner);
    else setPartner(null);

    if (coupleData.partner) {
      const msgRes = await fetch("/api/messages?limit=100");
      const msgJson = (await msgRes.json()) as {
        data?: { messages: Message[] };
        error?: { message?: string };
      };
      if (!msgRes.ok) {
        throw new Error(msgJson.error?.message ?? "Failed to load messages");
      }
      if (msgJson.data?.messages) setMessages(msgJson.data.messages);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);
        await loadCoupleAndMessages();
      } catch (error) {
        setPageError(
          error instanceof Error
            ? error.message
            : "Unable to connect right now. Please refresh and try again.",
        );
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [supabase, loadCoupleAndMessages]);

  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`chat-${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Explicitly create a new solo couple ────────────────────────────────
  async function handleCreate() {
    setCreating(true);
    setPageError(null);
    try {
      const res = await fetch("/api/couple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const json = (await res.json()) as {
        data?: { couple: { id: string }; inviteCode: string };
        error?: { message?: string };
      };
      if (!res.ok) {
        setPageError(json.error?.message ?? "Failed to create your couple space");
        return;
      }
      if (json.data) {
        setCoupleId(json.data.couple.id);
        setInviteCode(json.data.inviteCode);
      }
    } catch {
      setPageError("Connection error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  // ── Leave an incomplete solo couple ────────────────────────────────────
  async function handleLeave() {
    setLeaving(true);
    setJoinError(null);
    try {
      const res = await fetch("/api/couple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        setJoinError(json.error?.message ?? "Failed to cancel. Please try again.");
        return;
      }
      setCoupleId(null);
      setInviteCode(null);
      setPartner(null);
      setJoinCode("");
      setJoinError(null);
    } catch {
      setJoinError("Connection error. Please try again.");
    } finally {
      setLeaving(false);
    }
  }

  async function sendMessage(content: string) {
    if (!content.trim() || !coupleId) return;
    setComposerError(null);
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          message_type: "text",
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to send message");
      }
      setInput("");
      setShowAI(false);
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : "Failed to send message",
      );
    } finally {
      setSending(false);
    }
  }

  async function loadAiSuggestions() {
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recent_input: input.trim() || undefined,
          tone: "romantic",
          count: 4,
        }),
      });
      if (!res.ok) {
        setAiSuggestions(DEFAULT_AI_SUGGESTIONS);
        return;
      }
      const json = (await res.json()) as {
        data?: { suggestions?: string[] };
      };

      if (json.data?.suggestions?.length) {
        setAiSuggestions(json.data.suggestions);
      } else {
        setAiSuggestions(DEFAULT_AI_SUGGESTIONS);
      }
    } catch {
      setAiSuggestions(DEFAULT_AI_SUGGESTIONS);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    setJoinError(null);
    try {
      const res = await fetch("/api/couple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          invite_code: joinCode.trim().toUpperCase(),
        }),
      });
      const json = (await res.json()) as {
        data?: unknown;
        error?: { message: string };
      };
      if (!res.ok || json.error) {
        if (res.status === 429) {
          setJoinError("Too many attempts. Please wait a minute and try again.");
        } else {
          setJoinError(json.error?.message ?? "Invalid invite code");
        }
        return;
      }
      setInviteCode(null);
      setJoinCode("");
      await loadCoupleAndMessages();
    } catch {
      setJoinError("Connection error. Please try again.");
    }
  }

  if (loading) return <LoadingSkeleton />;

  // ── No couple yet: onboarding screen ───────────────────────────────────
  if (!coupleId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-10">
        <div className="glass-card w-full max-w-sm p-7 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
            <Heart className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Start your universe</h2>
          <p className="text-sm text-purple-300/60 mb-6">
            Create a shared space and invite your partner, or enter their code to connect.
          </p>

          {pageError && (
            <p className="mb-4 text-xs text-red-400 border border-red-500/20 rounded-xl px-3 py-2 bg-red-500/10">
              {pageError}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 mb-4"
          >
            {creating ? "Creating…" : "✨ Create new space"}
          </button>

          <p className="text-purple-300/40 text-xs mb-4">— or join your partner —</p>

          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") void handleJoin(); }}
              placeholder="Enter code…"
              maxLength={8}
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-purple-300/30 text-sm focus:outline-none focus:border-purple-500/50 uppercase tracking-widest"
            />
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm hover:bg-purple-500 transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              <LogIn className="w-4 h-4" /> Join
            </button>
          </div>
          {joinError && (
            <p className="text-red-400 text-xs mt-2">{joinError}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Full chat view (couple exists) ─────────────────────────────────────
  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh)] max-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-purple-500/10 shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-white">
            {partner?.display_name ?? "Your Partner"}
          </h2>
          <p className={`text-xs ${partner ? "text-emerald-300/80" : "text-amber-300/80"}`}>
            {partner ? "In your universe ✨" : "Waiting to connect… Share or enter a code below."}
          </p>
        </div>
      </div>
      {pageError && (
        <div className="mx-4 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {pageError}
        </div>
      )}

      {/* Pending invite section: solo couple, no partner yet */}
      {!partner && (
        <div className="mx-4 mt-4 glass-card p-4 shrink-0">
          {inviteCode && (
            <>
              <p className="text-sm text-purple-300/80 mb-3">
                Share this code with your partner to connect:
              </p>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 font-mono text-lg text-center tracking-widest">
                  {inviteCode}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(inviteCode)}
                  className="px-3 py-2 rounded-xl bg-purple-600/20 text-purple-300 text-xs hover:bg-purple-600/30 transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-center text-purple-300/40 text-xs mb-3">— or —</p>
            </>
          )}
          <p className="text-sm text-purple-300/80 mb-2">
            Join with your partner&apos;s code:
          </p>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") void handleJoin(); }}
              placeholder="Enter code…"
              maxLength={8}
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-purple-300/30 text-sm focus:outline-none focus:border-purple-500/50 uppercase tracking-widest"
            />
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim()}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm hover:bg-purple-500 transition-colors disabled:opacity-40"
            >
              Join
            </button>
          </div>
          {joinError && (
            <p className="text-red-400 text-xs mt-2">{joinError}</p>
          )}
          {inviteCode && (
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="mt-3 text-xs text-purple-400/50 hover:text-purple-400/80 transition-colors underline underline-offset-2"
            >
              {leaving ? "Cancelling…" : "Cancel and start over"}
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && partner && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="text-5xl mb-4">💬</div>
            <p className="text-purple-300/60">
              No messages yet. Say something ✨
            </p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === userId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? "bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-br-sm"
                    : "glass-card text-purple-100 rounded-bl-sm"
                }`}
              >
                <p>{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    isMe ? "text-white/50" : "text-purple-400/40"
                  }`}
                >
                  {formatDistanceToNow(new Date(msg.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Suggestions */}
      {showAI && (
        <div className="px-4 py-2 shrink-0">
          <div className="glass-card p-3">
            <p className="text-xs text-purple-400/60 mb-2 flex items-center gap-1">
              <Bot className="w-3 h-3" /> AI Love Assistant
            </p>
            <div className="flex flex-wrap gap-2">
              {loadingSuggestions && (
                <p className="text-xs text-purple-400/60">Generating suggestions…</p>
              )}
              {!loadingSuggestions &&
                aiSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                      setShowAI(false);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border border-purple-500/20 text-purple-300/70 hover:border-purple-500/50 hover:text-purple-300 transition-all"
                  >
                    {s}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-purple-500/10 shrink-0">
        {composerError && (
          <p className="mb-2 text-xs text-red-300/80">{composerError}</p>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={() => {
              const next = !showAI;
              setShowAI(next);
              if (next) void loadAiSuggestions();
            }}
            title="AI Love Assistant"
            className={`p-2.5 rounded-xl transition-all ${
              showAI
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-purple-400/60 hover:text-purple-400 hover:bg-white/10"
            }`}
          >
            <Bot className="w-4 h-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder={partner ? "Say something beautiful…" : "Connect with your partner first ✨"}
            disabled={!partner}
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-purple-300/30 text-sm focus:outline-none focus:border-purple-500/50 resize-none disabled:opacity-40"
          />
          <button
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || sending || !partner}
            className="p-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 text-white disabled:opacity-40 hover:opacity-90 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 flex flex-col items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      <p className="text-purple-400/50 text-sm mt-3">Connecting…</p>
    </div>
  );
}
