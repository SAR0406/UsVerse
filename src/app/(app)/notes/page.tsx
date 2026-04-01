"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit3, Trash2, Save, X, Feather, Heart, BookMarked, ImagePlus } from "lucide-react";
import type { SharedNote } from "@/types/database";
import { format, formatDistanceToNow } from "date-fns";

/* ─── LocalStorage image helpers ─────────────────── */
interface DiaryImage { id: string; dataUrl: string; caption: string; }
const DRAFT_IMG_KEY = "diary-img-draft";
const DRAFT_MOOD_KEY = "diary-mood-draft";
const imgKey = (id: string) => `diary-img-${id}`;
const moodKey = (id: string) => `diary-mood-${id}`;

function loadImgs(k: string): DiaryImage[] {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as DiaryImage[]) : []; }
  catch { return []; }
}
function saveImgs(k: string, imgs: DiaryImage[]) {
  try { localStorage.setItem(k, JSON.stringify(imgs)); } catch {}
}
function loadMood(k: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(k) ?? "";
}

/* ─── Moods ───────────────────────────────────────── */
const MOODS = [
  { e: "😊", l: "Happy" }, { e: "💕", l: "Loved" }, { e: "😌", l: "Calm" },
  { e: "🥺", l: "Nostalgic" }, { e: "😄", l: "Excited" }, { e: "🌧️", l: "Sad" },
  { e: "✨", l: "Grateful" }, { e: "🌙", l: "Dreamy" },
];

/* ─── Spiral rings ────────────────────────────────── */
const RING_COUNT = 18;

function SpiralBindings() {
  return (
    <div
      className="diary-spiral w-8 shrink-0 select-none"
      style={{ minHeight: "100%" }}
      aria-hidden
    >
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <div key={i} className="diary-spiral-ring my-[7px]" />
      ))}
    </div>
  );
}

const TAB_COLORS = [
  "#ff6b9d", "#ffab76", "#c8b6e2", "#b8e3ff",
  "#fff3b0", "#b8f0c8", "#f0a0d0", "#a0d4f0",
];

