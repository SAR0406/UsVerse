"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Clapperboard,
  Link2,
  Maximize2,
  MessageSquare,
  Minimize2,
  MonitorPlay,
  Pause,
  Play,
  Send,
  Sparkles,
  Users,
  Waves,
  Wifi,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  vibrateCelebrate,
  vibrateHeartbeat,
  vibrateHug,
  vibratePress,
  vibrateSoftError,
  vibrateSuccess,
  vibrateTap,
} from "@/lib/haptics";

type SyncAction = "play" | "pause" | "seek";
type P2PStatus = "idle" | "connecting" | "connected" | "error";
type P2PRole = "none" | "host" | "guest";
type PlaybackSource = "none" | "youtube" | "direct";
type CinemaChannelEvent =
  | "cinema_sync"
  | "cinema_signal"
  | "cinema_presence"
  | "cinema_ritual"
  | "cinema_spark"
  | "cinema_afterglow"
  | "cinema_chat";
type SparkKind = "heart" | "laugh" | "tear" | "star" | "shock" | "pulse";
type SparkSide = "left" | "right";

type CinemaSyncPayload = {
  senderId: string;
  action: SyncAction;
  timestamp: number;
  sentAt: number;
};

type SignalPayload = {
  senderId: string;
  kind: "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type PresencePayload = {
  senderId: string;
  source: Exclude<PlaybackSource, "none">;
  timestamp: number;
  paused: boolean;
  sentAt: number;
};

type RitualPayload = {
  senderId: string;
  source: Exclude<PlaybackSource, "none">;
  startAt: number;
};

type SparkPayload = {
  senderId: string;
  kind: SparkKind;
  xPercent: number;
  at: number;
};

type AfterglowPayload = {
  senderId: string;
  sentence: string;
};

type ChatPayload = {
  senderId: string;
  text: string;
  sentAt: number;
  msgId: string;
};

type BroadcastPayload =
  | CinemaSyncPayload
  | SignalPayload
  | PresencePayload
  | RitualPayload
  | SparkPayload
  | AfterglowPayload
  | ChatPayload;

type SparkParticle = {
  id: string;
  kind: SparkKind;
  side: SparkSide;
  xPercent: number;
};

type SparkLog = {
  id: string;
  kind: SparkKind;
  side: SparkSide;
  at: number;
};

type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  sentAt: number;
};

type PlaybackSnapshot = {
  source: PlaybackSource;
  timestamp: number;
  paused: boolean;
};

type GestureState = {
  downAt: number;
  downX: number;
  downY: number;
  swipeTriggered: boolean;
  longTriggered: boolean;
  lastTapAt: number;
  longTimer: number | null;
  tapTimer: number | null;
  twoFingerTimer: number | null;
};

const SPARK_META: Record<SparkKind, { emoji: string; intensity: number; label: string }> = {
  heart: { emoji: "\u{1F495}", intensity: 2.2, label: "Heart pulse" },
  laugh: { emoji: "\u{1F602}", intensity: 2.8, label: "Laugh burst" },
  tear: { emoji: "\u{1F62D}", intensity: 3.1, label: "Tear spark" },
  star: { emoji: "\u{1F31F}", intensity: 2.4, label: "Amazed star" },
  shock: { emoji: "\u{1F631}", intensity: 3.3, label: "Shock flash" },
  pulse: { emoji: "\u{1F90D}", intensity: 4.2, label: "Silent pulse" },
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: Record<string, number>;
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
          };
        },
      ) => {
        destroy: () => void;
        getCurrentTime: () => number;
        getPlayerState: () => number;
        playVideo: () => void;
        pauseVideo: () => void;
        seekTo: (seconds: number, allowSeekAhead: boolean) => void;
      };
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];
const DRIFT_THRESHOLD_SECONDS = 0.5;
const SUPPRESS_DURATION_MS = 250;
const PRESENCE_HEARTBEAT_MS = 2000;
const PARTNER_STALE_MS = 5000;
const RITUAL_BUFFER_MS = 1200;
const RITUAL_DURATION_MS = 3000;
const WAVE_BUCKETS = 36;
const DOUBLE_TAP_WINDOW_MS = 260;
const LONG_PRESS_MS = 420;
const TWO_FINGER_HOLD_MS = 420;
const SWIPE_MIN_DISTANCE_PX = 42;
const SHAKE_THRESHOLD = 33;
const SHAKE_COOLDOWN_MS = 1400;
const MAX_CHAT_MESSAGES = 200;
const MAX_CHAT_LENGTH = 200;

function extractYouTubeId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatChatTime(sentAt: number): string {
  const d = new Date(sentAt);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toSingleSentence(value: string): string {
  const compact = value.trim().replace(/\s+/g, " ");
  if (!compact) return "";
  const firstSentence = compact.match(/[^.!?]+[.!?]?/);
  return (firstSentence?.[0] ?? compact).trim();
}

function safeVideoUrl(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return trimmed;
  } catch {
    // not a valid URL
  }
  return "";
}

function pointToPercentX(target: HTMLElement, clientX: number): number {
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0) return 50;
  return clamp(((clientX - rect.left) / rect.width) * 100, 8, 92);
}

