"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  WandSparkles, Send, Sparkles, Flower2, Palette, Camera,
  Eraser, RotateCcw, Shuffle, Zap,
} from "lucide-react";
import {
  vibrateCelebrate,
  vibratePress,
  vibrateSuccess,
  vibrateTap,
} from "@/lib/haptics";

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
  { key: "blossom", cssVar: "--color-blossom", label: "Blossom", hex: "#ff6b9d" },
  { key: "peach", cssVar: "--color-peach", label: "Peach", hex: "#ffab76" },
  { key: "lilac", cssVar: "--color-lilac-dream", label: "Lilac", hex: "#c8b6e2" },
  { key: "butter", cssVar: "--color-butter", label: "Butter", hex: "#fff3b0" },
  { key: "mint", cssVar: "--color-mint-kiss", label: "Mint", hex: "#b8f0c8" },
  { key: "sky", cssVar: "--color-sky-blush", label: "Sky", hex: "#b8e3ff" },
] as const;

const EMOTION_SHELVES = [
  { id: "thinking", label: "Thinking of you", stickers: ["💭", "💌", "🌙"] },
  { id: "laugh", label: "Made me laugh", stickers: ["😂", "🎈", "✨"] },
  { id: "missing", label: "Missing you", stickers: ["🥺", "🫂", "💓"] },
  { id: "proud", label: "So proud of you", stickers: ["🏆", "⭐", "🌟"] },
  { id: "nowords", label: "No words…", stickers: ["🌸", "🪐", "🕊️"] },
] as const;
type EmotionShelfId = (typeof EMOTION_SHELVES)[number]["id"];

const TRANSFORM_FILTERS = [
  { id: "ghibli", label: "🌿 Ghibli", value: "saturate(0.9) contrast(0.9) blur(0.2px)" },
  { id: "neon", label: "⚡ Neon", value: "contrast(1.35) saturate(1.25) drop-shadow(0 0 12px var(--accent))" },
  { id: "cartoon", label: "🎨 Cartoon", value: "contrast(1.18) saturate(1.35)" },
  { id: "ink", label: "🖋 Ink", value: "grayscale(1) contrast(1.4)" },
  { id: "starlight", label: "✨ Starlight", value: "brightness(1.05) saturate(1.2) drop-shadow(0 0 16px var(--color-lilac-dream))" },
  { id: "golden", label: "🌅 Golden", value: "sepia(0.4) saturate(1.3) brightness(1.05)" },
] as const;
type TransformFilterValue = (typeof TRANSFORM_FILTERS)[number]["value"];

const CEREMONY_PARTICLES = ["✨", "💕", "🌸", "⭐", "💫", "🕊️"] as const;

const BRUSH_META: Record<Brush, { icon: string; tip: string }> = {
  heartline: { icon: "🩷", tip: "Curves with heart" },
  starfall: { icon: "⭐", tip: "Leaves sparkles" },
  whisper: { icon: "🌫️", tip: "Soft & dreamy" },
  ember: { icon: "🔥", tip: "Warm gradient" },
  constellation: { icon: "✦", tip: "Connect the stars" },
};

const BRUSH_ORDER: Brush[] = ["heartline", "starfall", "whisper", "ember", "constellation"];

function normalizeHexColor(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "#ff6b9d";
  if (trimmed.startsWith("#") && (trimmed.length === 7 || trimmed.length === 4)) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return trimmed;
  }
  const rgb = trimmed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgb) {
    const red = Number(rgb[1]).toString(16).padStart(2, "0");
    const green = Number(rgb[2]).toString(16).padStart(2, "0");
    const blue = Number(rgb[3]).toString(16).padStart(2, "0");
    return `#${red}${green}${blue}`;
  }
  return "#ff6b9d";
}

function rgbToHex(red: number, green: number, blue: number): string {
  return `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue
    .toString(16)
    .padStart(2, "0")}`;
}