export default function NotesPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipKey, setFlipKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCoverPage, setShowCoverPage] = useState(true);
  /* image + mood state */
  const [pendingImages, setPendingImages] = useState<DiaryImage[]>([]);
  const [mood, setMood] = useState("");
  const [noteImagesMap, setNoteImagesMap] = useState<Record<string, DiaryImage[]>>({});
  const [noteMoodsMap, setNoteMoodsMap] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const loadNotes = useCallback(async () => {
    const res = await fetch("/api/notes?limit=50");
    const json = (await res.json()) as {
      data?: { notes: SharedNote[] };
      error?: { message?: string };
    };
    if (res.ok && json.data?.notes) {
      setNotes(json.data.notes);
      setErrorMessage(null);
      const imgs: Record<string, DiaryImage[]> = {};
      const moods: Record<string, string> = {};
      for (const n of json.data.notes) {
        imgs[n.id] = loadImgs(imgKey(n.id));
        moods[n.id] = loadMood(moodKey(n.id));
      }
      setNoteImagesMap(imgs);
      setNoteMoodsMap(moods);
    } else if (!res.ok) {
      setErrorMessage(json.error?.message ?? "Failed to load notes");
    }
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("couple_id")
        .eq("id", user.id)
        .single();
      if (profile?.couple_id) {
        setCoupleId(profile.couple_id);
        await loadNotes();
      }
      setLoading(false);
    }
    init();
  }, [supabase, loadNotes]);

  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`notes-${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shared_notes", filter: `couple_id=eq.${coupleId}` }, () => { loadNotes(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coupleId, supabase, loadNotes]);

  function openPage(index: number) {
    setActiveIndex(index);
    setFlipKey((k) => k + 1);
    setCreating(false);
    setEditingId(null);
    setShowCoverPage(false);
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setTitle("");
    setContent("");
    setPendingImages(loadImgs(DRAFT_IMG_KEY));
    setMood(loadMood(DRAFT_MOOD_KEY));
    setShowCoverPage(false);
    window.setTimeout(() => titleRef.current?.focus(), 80);
  }

  function startEdit(note: SharedNote) {
    setCreating(false);
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setPendingImages(loadImgs(imgKey(note.id)));
    setMood(loadMood(moodKey(note.id)));
    window.setTimeout(() => titleRef.current?.focus(), 80);
  }

  function cancelEdit() {
    setCreating(false);
    setEditingId(null);
    setTitle("");
    setContent("");
    setPendingImages([]);
    setMood("");
  }

  function handleImageFiles(files: FileList | null) {
    if (!files) return;
    const isCreating = creating;
    const curEditId = editingId;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;
        const img: DiaryImage = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          dataUrl,
          caption: "",
        };
        setPendingImages((prev) => {
          const next = [...prev, img];
          if (isCreating) saveImgs(DRAFT_IMG_KEY, next);
          else if (curEditId) saveImgs(imgKey(curEditId), next);
          return next;
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(id: string) {
    const isCreating = creating;
    const curEditId = editingId;
    setPendingImages((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (isCreating) saveImgs(DRAFT_IMG_KEY, next);
      else if (curEditId) saveImgs(imgKey(curEditId), next);
      return next;
    });
  }

  function updateCaption(id: string, caption: string) {
    const isCreating = creating;
    const curEditId = editingId;
    setPendingImages((prev) => {
      const next = prev.map((i) => i.id === id ? { ...i, caption } : i);
      if (isCreating) saveImgs(DRAFT_IMG_KEY, next);
      else if (curEditId) saveImgs(imgKey(curEditId), next);
      return next;
    });
  }

  async function saveNote() {
    if (!title.trim()) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      if (creating) {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), content: content.trim() }),
        });
        const json = (await res.json()) as { data?: SharedNote; error?: { message?: string } };
        if (!res.ok) {
          setErrorMessage(json.error?.message ?? "Failed to create note");
          return;
        }
        const newId = json.data?.id;
        if (newId) {
          saveImgs(imgKey(newId), pendingImages);
          localStorage.setItem(moodKey(newId), mood);
        }
        localStorage.removeItem(DRAFT_IMG_KEY);
        localStorage.removeItem(DRAFT_MOOD_KEY);
      } else if (editingId) {
        const res = await fetch(`/api/notes/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), content: content.trim() }),
        });
        if (!res.ok) {
          const json = (await res.json()) as { error?: { message?: string } };
          setErrorMessage(json.error?.message ?? "Failed to update note");
          return;
        }
        saveImgs(imgKey(editingId), pendingImages);
        localStorage.setItem(moodKey(editingId), mood);
      }
      await loadNotes();
      cancelEdit();
      if (creating) {
        window.setTimeout(() => setActiveIndex(0), 100);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    if (!confirm("Remove this diary entry forever?")) return;
    setErrorMessage(null);
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json()) as { error?: { message?: string } };
      setErrorMessage(json.error?.message ?? "Failed to delete note");
      return;
    }
    localStorage.removeItem(imgKey(id));
    localStorage.removeItem(moodKey(id));
    await loadNotes();
    if (activeIndex >= notes.length - 1) setActiveIndex(Math.max(0, Math.min(activeIndex, notes.length - 2)));
  }

  /* ── Loading state ──────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-20">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl animate-float">📖</div>
          <p className="text-[color:var(--text-soft)] text-sm">Opening your diary…</p>
        </div>
      </div>
    );
  }

  /* ── No-couple state ─────────────────────────── */
  if (!coupleId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 text-center">
        <div className="text-5xl mb-4">📔</div>
        <h2 className="text-xl font-semibold text-white mb-2">Shared Diary</h2>
        <p className="text-sm text-[color:var(--text-soft)] max-w-xs">
          Connect with your partner first — head to{" "}
          <a href="/chat" className="text-purple-400 underline underline-offset-2 hover:text-purple-300">
            Chat
          </a>{" "}
          and share your invite code to unlock your shared diary.
        </p>
      </div>
    );
  }

  const activeNote = notes[activeIndex] ?? null;
  const isFormOpen = creating || !!editingId;

  const tocItems = notes.map((n, i) => ({
    note: n,
    index: i,
    color: TAB_COLORS[i % TAB_COLORS.length],
    isOwn: n.author_id === userId,
  }));

  return (
    <div className="min-h-screen p-3 sm:p-5 lg:p-8 flex items-start justify-center">
      <div className="w-full max-w-5xl" style={{ perspective: "1400px" }}>

        {/* ── Book cover ── */}
        {showCoverPage && (
          <div
            className="diary-cover rounded-2xl overflow-hidden cursor-pointer group"
            style={{ minHeight: 360 }}
            onClick={() => setShowCoverPage(false)}
          >
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[360px] gap-6 px-8 py-10">
              <div className="text-center">
                <div
                  className="text-5xl sm:text-6xl mb-3"
                  style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }}
                >
                  📔
                </div>
                <h1
                  className="text-3xl sm:text-4xl font-bold text-amber-200/90"
                  style={{ fontFamily: "var(--font-serif), Georgia, serif", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
                >
                  Our Shared Diary
                </h1>
                <p className="text-amber-300/60 mt-2 text-sm tracking-widest uppercase"
                  style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
                  {new Date().getFullYear()}
                </p>
              </div>
              <div className="flex items-center gap-3 w-full max-w-xs">
                <div className="flex-1 h-px bg-amber-400/30" />
                <span className="text-amber-400/60 text-xs">❧</span>
                <div className="flex-1 h-px bg-amber-400/30" />
              </div>
              <p className="text-amber-200/50 text-sm text-center max-w-xs leading-relaxed"
                style={{ fontFamily: "var(--font-accent), cursive" }}>
                {notes.length > 0
                  ? `${notes.length} entr${notes.length === 1 ? "y" : "ies"} written with love`
                  : "Every love story deserves a diary"}
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setShowCoverPage(false); }}
                className="mt-2 px-8 py-3 rounded-full text-sm font-semibold transition-all group-hover:scale-105 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, rgba(255,200,100,0.25), rgba(255,200,100,0.12))",
                  border: "1px solid rgba(255,200,100,0.4)",
                  color: "rgba(255,220,140,0.95)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }}
              >
                Open Diary ✦
              </button>
            </div>
          </div>
        )}

        {/* ── Main diary book ── */}
        {!showCoverPage && (
          <div
            className="flex rounded-2xl overflow-hidden"
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2)",
              minHeight: "min(85vh, 780px)",
            }}
          >
            {/* LEFT: Spiral + TOC */}
            <div
              className="flex shrink-0"
              style={{
                background: "linear-gradient(180deg, #3d2b1f 0%, #2a1c12 100%)",
                width: "clamp(200px, 28%, 280px)",
              }}
            >
              <SpiralBindings />
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-3 pt-4 pb-3 border-b border-amber-900/30">
                  <div className="flex items-center gap-2 mb-0.5">
                    <BookMarked className="w-3.5 h-3.5 text-amber-400/70" />
                    <span className="text-xs font-bold text-amber-300/70 tracking-widest uppercase">
                      Index
                    </span>
                  </div>
                </div>

                <div className="px-3 pt-3 pb-2">
                  <button
                    onClick={startCreate}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, color-mix(in oklab, var(--color-blossom) 22%, transparent), color-mix(in oklab, var(--color-blossom) 8%, transparent))",
                      border: "1px solid color-mix(in oklab, var(--color-blossom) 35%, transparent)",
                      color: "var(--color-blossom)",
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Entry
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
                  {tocItems.length === 0 ? (
                    <p className="text-amber-200/30 text-xs px-2 py-4 text-center leading-relaxed"
                      style={{ fontFamily: "var(--font-accent), cursive" }}>
                      Your first page awaits…
                    </p>
                  ) : (
                    tocItems.map(({ note, index, color, isOwn }) => (
                      <button
                        key={note.id}
                        onClick={() => openPage(index)}
                        className={`diary-toc-item w-full text-left px-2.5 py-2 rounded-lg transition-all ${
                          activeIndex === index && !isFormOpen ? "diary-toc-item-active" : ""
                        }`}
                        style={{
                          background: activeIndex === index && !isFormOpen
                            ? `linear-gradient(135deg, ${color}22, ${color}10)` : "transparent",
                          borderLeft: activeIndex === index && !isFormOpen
                            ? `3px solid ${color}` : "3px solid transparent",
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0 text-xs">{isOwn ? "✍️" : "💜"}</span>
                          <div className="min-w-0">
                            <p
                              className="text-xs font-semibold truncate leading-tight"
                              style={{ color: activeIndex === index && !isFormOpen ? color : "rgba(255,220,180,0.75)" }}
                            >
                              {note.title}
                            </p>
                            <p className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(200,160,120,0.5)" }}>
                              {format(new Date(note.updated_at), "MMM d, yyyy")}
                            </p>
                            {noteMoodsMap[note.id] && (
                              <span className="text-[10px]">{noteMoodsMap[note.id]}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="px-3 py-3 border-t border-amber-900/30">
                  <button
                    onClick={() => setShowCoverPage(true)}
                    className="w-full text-xs text-amber-300/40 hover:text-amber-300/70 transition-colors text-center"
                  >
                    ← Close diary
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: Page content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Page header strip */}
              <div
                className="flex items-center justify-between px-5 py-3 shrink-0"
                style={{
                  background: "linear-gradient(180deg, rgba(253,246,233,0.97), rgba(253,246,233,0.90))",
                  borderBottom: "1px solid rgba(147,180,220,0.3)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Feather className="w-4 h-4" style={{ color: "var(--diary-accent)" }} />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--diary-text-secondary)", fontFamily: "var(--font-serif), Georgia, serif" }}
                  >
                    Shared Diary
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {errorMessage && (
                    <span className="text-xs text-red-500/80">{errorMessage}</span>
                  )}
                  {!isFormOpen && activeNote && (
                    <span
                      className="text-xs"
                      style={{ color: "var(--diary-text-tertiary)", fontFamily: "var(--font-serif), Georgia, serif" }}
                    >
                      p. {activeIndex + 1}
                    </span>
                  )}
                </div>
              </div>

              {/* Page area */}
              <div className="flex-1 overflow-y-auto relative diary-paper diary-page-shadow">

                {/* Empty state */}
                {notes.length === 0 && !isFormOpen && (
                  <div className="flex flex-col items-center justify-center min-h-[400px] gap-5 px-8">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ background: "color-mix(in oklab, var(--diary-accent) 12%, transparent)", border: "2px dashed var(--diary-border)" }}
                    >
                      <Feather className="w-9 h-9" style={{ color: "var(--diary-accent)", opacity: 0.6 }} />
                    </div>
                    <div className="text-center">
                      <p
                        className="text-xl font-semibold mb-1"
                        style={{ color: "var(--diary-text-secondary)", fontFamily: "var(--font-serif), Georgia, serif" }}
                      >
                        Your diary is empty
                      </p>
                      <p
                        className="text-sm leading-relaxed max-w-xs text-center"
                        style={{ color: "var(--diary-text-primary)", fontFamily: "var(--font-accent), cursive", fontSize: "1rem" }}
                      >
                        Write your first entry and begin your shared story…
                      </p>
                    </div>
                    <button
                      onClick={startCreate}
                      className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: "linear-gradient(135deg, var(--diary-accent), var(--diary-text-secondary))",
                        color: "var(--diary-paper-bg)",
                        boxShadow: "0 4px 14px color-mix(in oklab, var(--diary-accent) 35%, transparent)",
                      }}
                    >
                      Write now ✍️
                    </button>
                  </div>
                )}

                {/* Form (new / edit) */}
                {isFormOpen && (
                  <div key="form" className="diary-page-enter relative p-6 sm:p-8 min-h-[480px]">
                    <div
                      className="absolute left-[52px] top-0 bottom-0 w-[1.5px] pointer-events-none"
                      style={{ background: "rgba(255,107,157,0.35)" }}
                    />

                    <p
                      className="text-xs font-bold tracking-widest uppercase mb-5 pl-10"
                      style={{ color: "var(--diary-accent)", fontFamily: "var(--font-serif), Georgia, serif" }}
                    >
                      {creating ? "New Entry" : "Edit Entry"}
                    </p>

                    {/* Title input */}
                    <div className="pl-10 mb-1">
                      <input
                        ref={titleRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Give this page a title…"
                        className="w-full bg-transparent border-0 border-b-2 outline-none pb-1 text-lg font-semibold placeholder:font-normal transition-colors"
                        style={{
                          borderColor: title ? "var(--diary-accent)" : "var(--diary-border)",
                          color: "var(--diary-text-primary)",
                          fontFamily: "var(--font-serif), Georgia, serif",
                          caretColor: "var(--diary-text-primary)",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--diary-accent)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = title ? "var(--diary-accent)" : "var(--diary-border)")}
                      />
                    </div>

                    {/* Date stamp */}
                    <div className="pl-10 mb-4">
                      <span
                        className="diary-date-stamp text-xs"
                        style={{ color: "var(--diary-text-tertiary)", borderColor: "var(--diary-border)" }}
                      >
                        {format(new Date(), "MMMM d, yyyy")}
                      </span>
                    </div>

                    {/* Mood selector */}
                    <div className="pl-10 mb-5">
                      <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "var(--diary-text-tertiary)" }}>
                        Today&apos;s Mood
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {MOODS.map((m) => (
                          <button
                            key={m.l}
                            onClick={() => {
                              const next = mood === m.e ? "" : m.e;
                              setMood(next);
                              const k = creating ? DRAFT_MOOD_KEY : editingId ? moodKey(editingId) : null;
                              if (k) localStorage.setItem(k, next);
                            }}
                            className="diary-mood-chip"
                            style={{
                              background: mood === m.e ? "color-mix(in oklab, var(--diary-accent) 25%, transparent)" : "color-mix(in oklab, var(--diary-accent) 8%, transparent)",
                              border: `1px solid ${mood === m.e ? "var(--diary-accent)" : "var(--diary-border)"}`,
                              color: "var(--diary-text-primary)",
                              opacity: mood && mood !== m.e ? 0.55 : 1,
                            }}
                            title={m.l}
                          >
                            {m.e} <span className="text-[9px] ml-0.5">{m.l}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Content textarea */}
                    <div className="pl-10 relative mb-5">
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Dear diary… what happened today?"
                        rows={8}
                        className="w-full bg-transparent border-0 outline-none resize-none leading-8 text-sm"
                        style={{
                          lineHeight: "32px",
                          color: "var(--diary-text-primary)",
                          fontFamily: "var(--font-accent), cursive",
                          fontSize: "1rem",
                          caretColor: "var(--diary-text-primary)",
                        }}
                      />
                    </div>

                    {/* Image attachments section */}
                    <div className="pl-10 mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--diary-text-tertiary)" }}>
                          Photos &amp; Memories
                        </p>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
                          style={{
                            background: "color-mix(in oklab, var(--diary-accent) 12%, transparent)",
                            border: "1px dashed var(--diary-border)",
                            color: "var(--diary-text-primary)",
                          }}
                        >
                          <ImagePlus className="w-3 h-3" />
                          Add Photo
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleImageFiles(e.target.files)}
                        />
                      </div>

                      {pendingImages.length > 0 ? (
                        <div className="flex flex-wrap gap-4">
                          {pendingImages.map((img) => (
                            <div key={img.id} className="diary-polaroid group">
                              <div className="diary-tape diary-tape-top" />
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.dataUrl} alt={img.caption || "Memory"} className="diary-polaroid-photo" />
                              <input
                                type="text"
                                value={img.caption}
                                onChange={(e) => updateCaption(img.id, e.target.value)}
                                placeholder="Caption…"
                                className="diary-polaroid-caption-input"
                              />
                              <button
                                onClick={() => removeImage(img.id)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-400/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove photo"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed transition-all hover:scale-[1.01]"
                          style={{ borderColor: "rgba(200,144,96,0.2)", color: "rgba(200,144,96,0.4)" }}
                        >
                          <ImagePlus className="w-6 h-6" />
                          <span className="text-xs">Attach photos to this memory</span>
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pl-10 mt-2 flex items-center gap-3">
                      <button
                        onClick={saveNote}
                        disabled={!title.trim() || saving}
                        className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                        style={{
                          background: "linear-gradient(135deg, #c89060, #a06840)",
                          color: "#fff8f0",
                          boxShadow: "0 4px 14px rgba(168,104,64,0.3)",
                        }}
                      >
                        {saving ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        Save Entry
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-colors"
                        style={{ color: "rgba(100,60,20,0.5)" }}
                      >
                        <X className="w-3 h-3" />
                        Discard
                      </button>
                    </div>
                  </div>
                )}

                {/* View a note */}
                {!isFormOpen && activeNote && (
                  <div
                    key={`note-${flipKey}`}
                    className="diary-page-flip-in relative p-6 sm:p-8 min-h-[480px]"
                  >
                    <div
                      className="absolute left-[52px] top-0 bottom-0 w-[1.5px] pointer-events-none"
                      style={{ background: "rgba(255,107,157,0.35)" }}
                    />

                    {/* Author badge + actions */}
                    <div className="pl-10 mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold tracking-widest uppercase"
                          style={{ color: "var(--diary-accent)", fontFamily: "var(--font-serif), Georgia, serif" }}
                        >
                          {activeNote.author_id === userId ? "Your Entry" : "Their Entry"}
                        </span>
                        {noteMoodsMap[activeNote.id] && (
                          <span className="diary-mood-badge">{noteMoodsMap[activeNote.id]}</span>
                        )}
                      </div>
                      {activeNote.author_id === userId && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(activeNote)}
                            className="p-1.5 rounded-lg transition-all hover:scale-110"
                            style={{ color: "rgba(168,104,64,0.5)" }}
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteNote(activeNote.id)}
                            className="p-1.5 rounded-lg transition-all hover:scale-110"
                            style={{ color: "rgba(200,80,80,0.45)" }}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h2
                      className="pl-10 text-2xl font-bold mb-2 leading-tight"
                      style={{ color: "var(--diary-text-primary)", fontFamily: "var(--font-serif), Georgia, serif" }}
                    >
                      {activeNote.title}
                    </h2>

                    {/* Date stamp */}
                    <div className="pl-10 mb-6">
                      <span
                        className="diary-date-stamp text-xs"
                        style={{ color: "var(--diary-text-tertiary)", borderColor: "var(--diary-border)" }}
                      >
                        {format(new Date(activeNote.updated_at), "MMMM d, yyyy")}
                      </span>
                      <span
                        className="ml-3 text-xs"
                        style={{ color: "var(--diary-text-tertiary)", fontFamily: "var(--font-serif), Georgia, serif" }}
                      >
                        {formatDistanceToNow(new Date(activeNote.updated_at), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Content */}
                    {activeNote.content ? (
                      <div className="pl-10">
                        <p
                          className="leading-8 whitespace-pre-wrap"
                          style={{
                            color: "var(--diary-text-primary)",
                            fontFamily: "var(--font-accent), cursive",
                            fontSize: "1.05rem",
                            lineHeight: "32px",
                          }}
                        >
                          {activeNote.content}
                        </p>
                      </div>
                    ) : (
                      <p
                        className="pl-10 italic"
                        style={{ color: "var(--diary-text-placeholder)", fontFamily: "var(--font-accent), cursive" }}
                      >
                        (No words today — sometimes feelings are beyond writing)
                      </p>
                    )}

                    {/* Photo polaroids */}
                    {(noteImagesMap[activeNote.id]?.length ?? 0) > 0 && (
                      <div className="pl-10 mt-8">
                        <p className="text-[10px] font-bold tracking-widest uppercase mb-4" style={{ color: "var(--diary-text-tertiary)" }}>
                          📷 Memories
                        </p>
                        <div className="flex flex-wrap gap-6 pb-2">
                          {noteImagesMap[activeNote.id].map((img, idx) => (
                            <div
                              key={img.id}
                              className="diary-polaroid-view"
                              style={{ transform: `rotate(${idx % 2 === 0 ? -2 : 2}deg)` }}
                            >
                              <div className={`diary-tape ${idx % 3 === 0 ? "diary-tape-top" : idx % 3 === 1 ? "diary-tape-left" : "diary-tape-corner"}`} />
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.dataUrl} alt={img.caption || "Memory"} className="diary-polaroid-photo" />
                              {img.caption && (
                                <p className="diary-polaroid-caption-view">{img.caption}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Wax seal */}
                    <div className="pl-10 mt-10 flex items-center gap-3">
                      <div
                        className="diary-wax-seal w-9 h-9 rounded-full flex items-center justify-center text-sm"
                        style={{
                          background: "radial-gradient(circle at 35% 35%, #ff8fb0, #c85080)",
                          boxShadow: "0 2px 8px rgba(200,80,120,0.4), inset 0 1px 2px rgba(255,255,255,0.3)",
                        }}
                      >
                        <Heart className="w-4 h-4 text-white" fill="white" />
                      </div>
                      <span
                        className="text-xs"
                        style={{ color: "rgba(168,104,64,0.45)", fontFamily: "var(--font-serif), Georgia, serif" }}
                      >
                        With love
                      </span>
                    </div>

                    <div className="diary-corner-fold" />
                  </div>
                )}

                {/* No note selected */}
                {!isFormOpen && !activeNote && notes.length > 0 && (
                  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 px-8 text-center">
                    <span className="text-4xl opacity-40">📖</span>
                    <p style={{ color: "rgba(168,104,64,0.6)", fontFamily: "var(--font-serif), Georgia, serif" }}>
                      Select a page from the index
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom nav */}
              {!isFormOpen && notes.length > 1 && (
                <div
                  className="flex items-center justify-between px-5 py-2.5 shrink-0"
                  style={{
                    background: "rgba(253,246,233,0.95)",
                    borderTop: "1px solid rgba(147,180,220,0.25)",
                  }}
                >
                  <button
                    onClick={() => openPage(Math.max(0, activeIndex - 1))}
                    disabled={activeIndex === 0}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
                    style={{ color: "var(--diary-text-secondary)", background: "color-mix(in oklab, var(--diary-accent) 12%, transparent)" }}
                  >
                    ← Previous
                  </button>
                  <span
                    className="text-xs"
                    style={{ color: "var(--diary-text-tertiary)", fontFamily: "var(--font-serif), Georgia, serif" }}
                  >
                    {activeIndex + 1} / {notes.length}
                  </span>
                  <button
                    onClick={() => openPage(Math.min(notes.length - 1, activeIndex + 1))}
                    disabled={activeIndex === notes.length - 1}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
                    style={{ color: "var(--diary-text-secondary)", background: "color-mix(in oklab, var(--diary-accent) 12%, transparent)" }}
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
