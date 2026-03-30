"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { WandSparkles, Send, Sparkles, Flower2, Palette, Camera } from "lucide-react";

type CreationMode = "painter" | "assembler" | "transformer";
type Brush = "heartline" | "starfall" | "whisper" | "ember" | "constellation";

interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
  velocity: number;
}

interface SparkleParticle {
  id: string;
  x: number;
  y: number;
}

interface CollageItem {
  id: string;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
}

const COLOR_BOTTLES = [
  { key: "blossom", cssVar: "--color-blossom", label: "Blossom" },
  { key: "peach", cssVar: "--color-peach", label: "Peach" },
  { key: "lilac", cssVar: "--color-lilac-dream", label: "Lilac" },
  { key: "butter", cssVar: "--color-butter", label: "Butter" },
] as const;

const EMOTION_SHELVES = [
  { id: "thinking", label: "I'm thinking of you", stickers: ["💭", "💌", "🌙"] },
  { id: "laugh", label: "Made me laugh today", stickers: ["😂", "🎈", "✨"] },
  { id: "missing", label: "Missing you physically", stickers: ["🥺", "🫂", "💓"] },
  { id: "proud", label: "Proud of you", stickers: ["🏆", "⭐", "🌟"] },
  { id: "nowords", label: "No words, just this", stickers: ["🌸", "🪐", "🕊️"] },
] as const;
type EmotionShelfId = (typeof EMOTION_SHELVES)[number]["id"];

const TRANSFORM_FILTERS = [
  { id: "ghibli", label: "Ghibli Wash", value: "saturate(0.9) contrast(0.9) blur(0.2px)" },
  { id: "neon", label: "Neon Trace", value: "contrast(1.35) saturate(1.25) drop-shadow(0 0 12px var(--accent))" },
  { id: "cartoon", label: "Cartoon Pop", value: "contrast(1.18) saturate(1.35)" },
  { id: "ink", label: "Ink Portrait", value: "grayscale(1) contrast(1.4)" },
  { id: "starlight", label: "Starlight", value: "brightness(1.05) saturate(1.2) drop-shadow(0 0 16px var(--color-lilac-dream))" },
] as const;
type TransformFilterValue = (typeof TRANSFORM_FILTERS)[number]["value"];

const CEREMONY_PARTICLES = ["✨", "💕", "🌸", "⭐", "💫", "🕊️"] as const;

