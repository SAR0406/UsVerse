"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Bot, MessageCircle } from "lucide-react";
import type { Message, Profile } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

const AI_SUGGESTIONS = [
  "I've been thinking about you all day ☁️",
  "Remember that time we laughed until we cried? I miss that.",
  "If I could teleport anywhere right now, you know where I'd be.",
  "I was looking at our old photos… I smiled so wide.",
  "What's one thing you wish we could do together right now?",
  "I love the version of me that exists when I'm with you.",
  "The sky looks beautiful today. I wish you could see it too.",
  "You make ordinary moments feel extraordinary.",
];

export default function ChatPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [partner, setPartner] = useState<Partial<Profile> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (cid: string) => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("couple_id", cid)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) setMessages(data as Message[]);
  }, [supabase]);

  const loadPartner = useCallback(async (cid: string, myId: string) => {
    const { data: couple } = await supabase
      .from("couples")
      .select("user1_id, user2_id")
      .eq("id", cid)
      .single();
    if (!couple) return;
    const partnerId =
      couple.user1_id === myId ? couple.user2_id : couple.user1_id;
    if (!partnerId) return;
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", partnerId)
      .single();
    if (partnerProfile) setPartner(partnerProfile);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("couple_id")
        .eq("id", user.id)
        .single();

      if (profile?.couple_id) {
        setCoupleId(profile.couple_id);
        await loadMessages(profile.couple_id);
        await loadPartner(profile.couple_id, user.id);
      } else {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data: couple } = await supabase
          .from("couples")
          .insert({ user1_id: user.id, invite_code: code })
          .select()
          .single();
        if (couple) {
          await supabase
            .from("profiles")
            .upsert({ id: user.id, couple_id: couple.id });
          setCoupleId(couple.id);
          setInviteCode(code);
        }
      }
      setLoading(false);
    }
    init();
  }, [supabase, loadMessages, loadPartner]);

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

  async function sendMessage(content: string) {
    if (!content.trim() || !coupleId || !userId) return;
    setSending(true);
    await supabase.from("messages").insert({
      couple_id: coupleId,
      sender_id: userId,
      content: content.trim(),
      message_type: "text",
    });
    setSending(false);
    setInput("");
    setShowAI(false);
  }

  async function handleJoin() {
    if (!userId || !joinCode.trim()) return;
    setJoinError(null);
    const { data: couple } = await supabase
      .from("couples")
      .select("*")
      .eq("invite_code", joinCode.toUpperCase())
      .single();
    if (!couple) {
      setJoinError("Invalid invite code. Ask your partner to share theirs.");
      return;
    }
    if (couple.user2_id) {
      setJoinError("This couple already has two members.");
      return;
    }
    await supabase
      .from("couples")
      .update({ user2_id: userId })
      .eq("id", couple.id);
    await supabase
      .from("profiles")
      .upsert({ id: userId, couple_id: couple.id });
    setCoupleId(couple.id);
    setInviteCode(null);
    await loadMessages(couple.id);
    await loadPartner(couple.id, userId);
  }

  if (loading) return <LoadingSkeleton />;

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
          <p className="text-xs text-purple-400/50">
            {partner ? "In your universe ✨" : "Waiting to connect…"}
          </p>
        </div>
      </div>

      {/* Invite section (when no partner yet) */}
      {inviteCode && !partner && (
        <div className="mx-4 mt-4 glass-card p-4 shrink-0">
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
          <p className="text-sm text-purple-300/80 mb-2">
            Join with partner&apos;s code:
          </p>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter code…"
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-purple-300/30 text-sm focus:outline-none focus:border-purple-500/50"
            />
            <button
              onClick={handleJoin}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm hover:bg-purple-500 transition-colors"
            >
              Join
            </button>
          </div>
          {joinError && (
            <p className="text-red-400 text-xs mt-2">{joinError}</p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !inviteCode && (
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
              {AI_SUGGESTIONS.map((s) => (
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
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowAI(!showAI)}
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
                sendMessage(input);
              }
            }}
            placeholder="Say something beautiful…"
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-purple-300/30 text-sm focus:outline-none focus:border-purple-500/50 resize-none"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || sending}
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
