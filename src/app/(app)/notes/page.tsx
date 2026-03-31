"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit3, Trash2, Save, X, Feather, Heart, BookMarked } from "lucide-react";
import type { SharedNote } from "@/types/database";
import { format, formatDistanceToNow } from "date-fns";

/* ── Spiral rings ─────────────────────────────────── */
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

/* ── Month label colours for index tabs ──────────── */
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
    setShowCoverPage(false);
    window.setTimeout(() => titleRef.current?.focus(), 80);
  }

  function startEdit(note: SharedNote) {
    setCreating(false);
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    window.setTimeout(() => titleRef.current?.focus(), 80);
  }

  function cancelEdit() {
    setCreating(false);
    setEditingId(null);
    setTitle("");
    setContent("");
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
        if (!res.ok) {
          const json = (await res.json()) as { error?: { message?: string } };
          setErrorMessage(json.error?.message ?? "Failed to create note");
          return;
        }
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

  /* ── Table of contents items ─────────────────── */
  const tocItems = notes.map((n, i) => ({
    note: n,
    index: i,
    color: TAB_COLORS[i % TAB_COLORS.length],
    isOwn: n.author_id === userId,
  }));

  /* ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen p-3 sm:p-5 lg:p-8 flex items-start justify-center">
      {/* Outer diary book container */}
      <div
        className="w-full max-w-5xl"
        style={{ perspective: "1400px" }}
      >
        {/* ── Book cover opening ──────────────────── */}
        {showCoverPage && (
          <div
            className="diary-cover rounded-2xl overflow-hidden cursor-pointer group"
            style={{ minHeight: 360 }}
            onClick={() => setShowCoverPage(false)}
          >
            <div className="relative z-10 flex flex-col items-center justify-center min-h-[360px] gap-6 px-8 py-10">
              {/* Embossed title */}
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

              {/* Decorative border lines */}
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
                className="mt-2 px-8 py-3 rounded-full text-sm font-semibold transition-all
                  group-hover:scale-105 active:scale-95"
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

        {/* ── Main diary book layout ────────────────── */}
        {!showCoverPage && (
          <div
            className="flex rounded-2xl overflow-hidden"
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.2)",
              minHeight: "min(85vh, 780px)",
            }}
          >
            {/* LEFT PANEL: Spiral + TOC ──────────── */}
            <div
              className="flex shrink-0"
              style={{
                background: "linear-gradient(180deg, #3d2b1f 0%, #2a1c12 100%)",
                width: "clamp(200px, 28%, 280px)",
              }}
            >
              {/* Spiral binding */}
              <SpiralBindings />

              {/* TOC Panel */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* TOC header */}
                <div className="px-3 pt-4 pb-3 border-b border-amber-900/30">
                  <div className="flex items-center gap-2 mb-0.5">
                    <BookMarked className="w-3.5 h-3.5 text-amber-400/70" />
                    <span className="text-xs font-bold text-amber-300/70 tracking-widest uppercase">
                      Index
                    </span>
                  </div>
                </div>

                {/* New entry button */}
                <div className="px-3 pt-3 pb-2">
                  <button
                    onClick={startCreate}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,107,157,0.22), rgba(255,107,157,0.08))",
                      border: "1px solid rgba(255,107,157,0.35)",
                      color: "#ffb3cf",
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Entry
                  </button>
                </div>

                {/* TOC entries */}
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
                          activeIndex === index && !isFormOpen
                            ? "diary-toc-item-active"
                            : ""
                        }`}
                        style={{
                          background:
                            activeIndex === index && !isFormOpen
                              ? `linear-gradient(135deg, ${color}22, ${color}10)`
                              : "transparent",
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
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Cover button */}
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

            {/* RIGHT PANEL: Page content ──────────── */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Page top strip with decorative header */}
              <div
                className="flex items-center justify-between px-5 py-3 shrink-0"
                style={{
                  background: "linear-gradient(180deg, rgba(253,246,233,0.97), rgba(253,246,233,0.90))",
                  borderBottom: "1px solid rgba(147,180,220,0.3)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Feather className="w-4 h-4" style={{ color: "#c89060" }} />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "#6b3f20", fontFamily: "var(--font-serif), Georgia, serif" }}
                  >
                    Shared Diary
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {errorMessage && (
                    <span className="text-xs text-red-500/80">{errorMessage}</span>
                  )}
                  {/* Page number */}
                  {!isFormOpen && activeNote && (
                    <span
                      className="text-xs"
                      style={{ color: "#b89070", fontFamily: "var(--font-serif), Georgia, serif" }}
                    >
                      p. {activeIndex + 1}
                    </span>
                  )}
                </div>
              </div>

              {/* Actual page area */}
              <div className="flex-1 overflow-y-auto relative diary-paper diary-page-shadow">
                {/* ── Empty state ── */}
                {notes.length === 0 && !isFormOpen && (
                  <div className="flex flex-col items-center justify-center min-h-[400px] gap-5 px-8">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(200,144,96,0.12)", border: "2px dashed rgba(200,144,96,0.3)" }}
                    >
                      <Feather className="w-9 h-9" style={{ color: "#c89060", opacity: 0.6 }} />
                    </div>
                    <div className="text-center">
                      <p
                        className="text-xl font-semibold mb-1"
                        style={{ color: "#6b3f20", fontFamily: "var(--font-serif), Georgia, serif" }}
                      >
                        Your diary is empty
                      </p>
                      <p
                        className="text-sm leading-relaxed max-w-xs text-center"
                        style={{ color: "#c89060", fontFamily: "var(--font-accent), cursive", fontSize: "1rem" }}
                      >
                        Write your first entry and begin your shared story…
                      </p>
                    </div>
                    <button
                      onClick={startCreate}
                      className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                      style={{
                        background: "linear-gradient(135deg, #c89060, #a06840)",
                        color: "#fff8f0",
                        boxShadow: "0 4px 14px rgba(168,104,64,0.35)",
                      }}
                    >
                      Write now ✍️
                    </button>
                  </div>
                )}

                {/* ── New / Edit form ── */}
                {isFormOpen && (
                  <div
                    key="form"
                    className="diary-page-enter relative p-6 sm:p-8 min-h-[480px]"
                  >
                    {/* Red margin line */}
                    <div
                      className="absolute left-[52px] top-0 bottom-0 w-[1.5px] pointer-events-none"
                      style={{ background: "rgba(255,107,157,0.35)" }}
                    />

                    {/* Section label */}
                    <p
                      className="text-xs font-bold tracking-widest uppercase mb-5 pl-10"
                      style={{ color: "#c89060", fontFamily: "var(--font-serif), Georgia, serif" }}
                    >
                      {creating ? "New Entry" : "Edit Entry"}
                    </p>

                    {/* Title */}
                    <div className="pl-10 mb-1">
                      <input
                        ref={titleRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Give this page a title…"
                        className="w-full bg-transparent border-0 border-b-2 outline-none pb-1 text-lg font-semibold placeholder:font-normal transition-colors"
                        style={{
                          borderColor: title ? "rgba(200,144,96,0.6)" : "rgba(200,144,96,0.25)",
                          color: "#3d1e0a",
                          fontFamily: "var(--font-serif), Georgia, serif",
                          caretColor: "#c89060",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,144,96,0.9)")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = title ? "rgba(200,144,96,0.6)" : "rgba(200,144,96,0.25)")}
                      />
                    </div>

                    {/* Date stamp */}
                    <div className="pl-10 mb-5">
                      <span
                        className="diary-date-stamp text-xs"
                        style={{ color: "rgba(200,144,96,0.6)", borderColor: "rgba(200,144,96,0.3)" }}
                      >
                        {format(new Date(), "MMMM d, yyyy")}
                      </span>
                    </div>

                    {/* Content textarea */}
                    <div className="pl-10 relative">
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Dear diary… what happened today?"
                        rows={12}
                        className="w-full bg-transparent border-0 outline-none resize-none leading-8 text-sm"
                        style={{
                          lineHeight: "32px",
                          color: "#3d1e0a",
                          fontFamily: "var(--font-accent), cursive",
                          fontSize: "1rem",
                          caretColor: "#c89060",
                        }}
                      />
                    </div>

                    {/* Actions */}
                    <div className="pl-10 mt-6 flex items-center gap-3">
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

                {/* ── View a note ── */}
                {!isFormOpen && activeNote && (
                  <div
                    key={`note-${flipKey}`}
                    className="diary-page-enter relative p-6 sm:p-8 min-h-[480px]"
                  >
                    {/* Red margin line */}
                    <div
                      className="absolute left-[52px] top-0 bottom-0 w-[1.5px] pointer-events-none"
                      style={{ background: "rgba(255,107,157,0.35)" }}
                    />

                    {/* Author badge + actions */}
                    <div className="pl-10 mb-3 flex items-center justify-between">
                      <span
                        className="text-xs font-bold tracking-widest uppercase"
                        style={{ color: "#c89060", fontFamily: "var(--font-serif), Georgia, serif" }}
                      >
                        {activeNote.author_id === userId ? "Your Entry" : "Their Entry"}
                      </span>
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
                      style={{ color: "#3d1e0a", fontFamily: "var(--font-serif), Georgia, serif" }}
                    >
                      {activeNote.title}
                    </h2>

                    {/* Date stamp */}
                    <div className="pl-10 mb-6">
                      <span
                        className="diary-date-stamp text-xs"
                        style={{ color: "rgba(200,144,96,0.65)", borderColor: "rgba(200,144,96,0.3)" }}
                      >
                        {format(new Date(activeNote.updated_at), "MMMM d, yyyy")}
                      </span>
                      <span
                        className="ml-3 text-xs"
                        style={{ color: "rgba(168,104,64,0.5)", fontFamily: "var(--font-serif), Georgia, serif" }}
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
                            color: "#3d1e0a",
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
                        style={{ color: "rgba(168,104,64,0.4)", fontFamily: "var(--font-accent), cursive" }}
                      >
                        (No words today — sometimes feelings are beyond writing)
                      </p>
                    )}

                    {/* Wax seal / signing mark */}
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

                    {/* Corner fold */}
                    <div className="diary-corner-fold" />
                  </div>
                )}

                {/* ── No note selected (notes exist but none selected) ── */}
                {!isFormOpen && !activeNote && notes.length > 0 && (
                  <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 px-8 text-center">
                    <span className="text-4xl opacity-40">📖</span>
                    <p style={{ color: "rgba(168,104,64,0.6)", fontFamily: "var(--font-serif), Georgia, serif" }}>
                      Select a page from the index
                    </p>
                  </div>
                )}
              </div>

              {/* Bottom nav strip */}
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
                    style={{ color: "#a06840", background: "rgba(200,144,96,0.12)" }}
                  >
                    ← Previous
                  </button>
                  <span
                    className="text-xs"
                    style={{ color: "rgba(168,104,64,0.5)", fontFamily: "var(--font-serif), Georgia, serif" }}
                  >
                    {activeIndex + 1} / {notes.length}
                  </span>
                  <button
                    onClick={() => openPage(Math.min(notes.length - 1, activeIndex + 1))}
                    disabled={activeIndex === notes.length - 1}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all disabled:opacity-30 hover:scale-105 active:scale-95"
                    style={{ color: "#a06840", background: "rgba(200,144,96,0.12)" }}
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
