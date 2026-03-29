"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Plus, Edit3, Trash2, Save, X } from "lucide-react";
import type { SharedNote } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

export default function NotesPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [notes, setNotes] = useState<SharedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const loadNotes = useCallback(async () => {
    const res = await fetch("/api/notes?limit=50");
    const json = (await res.json()) as { data?: { notes: SharedNote[] } };
    if (json.data?.notes) setNotes(json.data.notes);
  }, []);

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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shared_notes",
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          loadNotes();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [coupleId, supabase, loadNotes]);

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setTitle("");
    setContent("");
  }

  function startEdit(note: SharedNote) {
    setCreating(false);
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
  }

  function cancelEdit() {
    setCreating(false);
    setEditingId(null);
    setTitle("");
    setContent("");
  }

  async function saveNote() {
    if (!coupleId || !userId || !title.trim()) return;
    setSaving(true);

    if (creating) {
      await supabase.from("shared_notes").insert({
        couple_id: coupleId,
        author_id: userId,
        title: title.trim(),
        content: content.trim(),
      });
    } else if (editingId) {
      await supabase
        .from("shared_notes")
        .update({
          title: title.trim(),
          content: content.trim(),
        })
        .eq("id", editingId);
    }

    setSaving(false);
    cancelEdit();
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("shared_notes").delete().eq("id", id);
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-full p-20">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );

  const isFormOpen = creating || !!editingId;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">Shared Diary</h1>
          </div>
          <p className="text-purple-300/50 text-sm">
            Write together. Feel together. 📖
          </p>
        </div>
        {!isFormOpen && (
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm hover:bg-purple-500 transition-all"
          >
            <Plus className="w-4 h-4" />
            New entry
          </button>
        )}
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="glass-card p-6 mb-6">
          <h3 className="text-sm font-medium text-purple-400/70 mb-4 uppercase tracking-wider">
            {creating ? "New Diary Entry" : "Edit Entry"}
          </h3>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title… (e.g. Today I felt…)"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-purple-300/30 text-sm focus:outline-none focus:border-purple-500/50 mb-3"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's in your heart today?…"
            rows={6}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-purple-500/20 text-white placeholder-purple-300/30 text-sm focus:outline-none focus:border-purple-500/50 resize-none mb-4"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-purple-300/60 hover:text-purple-300 text-sm transition-colors"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
            <button
              onClick={saveNote}
              disabled={!title.trim() || saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm hover:bg-purple-500 disabled:opacity-40 transition-all"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 && !isFormOpen && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📖</div>
          <p className="text-purple-300/50 text-sm mb-4">
            Your shared diary is empty. Write your first entry.
          </p>
          <button
            onClick={startCreate}
            className="px-6 py-2.5 rounded-full bg-purple-600 text-white text-sm hover:bg-purple-500 transition-all"
          >
            Write now ✍️
          </button>
        </div>
      )}

      <div className="space-y-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className="glass-card p-5 hover:border-purple-500/30 transition-all"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {note.author_id === userId ? "✍️" : "💜"}
                </span>
                <h3 className="font-semibold text-white">{note.title}</h3>
              </div>
              {note.author_id === userId && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(note)}
                    className="p-1.5 rounded-lg text-purple-400/40 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            {note.content && (
              <p className="text-purple-200/70 text-sm leading-relaxed whitespace-pre-wrap">
                {note.content}
              </p>
            )}
            <p className="text-purple-400/30 text-xs mt-3">
              {note.author_id === userId ? "You" : "Her"} ·{" "}
              {formatDistanceToNow(new Date(note.updated_at), {
                addSuffix: true,
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