export default function BloomPage() {
  const [mode, setMode] = useState<CreationMode>("painter");
  const [brush, setBrush] = useState<Brush>("heartline");
  const [activeColor, setActiveColor] = useState("var(--color-blossom)");
  const [pouringColor, setPouringColor] = useState<string | null>(null);
  const [sparkles, setSparkles] = useState<SparkleParticle[]>([]);
  const [constellationCount, setConstellationCount] = useState(0);
  const [sendStage, setSendStage] = useState<"idle" | "folding" | "launch" | "done">("idle");
  const [activeShelf, setActiveShelf] = useState<EmotionShelfId>(EMOTION_SHELVES[0].id);
  const [collageItems, setCollageItems] = useState<CollageItem[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [transformFilter, setTransformFilter] = useState<TransformFilterValue>(
    TRANSFORM_FILTERS[0].value,
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const collageIdRef = useRef(0);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<StrokePoint | null>(null);
  const constellationPointsRef = useRef<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = wrap.clientWidth * ratio;
    canvas.height = wrap.clientHeight * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setCollageItems((items) =>
        items.map((item) => {
          if (item.pinned) return item;
          const nextVy = Math.min(item.vy + 0.22, 5.8);
          const nextY = item.y + nextVy;
          const stageBottom = 260;
          if (nextY > stageBottom) {
            return { ...item, y: stageBottom, vy: -nextVy * 0.45, vx: item.vx * 0.85 };
          }
          const nextX = Math.max(6, Math.min(290, item.x + item.vx));
          return { ...item, x: nextX, y: nextY, vy: nextVy, vx: item.vx * 0.98 };
        }),
      );
    }, 16);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion]);

  const activeShelfStickers = useMemo(
    () => EMOTION_SHELVES.find((s) => s.id === activeShelf)?.stickers ?? [],
    [activeShelf],
  );

  const getStrokeWidth = (point: StrokePoint, baseWidth: number) => {
    const pressureFactor = 0.5 + point.pressure * 0.5;
    const velocityFactor = 1 - Math.min(point.velocity / 500, 0.6);
    return Math.max(1, baseWidth * pressureFactor * velocityFactor);
  };

  const resolveCssVarColor = (variableName: string) => {
    if (typeof window === "undefined") return "var(--color-blossom)";
    const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    return value || "var(--color-blossom)";
  };

  function toPoint(e: React.PointerEvent<HTMLCanvasElement>): StrokePoint {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();
    const previous = lastPointRef.current;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    if (!previous) {
      return { x, y, pressure, timestamp: now, velocity: 0 };
    }
    const dt = Math.max(now - previous.timestamp, 1);
    const dx = x - previous.x;
    const dy = y - previous.y;
    const distance = Math.hypot(dx, dy);
    return { x, y, pressure, timestamp: now, velocity: (distance / dt) * 1000 };
  }

  function drawSegment(from: StrokePoint, to: StrokePoint) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const width = getStrokeWidth(to, brush === "whisper" ? 5 : 10);
    ctx.save();
    ctx.lineWidth = width;
    if (brush === "ember") {
      const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      gradient.addColorStop(0, resolveCssVarColor("--color-peach"));
      gradient.addColorStop(1, resolveCssVarColor("--color-blossom"));
      ctx.strokeStyle = gradient;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "var(--accent-glow)";
    } else {
      ctx.strokeStyle = activeColor;
      ctx.shadowBlur = brush === "whisper" ? 10 : 0;
      ctx.shadowColor = brush === "whisper" ? "var(--color-sky-blush)" : "transparent";
      ctx.globalAlpha = brush === "whisper" ? 0.55 : 0.95;
    }
    ctx.beginPath();
    if (brush === "heartline") {
      const cx = (from.x + to.x) / 2;
      const cy = Math.min(from.y, to.y) - 6;
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(cx, cy, to.x, to.y);
    } else {
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function placeConstellationStar(point: StrokePoint) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const points = constellationPointsRef.current;
    const nearby = points.filter((p) => Math.hypot(p.x - point.x, p.y - point.y) < 120);
    ctx.save();
    ctx.strokeStyle = resolveCssVarColor("--color-lilac-dream");
    ctx.lineWidth = 1.2;
    nearby.forEach((p) => {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    });
    ctx.fillStyle = resolveCssVarColor("--color-butter");
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    points.push({ x: point.x, y: point.y });
    setConstellationCount(points.length);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = toPoint(e);
    if (brush === "constellation") {
      placeConstellationStar(point);
      return;
    }
    isDrawingRef.current = true;
    lastPointRef.current = point;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const point = toPoint(e);
    const previous = lastPointRef.current;
    if (previous) drawSegment(previous, point);
    if (brush === "starfall") {
      const id = `sparkle-${performance.now()}`;
      setSparkles((items) => [...items, { id, x: point.x, y: point.y }].slice(-28));
      window.setTimeout(() => {
        setSparkles((items) => items.filter((item) => item.id !== id));
      }, 1400);
    }
    lastPointRef.current = point;
  }

  function endStroke() {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    constellationPointsRef.current = [];
    setConstellationCount(0);
  }

  function chooseColor(colorCssVarName: string) {
    const resolved = resolveCssVarColor(colorCssVarName);
    setActiveColor(resolved);
    setPouringColor(`var(${colorCssVarName})`);
    window.setTimeout(() => setPouringColor(null), 350);
  }

  function triggerSendCeremony() {
    if (prefersReducedMotion) {
      setSendStage("done");
      window.setTimeout(() => setSendStage("idle"), 1900);
      return;
    }
    setSendStage("folding");
    window.setTimeout(() => setSendStage("launch"), 440);
    window.setTimeout(() => setSendStage("done"), 1060);
    window.setTimeout(() => setSendStage("idle"), 2600);
  }

  function addCollageSticker(emoji: string) {
    collageIdRef.current += 1;
    const index = collageIdRef.current;
    const id = `${emoji}-${index}`;
    setCollageItems((items) => [
      ...items,
      {
        id,
        emoji,
        x: 30 + ((index * 37) % 220),
        y: 10,
        vx: prefersReducedMotion ? 0 : ((index % 7) - 3) * 0.2,
        vy: prefersReducedMotion ? 0 : 0.8,
        pinned: false,
      },
    ]);
  }

  function togglePin(itemId: string) {
    setCollageItems((items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, pinned: !item.pinned, vx: 0, vy: 0 } : item,
      ),
    );
  }

  function shakeCollage() {
    if (prefersReducedMotion) return;
    setCollageItems((items) =>
      items.map((item, index) => ({
        ...item,
        vx: ((index % 5) - 2) * 0.9,
        vy: -2.2 - (index % 3) * 0.4,
      })),
    );
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextPreview = URL.createObjectURL(file);
    setImagePreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return nextPreview;
    });
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-[color:var(--foreground)]">
          Bloom Studio 🌸
        </h1>
        <p className="text-sm text-[color:var(--text-soft)] mt-1">
          Make something that could only exist for the two of you, right now.
        </p>
      </div>

      <div className="glass-card p-2 rounded-2xl mb-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "painter", icon: Palette, label: "Painter" },
            { id: "assembler", icon: Flower2, label: "Assembler" },
            { id: "transformer", icon: Camera, label: "Transformer" },
          ].map((entry) => {
            const active = mode === entry.id;
            const Icon = entry.icon;
            return (
              <button
                key={entry.id}
                onClick={() => setMode(entry.id as CreationMode)}
                className={`rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  active
                    ? "bg-[color:var(--accent)] text-white shadow-[0_0_22px_var(--accent-glow)]"
                    : "text-[color:var(--text-soft)] hover:text-[color:var(--foreground)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {entry.label}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "painter" && (
        <section className="space-y-4">
          <div className="glass-card p-4 rounded-2xl">
            <div className="relative">
              {pouringColor && (
                <div
                  className="bloom-pour-overlay"
                  style={{ ["--bloom-pour-color" as string]: pouringColor }}
                />
              )}
              <div
                ref={wrapRef}
                className="relative overflow-hidden rounded-2xl border border-[color:var(--border)] bloom-parchment h-[340px] md:h-[420px]"
              >
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 touch-none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endStroke}
                  onPointerCancel={endStroke}
                />
                {sparkles.map((sparkle) => (
                  <span
                    key={sparkle.id}
                    className="bloom-starfall"
                    style={{ left: sparkle.x, top: sparkle.y }}
                  >
                    ✨
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(["heartline", "starfall", "whisper", "ember", "constellation"] as const).map(
                (currentBrush) => (
                  <button
                    key={currentBrush}
                    onClick={() => setBrush(currentBrush)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      brush === currentBrush
                        ? "bg-[color:var(--color-lilac-dream)] text-[color:var(--dark-void)]"
                        : "border border-[color:var(--border)] text-[color:var(--text-soft)]"
                    }`}
                  >
                    {currentBrush}
                  </button>
                ),
              )}
              <button
                onClick={clearCanvas}
                className="ml-auto px-3 py-1.5 rounded-full text-xs border border-[color:var(--border)] text-[color:var(--text-soft)]"
              >
                Clear
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 overflow-x-auto">
              {COLOR_BOTTLES.map((bottle) => (
                <button
                  key={bottle.key}
                  onClick={() => chooseColor(bottle.cssVar)}
                  className="shrink-0 w-10 h-10 rounded-full border border-[color:var(--border)] relative"
                  aria-label={`Pick ${bottle.label} paint`}
                  style={{ background: `var(${bottle.cssVar})` }}
                />
              ))}
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[color:var(--foreground)] font-semibold">Send Ceremony</p>
                <p className="text-xs text-[color:var(--text-soft)]">
                  {constellationCount > 5
                    ? `Name this constellation before sending ✨ (${constellationCount} stars)`
                    : "Fold it into a tiny love note and launch it"}
                </p>
              </div>
              <button
                onClick={triggerSendCeremony}
                className="px-4 py-2 rounded-full bg-[color:var(--color-blossom)] text-white text-sm font-semibold flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send to her 💕
              </button>
            </div>

            <div className="relative mt-4 h-28 rounded-xl border border-[color:var(--border)] overflow-hidden bg-[color:var(--surface-2)]/40">
              {CEREMONY_PARTICLES.map((particle, index) => (
                <span
                  key={particle + index}
                  className={`bloom-send-particle ${sendStage === "launch" ? "bloom-send-particle-active" : ""}`}
                  style={{ left: `${12 + index * 14}%` }}
                >
                  {particle}
                </span>
              ))}
              <div
                className={`bloom-send-card ${
                  sendStage === "folding"
                    ? "bloom-send-card-fold"
                    : sendStage === "launch"
                      ? "bloom-send-card-launch"
                      : ""
                }`}
              >
                <Sparkles className="w-5 h-5 text-[color:var(--color-butter)]" />
              </div>
              {sendStage === "done" && (
                <p className="absolute inset-x-0 bottom-3 text-center text-xs text-[color:var(--text-soft)]">
                  Landed softly on her screen. Archived in Bloom 🌸
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {mode === "assembler" && (
        <section className="glass-card p-4 rounded-2xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm font-semibold text-[color:var(--foreground)]">Emotion Shelves</p>
            <button
              onClick={shakeCollage}
              className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--border)] text-[color:var(--text-soft)]"
            >
              Shake snow globe
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {EMOTION_SHELVES.map((shelf) => (
              <button
                key={shelf.id}
                onClick={() => setActiveShelf(shelf.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs ${
                  activeShelf === shelf.id
                    ? "bg-[color:var(--color-peach)] text-[color:var(--dark-void)]"
                    : "border border-[color:var(--border)] text-[color:var(--text-soft)]"
                }`}
              >
                {shelf.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            {activeShelfStickers.map((sticker) => (
              <button
                key={sticker}
                onClick={() => addCollageSticker(sticker)}
                className="w-10 h-10 rounded-full border border-[color:var(--border)] text-xl"
              >
                {sticker}
              </button>
            ))}
          </div>

          <div className="mt-4 relative h-[300px] rounded-2xl border border-[color:var(--border)] overflow-hidden bloom-parchment">
            {collageItems.map((item) => (
              <button
                key={item.id}
                onClick={() => togglePin(item.id)}
                className="absolute text-2xl transition-transform"
                style={{ left: item.x, top: item.y }}
                aria-label={`${item.pinned ? "Unpin" : "Pin"} ${item.emoji}`}
              >
                {item.emoji}
              </button>
            ))}
            {collageItems.length === 0 && (
              <div className="h-full grid place-items-center text-center px-6">
                <p className="text-sm text-[color:var(--text-soft)] leading-relaxed">
                  Tap an emotion sticker above and watch it drift into your shared scene ✨
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {mode === "transformer" && (
        <section className="glass-card p-4 rounded-2xl">
          <div className="mb-3">
            <p className="text-sm font-semibold text-[color:var(--foreground)]">Photo to Art</p>
            <p className="text-xs text-[color:var(--text-soft)]">
              Upload one memory and reimagine it with tonight&apos;s artistic style.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[color:var(--color-lilac-dream)] text-[color:var(--dark-void)] text-sm font-semibold">
            <Camera className="w-4 h-4" />
            Choose photo
            <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
          </label>

          <div className="mt-3 flex gap-2 overflow-x-auto">
            {TRANSFORM_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setTransformFilter(filter.value)}
                className={`px-3 py-1.5 rounded-full text-xs ${
                  transformFilter === filter.value
                    ? "bg-[color:var(--color-blossom)] text-white"
                    : "border border-[color:var(--border)] text-[color:var(--text-soft)]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-[color:var(--border)] min-h-[280px] flex items-center justify-center overflow-hidden bg-[color:var(--surface-2)]/35">
            {imagePreview ? (
              <Image
                src={imagePreview}
                alt="Preview for sticker transform"
                width={320}
                height={320}
                unoptimized
                style={{ filter: transformFilter }}
                className="rounded-xl object-cover"
              />
            ) : (
              <p className="text-sm text-[color:var(--text-soft)] px-6 text-center">
                A tiny gallery moment is waiting — add a photo and choose a dreamy filter.
              </p>
            )}
          </div>
        </section>
      )}

      <div className="mt-4 text-xs text-[color:var(--text-whisper)] flex items-center gap-2">
        <WandSparkles className="w-3.5 h-3.5" />
        Bloom archives every send with date + mood, so your art becomes your timeline.
      </div>
    </div>
  );
}
