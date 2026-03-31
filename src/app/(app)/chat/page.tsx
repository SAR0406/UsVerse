"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Bot, Heart, LogIn, Copy, Check, WifiOff } from "lucide-react";
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

interface FlyingHeart {
  id: number;
  x: number;
  delay: number;
}

function getInitial(name?: string | null) {
  return name && name.trim() ? name.trim().charAt(0).toUpperCase() : "♡";
}

function getAvatarGradient(name?: string | null): string {
  const gradients = [
    "from-violet-500 to-purple-600",
    "from-pink-500 to-rose-500",
    "from-cyan-500 to-blue-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-400",
  ];
  if (!name) return "from-purple-600 to-pink-500";
  return gradients[name.charCodeAt(0) % gradients.length];
}

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
  const [aiSuggestions, setAiSuggestions] = useState<string[]>(DEFAULT_AI_SUGGESTIONS);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [flyingHearts, setFlyingHearts] = useState<FlyingHeart[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load couple state + messages ───────────────────────────────────────
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
        const { data: { user } } = await supabase.auth.getUser();
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
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coupleId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function triggerHearts() {
    const newHearts: FlyingHeart[] = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 72,
      delay: i * 90,
    }));
    setFlyingHearts((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setFlyingHearts((prev) => {
        const idsToRemove = new Set(newHearts.map((h) => h.id));
        return prev.filter((h) => !idsToRemove.has(h.id));
      });
    }, 1600);
  }

  function copyInviteCode(code: string) {
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Create couple ──────────────────────────────────────────────────────
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

  // ── Leave couple ───────────────────────────────────────────────────────
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
      triggerHearts();
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
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
      const json = (await res.json()) as { data?: { suggestions?: string[] } };
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

  const partnerInitial = getInitial(partner?.display_name);
  const avatarGradient = getAvatarGradient(partner?.display_name);

  // ── No couple: onboarding ──────────────────────────────────────────────
  if (!coupleId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-5 py-10">
        <div className="w-full max-w-sm">
          {/* Animated logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-2xl animate-pulse-glow">
                <Heart className="w-10 h-10 text-white animate-heartbeat" fill="white" />
              </div>
              <span className="absolute -top-1 -right-0.5 text-lg animate-float">✨</span>
            </div>
            <h1 className="text-2xl font-bold text-[color:var(--foreground)] text-center">
              Start your universe
            </h1>
            <p className="text-sm text-[color:var(--text-whisper)] text-center mt-1.5 leading-relaxed">
              Connect with the one who makes your world complete
            </p>
          </div>

          <div className="glass-card p-6 space-y-5">
            {pageError && (
              <div className="flex items-center gap-2 text-xs text-red-300 border border-red-500/20 rounded-xl px-3 py-2.5 bg-red-500/10">
                <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
                {pageError}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-purple-500/25"
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </span>
              ) : (
                "✨ Create our space"
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[color:var(--border)]" />
              <span className="text-[color:var(--text-whisper)] text-xs">or join your partner</span>
              <div className="flex-1 h-px bg-[color:var(--border)]" />
            </div>

            <div className="space-y-2.5">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") void handleJoin(); }}
                placeholder="ENTER CODE"
                maxLength={8}
                className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-[color:var(--border)] text-[color:var(--foreground)] placeholder-[color:var(--text-whisper)] text-base focus:outline-none focus:border-purple-500/60 uppercase tracking-[0.3em] text-center font-mono"
              />
              {joinError && (
                <p className="text-red-400 text-xs text-center">{joinError}</p>
              )}
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim()}
                className="w-full py-3 rounded-2xl bg-[color:var(--surface-2)] border border-[color:var(--border)] text-[color:var(--foreground)] text-sm font-medium hover:border-purple-500/40 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" /> Join with code
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Full chat view ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden relative">
      {/* Flying hearts overlay */}
      <div className="pointer-events-none fixed bottom-24 right-20 z-50">
        {flyingHearts.map((h) => (
          <span
            key={h.id}
            className="absolute text-lg animate-fly-heart"
            style={{
              left: `${h.x}px`,
              animationDelay: `${h.delay}ms`,
              animationFillMode: "both",
            }}
          >
            ❤️
          </span>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-[color:var(--border)] shrink-0 bg-[color:var(--card)]/60 backdrop-blur-md">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0`}
        >
          {partner ? partnerInitial : <Heart className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-[color:var(--foreground)] truncate text-[15px]">
              {partner?.display_name ?? "Your Partner"}
            </h2>
            {partner && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
            )}
          </div>
          <p className={`text-xs ${partner ? "text-emerald-400/80" : "text-amber-400/80"}`}>
            {partner ? "In your universe ✨" : "Waiting for your partner…"}
          </p>
        </div>
      </div>

      {pageError && (
        <div className="mx-4 mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2 shrink-0">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          {pageError}
        </div>
      )}

      {/* ── Pending invite section (no partner yet) ── */}
      {!partner && (
        <div className="mx-4 mt-4 glass-card p-4 shrink-0 space-y-4">
          {inviteCode && (
            <div>
              <p className="text-xs text-[color:var(--text-soft)] mb-2.5 text-center">
                Share this code with your partner
              </p>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 px-4 py-3 rounded-2xl bg-purple-600/15 border border-purple-500/25 text-purple-200 font-mono text-xl text-center tracking-[0.4em] select-all">
                  {inviteCode}
                </div>
                <button
                  onClick={() => copyInviteCode(inviteCode)}
                  className={`flex-shrink-0 p-3 rounded-2xl border transition-all ${
                    copied
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-white/5 text-[color:var(--text-soft)] border-[color:var(--border)] hover:bg-white/10"
                  }`}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[color:var(--border)]" />
                <span className="text-[color:var(--text-whisper)] text-xs">or</span>
                <div className="flex-1 h-px bg-[color:var(--border)]" />
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-[color:var(--text-soft)] mb-2">
              Join with your partner&apos;s code:
            </p>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") void handleJoin(); }}
                placeholder="Enter code…"
                maxLength={8}
                className="flex-1 px-4 py-2.5 rounded-2xl bg-white/5 border border-[color:var(--border)] text-[color:var(--foreground)] placeholder-[color:var(--text-whisper)] text-sm focus:outline-none focus:border-purple-500/50 uppercase tracking-[0.2em] font-mono"
              />
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim()}
                className="px-4 py-2.5 rounded-2xl bg-purple-600 text-white text-sm hover:bg-purple-500 transition-colors disabled:opacity-40"
              >
                Join
              </button>
            </div>
          </div>
          {joinError && <p className="text-red-400 text-xs">{joinError}</p>}
          {inviteCode && (
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="text-xs text-[color:var(--text-whisper)] hover:text-[color:var(--text-soft)] transition-colors underline underline-offset-2"
            >
              {leaving ? "Cancelling…" : "Cancel and start over"}
            </button>
          )}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2">
        {messages.length === 0 && partner && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-20">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center animate-pulse-glow">
              <Heart className="w-8 h-8 text-purple-400/50" />
            </div>
            <div>
              <p className="text-[color:var(--text-soft)] text-sm font-medium">No messages yet</p>
              <p className="text-[color:var(--text-whisper)] text-xs mt-1">
                Say something beautiful ✨
              </p>
            </div>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === userId;
          const isLast = idx === messages.length - 1;
          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 animate-message-in ${isMe ? "justify-end" : "justify-start"}`}
            >
              {/* Partner avatar */}
              {!isMe && (
                <div
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0`}
                >
                  {partnerInitial}
                </div>
              )}

              <div className="max-w-[75%] md:max-w-md lg:max-w-lg space-y-0.5">
                <div
                  className={`px-4 py-2.5 text-sm leading-relaxed break-words ${
                    isMe
                      ? "bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-2xl rounded-br-sm shadow-md shadow-purple-500/20"
                      : "glass-card text-[color:var(--foreground)] rounded-2xl rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                {isLast && (
                  <p
                    className={`text-[10px] px-1 text-[color:var(--text-whisper)] ${isMe ? "text-right" : ""}`}
                  >
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── AI Suggestions ── */}
      {showAI && (
        <div className="px-4 pb-2 shrink-0 animate-slide-up-fade">
          <div className="glass-card p-3">
            <p className="text-xs text-[color:var(--text-whisper)] mb-2.5 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Love Assistant</span>
              {loadingSuggestions && (
                <span className="ml-auto w-3.5 h-3.5 border border-purple-500/40 border-t-purple-500 rounded-full animate-spin" />
              )}
            </p>
            {!loadingSuggestions && (
              <div className="flex flex-wrap gap-1.5">
                {aiSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                      setShowAI(false);
                      inputRef.current?.focus();
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--border)] text-[color:var(--text-soft)] hover:border-purple-500/50 hover:text-[color:var(--foreground)] hover:bg-purple-500/10 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="px-4 py-3 border-t border-[color:var(--border)] shrink-0 bg-[color:var(--card)]/50 backdrop-blur-sm">
        {composerError && (
          <p className="mb-2 text-xs text-red-300/80">{composerError}</p>
        )}
        <div className="flex items-end gap-2">
          {/* AI toggle */}
          <button
            onClick={() => {
              const next = !showAI;
              setShowAI(next);
              if (next) void loadAiSuggestions();
            }}
            title="AI Love Assistant"
            className={`flex-shrink-0 p-2.5 rounded-2xl transition-all ${
              showAI
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/30"
                : "bg-white/5 text-[color:var(--text-whisper)] hover:text-purple-400 hover:bg-white/10 border border-[color:var(--border)]"
            }`}
          >
            <Bot className="w-4 h-4" />
          </button>

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder={
              partner ? "Say something beautiful…" : "Connect with your partner first ✨"
            }
            disabled={!partner}
            rows={1}
            style={{ minHeight: "42px", maxHeight: "120px" }}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-white/5 border border-[color:var(--border)] text-[color:var(--foreground)] placeholder-[color:var(--text-whisper)] text-sm focus:outline-none focus:border-purple-500/50 resize-none disabled:opacity-40 overflow-hidden"
          />

          {/* Send button */}
          <button
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || sending || !partner}
            className="flex-shrink-0 p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-purple-500/20"
          >
            {sending ? (
              <span className="block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-3">
      <div className="w-10 h-10 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
      <p className="text-[color:var(--text-whisper)] text-sm">Connecting…</p>
    </div>
  );
}