export default function BloomPage() {
  const [mode, setMode] = useState<CreationMode>("painter");
  const [brush, setBrush] = useState<Brush>("heartline");
  const [carouselCenterIndex, setCarouselCenterIndex] = useState(0);
  const [brushSize, setBrushSize] = useState(10);
  const [eraserMode, setEraserMode] = useState(false);
  const [activeColor, setActiveColor] = useState("var(--color-blossom)");
  const [activeColorHex, setActiveColorHex] = useState("#ff6b9d");
  const [gradientMode, setGradientMode] = useState(false);
  const [gradientStops, setGradientStops] = useState<string[]>(["#ff6b9d", "#c8b6e2", "#b8e3ff"]);
  const [memorySampleLabel, setMemorySampleLabel] = useState<string | null>(null);
  const [pouringColor, setPouringColor] = useState<string | null>(null);
  const [sparkles, setSparkles] = useState<SparkleParticle[]>([]);
  const [constellationCount, setConstellationCount] = useState(0);
  const [constellationName, setConstellationName] = useState("");
  const [showConstellationNamer, setShowConstellationNamer] = useState(false);
  const [sendStage, setSendStage] = useState<"idle" | "folding" | "launch" | "done">("idle");
  const [activeShelf, setActiveShelf] = useState<EmotionShelfId>(EMOTION_SHELVES[0].id);
  const [collageItems, setCollageItems] = useState<CollageItem[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [transformFilter, setTransformFilter] = useState<TransformFilterValue>(TRANSFORM_FILTERS[0].value);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [partnerActive, setPartnerActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const colorSampleInputRef = useRef<HTMLInputElement | null>(null);
  const collageIdRef = useRef(0);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<StrokePoint | null>(null);
  const constellationPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const carouselDragStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    function onPartnerState(event: Event) {
      setPartnerActive(Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active));
    }
    window.addEventListener("usverse:partner-active", onPartnerState as EventListener);
    return () => window.removeEventListener("usverse:partner-active", onPartnerState as EventListener);
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

  const moodColorSuggestion = useMemo(() => {
    const hour = new Date().getHours();
    if (partnerActive) {
      return {
        cssVar: "--color-blossom",
        hex: "#ff6b9d",
        line: "She is here now. Bloom in pink warmth.",
      };
    }
    if (hour < 11) {
      return {
        cssVar: "--color-butter",
        hex: "#fff3b0",
        line: "Morning light feels soft. Try sun-butter yellow.",
      };
    }
    if (hour < 17) {
      return {
        cssVar: "--color-mint-kiss",
        hex: "#b8f0c8",
        line: "Daylight energy: mint keeps things airy.",
      };
    }
    if (hour < 22) {
      return {
        cssVar: "--color-peach",
        hex: "#ffab76",
        line: "Golden-hour mood. Peach feels like a voice note hug.",
      };
    }
    return {
      cssVar: "--color-lilac-dream",
      hex: "#c8b6e2",
      line: "Late-night calm. Lilac turns strokes into whispers.",
    };
  }, [partnerActive]);

  useEffect(() => {
    const index = BRUSH_ORDER.indexOf(brush);
    if (index >= 0) {
      setCarouselCenterIndex(index);
    }
  }, [brush]);

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
    if (!previous) return { x, y, pressure, timestamp: now, velocity: 0 };
    const dt = Math.max(now - previous.timestamp, 1);
    const dx = x - previous.x;
    const dy = y - previous.y;
    const distance = Math.hypot(dx, dy);
    return { x, y, pressure, timestamp: now, velocity: (distance / dt) * 1000 };
  }

  function drawSegment(from: StrokePoint, to: StrokePoint) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    if (eraserMode) {
      const width = brushSize * 2.5;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
      return;
    }
    const width = getStrokeWidth(to, brush === "whisper" ? 5 : brushSize);
    ctx.save();
    ctx.lineWidth = width;
    if (brush === "ember") {
      const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      gradient.addColorStop(0, resolveCssVarColor("--color-peach"));
      gradient.addColorStop(1, resolveCssVarColor("--color-blossom"));
      ctx.strokeStyle = gradient;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "var(--accent-glow)";
    } else if (gradientMode) {
      const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      const lastIndex = Math.max(gradientStops.length - 1, 1);
      gradientStops.forEach((stop, index) => {
        gradient.addColorStop(index / lastIndex, stop);
      });
      ctx.strokeStyle = gradient;
      ctx.shadowBlur = brush === "whisper" ? 8 : 2;
      ctx.shadowColor = gradientStops[0] ?? activeColor;
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
    if (points.length >= 7 && !showConstellationNamer && !constellationName) {
      setShowConstellationNamer(true);
      vibrateTap();
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    vibrateTap();
    const point = toPoint(e);
    if (!eraserMode && brush === "constellation") {
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
    if (!eraserMode && brush === "starfall") {
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
    setConstellationName("");
    setShowConstellationNamer(false);
    vibratePress();
  }

  function chooseColor(colorCssVarName: string, hex: string) {
    const resolved = resolveCssVarColor(colorCssVarName);
    setActiveColor(resolved);
    setActiveColorHex(normalizeHexColor(hex));
    setEraserMode(false);
    setGradientMode(false);
    setMemorySampleLabel(null);
    setPouringColor(`var(${colorCssVarName})`);
    vibrateTap();
    window.setTimeout(() => setPouringColor(null), 350);
  }

  function applyGradientPreset() {
    setGradientStops(["#ff6b9d", "#c8b6e2", "#b8e3ff"]);
    setGradientMode(true);
    setEraserMode(false);
    setMemorySampleLabel(null);
    setPouringColor("linear-gradient(180deg, #ff6b9d, #c8b6e2, #b8e3ff)");
    vibratePress();
    window.setTimeout(() => setPouringColor(null), 350);
  }

  async function sampleMemoryColor(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("image-load-failed"));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let redTotal = 0;
      let greenTotal = 0;
      let blueTotal = 0;
      let count = 0;
      for (let index = 0; index < data.length; index += 4) {
        redTotal += data[index] ?? 0;
        greenTotal += data[index + 1] ?? 0;
        blueTotal += data[index + 2] ?? 0;
        count += 1;
      }
      if (!count) return;
      const sampledHex = rgbToHex(
        Math.round(redTotal / count),
        Math.round(greenTotal / count),
        Math.round(blueTotal / count),
      );
      setActiveColor(sampledHex);
      setActiveColorHex(sampledHex);
      setMemorySampleLabel("Memory sampled");
      setGradientMode(false);
      setEraserMode(false);
      setPouringColor(sampledHex);
      vibrateSuccess();
      window.setTimeout(() => setPouringColor(null), 350);
    } catch {
      // Keep calm if sampling fails; user can retry instantly.
    } finally {
      URL.revokeObjectURL(url);
      event.target.value = "";
    }
  }

  function applyMoodColor() {
    chooseColor(moodColorSuggestion.cssVar, moodColorSuggestion.hex);
    setMemorySampleLabel("Mood matched");
  }

  function triggerSendCeremony() {
    vibratePress();
    window.dispatchEvent(
      new CustomEvent("usverse:notification-drop", {
        detail: { x: 0.88, y: 0.16 },
      }),
    );
    if (prefersReducedMotion) {
      setSendStage("done");
      vibrateSuccess();
      window.setTimeout(() => setSendStage("idle"), 1900);
      return;
    }
    setSendStage("folding");
    window.setTimeout(() => setSendStage("launch"), 440);
    window.setTimeout(() => {
      setSendStage("done");
      vibrateCelebrate();
      window.dispatchEvent(
        new CustomEvent("usverse:emotion", {
          detail: { kind: "missing_you" },
        }),
      );
      const AudioCtor = window.AudioContext;
      if (AudioCtor) {
        const audioContext = new AudioCtor();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(740, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(980, audioContext.currentTime + 0.28);
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.06, audioContext.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.4);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.4);
        window.setTimeout(() => {
          void audioContext.close();
        }, 520);
      }
    }, 1060);
    window.setTimeout(() => setSendStage("idle"), 2600);
  }

  function selectBrush(nextBrush: Brush) {
    setBrush(nextBrush);
    setEraserMode(false);
    vibrateTap();
  }

  function rotateCarousel(direction: -1 | 1) {
    setCarouselCenterIndex((previous) => {
      const next = (previous + direction + BRUSH_ORDER.length) % BRUSH_ORDER.length;
      selectBrush(BRUSH_ORDER[next] ?? "heartline");
      return next;
    });
  }

  function onCarouselPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    carouselDragStartXRef.current = event.clientX;
  }

  function onCarouselPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (carouselDragStartXRef.current === null) return;
    const delta = event.clientX - carouselDragStartXRef.current;
    if (Math.abs(delta) < 32) return;
    rotateCarousel(delta > 0 ? -1 : 1);
    carouselDragStartXRef.current = event.clientX;
  }

  function onCarouselPointerUp() {
    carouselDragStartXRef.current = null;
  }

  function addCollageSticker(emoji: string) {
    collageIdRef.current += 1;
    const index = collageIdRef.current;
    const id = `${emoji}-${index}`;
    vibrateTap();
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
    vibrateTap();
    setCollageItems((items) =>
      items.map((item) =>
        item.id === itemId ? { ...item, pinned: !item.pinned, vx: 0, vy: 0 } : item,
      ),
    );
  }

  function shakeCollage() {
    if (prefersReducedMotion) return;
    vibratePress();
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
    vibrateTap();
    const nextPreview = URL.createObjectURL(file);
    setImagePreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return nextPreview;
    });
  }

  function saveConstellationName() {
    if (!constellationName.trim()) return;
    setShowConstellationNamer(false);
    vibrateSuccess();
  }

  /* ── Mode metadata ─────────────────────────────────── */
  const modes = [
    {
      id: "painter" as const,
      icon: Palette,
      label: "Painter",
      emoji: "🎨",
      tagline: "Draw with love",
    },
    {
      id: "assembler" as const,
      icon: Flower2,
      label: "Assembler",
      emoji: "🌸",
      tagline: "Build a mood scene",
    },
    {
      id: "transformer" as const,
      icon: Camera,
      label: "Transformer",
      emoji: "✨",
      tagline: "Reimagine a photo",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Hero header ────────────────────────────────── */}
      <div
        className="relative overflow-hidden px-4 pt-6 pb-4 md:px-8 md:pt-8 md:pb-6"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklab, var(--color-blossom) 14%, transparent), color-mix(in oklab, var(--color-lilac-dream) 10%, transparent))",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Floating decorative particles */}
        <span
          className="absolute right-8 top-4 text-3xl opacity-20 animate-float select-none pointer-events-none"
          style={{ animationDelay: "0s" }}
          aria-hidden
        >
          🌸
        </span>
        <span
          className="absolute right-20 top-8 text-xl opacity-15 animate-float select-none pointer-events-none"
          style={{ animationDelay: "1.2s" }}
          aria-hidden
        >
          ✨
        </span>
        <span
          className="absolute right-4 top-10 text-2xl opacity-10 animate-float select-none pointer-events-none"
          style={{ animationDelay: "2.1s" }}
          aria-hidden
        >
          💕
        </span>

        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2.5 mb-1">
            <WandSparkles className="w-5 h-5 text-[color:var(--color-blossom)]" />
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Bloom Studio</h1>
          </div>
          <p className="text-sm text-[color:var(--text-soft)] mt-0.5 max-w-md">
            Make something that could only exist for the two of you, right now.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 py-4 md:px-6 md:py-6">
        {/* ── Mode selector ── sliding pill tabs ──────── */}
        <div className="glass-card p-1.5 rounded-2xl mb-5">
          <div className="grid grid-cols-3 gap-1">
            {modes.map((m) => {
              const active = mode === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setMode(m.id);
                    vibrateTap();
                  }}
                  className={`relative rounded-xl py-2.5 px-3 flex flex-col sm:flex-row items-center justify-center sm:gap-2 transition-all duration-200 touch-pressable ${
                    active ? "text-white" : "text-[color:var(--text-soft)] hover:text-[color:var(--foreground)]"
                  }`}
                  style={
                    active
                      ? {
                          background:
                            "linear-gradient(135deg, var(--color-blossom), var(--color-lilac-dream))",
                          boxShadow: "0 4px 16px var(--accent-glow)",
                        }
                      : undefined
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-semibold mt-0.5 sm:mt-0">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── PAINTER MODE ────────────────────────────── */}
        {mode === "painter" && (
          <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-4">
            {/* Canvas section */}
            <div className="space-y-3">
              {/* Canvas wrapper */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="relative">
                  {pouringColor && (
                    <div
                      className="bloom-pour-overlay"
                      style={{ ["--bloom-pour-color" as string]: pouringColor }}
                    />
                  )}
                  <div
                    ref={wrapRef}
                    className="relative overflow-hidden rounded-t-xl bloom-parchment bloom-canvas-shine h-[340px] md:h-[460px]"
                  >
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 touch-none"
                      style={{ cursor: eraserMode ? "cell" : "crosshair" }}
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
                    {/* Canvas overlay label */}
                    {constellationCount === 0 && brush === "constellation" && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-xs text-[color:var(--text-whisper)] bg-[color:var(--card)]/60 px-4 py-2 rounded-full backdrop-blur-sm">
                          Tap to place stars ✦
                        </p>
                      </div>
                    )}
                    {showConstellationNamer && (
                      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] grid place-items-center p-4">
                        <div className="w-full max-w-xs rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)]/95 p-4 shadow-xl">
                          <p className="text-xs text-[color:var(--text-whisper)] uppercase tracking-wider mb-1">
                            New constellation
                          </p>
                          <p className="text-sm text-[color:var(--foreground)] mb-3">
                            Name the stars you just made.
                          </p>
                          <input
                            value={constellationName}
                            onChange={(event) => setConstellationName(event.target.value)}
                            placeholder="Name this constellation"
                            className="w-full rounded-xl bg-[color:var(--surface-2)]/70 border border-[color:var(--border)] px-3 py-2 text-sm outline-none focus:border-[color:var(--color-lilac-dream)]"
                          />
                          <div className="mt-3 flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setShowConstellationNamer(false)}
                              className="px-3 py-1.5 text-xs rounded-lg border border-[color:var(--border)] text-[color:var(--text-soft)] hover:text-[color:var(--foreground)] transition-colors"
                            >
                              Later
                            </button>
                            <button
                              type="button"
                              onClick={saveConstellationName}
                              disabled={!constellationName.trim()}
                              className="px-3 py-1.5 text-xs rounded-lg text-white disabled:opacity-50 touch-pressable"
                              style={{
                                background:
                                  "linear-gradient(135deg, var(--color-blossom), var(--color-lilac-dream))",
                              }}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Inline bottom toolbar */}
                  <div className="p-3 bg-[color:var(--card)]/40 backdrop-blur-sm border-t border-[color:var(--border)]/50">
                    {/* Brush carousel */}
                    <div
                      className="relative mb-3 rounded-xl border border-[color:var(--border)]/70 bg-[color:var(--surface-2)]/35 px-10 py-2"
                      onPointerDown={onCarouselPointerDown}
                      onPointerMove={onCarouselPointerMove}
                      onPointerUp={onCarouselPointerUp}
                      onPointerCancel={onCarouselPointerUp}
                    >
                      <button
                        type="button"
                        onClick={() => rotateCarousel(-1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-[color:var(--border)] text-[color:var(--text-soft)] hover:text-[color:var(--foreground)]"
                        aria-label="Previous brush"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => rotateCarousel(1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-[color:var(--border)] text-[color:var(--text-soft)] hover:text-[color:var(--foreground)]"
                        aria-label="Next brush"
                      >
                        ›
                      </button>

                      <div className="grid grid-cols-5 gap-1 perspective-[700px]">
                        {BRUSH_ORDER.map((value, index) => {
                          const offset = index - carouselCenterIndex;
                          const wrappedOffset =
                            offset > 2
                              ? offset - BRUSH_ORDER.length
                              : offset < -2
                                ? offset + BRUSH_ORDER.length
                                : offset;
                          const angle = wrappedOffset * -16;
                          const translateZ = Math.max(0, 22 - Math.abs(wrappedOffset) * 7);
                          const active = brush === value && !eraserMode;

                          return (
                            <button
                              key={value}
                              type="button"
                              title={BRUSH_META[value].tip}
                              onClick={() => selectBrush(value)}
                              className={`rounded-xl py-2 text-center transition-all touch-pressable ${
                                active
                                  ? "text-[color:var(--dark-void)]"
                                  : "text-[color:var(--text-soft)] hover:text-[color:var(--foreground)]"
                              }`}
                              style={{
                                transform: `rotateY(${angle}deg) translateZ(${translateZ}px)`,
                                background: active
                                  ? "linear-gradient(135deg, var(--color-peach), var(--color-butter))"
                                  : "color-mix(in oklab, var(--card) 76%, transparent)",
                                opacity: 1 - Math.abs(wrappedOffset) * 0.12,
                              }}
                            >
                              <span className="block text-base leading-none">{BRUSH_META[value].icon}</span>
                              <span className="block mt-1 text-[10px] capitalize">{value}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                      <button
                        type="button"
                        onClick={applyMoodColor}
                        className="px-2.5 py-1.5 rounded-full text-xs font-medium border border-[color:var(--border)] text-[color:var(--text-soft)] hover:text-[color:var(--foreground)] transition-colors touch-pressable"
                      >
                        Mood Color
                      </button>
                      <button
                        type="button"
                        onClick={applyGradientPreset}
                        className={`px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all touch-pressable ${
                          gradientMode
                            ? "border-transparent text-[color:var(--dark-void)]"
                            : "border-[color:var(--border)] text-[color:var(--text-soft)] hover:text-[color:var(--foreground)]"
                        }`}
                        style={
                          gradientMode
                            ? { background: "linear-gradient(135deg, #ff6b9d, #c8b6e2, #b8e3ff)" }
                            : undefined
                        }
                      >
                        Gradient Pen
                      </button>
                      <button
                        type="button"
                        onClick={() => colorSampleInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-full text-xs font-medium border border-[color:var(--border)] text-[color:var(--text-soft)] hover:text-[color:var(--foreground)] transition-colors touch-pressable"
                      >
                        Memory Sample
                      </button>
                      <input
                        ref={colorSampleInputRef}
                        type="file"
                        accept="image/*"
                        onChange={sampleMemoryColor}
                        className="sr-only"
                      />

                      <button
                        onClick={() => setEraserMode((v) => !v)}
                        title="Eraser"
                        className={`px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-all touch-pressable ${
                          eraserMode
                            ? "bg-[color:var(--foreground)]/15 text-[color:var(--foreground)] shadow-sm"
                            : "border border-[color:var(--border)] text-[color:var(--text-soft)]"
                        }`}
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Eraser</span>
                      </button>
                      <button
                        onClick={clearCanvas}
                        title="Clear canvas"
                        className="ml-auto p-1.5 rounded-full border border-[color:var(--border)] text-[color:var(--text-soft)] hover:text-red-400 hover:border-red-400/40 transition-all touch-pressable"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mb-2.5 rounded-xl border border-[color:var(--border)]/55 bg-[color:var(--surface-2)]/35 px-3 py-2">
                      <p className="text-[11px] text-[color:var(--text-whisper)] leading-relaxed">
                        {memorySampleLabel
                          ? `${memorySampleLabel}: ${activeColorHex}`
                          : moodColorSuggestion.line}
                      </p>
                    </div>

                    {/* Color + size row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Color swatches */}
                      <div className="flex items-center gap-1.5">
                        {COLOR_BOTTLES.map((bottle) => (
                          <button
                            key={bottle.key}
                            onClick={() => chooseColor(bottle.cssVar, bottle.hex)}
                            aria-label={`Pick ${bottle.label}`}
                            title={bottle.label}
                            className="w-7 h-7 rounded-full border-2 transition-all touch-pressable hover:scale-110"
                            style={{
                              background: `var(${bottle.cssVar})`,
                              borderColor:
                                activeColorHex === bottle.hex && !eraserMode
                                  ? "white"
                                  : "transparent",
                              boxShadow:
                                activeColorHex === bottle.hex && !eraserMode
                                  ? `0 0 0 1px ${bottle.hex}`
                                  : "none",
                            }}
                          />
                        ))}
                      </div>
                      {/* Size slider */}
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="text-xs text-[color:var(--text-whisper)]">Size</span>
                        <input
                          type="range"
                          min={3}
                          max={28}
                          value={brushSize}
                          onChange={(e) => setBrushSize(Number(e.target.value))}
                          className="w-20 accent-[var(--accent)] h-1"
                          aria-label="Brush size"
                        />
                        <span className="text-xs text-[color:var(--text-whisper)] w-5">{brushSize}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right sidebar: Send ceremony */}
            <div className="mt-3 lg:mt-0 space-y-3">
              {/* Brush info card */}
              <div className="glass-card p-4 rounded-2xl">
                <p className="text-xs font-semibold text-[color:var(--text-soft)] uppercase tracking-wider mb-2">
                  Active brush
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{
                      background: eraserMode
                        ? "rgba(255,255,255,0.08)"
                        : `color-mix(in oklab, ${activeColorHex} 25%, transparent)`,
                    }}
                  >
                    {eraserMode ? "⬜" : BRUSH_META[brush].icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--foreground)] capitalize">
                      {eraserMode ? "Eraser" : brush}
                    </p>
                    <p className="text-xs text-[color:var(--text-soft)]">
                      {eraserMode ? "Erase strokes" : BRUSH_META[brush].tip}
                    </p>
                  </div>
                </div>
                {brush === "constellation" && !eraserMode && (
                  <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-[color:var(--surface-2)]/40">
                    <span className="text-lg">✦</span>
                    <span className="text-xs text-[color:var(--text-soft)]">
                      {constellationCount} star{constellationCount !== 1 ? "s" : ""} placed
                    </span>
                  </div>
                )}
              </div>

              {/* Send ceremony */}
              <div className="glass-card p-4 rounded-2xl">
                <p className="text-sm font-semibold text-[color:var(--foreground)] mb-0.5">
                  Send Ceremony 💌
                </p>
                <p className="text-xs text-[color:var(--text-soft)] mb-3">
                  Fold it into a love note and launch it to her screen
                </p>

                <div
                  className="relative h-24 rounded-xl border border-[color:var(--border)] overflow-hidden mb-3"
                  style={{ background: "var(--surface-2)" }}
                >
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
                    <p className="absolute inset-x-0 bottom-2 text-center text-xs text-[color:var(--text-soft)]">
                      Landed softly 🌸
                    </p>
                  )}
                </div>

                <button
                  onClick={triggerSendCeremony}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] touch-pressable"
                  style={{
                    background: "linear-gradient(135deg, var(--color-blossom), var(--color-lilac-dream))",
                    boxShadow: "0 4px 16px var(--accent-glow)",
                  }}
                >
                  <Send className="w-4 h-4" />
                  Send to her 💕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── ASSEMBLER MODE ───────────────────────────── */}
        {mode === "assembler" && (
          <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-4">
            {/* Left: emotion shelves */}
            <div className="space-y-3 mb-3 lg:mb-0">
              <div className="glass-card p-4 rounded-2xl">
                <p className="text-xs font-semibold text-[color:var(--text-soft)] uppercase tracking-wider mb-3">
                  Emotion Shelves
                </p>
                <div className="space-y-1.5">
                  {EMOTION_SHELVES.map((shelf) => (
                    <button
                      key={shelf.id}
                      onClick={() => setActiveShelf(shelf.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all touch-pressable ${
                        activeShelf === shelf.id
                          ? "bg-[color:var(--color-peach)] text-[color:var(--dark-void)] font-semibold shadow-sm"
                          : "border border-[color:var(--border)] text-[color:var(--text-soft)] hover:border-[color:var(--color-peach)]/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{shelf.label}</span>
                        <div className="flex gap-0.5">
                          {shelf.stickers.map((s) => (
                            <span key={s} className="text-sm">{s}</span>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Sticker launchers */}
                <div className="mt-4">
                  <p className="text-xs text-[color:var(--text-whisper)] mb-2">Add to scene</p>
                  <div className="flex items-center gap-2">
                    {activeShelfStickers.map((sticker) => (
                      <button
                        key={sticker}
                        onClick={() => addCollageSticker(sticker)}
                        className="w-11 h-11 rounded-full border border-[color:var(--border)] text-xl flex items-center justify-center transition-all hover:scale-110 hover:border-[color:var(--color-peach)] touch-pressable"
                      >
                        {sticker}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={shakeCollage}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-[color:var(--border)] text-xs text-[color:var(--text-soft)] hover:border-[color:var(--color-lilac-dream)]/40 transition-all touch-pressable"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  Shake snow globe
                </button>
              </div>
            </div>

            {/* Right: collage stage */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div
                className="relative h-[360px] md:h-[460px] bloom-parchment"
              >
                {collageItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => togglePin(item.id)}
                    className="absolute text-2xl transition-transform hover:scale-110 touch-pressable"
                    style={{ left: item.x, top: item.y }}
                    aria-label={`${item.pinned ? "Unpin" : "Pin"} ${item.emoji}`}
                    title={item.pinned ? "Click to unpin" : "Click to pin"}
                  >
                    <span
                      style={
                        item.pinned
                          ? { filter: "drop-shadow(0 2px 8px rgba(255,107,157,0.6))" }
                          : undefined
                      }
                    >
                      {item.emoji}
                    </span>
                  </button>
                ))}
                {collageItems.length === 0 && (
                  <div className="h-full grid place-items-center text-center px-6">
                    <div>
                      <div className="text-4xl mb-3 opacity-30">🌸</div>
                      <p className="text-sm text-[color:var(--text-soft)] leading-relaxed">
                        Choose an emotion shelf and tap stickers to drop them into your shared scene
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="px-4 py-2.5 border-t border-[color:var(--border)]/40 bg-[color:var(--card)]/40 backdrop-blur-sm">
                <p className="text-xs text-[color:var(--text-whisper)]">
                  {collageItems.length > 0
                    ? `${collageItems.length} sticker${collageItems.length !== 1 ? "s" : ""} · tap to pin/unpin`
                    : "An empty canvas awaits your feelings"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── TRANSFORMER MODE ─────────────────────────── */}
        {mode === "transformer" && (
          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-4">
            {/* Left: filter picker */}
            <div className="mb-3 lg:mb-0">
              <div className="glass-card p-4 rounded-2xl">
                <p className="text-xs font-semibold text-[color:var(--text-soft)] uppercase tracking-wider mb-3">
                  Artistic Filters
                </p>
                <div className="space-y-1.5">
                  {TRANSFORM_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setTransformFilter(filter.value)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all touch-pressable ${
                        transformFilter === filter.value
                          ? "bg-[color:var(--color-blossom)] text-white font-semibold shadow-sm"
                          : "border border-[color:var(--border)] text-[color:var(--text-soft)] hover:border-[color:var(--color-blossom)]/40"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Upload */}
                <div className="mt-4">
                  <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all hover:scale-[1.02] touch-pressable"
                    style={{
                      background: "linear-gradient(135deg, var(--color-lilac-dream), var(--color-sky-blush))",
                      color: "var(--dark-void)",
                    }}
                  >
                    <Camera className="w-4 h-4" />
                    <span className="text-sm font-semibold">Choose photo</span>
                    <input type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
            </div>

            {/* Right: preview */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div
                className="relative flex items-center justify-center min-h-[340px] md:min-h-[460px]"
                style={{ background: "var(--surface-2)" }}
              >
                {imagePreview ? (
                  <>
                    <Image
                      src={imagePreview}
                      alt="Preview for sticker transform"
                      width={420}
                      height={420}
                      unoptimized
                      style={{ filter: transformFilter, objectFit: "cover", maxHeight: 420 }}
                      className="rounded-xl w-full h-full object-cover"
                    />
                    {/* Filter label overlay */}
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm"
                      style={{
                        background: "rgba(0,0,0,0.45)",
                        color: "rgba(255,255,255,0.9)",
                      }}>
                      {/* transformFilter is always from TRANSFORM_FILTERS so .find always succeeds */}
                      {TRANSFORM_FILTERS.find(f => f.value === transformFilter)!.label}
                    </div>
                  </>
                ) : (
                  <div className="text-center px-8">
                    <div className="text-5xl mb-4 opacity-25">
                      <Zap className="w-14 h-14 mx-auto text-[color:var(--color-lilac-dream)]" />
                    </div>
                    <p className="text-sm text-[color:var(--text-soft)] leading-relaxed mb-2">
                      Upload a memory and watch it transform
                    </p>
                    <p className="text-xs text-[color:var(--text-whisper)]">
                      Choose a photo · then pick an artistic filter
                    </p>
                  </div>
                )}
              </div>
              {imagePreview && (
                <div className="px-4 py-2.5 border-t border-[color:var(--border)]/40 bg-[color:var(--card)]/40 flex items-center justify-between">
                  <p className="text-xs text-[color:var(--text-whisper)]">
                    Tap a filter to change the look
                  </p>
                  <button
                    onClick={() => setImagePreview(null)}
                    className="text-xs text-[color:var(--text-soft)] hover:text-red-400 transition-colors"
                  >
                    Remove photo
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="mt-5 flex items-center gap-2 text-xs text-[color:var(--text-whisper)]">
          <WandSparkles className="w-3.5 h-3.5 shrink-0" />
          <span>Bloom archives every send with date + mood, so your art becomes your timeline.</span>
        </div>
      </div>
    </div>
  );
}
