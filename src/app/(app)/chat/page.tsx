"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Send,
  Bot,
  MessageCircle,
  Heart,
  LogIn,
  Trash2,
  Edit2,
  MoreVertical,
  Image as ImageIcon,
  Video,
  Mic,
  Smile,
  Check,
  CheckCheck,
  Reply,
  Camera,
  Paperclip,
} from "lucide-react";
import type { Message, MessageReaction, Profile } from "@/types/database";
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

const REACTION_EMOJIS: Record<string, string> = {
  heart: "❤️",
  laugh: "😂",
  sad: "😢",
  wow: "😮",
  angry: "😠",
  thumbs_up: "👍",
  fire: "🔥",
  clap: "👏",
};

const GIF_CATEGORIES = [
  "love",
  "happy",
  "miss you",
  "good morning",
  "good night",
  "hug",
  "kiss",
  "cute",
];

type CoupleApiData = {
  couple: { id: string } | null;
  partner: Partial<Profile> | null;
  inviteCode: string | null;
};

type ExtendedMessage = Message & {
  reactions?: MessageReaction[];
};

interface TypingIndicator {
  userId: string;
  typing: boolean;
}

export default function ChatPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [partner, setPartner] = useState<Partial<Profile> | null>(null);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>(
    DEFAULT_AI_SUGGESTIONS
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyTo, setReplyTo] = useState<ExtendedMessage | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(
    null
  );
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── Load couple state + messages ──────────────────────────────────────────
  const loadCoupleAndMessages = useCallback(async () => {
    setPageError(null);
    const coupleRes = await fetch("/api/couple");
    const coupleJson = (await coupleRes.json()) as {
      data?: CoupleApiData;
      error?: { message?: string };
    };
    if (!coupleRes.ok) {
      throw new Error(
        coupleJson.error?.message ?? "Failed to load your connection"
      );
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
      if (msgJson.data?.messages) {
        // Load reactions for each message
        const messagesWithReactions = await Promise.all(
          msgJson.data.messages.map(async (msg) => {
            const reactionsRes = await fetch(
              `/api/messages/${msg.id}/reactions`
            );
            if (reactionsRes.ok) {
              const reactionsJson = (await reactionsRes.json()) as {
                data?: { reactions: MessageReaction[] };
              };
              return {
                ...msg,
                reactions: reactionsJson.data?.reactions || [],
              };
            }
            return { ...msg, reactions: [] };
          })
        );
        setMessages(messagesWithReactions);
      }
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
            : "Unable to connect right now. Please refresh and try again."
        );
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [supabase, loadCoupleAndMessages]);

  // ── Real-time subscriptions for messages, reactions, typing, presence ────
  useEffect(() => {
    if (!coupleId || !userId) return;

    const channel = supabase.channel(`chat-${coupleId}`);

    // Messages INSERT
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `couple_id=eq.${coupleId}`,
      },
      async (payload) => {
        const newMsg = payload.new as Message;
        // Load reactions for new message
        const reactionsRes = await fetch(
          `/api/messages/${newMsg.id}/reactions`
        );
        const reactions =
          reactionsRes.ok
            ? ((await reactionsRes.json()) as {
                data?: { reactions: MessageReaction[] };
              }).data?.reactions || []
            : [];
        setMessages((prev) => [...prev, { ...newMsg, reactions }]);
        // Mark as read if from partner
        if (newMsg.sender_id !== userId && !newMsg.read_at) {
          void fetch(`/api/messages/${newMsg.id}/read`, { method: "POST" });
        }
      }
    );

    // Messages UPDATE
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `couple_id=eq.${coupleId}`,
      },
      (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updated.id ? { ...m, ...updated } : m
          )
        );
      }
    );

    // Messages DELETE
    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "messages",
        filter: `couple_id=eq.${coupleId}`,
      },
      (payload) => {
        const deleted = payload.old as { id: string };
        setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
      }
    );

    // Reactions INSERT
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "message_reactions",
      },
      (payload) => {
        const newReaction = payload.new as MessageReaction;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === newReaction.message_id
              ? {
                  ...m,
                  reactions: [...(m.reactions || []), newReaction],
                }
              : m
          )
        );
      }
    );

    // Reactions DELETE
    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "message_reactions",
      },
      (payload) => {
        const deleted = payload.old as { id: string; message_id: string };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === deleted.message_id
              ? {
                  ...m,
                  reactions: (m.reactions || []).filter(
                    (r) => r.id !== deleted.id
                  ),
                }
              : m
          )
        );
      }
    );

    // Typing indicator broadcast
    channel.on("broadcast", { event: "typing" }, (payload) => {
      const typingData = payload.payload as TypingIndicator;
      if (typingData.userId !== userId) {
        setPartnerTyping(typingData.typing);
        if (typingData.typing) {
          setTimeout(() => setPartnerTyping(false), 3000);
        }
      }
    });

    // Online presence broadcast
    channel.on("broadcast", { event: "presence" }, (payload) => {
      const presenceData = payload.payload as { userId: string; online: boolean };
      if (presenceData.userId !== userId) {
        setPartnerOnline(presenceData.online);
      }
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // Broadcast that I'm online
        void channel.send({
          type: "broadcast",
          event: "presence",
          payload: { userId, online: true },
        });
      }
    });

    // Cleanup: broadcast offline
    return () => {
      void channel.send({
        type: "broadcast",
        event: "presence",
        payload: { userId, online: false },
      });
      supabase.removeChannel(channel);
    };
  }, [coupleId, userId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Typing indicator ──────────────────────────────────────────────────────
  const handleInputChange = (value: string) => {
    setInput(value);
    if (!coupleId || !userId) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Broadcast typing
    const channel = supabase.channel(`chat-${coupleId}`);
    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId, typing: true },
    });

    // Stop typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      void channel.send({
        type: "broadcast",
        event: "typing",
        payload: { userId, typing: false },
      });
    }, 2000);
  };

  // ── Create couple ─────────────────────────────────────────────────────────
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

  // ── Leave couple ──────────────────────────────────────────────────────────
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

  // ── Join couple ───────────────────────────────────────────────────────────
  async function handleJoin() {
    if (!joinCode.trim() || joining) return;

    if (inviteCode && joinCode.trim().toUpperCase() === inviteCode.toUpperCase()) {
      setJoinError(
        "That's your own invite code – share it with your partner so they can enter it."
      );
      return;
    }

    setJoining(true);
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
    } finally {
      setJoining(false);
    }
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(content: string, mediaData?: { media_url?: string; media_thumbnail_url?: string; media_duration?: number; gif_url?: string; message_type?: "photo" | "video" | "voice" | "gif" }) {
    if ((!content.trim() && !mediaData) || !coupleId) return;
    setComposerError(null);
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim() || "📎 Media",
          message_type: mediaData?.message_type || "text",
          media_url: mediaData?.media_url,
          media_thumbnail_url: mediaData?.media_thumbnail_url,
          media_duration: mediaData?.media_duration,
          gif_url: mediaData?.gif_url,
          reply_to_id: replyTo?.id,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        throw new Error(json.error?.message ?? "Failed to send message");
      }
      setInput("");
      setReplyTo(null);
      setShowAI(false);
      setShowGifs(false);
      setSelectedFile(null);
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  }

  // ── Delete message ────────────────────────────────────────────────────────
  async function handleDeleteMessage(id: string) {
    setDeletingId(id);
    setComposerError(null);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
      if (!res.ok) {
        await loadCoupleAndMessages();
        const json = (await res.json()) as { error?: { message?: string } };
        setComposerError(json.error?.message ?? "Failed to delete message");
      }
    } catch {
      await loadCoupleAndMessages();
      setComposerError("Failed to delete message");
    } finally {
      setDeletingId(null);
    }
  }

  // ── Edit message ──────────────────────────────────────────────────────────
  async function handleEditMessage(id: string, newContent: string) {
    if (!newContent.trim()) return;
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent.trim() }),
      });
      if (!res.ok) {
        throw new Error("Failed to edit message");
      }
      setEditingId(null);
      setEditContent("");
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : "Failed to edit message"
      );
    }
  }

  // ── Add reaction ──────────────────────────────────────────────────────────
  async function handleAddReaction(messageId: string, reaction: string) {
    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      });
      if (!res.ok) {
        throw new Error("Failed to add reaction");
      }
      setShowReactionPicker(null);
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : "Failed to add reaction"
      );
    }
  }

  // ── Remove reaction ───────────────────────────────────────────────────────
  async function handleRemoveReaction(messageId: string) {
    try {
      const message = messages.find((m) => m.id === messageId);
      const myReaction = message?.reactions?.find((r) => r.user_id === userId);
      if (!myReaction) return;

      const res = await fetch(
        `/api/messages/${messageId}/reactions/${myReaction.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error("Failed to remove reaction");
      }
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : "Failed to remove reaction"
      );
    }
  }

  // ── File upload ───────────────────────────────────────────────────────────
  async function handleFileUpload(file: File, type: "photo" | "video" | "voice") {
    if (!userId) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from("chat-media")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("chat-media")
        .getPublicUrl(data.path);

      const mediaUrl = urlData.publicUrl;

      // For video/voice, get duration if needed
      const duration = type === "video" || type === "voice" ? await getMediaDuration(file) : undefined;

      await sendMessage("", {
        media_url: mediaUrl,
        message_type: type,
        media_duration: duration,
      });

      setSelectedFile(null);
      setShowMediaPicker(false);
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  // ── Get media duration ────────────────────────────────────────────────────
  function getMediaDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const media = document.createElement(
        file.type.startsWith("video") ? "video" : "audio"
      ) as HTMLVideoElement | HTMLAudioElement;
      media.src = url;
      media.onloadedmetadata = () => {
        resolve(Math.floor(media.duration));
        URL.revokeObjectURL(url);
      };
      media.onerror = () => {
        resolve(0);
        URL.revokeObjectURL(url);
      };
    });
  }

  // ── Voice recording ───────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        await handleFileUpload(file, "voice");
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setAudioChunks([]);
    } catch (error) {
      setComposerError("Failed to access microphone");
    }
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  }

  // ── AI suggestions ────────────────────────────────────────────────────────
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

  if (loading) return <LoadingSkeleton />;

  // ── No couple yet: onboarding screen ───────────────────────────────────────
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
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleJoin();
              }}
              placeholder="Enter code…"
              maxLength={8}
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-purple-300/30 text-sm focus:outline-none focus:border-purple-500/50 uppercase tracking-widest"
            />
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim() || joining}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm hover:bg-purple-500 transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              {joining ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Join
                </>
              )}
            </button>
          </div>
          {joinError && <p className="text-red-400 text-xs mt-2">{joinError}</p>}
        </div>
      </div>
    );
  }

  // ── Full chat view ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh)] max-h-screen bg-gradient-to-b from-purple-900/10 to-transparent">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-purple-500/10 shrink-0 backdrop-blur-sm bg-black/20">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          {partnerOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-black rounded-full" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-white flex items-center gap-2">
            {partner?.display_name ?? "Your Partner"}
          </h2>
          <p className="text-xs text-purple-300/70">
            {partnerTyping ? (
              <span className="flex items-center gap-1">
                <span className="animate-pulse">typing</span>
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </span>
            ) : partnerOnline ? (
              "online"
            ) : partner ? (
              "offline"
            ) : (
              "Waiting to connect…"
            )}
          </p>
        </div>
      </div>

      {pageError && (
        <div className="mx-4 mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {pageError}
        </div>
      )}

      {/* Pending invite section */}
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
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleJoin();
              }}
              placeholder="Enter code…"
              maxLength={8}
              className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-purple-300/30 text-sm focus:outline-none focus:border-purple-500/50 uppercase tracking-widest"
            />
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim() || joining}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm hover:bg-purple-500 transition-colors disabled:opacity-40 flex items-center justify-center min-w-[60px]"
            >
              {joining ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Join"
              )}
            </button>
          </div>
          {joinError && <p className="text-red-400 text-xs mt-2">{joinError}</p>}
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
            <p className="text-purple-300/60">No messages yet. Say something ✨</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === userId;
          const myReaction = msg.reactions?.find((r) => r.user_id === userId);
          const partnerReaction = msg.reactions?.find(
            (r) => r.user_id !== userId
          );

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 group ${
                isMe ? "justify-end" : "justify-start"
              }`}
            >
              {isMe && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {msg.message_type === "text" && (
                    <button
                      onClick={() => {
                        setEditingId(msg.id);
                        setEditContent(msg.content);
                      }}
                      title="Edit message"
                      className="p-1 rounded-full text-white/30 hover:text-blue-400 hover:bg-blue-500/20 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => void handleDeleteMessage(msg.id)}
                    disabled={deletingId === msg.id}
                    title="Delete message"
                    className="p-1 rounded-full text-white/30 hover:text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-30"
                  >
                    {deletingId === msg.id ? (
                      <span className="inline-block w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}

              <div className="relative max-w-xs md:max-w-md lg:max-w-lg">
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? "bg-gradient-to-br from-purple-600 to-pink-500 text-white rounded-br-sm"
                      : "glass-card text-purple-100 rounded-bl-sm"
                  }`}
                >
                  {/* Render different message types */}
                  {msg.message_type === "photo" && msg.media_url && (
                    <img
                      src={msg.media_url}
                      alt="Shared photo"
                      className="rounded-lg max-w-full h-auto mb-2"
                    />
                  )}
                  {msg.message_type === "video" && msg.media_url && (
                    <video
                      src={msg.media_url}
                      controls
                      className="rounded-lg max-w-full h-auto mb-2"
                    />
                  )}
                  {msg.message_type === "voice" && msg.media_url && (
                    <audio src={msg.media_url} controls className="mb-2" />
                  )}
                  {msg.message_type === "gif" && msg.gif_url && (
                    <img
                      src={msg.gif_url}
                      alt="GIF"
                      className="rounded-lg max-w-full h-auto mb-2"
                    />
                  )}

                  <p>{msg.content}</p>
                  {msg.edited && (
                    <span className="text-xs opacity-50 ml-1">(edited)</span>
                  )}

                  <div className="flex items-center justify-between mt-1">
                    <p
                      className={`text-[10px] ${
                        isMe ? "text-white/50" : "text-purple-400/40"
                      }`}
                    >
                      {formatDistanceToNow(new Date(msg.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    {isMe && (
                      <div className="text-[10px] text-white/60">
                        {msg.read_at ? (
                          <CheckCheck className="w-3 h-3 text-blue-400" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Reactions */}
                {(msg.reactions && msg.reactions.length > 0) && (
                  <div className="absolute -bottom-3 right-2 flex gap-1">
                    {myReaction && (
                      <button
                        onClick={() => void handleRemoveReaction(msg.id)}
                        className="text-xs bg-white/90 px-2 py-0.5 rounded-full border border-purple-300 hover:scale-110 transition-transform"
                      >
                        {REACTION_EMOJIS[myReaction.reaction]}
                      </button>
                    )}
                    {partnerReaction && (
                      <span className="text-xs bg-white/90 px-2 py-0.5 rounded-full border border-purple-300">
                        {REACTION_EMOJIS[partnerReaction.reaction]}
                      </span>
                    )}
                  </div>
                )}

                {/* Reaction picker */}
                {!isMe && (
                  <button
                    onClick={() =>
                      setShowReactionPicker(
                        showReactionPicker === msg.id ? null : msg.id
                      )
                    }
                    className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-full bg-purple-600/80 text-white hover:bg-purple-600 transition-all"
                  >
                    <Smile className="w-3 h-3" />
                  </button>
                )}
                {showReactionPicker === msg.id && (
                  <div className="absolute top-0 right-0 mt-6 bg-white/95 backdrop-blur-sm rounded-xl p-2 shadow-xl flex gap-1 z-10">
                    {Object.entries(REACTION_EMOJIS).map(([key, emoji]) => (
                      <button
                        key={key}
                        onClick={() => void handleAddReaction(msg.id, key)}
                        className="text-lg hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!isMe && (
                <button
                  onClick={() => setReplyTo(msg)}
                  title="Reply"
                  className="p-1 rounded-full opacity-0 group-hover:opacity-100 text-white/30 hover:text-purple-400 hover:bg-purple-500/20 transition-all"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Editing mode */}
      {editingId && (
        <div className="mx-4 mb-2 p-3 glass-card flex items-center gap-2">
          <Edit2 className="w-4 h-4 text-purple-400" />
          <input
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleEditMessage(editingId, editContent);
              } else if (e.key === "Escape") {
                setEditingId(null);
                setEditContent("");
              }
            }}
            className="flex-1 bg-transparent text-white text-sm focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => void handleEditMessage(editingId, editContent)}
            className="text-xs px-3 py-1 rounded-lg bg-purple-600 text-white hover:bg-purple-500"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setEditContent("");
            }}
            className="text-xs px-3 py-1 rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Reply indicator */}
      {replyTo && (
        <div className="mx-4 mb-2 p-3 glass-card flex items-center gap-2">
          <Reply className="w-4 h-4 text-purple-400" />
          <div className="flex-1 text-sm text-purple-300">
            Replying to: {replyTo.content.slice(0, 50)}
            {replyTo.content.length > 50 && "..."}
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            Cancel
          </button>
        </div>
      )}

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

      {/* GIF Picker */}
      {showGifs && (
        <div className="px-4 py-2 shrink-0">
          <div className="glass-card p-3">
            <p className="text-xs text-purple-400/60 mb-2">Popular GIFs</p>
            <div className="grid grid-cols-4 gap-2">
              {GIF_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    // In a real app, you'd fetch from Tenor/Giphy API
                    // For now, just show placeholder
                    setShowGifs(false);
                  }}
                  className="aspect-square rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-xs text-purple-300 hover:scale-105 transition-transform"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="mx-4 mb-2 glass-card p-3">
          <div className="flex items-center gap-2 mb-1">
            <Paperclip className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-sm text-purple-300">Uploading...</span>
          </div>
          <div className="w-full bg-purple-900/30 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-purple-600 to-pink-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-purple-500/10 shrink-0 backdrop-blur-sm bg-black/20">
        {composerError && (
          <p className="mb-2 text-xs text-red-300/80">{composerError}</p>
        )}
        <div className="flex items-end gap-2">
          {/* Media buttons */}
          <div className="flex gap-1">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileUpload(file, "photo");
              }}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileUpload(file, "video");
              }}
              className="hidden"
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={!partner || isUploading}
              title="Send photo"
              className="p-2.5 rounded-xl bg-white/5 text-purple-400/60 hover:text-purple-400 hover:bg-white/10 transition-all disabled:opacity-40"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={!partner || isUploading}
              title="Send video"
              className="p-2.5 rounded-xl bg-white/5 text-purple-400/60 hover:text-purple-400 hover:bg-white/10 transition-all disabled:opacity-40"
            >
              <Video className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (isRecording) stopRecording();
                else void startRecording();
              }}
              disabled={!partner || isUploading}
              title={isRecording ? "Stop recording" : "Record voice"}
              className={`p-2.5 rounded-xl transition-all disabled:opacity-40 ${
                isRecording
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-white/5 text-purple-400/60 hover:text-purple-400 hover:bg-white/10"
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => {
              const next = !showAI;
              setShowAI(next);
              setShowGifs(false);
              if (next) void loadAiSuggestions();
            }}
            disabled={!partner}
            title="AI Love Assistant"
            className={`p-2.5 rounded-xl transition-all disabled:opacity-40 ${
              showAI
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-purple-400/60 hover:text-purple-400 hover:bg-white/10"
            }`}
          >
            <Bot className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setShowGifs(!showGifs);
              setShowAI(false);
            }}
            disabled={!partner}
            title="Send GIF"
            className={`p-2.5 rounded-xl transition-all disabled:opacity-40 ${
              showGifs
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-purple-400/60 hover:text-purple-400 hover:bg-white/10"
            }`}
          >
            <Smile className="w-4 h-4" />
          </button>

          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder={
              partner ? "Say something beautiful…" : "Connect with your partner first ✨"
            }
            disabled={!partner || isUploading}
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-purple-300/30 text-sm focus:outline-none focus:border-purple-500/50 resize-none disabled:opacity-40"
          />

          <button
            onClick={() => void sendMessage(input)}
            disabled={!input.trim() || sending || !partner || isUploading}
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
