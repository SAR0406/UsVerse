"use client";

import { useEffect, useRef, useState } from "react";

type Ripple = {
  id: number;
  x: number;
  y: number;
  radius: number;
  life: number;
  strength: number;
};

type CursorPoint = {
  id: number;
  x: number;
  y: number;
  opacity: number;
  scale: number;
};

function cssColorToRgba(value: string, alpha: number) {
  if (value.startsWith("#")) {
    const normalized = value.length === 4
      ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      : value;
    const red = Number.parseInt(normalized.slice(1, 3), 16);
    const green = Number.parseInt(normalized.slice(3, 5), 16);
    const blue = Number.parseInt(normalized.slice(5, 7), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
  return value;
}

export default function LivingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const rippleIdRef = useRef(0);
  const cursorIdRef = useRef(0);
  const lastPointerStampRef = useRef(0);
  const [cursorPoints, setCursorPoints] = useState<CursorPoint[]>([]);
  const [showBottomMessage, setShowBottomMessage] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;
    const targetCanvas = canvas;
    const ctx = context;

    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const ripples: Ripple[] = [];
    let partnerActive = false;
    let melancholyUntil = 0;

    function resize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      targetCanvas.width = Math.floor(width * ratio);
      targetCanvas.height = Math.floor(height * ratio);
      targetCanvas.style.width = `${width}px`;
      targetCanvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function queueRipple(normalizedX: number, normalizedY: number, strength: number) {
      rippleIdRef.current += 1;
      ripples.push({
        id: rippleIdRef.current,
        x: normalizedX * window.innerWidth,
        y: normalizedY * window.innerHeight,
        radius: 10,
        life: 1,
        strength,
      });
      if (ripples.length > 26) ripples.shift();
    }

    function handlePointerMove(event: PointerEvent) {
      const now = event.timeStamp;
      const delta = now - lastPointerStampRef.current;
      if (delta < 44) return;
      lastPointerStampRef.current = now;
      queueRipple(event.clientX / window.innerWidth, event.clientY / window.innerHeight, 0.32);

      if (!window.matchMedia("(pointer: fine)").matches) return;
      cursorIdRef.current += 1;
      const speed = Math.min(Math.hypot(event.movementX, event.movementY), 60);
      const trailCount = speed > 26 ? 6 : 4;
      const nextPoints: CursorPoint[] = [];
      for (let index = 0; index < trailCount; index += 1) {
        nextPoints.push({
          id: cursorIdRef.current + index,
          x: event.clientX - event.movementX * index * 0.36,
          y: event.clientY - event.movementY * index * 0.36,
          opacity: Math.max(0.15, 1 - index * 0.2),
          scale: Math.max(0.45, 1 - index * 0.1),
        });
      }
      setCursorPoints(nextPoints);
    }

    function handleTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;
      queueRipple(touch.clientX / window.innerWidth, touch.clientY / window.innerHeight, 0.4);
    }

    function handleNotificationDrop(event: Event) {
      const detail = (event as CustomEvent<{ x?: number; y?: number }>).detail;
      const x = typeof detail?.x === "number" ? detail.x : 0.5;
      const y = typeof detail?.y === "number" ? detail.y : 0.15;
      queueRipple(x, y, 0.75);
    }

    function handlePartnerState(event: Event) {
      partnerActive = Boolean((event as CustomEvent<{ active?: boolean }>).detail?.active);
    }

    function handleEmotion(event: Event) {
      const mood = (event as CustomEvent<{ kind?: string }>).detail?.kind;
      if (mood === "missing_you") {
        melancholyUntil = performance.now() + 60_000;
      }
    }

    let lastScrollY = window.scrollY;
    let scrollTimeout: number | null = null;
    function handleScroll() {
      const scrollingDown = window.scrollY > lastScrollY;
      lastScrollY = window.scrollY;
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 24;
      if (scrollingDown && nearBottom) {
        setShowBottomMessage(true);
        if (scrollTimeout) window.clearTimeout(scrollTimeout);
        scrollTimeout = window.setTimeout(() => setShowBottomMessage(false), 2200);
      }
    }

    function animate(timestamp: number) {
      const hour = new Date().getHours();
      const dayRatio = 1 - Math.abs(12 - hour) / 12;
      const viscosity = 0.1 + (1 - dayRatio) * 0.7;
      const melancholy = timestamp < melancholyUntil;
      const styles = getComputedStyle(document.documentElement);
      const colorA = cssColorToRgba(styles.getPropertyValue("--color-blossom").trim(), 0.08);
      const colorB = cssColorToRgba(styles.getPropertyValue("--color-lilac-dream").trim(), 0.08);

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = "source-over";

      const driftX = partnerActive ? Math.sin(timestamp * 0.00022) * 70 : Math.sin(timestamp * 0.00012) * 24;
      const driftY = melancholy ? Math.cos(timestamp * 0.00025) * 34 : Math.cos(timestamp * 0.00016) * 16;

      const gradient = ctx.createRadialGradient(
        window.innerWidth * 0.35 + driftX,
        window.innerHeight * 0.25 + driftY,
        20,
        window.innerWidth * 0.45,
        window.innerHeight * 0.45,
        window.innerWidth * 0.75,
      );
      gradient.addColorStop(0, colorA);
      gradient.addColorStop(1, colorB);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      for (let index = ripples.length - 1; index >= 0; index -= 1) {
        const ripple = ripples[index];
        ripple.radius += 1.6 + (1 - viscosity);
        ripple.life -= melancholy ? 0.012 : 0.016;
        if (ripple.life <= 0) {
          ripples.splice(index, 1);
          continue;
        }
        const alpha = ripple.life * ripple.strength * 0.34;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = cssColorToRgba(styles.getPropertyValue("--color-sky-blush").trim(), alpha);
        ctx.lineWidth = 1.2 + (1 - ripple.life) * 1.8;
        ctx.stroke();
      }

      frameRef.current = window.requestAnimationFrame(animate);
    }

    resize();
    frameRef.current = window.requestAnimationFrame(animate);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("usverse:notification-drop", handleNotificationDrop as EventListener);
    window.addEventListener("usverse:partner-active", handlePartnerState as EventListener);
    window.addEventListener("usverse:emotion", handleEmotion as EventListener);

    return () => {
      if (scrollTimeout) window.clearTimeout(scrollTimeout);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("usverse:notification-drop", handleNotificationDrop as EventListener);
      window.removeEventListener("usverse:partner-active", handlePartnerState as EventListener);
      window.removeEventListener("usverse:emotion", handleEmotion as EventListener);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    if (!media.matches) return;
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = "none";
    return () => {
      document.body.style.cursor = previousCursor;
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="living-canvas-layer" aria-hidden="true" />
      <div className="living-cursor-layer" aria-hidden="true">
        {cursorPoints.map((point) => (
          <span
            key={point.id}
            className="living-cursor-heart"
            style={{
              left: point.x,
              top: point.y,
              opacity: point.opacity,
              transform: `translate(-50%, -50%) scale(${point.scale})`,
            }}
          >
            ❤
          </span>
        ))}
      </div>
      <div
        className={`living-scroll-message ${showBottomMessage ? "living-scroll-message-visible" : ""}`}
        aria-live="polite"
      >
        That&apos;s all for now. She hasn&apos;t added more yet. <span aria-hidden="true">🫣</span>
      </div>
    </>
  );
}