export default function CinemaPage() {
  const supabase = useMemo(() => createClient(), []);
  const ytPlayerRef = useRef<InstanceType<NonNullable<typeof window.YT>["Player"]> | null>(null);
  const suppressYouTubeRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const suppressVideoRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const partnerSeenAtRef = useRef(0);
  const ritualTimersRef = useRef<number[]>([]);
  const sparkCounterRef = useRef(0);
  const shakeStampRef = useRef(0);
  const gestureRef = useRef<GestureState>({
    downAt: 0,
    downX: 0,
    downY: 0,
    swipeTriggered: false,
    longTriggered: false,
    lastTapAt: 0,
    longTimer: null,
    tapTimer: null,
    twoFingerTimer: null,
  });
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Connecting room\u2026");
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);

  const [smartInput, setSmartInput] = useState("");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [youtubeReady, setYoutubeReady] = useState(false);
  const [youtubeApiReady, setYoutubeApiReady] = useState(false);

  const [videoInput, setVideoInput] = useState("");
  const [videoSource, setVideoSource] = useState("");
  const [preferredSource, setPreferredSource] = useState<"youtube" | "direct">("youtube");
  const [p2pStatus, setP2pStatus] = useState<P2PStatus>("idle");
  const [p2pRole, setP2pRole] = useState<P2PRole>("none");
  const [p2pError, setP2pError] = useState<string | null>(null);
  const [syncDriftSeconds, setSyncDriftSeconds] = useState(0);
  const [partnerActive, setPartnerActive] = useState(false);
  const [partnerPausedHint, setPartnerPausedHint] = useState(false);
  const [partnerLaughPulse, setPartnerLaughPulse] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const [ritualCountdown, setRitualCountdown] = useState<number | null>(null);
  const [sparkParticles, setSparkParticles] = useState<SparkParticle[]>([]);
  const [sparkLog, setSparkLog] = useState<SparkLog[]>([]);

  const [afterglowOpen, setAfterglowOpen] = useState(false);
  const [afterglowDraft, setAfterglowDraft] = useState("");
  const [myAfterglowSentence, setMyAfterglowSentence] = useState<string | null>(null);
  const [partnerAfterglowSentence, setPartnerAfterglowSentence] = useState<string | null>(null);
  const [waveCursor, setWaveCursor] = useState(0);
  const [memorySaveState, setMemorySaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [memorySaveNote, setMemorySaveNote] = useState<string | null>(null);
  const savedMemorySignatureRef = useRef<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const youtubeId = useMemo(() => extractYouTubeId(youtubeInput), [youtubeInput]);
  const posterArtUrl = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null;

  const resolvedSource = useMemo<PlaybackSource>(() => {
    if (preferredSource === "direct" && videoSource) return "direct";
    if (preferredSource === "youtube" && youtubeId) return "youtube";
    if (videoSource) return "direct";
    if (youtubeId) return "youtube";
    return "none";
  }, [preferredSource, videoSource, youtubeId]);

  const waveform = useMemo(() => {
    const bars = Array.from({ length: WAVE_BUCKETS }, () => 0);
    const groups: SparkLog[][] = Array.from({ length: WAVE_BUCKETS }, () => []);
    if (sparkLog.length === 0) {
      return {
        bars,
        groups,
        startAt: 0,
      };
    }

    const startAt = sparkLog[0]?.at ?? 0;
    const endAt = sparkLog[sparkLog.length - 1]?.at ?? startAt + 1;
    const span = Math.max(1, endAt - startAt);

    for (const item of sparkLog) {
      const normalized = (item.at - startAt) / span;
      const index = clamp(Math.floor(normalized * (WAVE_BUCKETS - 1)), 0, WAVE_BUCKETS - 1);
      bars[index] += SPARK_META[item.kind].intensity;
      groups[index]?.push(item);
    }

    return {
      bars: bars.map((value) => Math.min(96, value * 9)),
      groups,
      startAt,
    };
  }, [sparkLog]);

  const clampedWaveCursor = clamp(waveCursor, 0, waveform.bars.length - 1);
  const selectedWaveEvents = waveform.groups[clampedWaveCursor] ?? [];
  const selectedWaveLabel = selectedWaveEvents.length
    ? `Around ${formatClock((selectedWaveEvents[0].at - waveform.startAt) / 1000)} - ${selectedWaveEvents
        .slice(0, 2)
        .map((event) => SPARK_META[event.kind].label)
        .join(" + ")}`
    : "No spark captured in this moment yet.";

  const simultaneousMoments = useMemo(() => {
    const left = sparkLog.filter((item) => item.side === "left");
    const right = sparkLog.filter((item) => item.side === "right");
    let count = 0;
    for (const leftEvent of left) {
      const close = right.some((rightEvent) => Math.abs(rightEvent.at - leftEvent.at) <= 900);
      if (close) count += 1;
    }
    return count;
  }, [sparkLog]);

  const syncAligned = syncDriftSeconds <= DRIFT_THRESHOLD_SECONDS;

  const clearGestureTimers = useCallback(() => {
    const gesture = gestureRef.current;
    if (gesture.longTimer !== null) {
      window.clearTimeout(gesture.longTimer);
      gesture.longTimer = null;
    }
    if (gesture.tapTimer !== null) {
      window.clearTimeout(gesture.tapTimer);
      gesture.tapTimer = null;
    }
    if (gesture.twoFingerTimer !== null) {
      window.clearTimeout(gesture.twoFingerTimer);
      gesture.twoFingerTimer = null;
    }
  }, []);

  const clearRitualTimers = useCallback(() => {
    for (const timerId of ritualTimersRef.current) {
      window.clearTimeout(timerId);
    }
    ritualTimersRef.current = [];
  }, []);

  const markPartnerSeen = useCallback(() => {
    partnerSeenAtRef.current = Date.now();
    setPartnerActive(true);
  }, []);

  const getPlaybackSnapshot = useCallback((): PlaybackSnapshot => {
    if (resolvedSource === "direct") {
      const video = videoRef.current;
      if (!video) return { source: "none", timestamp: 0, paused: true };
      return { source: "direct", timestamp: video.currentTime, paused: video.paused };
    }

    if (resolvedSource === "youtube") {
      const player = ytPlayerRef.current;
      if (!player || !youtubeReady) {
        return { source: "none", timestamp: 0, paused: true };
      }
      const state = player.getPlayerState?.() ?? 0;
      const paused = state !== window.YT?.PlayerState.PLAYING;
      return {
        source: "youtube",
        timestamp: player.getCurrentTime(),
        paused,
      };
    }

    return { source: "none", timestamp: 0, paused: true };
  }, [resolvedSource, youtubeReady]);

  const sendBroadcast = useCallback(
    (event: CinemaChannelEvent, payload: BroadcastPayload) => {
      if (!channelRef.current) return;
      void channelRef.current.send({
        type: "broadcast",
        event,
        payload,
      });
    },
    [],
  );

  const sendYoutubeSync = useCallback(
    (action: SyncAction, timestamp: number) => {
      if (!userId) return;
      sendBroadcast("cinema_sync", {
        senderId: userId,
        action,
        timestamp,
        sentAt: Date.now(),
      });
    },
    [sendBroadcast, userId],
  );

  const openAfterglow = useCallback(() => {
    setAfterglowOpen(true);
    setMemorySaveState("idle");
    setMemorySaveNote(null);
    savedMemorySignatureRef.current = null;
    vibrateHug();
    window.dispatchEvent(
      new CustomEvent("usverse:notification-drop", {
        detail: { x: 0.5, y: 0.28 },
      }),
    );
  }, []);

  const applyRemoteYoutubeSync = useCallback(
    (payload: CinemaSyncPayload) => {
      const player = ytPlayerRef.current;
      if (!player) return;

      const networkDelay = (Date.now() - payload.sentAt) / 1000;
      const correctedTime = payload.timestamp + networkDelay;
      const drift = Math.abs(player.getCurrentTime() - correctedTime);
      setSyncDriftSeconds(drift);
      markPartnerSeen();

      if (payload.action === "pause") {
        setPartnerPausedHint(true);
        window.setTimeout(() => setPartnerPausedHint(false), 1200);
      }

      suppressYouTubeRef.current = true;
      if (payload.action === "seek" || drift > DRIFT_THRESHOLD_SECONDS) {
        player.seekTo(correctedTime, true);
      }
      if (payload.action === "play") player.playVideo();
      if (payload.action === "pause") player.pauseVideo();
      window.setTimeout(() => {
        suppressYouTubeRef.current = false;
      }, SUPPRESS_DURATION_MS);
    },
    [markPartnerSeen],
  );

  const closePeer = useCallback(() => {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    pendingCandidatesRef.current = [];
  }, []);

  const applyP2PSync = useCallback(
    (payload: CinemaSyncPayload) => {
      const video = videoRef.current;
      if (!video) return;

      const lag = (Date.now() - payload.sentAt) / 1000;
      const corrected = payload.timestamp + lag;
      const drift = Math.abs(video.currentTime - corrected);
      setSyncDriftSeconds(drift);
      markPartnerSeen();

      if (payload.action === "pause") {
        setPartnerPausedHint(true);
        window.setTimeout(() => setPartnerPausedHint(false), 1200);
      }

      suppressVideoRef.current = true;
      if (payload.action === "seek" || drift > DRIFT_THRESHOLD_SECONDS) {
        video.currentTime = corrected;
      }
      if (payload.action === "play") {
        void video.play().catch(() => undefined);
      }
      if (payload.action === "pause") {
        video.pause();
      }
      window.setTimeout(() => {
        suppressVideoRef.current = false;
      }, SUPPRESS_DURATION_MS);
    },
    [markPartnerSeen],
  );

  const setupDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      dataChannelRef.current = channel;

      channel.onopen = () => {
        setP2pStatus("connected");
        setP2pError(null);
      };

      channel.onclose = () => {
        setP2pStatus("idle");
      };

      channel.onerror = () => {
        setP2pStatus("error");
        setP2pError("P2P data channel failed.");
      };

      channel.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as Partial<CinemaSyncPayload>;
          if (
            !payload ||
            typeof payload.action !== "string" ||
            typeof payload.timestamp !== "number" ||
            typeof payload.sentAt !== "number" ||
            typeof payload.senderId !== "string"
          ) {
            setP2pError("Received invalid P2P sync payload. Try reconnecting.");
            return;
          }
          applyP2PSync(payload as CinemaSyncPayload);
        } catch {
          setP2pError("Received invalid P2P sync payload. Try reconnecting.");
        }
      };
    },
    [applyP2PSync],
  );

  const createPeerConnection = useCallback(
    (role: P2PRole) => {
      closePeer();
      const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionRef.current = connection;

      connection.onicecandidate = ({ candidate }) => {
        if (!candidate || !userId) return;
        sendBroadcast("cinema_signal", {
          senderId: userId,
          kind: "ice",
          candidate: candidate.toJSON(),
        });
      };

      connection.onconnectionstatechange = () => {
        if (connection.connectionState === "connected") {
          setP2pStatus("connected");
          setP2pError(null);
        }
        if (connection.connectionState === "failed") {
          setP2pStatus("error");
          setP2pError("WebRTC connection failed. Try host again.");
        }
      };

      if (role === "guest") {
        connection.ondatachannel = (event) => {
          setupDataChannel(event.channel);
        };
      }

      return connection;
    },
    [closePeer, sendBroadcast, setupDataChannel, userId],
  );

  const flushPendingCandidates = useCallback(async (connection: RTCPeerConnection) => {
    const queued = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const candidate of queued) {
      try {
        await connection.addIceCandidate(candidate);
      } catch {
        setP2pError("Could not apply ICE candidate. Connection may be unstable.");
      }
    }
  }, []);

  const handleSignal = useCallback(
    async (payload: SignalPayload) => {
      try {
        if (!userId || payload.senderId === userId) return;

        if (payload.kind === "offer" && payload.sdp) {
          setP2pStatus("connecting");
          setP2pRole("guest");
          const connection = createPeerConnection("guest");
          await connection.setRemoteDescription(payload.sdp);
          await flushPendingCandidates(connection);
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          sendBroadcast("cinema_signal", {
            senderId: userId,
            kind: "answer",
            sdp: answer,
          });
          return;
        }

        const connection = peerConnectionRef.current;
        if (!connection) return;

        if (payload.kind === "answer" && payload.sdp && p2pRole === "host") {
          await connection.setRemoteDescription(payload.sdp);
          await flushPendingCandidates(connection);
          return;
        }

        if (payload.kind === "ice" && payload.candidate) {
          if (connection.remoteDescription) {
            await connection.addIceCandidate(payload.candidate);
            return;
          }
          pendingCandidatesRef.current.push(payload.candidate);
        }
      } catch {
        setP2pStatus("error");
        setP2pError("WebRTC signaling failed. Try reconnecting.");
      }
    },
    [createPeerConnection, flushPendingCandidates, p2pRole, sendBroadcast, userId],
  );

  const startPlayback = useCallback(() => {
    if (resolvedSource === "youtube") {
      ytPlayerRef.current?.playVideo();
      return;
    }
    if (resolvedSource === "direct") {
      const video = videoRef.current;
      if (!video) return;
      void video.play().catch(() => undefined);
    }
  }, [resolvedSource]);

  const scheduleRitual = useCallback(
    (startAt: number) => {
      clearRitualTimers();
      if (prefersReducedMotion) {
        setRitualCountdown(null);
        startPlayback();
        return;
      }

      const endAt = startAt + RITUAL_DURATION_MS;
      const tick = () => {
        const remaining = endAt - Date.now();
        if (remaining <= 0) {
          setRitualCountdown(null);
          startPlayback();
          vibrateCelebrate();
          return;
        }
        setRitualCountdown(Math.ceil(remaining / 1000));
        vibrateHeartbeat();
        const timer = window.setTimeout(tick, 1000);
        ritualTimersRef.current.push(timer);
      };

      const lead = Math.max(0, startAt - Date.now());
      const starter = window.setTimeout(tick, lead);
      ritualTimersRef.current.push(starter);
    },
    [clearRitualTimers, prefersReducedMotion, startPlayback],
  );

  const pushSpark = useCallback(
    (kind: SparkKind, side: SparkSide, xPercent: number, at = Date.now()) => {
      sparkCounterRef.current += 1;
      const id = `spark-${sparkCounterRef.current}`;
      const normalizedX = clamp(xPercent, 8, 92);

      setSparkParticles((previous) => [
        ...previous,
        {
          id,
          kind,
          side,
          xPercent: normalizedX,
        },
      ].slice(-28));
      setSparkLog((previous) => [
        ...previous,
        {
          id: `log-${sparkCounterRef.current}`,
          kind,
          side,
          at,
        },
      ].slice(-240));

      const timeout = window.setTimeout(
        () => {
          setSparkParticles((previous) => previous.filter((particle) => particle.id !== id));
        },
        prefersReducedMotion ? 180 : 760,
      );
      ritualTimersRef.current.push(timeout);
    },
    [prefersReducedMotion],
  );

  const emitLocalSpark = useCallback(
    (kind: SparkKind, xPercent: number) => {
      const at = Date.now();
      pushSpark(kind, "left", xPercent, at);

      if (kind === "pulse") {
        vibrateHug();
      } else if (kind === "star") {
        vibrateCelebrate();
      } else if (kind === "tear" || kind === "shock") {
        vibratePress();
      } else {
        vibrateTap();
      }

      window.dispatchEvent(
        new CustomEvent("usverse:notification-drop", {
          detail: { x: xPercent / 100, y: 0.34 },
        }),
      );
      if (kind === "pulse") {
        window.dispatchEvent(
          new CustomEvent("usverse:emotion", {
            detail: { kind: "missing_you" },
          }),
        );
      }

      if (!userId) return;
      sendBroadcast("cinema_spark", {
        senderId: userId,
        kind,
        xPercent,
        at,
      });
    },
    [pushSpark, sendBroadcast, userId],
  );

  const handlePresence = useCallback(
    (payload: PresencePayload) => {
      if (!userId || payload.senderId === userId) return;
      markPartnerSeen();

      if (payload.paused) {
        setPartnerPausedHint(true);
        window.setTimeout(() => setPartnerPausedHint(false), 1200);
      }

      const local = getPlaybackSnapshot();
      if (local.source !== payload.source) return;

      const lag = (Date.now() - payload.sentAt) / 1000;
      const corrected = payload.timestamp + lag;
      setSyncDriftSeconds(Math.abs(local.timestamp - corrected));
    },
    [getPlaybackSnapshot, markPartnerSeen, userId],
  );

  const handleRitual = useCallback(
    (payload: RitualPayload) => {
      if (!userId || payload.senderId === userId) return;
      markPartnerSeen();
      setAfterglowOpen(false);
      setMyAfterglowSentence(null);
      setPartnerAfterglowSentence(null);
      setAfterglowDraft("");
      setMemorySaveState("idle");
      setMemorySaveNote(null);
      savedMemorySignatureRef.current = null;
      scheduleRitual(payload.startAt);
    },
    [markPartnerSeen, scheduleRitual, userId],
  );

  const handleSpark = useCallback(
    (payload: SparkPayload) => {
      if (!userId || payload.senderId === userId) return;
      markPartnerSeen();
      pushSpark(payload.kind, "right", 100 - payload.xPercent, payload.at);
      if (payload.kind === "laugh") {
        setPartnerLaughPulse((value) => value + 1);
      }
      if (payload.kind === "pulse") {
        window.dispatchEvent(
          new CustomEvent("usverse:emotion", {
            detail: { kind: "missing_you" },
          }),
        );
      }
    },
    [markPartnerSeen, pushSpark, userId],
  );

  const handleAfterglow = useCallback(
    (payload: AfterglowPayload) => {
      if (!userId || payload.senderId === userId) return;
      markPartnerSeen();
      setAfterglowOpen(true);
      setPartnerAfterglowSentence(payload.sentence);
      vibrateSuccess();
    },
    [markPartnerSeen, userId],
  );

  const handleChat = useCallback(
    (payload: ChatPayload) => {
      if (!userId || payload.senderId === userId) return;
      markPartnerSeen();
      setChatMessages((previous) =>
        [
          ...previous,
          {
            id: payload.msgId,
            senderId: payload.senderId,
            text: payload.text,
            sentAt: payload.sentAt,
          },
        ].slice(-MAX_CHAT_MESSAGES),
      );
      vibrateTap();
    },
    [markPartnerSeen, userId],
  );

  const sendChat = useCallback(() => {
    const text = chatInput.trim().slice(0, MAX_CHAT_LENGTH);
    if (!text || !userId) return;
    const msgId = crypto.randomUUID();
    const sentAt = Date.now();
    setChatMessages((previous) =>
      [
        ...previous,
        { id: msgId, senderId: userId, text, sentAt },
      ].slice(-MAX_CHAT_MESSAGES),
    );
    setChatInput("");
    sendBroadcast("cinema_chat", {
      senderId: userId,
      text,
      sentAt,
      msgId,
    });
    vibrateTap();
  }, [chatInput, sendBroadcast, userId]);

  const beginSharedRitual = useCallback(() => {
    const snapshot = getPlaybackSnapshot();
    if (snapshot.source === "none") {
      setStatusMessage("Load a YouTube link or direct video before starting the ritual.");
      vibratePress();
      return;
    }

    const startAt = Date.now() + (prefersReducedMotion ? 180 : RITUAL_BUFFER_MS);
    setAfterglowOpen(false);
    setMyAfterglowSentence(null);
    setPartnerAfterglowSentence(null);
    setAfterglowDraft("");
    setMemorySaveState("idle");
    setMemorySaveNote(null);
    savedMemorySignatureRef.current = null;
    scheduleRitual(startAt);
    if (userId) {
      sendBroadcast("cinema_ritual", {
        senderId: userId,
        source: snapshot.source,
        startAt,
      });
    }
    window.dispatchEvent(
      new CustomEvent("usverse:notification-drop", {
        detail: { x: 0.5, y: 0.08 },
      }),
    );
  }, [getPlaybackSnapshot, prefersReducedMotion, scheduleRitual, sendBroadcast, userId]);

  const sendP2PSync = useCallback(
    (action: SyncAction) => {
      const video = videoRef.current;
      if (!video || !userId || suppressVideoRef.current || dataChannelRef.current?.readyState !== "open") return;
      const payload: CinemaSyncPayload = {
        senderId: userId,
        action,
        timestamp: video.currentTime,
        sentAt: Date.now(),
      };
      dataChannelRef.current.send(JSON.stringify(payload));
    },
    [userId],
  );

  const doAutoResync = useCallback(() => {
    if (resolvedSource === "youtube") {
      const player = ytPlayerRef.current;
      if (!player || !youtubeReady) return;
      sendYoutubeSync("seek", player.getCurrentTime());
    } else if (resolvedSource === "direct") {
      sendP2PSync("seek");
    }
    vibratePress();
  }, [resolvedSource, sendYoutubeSync, sendP2PSync, youtubeReady]);

  const toggleFullscreen = useCallback(() => {
    const el = videoWrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const onSmartInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSmartInput(value);
    const ytId = extractYouTubeId(value);
    if (ytId) {
      setYoutubeInput(value);
      setPreferredSource("youtube");
    } else if (value.trim().startsWith("http")) {
      setVideoInput(value.trim());
      setVideoSource(safeVideoUrl(value));
      setYoutubeInput("");
      setPreferredSource("direct");
    } else {
      setYoutubeInput(value);
    }
  }, []);

  useEffect(() => {
    async function initRoom() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatusMessage("Login required for cinema sync.");
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const response = await fetch("/api/couple");
      const json = (await response.json()) as { data?: { couple: { id: string } | null } };
      const id = json.data?.couple?.id ?? null;
      if (!id) {
        setStatusMessage("Connect with your partner first.");
        setLoading(false);
        return;
      }

      setCoupleId(id);
      setStatusMessage("Room connected. Ready to sync.");
      setLoading(false);
    }

    void initRoom();
  }, [supabase]);

  useEffect(() => {
    if (!coupleId) return;

    const channel = supabase
      .channel(`cinema:${coupleId}`)
      .on("broadcast", { event: "cinema_sync" }, ({ payload }) => {
        const data = payload as CinemaSyncPayload;
        if (!userId || data.senderId === userId) return;
        applyRemoteYoutubeSync(data);
      })
      .on("broadcast", { event: "cinema_signal" }, ({ payload }) => {
        void handleSignal(payload as SignalPayload);
      })
      .on("broadcast", { event: "cinema_presence" }, ({ payload }) => {
        handlePresence(payload as PresencePayload);
      })
      .on("broadcast", { event: "cinema_ritual" }, ({ payload }) => {
        handleRitual(payload as RitualPayload);
      })
      .on("broadcast", { event: "cinema_spark" }, ({ payload }) => {
        handleSpark(payload as SparkPayload);
      })
      .on("broadcast", { event: "cinema_afterglow" }, ({ payload }) => {
        handleAfterglow(payload as AfterglowPayload);
      })
      .on("broadcast", { event: "cinema_chat" }, ({ payload }) => {
        handleChat(payload as ChatPayload);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      closePeer();
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [
    applyRemoteYoutubeSync,
    closePeer,
    coupleId,
    handleAfterglow,
    handleChat,
    handlePresence,
    handleRitual,
    handleSignal,
    handleSpark,
    supabase,
    userId,
  ]);

  useEffect(() => {
    if (window.YT?.Player) {
      window.setTimeout(() => setYoutubeApiReady(true), 0);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    window.onYouTubeIframeAPIReady = () => setYoutubeApiReady(true);
    document.head.appendChild(script);

    return () => {
      if (window.onYouTubeIframeAPIReady) {
        window.onYouTubeIframeAPIReady = undefined;
      }
    };
  }, []);

  useEffect(() => {
    if (!youtubeApiReady || !youtubeId || !window.YT?.Player) return;

    ytPlayerRef.current?.destroy();
    ytPlayerRef.current = new window.YT.Player("usverse-youtube-player", {
      videoId: youtubeId,
      playerVars: { playsinline: 1, rel: 0 }, // value 1 enables inline playback on mobile browsers
      events: {
        onReady: () => setYoutubeReady(true),
        onStateChange: (event) => {
          if (!ytPlayerRef.current || suppressYouTubeRef.current) return;
          if (event.data === window.YT?.PlayerState.PLAYING) {
            sendYoutubeSync("play", ytPlayerRef.current.getCurrentTime());
          }
          if (event.data === window.YT?.PlayerState.PAUSED) {
            sendYoutubeSync("pause", ytPlayerRef.current.getCurrentTime());
          }
          if (event.data === 0) {
            openAfterglow();
          }
        },
      },
    });

    return () => {
      ytPlayerRef.current?.destroy();
      ytPlayerRef.current = null;
      setYoutubeReady(false);
    };
  }, [openAfterglow, sendYoutubeSync, youtubeApiReady, youtubeId]);

  useEffect(() => {
    if (!userId || !coupleId) return;

    const id = window.setInterval(() => {
      const snapshot = getPlaybackSnapshot();
      if (snapshot.source === "none") return;
      sendBroadcast("cinema_presence", {
        senderId: userId,
        source: snapshot.source,
        timestamp: snapshot.timestamp,
        paused: snapshot.paused,
        sentAt: Date.now(),
      });
    }, PRESENCE_HEARTBEAT_MS);

    return () => window.clearInterval(id);
  }, [coupleId, getPlaybackSnapshot, sendBroadcast, userId]);

  useEffect(() => {
    const staleWatcher = window.setInterval(() => {
      if (Date.now() - partnerSeenAtRef.current > PARTNER_STALE_MS) {
        setPartnerActive(false);
      }
    }, 600);

    return () => window.clearInterval(staleWatcher);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("usverse:partner-active", {
        detail: { active: partnerActive },
      }),
    );
  }, [partnerActive]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const motionListener = (event: DeviceMotionEvent) => {
      if (resolvedSource === "none") return;
      const accel = event.accelerationIncludingGravity;
      if (!accel) return;
      const magnitude = Math.abs(accel.x ?? 0) + Math.abs(accel.y ?? 0) + Math.abs(accel.z ?? 0);
      const now = Date.now();
      if (magnitude < SHAKE_THRESHOLD || now - shakeStampRef.current < SHAKE_COOLDOWN_MS) return;
      shakeStampRef.current = now;
      emitLocalSpark("shock", 50);
    };

    window.addEventListener("devicemotion", motionListener);
    return () => window.removeEventListener("devicemotion", motionListener);
  }, [emitLocalSpark, resolvedSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => sendP2PSync("play");
    const onPause = () => sendP2PSync("pause");
    const onSeeked = () => sendP2PSync("seek");
    const onEnded = () => openAfterglow();

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("ended", onEnded);
    };
  }, [openAfterglow, sendP2PSync]);

  useEffect(
    () => () => {
      clearGestureTimers();
      clearRitualTimers();
    },
    [clearGestureTimers, clearRitualTimers],
  );

  // Auto-scroll chat to latest message
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Track fullscreen state changes
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  async function startHosting() {
    if (!userId) return;
    try {
      setP2pStatus("connecting");
      setP2pError(null);
      setP2pRole("host");

      const connection = createPeerConnection("host");
      const syncChannel = connection.createDataChannel("cinema-sync");
      setupDataChannel(syncChannel);

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      sendBroadcast("cinema_signal", {
        senderId: userId,
        kind: "offer",
        sdp: offer,
      });
    } catch {
      setP2pStatus("error");
      setP2pError("Could not create P2P host session.");
    }
  }

  function endP2P() {
    closePeer();
    setP2pRole("none");
    setP2pStatus("idle");
    setP2pError(null);
  }

  function onSparkPadPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (resolvedSource === "none") return;
    const gesture = gestureRef.current;
    clearGestureTimers();

    gesture.downAt = Date.now();
    gesture.downX = event.clientX;
    gesture.downY = event.clientY;
    gesture.swipeTriggered = false;
    gesture.longTriggered = false;

    const xPercent = pointToPercentX(event.currentTarget, event.clientX);
    gesture.longTimer = window.setTimeout(() => {
      gesture.longTriggered = true;
      emitLocalSpark("tear", xPercent);
    }, LONG_PRESS_MS);
  }

  function onSparkPadPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture.downAt || gesture.swipeTriggered || gesture.longTriggered) return;
    const deltaY = gesture.downY - event.clientY;
    if (deltaY < SWIPE_MIN_DISTANCE_PX) return;
    gesture.swipeTriggered = true;
    if (gesture.longTimer !== null) {
      window.clearTimeout(gesture.longTimer);
      gesture.longTimer = null;
    }
    emitLocalSpark("star", pointToPercentX(event.currentTarget, event.clientX));
  }

  function onSparkPadPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    const xPercent = pointToPercentX(event.currentTarget, event.clientX);

    if (gesture.longTimer !== null) {
      window.clearTimeout(gesture.longTimer);
      gesture.longTimer = null;
    }

    if (gesture.swipeTriggered || gesture.longTriggered) {
      gesture.downAt = 0;
      return;
    }

    const now = Date.now();
    if (now - gesture.lastTapAt <= DOUBLE_TAP_WINDOW_MS) {
      if (gesture.tapTimer !== null) {
        window.clearTimeout(gesture.tapTimer);
        gesture.tapTimer = null;
      }
      gesture.lastTapAt = 0;
      emitLocalSpark("laugh", xPercent);
    } else {
      gesture.lastTapAt = now;
      gesture.tapTimer = window.setTimeout(() => {
        emitLocalSpark("heart", xPercent);
        gesture.tapTimer = null;
      }, DOUBLE_TAP_WINDOW_MS);
    }
    gesture.downAt = 0;
  }

  function onSparkPadPointerCancel() {
    const gesture = gestureRef.current;
    clearGestureTimers();
    gesture.downAt = 0;
    gesture.swipeTriggered = false;
    gesture.longTriggered = false;
  }

  function onSparkPadTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2 || resolvedSource === "none") return;
    const gesture = gestureRef.current;
    if (gesture.twoFingerTimer !== null) {
      window.clearTimeout(gesture.twoFingerTimer);
      gesture.twoFingerTimer = null;
    }
    const firstTouch = event.touches[0];
    if (!firstTouch) return;
    const xPercent = pointToPercentX(event.currentTarget, firstTouch.clientX);
    gesture.twoFingerTimer = window.setTimeout(() => {
      emitLocalSpark("pulse", xPercent);
      gesture.twoFingerTimer = null;
    }, TWO_FINGER_HOLD_MS);
  }

  function onSparkPadTouchEnd() {
    const gesture = gestureRef.current;
    if (gesture.twoFingerTimer !== null) {
      window.clearTimeout(gesture.twoFingerTimer);
      gesture.twoFingerTimer = null;
    }
  }

  function submitAfterglow() {
    if (!userId) return;
    const oneSentence = toSingleSentence(afterglowDraft);
    if (!oneSentence) {
      vibratePress();
      return;
    }
    setMyAfterglowSentence(oneSentence);
    setAfterglowDraft(oneSentence);
    sendBroadcast("cinema_afterglow", {
      senderId: userId,
      sentence: oneSentence,
    });
    vibrateSuccess();
  }

  const saveCinemaMemory = useCallback(async () => {
    if (!userId || !myAfterglowSentence || !partnerAfterglowSentence) return;
    if (memorySaveState === "saving") return;

    const signature = [
      myAfterglowSentence,
      partnerAfterglowSentence,
      youtubeId ?? "",
      videoSource,
      String(sparkLog.length),
      String(simultaneousMoments),
    ].join("::");

    if (savedMemorySignatureRef.current === signature) return;

    const sourceLine = youtubeId
      ? `YouTube: https://youtu.be/${youtubeId}`
      : videoSource
        ? `Direct video: ${videoSource}`
        : "Source: Unknown";

    const title = `Cinema Memory \u2022 ${new Date().toLocaleDateString()}`;
    const content = [
      "Cinema Memory",
      `When: ${new Date().toLocaleString()}`,
      sourceLine,
      `Sync drift snapshot: ${syncDriftSeconds.toFixed(2)}s`,
      `Spark count: ${sparkLog.length}`,
      `Simultaneous reactions: ${simultaneousMoments}`,
      "",
      `Me: ${myAfterglowSentence}`,
      `Partner: ${partnerAfterglowSentence}`,
    ].join("\n");

    setMemorySaveState("saving");
    setMemorySaveNote("Binding this film memory into your shared diary...");

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, content }),
      });

      if (!response.ok) {
        throw new Error("cinema-memory-save-failed");
      }

      savedMemorySignatureRef.current = signature;
      setMemorySaveState("saved");
      setMemorySaveNote("Cinema Memory saved to Shared Diary.");
      vibrateSuccess();
    } catch {
      setMemorySaveState("error");
      setMemorySaveNote("Could not save this Cinema Memory right now.");
      vibrateSoftError();
    }
  }, [
    memorySaveState,
    myAfterglowSentence,
    partnerAfterglowSentence,
    simultaneousMoments,
    sparkLog.length,
    syncDriftSeconds,
    userId,
    videoSource,
    youtubeId,
  ]);

  useEffect(() => {
    if (!afterglowOpen || !myAfterglowSentence || !partnerAfterglowSentence) return;
    void saveCinemaMemory();
  }, [afterglowOpen, myAfterglowSentence, partnerAfterglowSentence, saveCinemaMemory]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* \u2500\u2500 Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <header className="glass-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-purple-300/70 text-xs tracking-wide uppercase mb-1">
              <Clapperboard className="w-4 h-4" />
              Cinema
            </div>
            <h1 className="text-2xl font-bold text-white">Watch Together</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-purple-100/80">
            <div className="flex items-center gap-2">
              <span className={`cinema-sync-dot ${partnerActive ? "cinema-sync-dot-good" : "cinema-sync-dot-drift"}`} />
              <span>{partnerActive ? "Partner is here \u2728" : "Waiting for partner\u2026"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`cinema-sync-dot ${syncAligned ? "cinema-sync-dot-good" : "cinema-sync-dot-drift"}`} />
              <span>{syncAligned ? "Synced" : `Drift ${syncDriftSeconds.toFixed(2)}s`}</span>
              {!syncAligned && resolvedSource !== "none" && (
                <button
                  type="button"
                  onClick={doAutoResync}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-rose-500/70 hover:bg-rose-500 text-white"
                >
                  Resync
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              <span>{loading ? "Loading\u2026" : statusMessage}</span>
            </div>
          </div>
        </div>
      </header>

      {/* \u2500\u2500 Smart URL input bar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <section className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-purple-200/60 uppercase tracking-wider mb-1 block">
              YouTube URL / video ID \u00b7 or direct MP4 / WebM link
            </label>
            <input
              value={smartInput}
              onChange={onSmartInputChange}
              placeholder="Paste a YouTube link, video ID, or direct video URL\u2026"
              className="w-full rounded-xl bg-white/5 border border-purple-500/30 px-3 py-2 text-sm outline-none focus:border-purple-400"
            />
          </div>
          <div className="flex items-end gap-2 flex-shrink-0">
            {resolvedSource === "youtube" && youtubeReady && (
              <button
                type="button"
                onClick={() => {
                  const player = ytPlayerRef.current;
                  if (!player || !youtubeReady) return;
                  sendYoutubeSync("seek", player.getCurrentTime());
                }}
                className="rounded-xl px-3 py-2 text-sm bg-white/10 hover:bg-white/15 text-white"
              >
                Sync Now
              </button>
            )}
            <button
              type="button"
              onClick={beginSharedRitual}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium bg-purple-600/80 hover:bg-purple-600 text-white touch-pressable"
            >
              <Sparkles className="w-4 h-4" />
              Start Ritual
            </button>
          </div>
        </div>

        {youtubeId && videoSource && (
          <div className="mt-2 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPreferredSource("youtube")}
              className={`rounded-full px-3 py-1 border transition-colors ${
                preferredSource === "youtube"
                  ? "bg-white/15 border-white/35 text-white"
                  : "bg-white/5 border-white/15 text-purple-200/70 hover:bg-white/10"
              }`}
            >
              YouTube
            </button>
            <button
              type="button"
              onClick={() => setPreferredSource("direct")}
              className={`rounded-full px-3 py-1 border transition-colors ${
                preferredSource === "direct"
                  ? "bg-white/15 border-white/35 text-white"
                  : "bg-white/5 border-white/15 text-purple-200/70 hover:bg-white/10"
              }`}
            >
              Direct link
            </button>
          </div>
        )}
      </section>

      {/* \u2500\u2500 Theater: Video + Chat \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
        {/* Video column */}
        <section
          className="glass-card overflow-hidden"
          style={{
            background:
              "linear-gradient(165deg, color-mix(in oklab, #080c18 86%, var(--card) 14%), color-mix(in oklab, #111a30 84%, var(--card) 16%))",
          }}
        >
          {/* Couch figures */}
          <div className="flex items-end justify-center gap-10 py-2 px-4 bg-black/15">
            <div
              className={`cinema-figure ${partnerPausedHint ? "cinema-figure-curious" : ""}`}
              style={{ background: "color-mix(in oklab, var(--color-blossom) 38%, black)" }}
            />
            <div
              className={`cinema-figure cinema-figure-lean ${partnerLaughPulse % 2 === 1 ? "cinema-figure-laugh" : ""}`}
              style={{ background: "color-mix(in oklab, var(--color-sky-blush) 40%, black)" }}
            />
          </div>

          {/* Player */}
          <div className="relative" ref={videoWrapRef}>
            {youtubeId ? (
              <div className={resolvedSource === "youtube" ? "w-full" : "hidden"}>
                <div id="usverse-youtube-player" className="w-full aspect-video rounded-none overflow-hidden" />
              </div>
            ) : null}

            <video
              ref={videoRef}
              src={safeVideoUrl(videoSource)}
              controls
              playsInline
              className={`${resolvedSource === "direct" ? "w-full aspect-video bg-black" : "hidden"}`}
            />

            {resolvedSource === "none" ? (
              <div className="aspect-video grid place-items-center text-center px-6">
                <div>
                  <Zap className="w-10 h-10 mx-auto text-purple-200/60 mb-3" />
                  <p className="text-sm text-purple-100/90">Paste a YouTube or direct video link above.</p>
                </div>
              </div>
            ) : null}

            <div className="cinema-vignette" />

            {sparkParticles.map((spark) => (
              <span
                key={spark.id}
                className="cinema-spark"
                style={{
                  left: `${spark.xPercent}%`,
                  color: spark.side === "left" ? "#ffb6cf" : "#b7dfff",
                }}
              >
                {SPARK_META[spark.kind].emoji}
              </span>
            ))}

            {ritualCountdown !== null ? (
              <div className="absolute inset-0 z-30 grid place-items-center bg-black/58 countdown-poster">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <span
                      key={`kernel-${index}`}
                      className="cinema-popcorn-kernel"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.22em] text-purple-100/80 mb-2">Lights dimming</p>
                  <div
                    className="countdown-flip-digit"
                    style={{
                      fontSize: "clamp(4.2rem, 18vw, 6rem)",
                      fontFamily: "var(--font-serif), Georgia, serif",
                    }}
                  >
                    {ritualCountdown}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Fullscreen button */}
            {resolvedSource !== "none" ? (
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className="absolute top-2 right-2 z-20 rounded-lg bg-black/45 p-1.5 text-white hover:bg-black/65 transition-colors"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            ) : null}

            {/* Spark pad */}
            {resolvedSource !== "none" ? (
              <div
                className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/65 via-black/20 to-transparent"
                onPointerDown={onSparkPadPointerDown}
                onPointerMove={onSparkPadPointerMove}
                onPointerUp={onSparkPadPointerUp}
                onPointerCancel={onSparkPadPointerCancel}
                onTouchStart={onSparkPadTouchStart}
                onTouchEnd={onSparkPadTouchEnd}
                onTouchCancel={onSparkPadTouchEnd}
              >
                <p className="absolute left-3 bottom-2 text-[10px] text-purple-100/80 tracking-wide">
                  Tap \u00b7 double-tap \u00b7 long-press \u00b7 swipe up \u00b7 shake \u00b7 two-finger hold
                </p>
              </div>
            ) : null}
          </div>

          {/* Reaction buttons */}
          <div className="p-3 flex flex-wrap gap-1.5">
            {(
              [
                ["heart", "\u{1F495}"],
                ["laugh", "\u{1F602}"],
                ["tear", "\u{1F62D}"],
                ["star", "\u{1F31F}"],
                ["shock", "\u{1F631}"],
                ["pulse", "\u{1F90D}"],
              ] as Array<[SparkKind, string]>
            ).map(([kind, emoji]) => (
              <button
                key={kind}
                type="button"
                onClick={() => emitLocalSpark(kind, kind === "shock" ? 50 : 18)}
                className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs hover:bg-white/15 touch-pressable"
              >
                {emoji} {SPARK_META[kind].label}
              </button>
            ))}
          </div>

          {/* Reaction waveform */}
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs text-purple-100/80 mb-2">
              <Waves className="w-3.5 h-3.5" />
              <span>Reaction timeline</span>
            </div>
            <div className="h-16 flex items-end gap-1">
              {waveform.bars.map((height, index) => (
                <span
                  key={`wave-${index}`}
                  className="cinema-wave-bar"
                  style={{
                    height: `${Math.max(10, height)}%`,
                    opacity: index === clampedWaveCursor ? 1 : 0.45,
                  }}
                />
              ))}
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, waveform.bars.length - 1)}
              value={clampedWaveCursor}
              onChange={(event) => {
                const next = Number(event.target.value);
                setWaveCursor(clamp(next, 0, waveform.bars.length - 1));
              }}
              className="mt-2 w-full accent-[var(--color-peach)]"
            />
            <p className="mt-1 text-xs text-purple-100/75">{selectedWaveLabel}</p>
          </div>
        </section>

        {/* \u2500\u2500 Chat sidebar \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        <section className="glass-card flex flex-col cinema-chat-panel">
          <div className="p-3 border-b border-white/10 flex items-center gap-2 flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-purple-300/80" />
            <span className="text-sm font-semibold text-white">Live Chat</span>
            {chatMessages.length > 0 && (
              <span className="ml-auto text-xs text-purple-200/50">{chatMessages.length}</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {chatMessages.length === 0 ? (
              <p className="text-center text-xs text-purple-200/50 mt-8 px-4">
                No messages yet.
                <br />
                Say something! {"💬"}
              </p>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === userId ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                      msg.senderId === userId
                        ? "bg-purple-600/70 text-white rounded-br-sm"
                        : "bg-white/10 text-purple-100 rounded-bl-sm"
                    }`}
                  >
                    <p className="break-words">{msg.text}</p>
                    <p className="text-[10px] opacity-60 mt-0.5 text-right">{formatChatTime(msg.sentAt)}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatScrollRef} />
          </div>

          <div className="p-3 border-t border-white/10 flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChat();
              }}
              className="flex gap-2"
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value.slice(0, MAX_CHAT_LENGTH))}
                placeholder={userId && coupleId ? "Say something\u2026" : "Connect first to chat"}
                disabled={!userId || !coupleId}
                className="flex-1 min-w-0 rounded-xl bg-white/5 border border-purple-500/30 px-3 py-1.5 text-sm outline-none focus:border-purple-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || !userId || !coupleId}
                className="rounded-xl px-2.5 py-1.5 bg-purple-600/80 hover:bg-purple-600 disabled:opacity-40 flex-shrink-0 text-white transition-colors"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            {chatInput.length > 150 && (
              <p className="text-right text-[10px] text-purple-200/50 mt-1">
                {chatInput.length}/{MAX_CHAT_LENGTH}
              </p>
            )}
          </div>
        </section>
      </div>

      {/* \u2500\u2500 Afterglow \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      {afterglowOpen ? (
        <section className="glass-card p-4 md:p-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-purple-300/70">Afterglow</p>
            <h2 className="text-2xl text-white" style={{ fontFamily: "var(--font-accent), cursive" }}>
              What did you feel?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-purple-500/20 bg-black/15 p-3">
              <p className="text-xs uppercase tracking-wider text-purple-300/70 mb-2">Your sentence</p>
              {myAfterglowSentence ? (
                <p className="text-sm text-purple-100">{myAfterglowSentence}</p>
              ) : (
                <>
                  <textarea
                    value={afterglowDraft}
                    onChange={(event) => setAfterglowDraft(event.target.value)}
                    rows={3}
                    placeholder="One sentence only"
                    className="w-full rounded-xl bg-white/5 border border-purple-500/30 px-3 py-2 text-sm outline-none focus:border-purple-400"
                  />
                  <button
                    type="button"
                    onClick={submitAfterglow}
                    className="mt-2 rounded-lg px-3 py-1.5 text-xs bg-purple-600/80 hover:bg-purple-600 touch-pressable"
                  >
                    Save my sentence
                  </button>
                </>
              )}
            </div>

            <div className="rounded-xl border border-purple-500/20 bg-black/15 p-3">
              <p className="text-xs uppercase tracking-wider text-purple-300/70 mb-2">Partner sentence</p>
              {partnerAfterglowSentence ? (
                <p className="text-sm text-purple-100">{partnerAfterglowSentence}</p>
              ) : (
                <p className="text-sm text-purple-200/70">Waiting for their reflection\u2026</p>
              )}
            </div>
          </div>

          {myAfterglowSentence && partnerAfterglowSentence ? (
            <div className="rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-900/25 via-black/20 to-rose-900/20 p-4 grid md:grid-cols-[130px_1fr] gap-4">
              {posterArtUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={posterArtUrl}
                  alt="Poster reference"
                  className="w-full h-28 md:h-full object-cover rounded-xl border border-white/10"
                />
              ) : (
                <div className="h-28 md:h-full rounded-xl border border-white/10 bg-black/25 grid place-items-center text-purple-200/70 text-xs px-3 text-center">
                  Cinema memory card
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-purple-300/70 mb-1">Cinema Memory</p>
                <h3 className="text-lg font-semibold text-white">Private Film Festival Entry</h3>
                <p className="text-xs text-purple-200/70 mb-3">{new Date().toLocaleString()}</p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <blockquote className="rounded-lg border border-white/10 bg-black/20 p-2 text-purple-100">
                    &quot;{myAfterglowSentence}&quot;
                  </blockquote>
                  <blockquote className="rounded-lg border border-white/10 bg-black/20 p-2 text-purple-100">
                    &quot;{partnerAfterglowSentence}&quot;
                  </blockquote>
                </div>
                <p className="mt-3 text-xs text-purple-200/75">
                  Sparks captured: {sparkLog.length} \u00b7 simultaneous reactions: {simultaneousMoments}
                </p>
                {memorySaveNote ? (
                  <p
                    className="mt-1 text-xs"
                    style={{
                      color:
                        memorySaveState === "error"
                          ? "var(--color-peach)"
                          : memorySaveState === "saved"
                            ? "var(--color-mint-kiss)"
                            : "var(--color-butter)",
                    }}
                  >
                    {memorySaveNote}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* \u2500\u2500 Advanced: WebRTC P2P \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      <details className="glass-card overflow-hidden group">
        <summary className="p-4 cursor-pointer flex items-center gap-2 text-white font-semibold select-none list-none">
          <Wifi className="w-4 h-4 text-emerald-300" />
          Advanced \u2014 Direct Video &amp; WebRTC P2P
          {p2pStatus !== "idle" && (
            <span className="ml-2 text-xs text-emerald-300 font-normal">
              {p2pStatus}
              {p2pRole !== "none" ? ` \u00b7 ${p2pRole}` : ""}
            </span>
          )}
          <span className="ml-auto group-open:rotate-180 transition-transform text-purple-300/60 text-base leading-none">\u25be</span>
        </summary>

        <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
          <p className="text-xs text-purple-200/70">
            For syncing direct video files (MP4/WebM) over WebRTC. Supabase is used only for offer/answer/ICE signaling.
            Playback sync runs on a direct data channel.
          </p>

          <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2">
            <input
              value={videoInput}
              onChange={(event) => setVideoInput(event.target.value)}
              placeholder="Direct MP4/WebM URL"
              className="rounded-xl bg-white/5 border border-purple-500/30 px-3 py-2 text-sm outline-none focus:border-purple-400"
            />
            <button
              type="button"
              onClick={() => {
                setVideoSource(safeVideoUrl(videoInput));
                setSmartInput(videoInput.trim());
                setPreferredSource("direct");
              }}
              className="rounded-xl px-4 py-2 text-sm bg-white/10 hover:bg-white/15 text-white"
            >
              <MonitorPlay className="w-4 h-4 inline mr-1" />
              Load
            </button>
            <button
              type="button"
              onClick={() => {
                void startHosting();
              }}
              disabled={!coupleId || p2pStatus === "connecting"}
              className="rounded-xl px-4 py-2 text-sm bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-50 text-white"
            >
              <Link2 className="w-4 h-4 inline mr-1" />
              Host P2P
            </button>
          </div>

          {p2pError ? (
            <div className="rounded-xl border border-rose-300/25 bg-rose-200/10 px-3 py-2 text-xs text-rose-100">
              {p2pError}
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const video = videoRef.current;
                if (!video) return;
                void video.play();
              }}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 text-white"
            >
              <Play className="w-3.5 h-3.5" />
              Play
            </button>
            <button
              type="button"
              onClick={() => {
                videoRef.current?.pause();
              }}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 text-white"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause
            </button>
            <button
              type="button"
              onClick={endP2P}
              className="rounded-lg px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 text-white"
            >
              Disconnect P2P
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
