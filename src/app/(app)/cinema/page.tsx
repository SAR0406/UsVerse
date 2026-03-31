"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard, Play, Pause, Radio, Wifi, Link2, MonitorPlay } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SyncAction = "play" | "pause" | "seek";
type P2PStatus = "idle" | "connecting" | "connected" | "error";
type P2PRole = "none" | "host" | "guest";

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

  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Connecting room…");
  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);

  const [youtubeInput, setYoutubeInput] = useState("");
  const [youtubeReady, setYoutubeReady] = useState(false);
  const [youtubeApiReady, setYoutubeApiReady] = useState(false);

  const [videoInput, setVideoInput] = useState("");
  const [videoSource, setVideoSource] = useState("");
  const [p2pStatus, setP2pStatus] = useState<P2PStatus>("idle");
  const [p2pRole, setP2pRole] = useState<P2PRole>("none");
  const [p2pError, setP2pError] = useState<string | null>(null);

  const youtubeId = useMemo(() => extractYouTubeId(youtubeInput), [youtubeInput]);

  const sendBroadcast = useCallback(
    (event: "cinema_sync" | "cinema_signal", payload: CinemaSyncPayload | SignalPayload) => {
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

  const applyRemoteYoutubeSync = useCallback((payload: CinemaSyncPayload) => {
    const player = ytPlayerRef.current;
    if (!player) return;

    const networkDelay = (Date.now() - payload.sentAt) / 1000;
    const correctedTime = payload.timestamp + networkDelay;
    const drift = Math.abs(player.getCurrentTime() - correctedTime);

    suppressYouTubeRef.current = true;
    if (payload.action === "seek" || drift > DRIFT_THRESHOLD_SECONDS) {
      player.seekTo(correctedTime, true);
    }
    if (payload.action === "play") player.playVideo();
    if (payload.action === "pause") player.pauseVideo();
    window.setTimeout(() => {
      suppressYouTubeRef.current = false;
    }, SUPPRESS_DURATION_MS);
  }, []);

  const closePeer = useCallback(() => {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    pendingCandidatesRef.current = [];
  }, []);

  const applyP2PSync = useCallback((payload: CinemaSyncPayload) => {
    const video = videoRef.current;
    if (!video) return;

    const lag = (Date.now() - payload.sentAt) / 1000;
    const corrected = payload.timestamp + lag;

    suppressVideoRef.current = true;
    if (payload.action === "seek" || Math.abs(video.currentTime - corrected) > DRIFT_THRESHOLD_SECONDS) {
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
  }, []);

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
          const payload = JSON.parse(event.data) as CinemaSyncPayload;
          applyP2PSync(payload);
        } catch (error) {
          console.warn("Invalid P2P sync payload received", { error, raw: event.data });
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
      } catch (error) {
        console.warn("Failed to apply ICE candidate", { error, candidate, state: connection.connectionState });
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
      } catch (error) {
        console.warn("Failed to process WebRTC signal", { error, kind: payload.kind });
        setP2pStatus("error");
        setP2pError("WebRTC signaling failed. Try reconnecting.");
      }
    },
    [createPeerConnection, flushPendingCandidates, p2pRole, sendBroadcast, userId],
  );

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
      .subscribe();

    channelRef.current = channel;

    return () => {
      closePeer();
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [applyRemoteYoutubeSync, closePeer, coupleId, handleSignal, supabase, userId]);

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
        },
      },
    });

    return () => {
      ytPlayerRef.current?.destroy();
      ytPlayerRef.current = null;
      setYoutubeReady(false);
    };
  }, [sendYoutubeSync, youtubeApiReady, youtubeId]);

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => sendP2PSync("play");
    const onPause = () => sendP2PSync("pause");
    const onSeeked = () => sendP2PSync("seek");

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [sendP2PSync]);

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
    } catch (error) {
      console.warn("Failed to start P2P host", error);
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="glass-card p-6">
        <div className="flex items-center gap-2 text-purple-300/70 text-xs tracking-wide uppercase mb-3">
          <Clapperboard className="w-4 h-4" />
          Cinema Sync
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Watch Together</h1>
        <p className="text-sm text-purple-200/80">{loading ? "Loading…" : statusMessage}</p>
      </header>

      <section className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Radio className="w-4 h-4 text-red-300" />
          Tier 1 — YouTube + Supabase Broadcast
        </div>
        <p className="text-xs text-purple-200/70">
          Play, pause, and seek sync over Supabase Realtime Broadcast with timestamp lag compensation.
        </p>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            value={youtubeInput}
            onChange={(event) => setYoutubeInput(event.target.value)}
            placeholder="Paste YouTube URL or 11-char video ID"
            className="flex-1 rounded-xl bg-white/5 border border-purple-500/30 px-3 py-2 text-sm outline-none focus:border-purple-400"
          />
          <button
            type="button"
            onClick={() => {
              const player = ytPlayerRef.current;
              if (!player || !youtubeReady) return;
              sendYoutubeSync("seek", player.getCurrentTime());
            }}
            disabled={!youtubeReady}
            className="rounded-xl px-4 py-2 text-sm bg-white/10 hover:bg-white/15 disabled:opacity-50"
          >
            Sync Current Time
          </button>
        </div>
        {youtubeId ? (
          <div className="rounded-2xl border border-purple-500/20 bg-black/30 p-3">
            <div id="usverse-youtube-player" className="w-full aspect-video rounded-xl overflow-hidden" />
          </div>
        ) : (
          <div className="rounded-xl border border-amber-300/25 bg-amber-200/10 px-3 py-2 text-xs text-amber-100">
            Enter a valid YouTube URL or video ID to start.
          </div>
        )}
      </section>

      <section className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Wifi className="w-4 h-4 text-emerald-300" />
          Tier 2 — WebRTC P2P (Any Direct Video URL)
        </div>
        <p className="text-xs text-purple-200/70">
          Supabase is used only for offer/answer/ICE signaling. Playback sync runs on a direct data channel.
        </p>
        <div className="grid md:grid-cols-[1fr_auto_auto] gap-2">
          <input
            value={videoInput}
            onChange={(event) => setVideoInput(event.target.value)}
            placeholder="Direct MP4/WebM URL"
            className="rounded-xl bg-white/5 border border-purple-500/30 px-3 py-2 text-sm outline-none focus:border-purple-400"
          />
          <button
            type="button"
            onClick={() => setVideoSource(videoInput.trim())}
            className="rounded-xl px-4 py-2 text-sm bg-white/10 hover:bg-white/15"
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
            className="rounded-xl px-4 py-2 text-sm bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-50"
          >
            <Link2 className="w-4 h-4 inline mr-1" />
            Host P2P
          </button>
        </div>
        <div className="text-xs text-purple-200/70">
          Status: <span className="text-white">{p2pStatus}</span>
          {p2pRole !== "none" ? (
            <>
              {" "}
              · Role: <span className="text-white">{p2pRole}</span>
            </>
          ) : null}
        </div>
        {p2pError ? (
          <div className="rounded-xl border border-rose-300/25 bg-rose-200/10 px-3 py-2 text-xs text-rose-100">
            {p2pError}
          </div>
        ) : null}
        <div className="rounded-2xl border border-purple-500/20 bg-black/30 p-3">
          <video
            ref={videoRef}
            src={videoSource}
            controls
            playsInline
            className="w-full aspect-video rounded-xl bg-black"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const video = videoRef.current;
              if (!video) return;
              void video.play();
            }}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15"
          >
            <Play className="w-3.5 h-3.5" />
            Play
          </button>
          <button
            type="button"
            onClick={() => {
              videoRef.current?.pause();
            }}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15"
          >
            <Pause className="w-3.5 h-3.5" />
            Pause
          </button>
          <button
            type="button"
            onClick={endP2P}
            className="rounded-lg px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15"
          >
            Disconnect P2P
          </button>
        </div>
      </section>
    </div>
  );
}
