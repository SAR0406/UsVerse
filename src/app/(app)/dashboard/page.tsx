import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  BookOpen,
  HelpCircle,
  Timer,
  Sparkles,
  WandSparkles,
  Gamepad2,
  Clapperboard,
  ArrowRight,
  Orbit,
  Bot,
  Link2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName =
    user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "You";

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", user.id)
    .maybeSingle();

  let partnerName: string | null = null;

  if (myProfile?.couple_id) {
    const { data: couple } = await supabase
      .from("couples")
      .select("user1_id, user2_id")
      .eq("id", myProfile.couple_id)
      .maybeSingle();

    const partnerId = couple
      ? couple.user1_id === user.id
        ? couple.user2_id
        : couple.user1_id
      : null;

    if (partnerId) {
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", partnerId)
        .maybeSingle();
      partnerName = partnerProfile?.display_name ?? "your partner";
    }
  }

  const greeting = getGreeting();
  const pulseLine = getPulseLine(partnerName);
  const focusCards = getFocusCards(partnerName);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="glass-card p-5 sm:p-7 border border-purple-400/20 relative overflow-hidden">
          <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,107,157,0.32)_0%,transparent_65%)] pointer-events-none" />
          <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-[radial-gradient(circle_at_center,rgba(152,90,255,0.3)_0%,transparent_70%)] pointer-events-none" />

          <p className="text-[color:var(--text-soft)] text-sm mb-2">{greeting}</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[color:var(--foreground)] leading-tight">
            Welcome back, <span className="gradient-text">{displayName}</span>
          </h1>
          <p className="text-sm sm:text-base text-[color:var(--text-soft)] mt-3 max-w-2xl">
            {pulseLine}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-500/25 hover:bg-purple-500/35 text-purple-100 px-4 py-2.5 text-sm font-semibold border border-purple-400/40 transition"
            >
              <MessageCircle className="w-4 h-4" />
              Open Chat
            </Link>
            <Link
              href="/presence"
              className="inline-flex items-center gap-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-100 px-4 py-2.5 text-sm font-semibold border border-pink-400/30 transition"
            >
              <Heart className="w-4 h-4" />
              Send Presence
            </Link>
          </div>
        </section>

        <section className="glass-card p-5 sm:p-6 border border-purple-400/15">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-whisper)] mb-3">
            Relationship signal
          </p>
          <div
            className={`rounded-xl border px-4 py-3 ${
              partnerName
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}
          >
            <p className="text-sm font-medium">
              {partnerName ? (
                <>
                  ✅ Connected with <strong>{partnerName}</strong>
                </>
              ) : (
                <>
                  ⏳ Invite pending · Open <strong>Chat</strong> to connect and unlock shared moments
                </>
              )}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2.5">
            {focusCards.map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3.5 py-3 flex items-start gap-3"
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${card.bg}`}>
                  <card.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[color:var(--foreground)]">{card.title}</p>
                  <p className="text-xs text-[color:var(--text-soft)] mt-0.5">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-semibold text-[color:var(--foreground)]">Launch your shared universe</h2>
          <p className="text-xs text-[color:var(--text-whisper)]">tap any card to continue your story</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="glass-card p-5 hover:border-purple-500/40 transition-all group hover:scale-[1.02] relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${action.bgColor}`}
            >
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-[color:var(--foreground)] mb-1">{action.title}</h3>
              {action.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-purple-400/30 text-[color:var(--text-soft)]">
                  {action.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-[color:var(--text-soft)] leading-relaxed mb-3">
              {action.desc}
            </p>
            <div className="flex items-center gap-1 text-[color:var(--text-whisper)] text-xs group-hover:text-[color:var(--foreground)] transition-colors">
              Open <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="glass-card p-6 text-center">
          <Sparkles className="w-5 h-5 text-purple-400 mx-auto mb-3" />
          <p className="text-[color:var(--foreground)] font-light italic text-lg leading-relaxed">
            &ldquo;{getDailyQuote()}&rdquo;
          </p>
          <p className="text-[color:var(--text-whisper)] text-xs mt-3">Daily reminder</p>
        </div>
        <div className="glass-card p-5 border border-purple-500/15">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-whisper)] mb-3">
            First impression lane
          </p>
          <ul className="space-y-3">
            {firstImpressionLane.map((item) => (
              <li key={item.title} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[color:var(--surface-2)] border border-[color:var(--border)] flex items-center justify-center">
                  <item.icon className="w-3.5 h-3.5 text-[color:var(--text-soft)]" />
                </div>
                <div>
                  <p className="text-sm text-[color:var(--foreground)] font-medium">{item.title}</p>
                  <p className="text-xs text-[color:var(--text-soft)]">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "🌙 Late night…";
  if (hour < 12) return "☀️ Good morning";
  if (hour < 17) return "🌤️ Good afternoon";
  if (hour < 21) return "🌅 Good evening";
  return "🌙 Good night";
}

function getDailyQuote() {
  const quotes = [
    "Distance is not for the fearful, it is for the bold.",
    "I carry your heart with me. I carry it in my heart.",
    "The pain of parting is nothing to the joy of meeting again.",
    "Love knows not distance; it hath no continent its is not sea that can divide.",
    "No matter where I am, no matter where I go, your heart is my northern light.",
    "True love doesn't mean being inseparable; it means being separated and nothing changes.",
    "Distance gives us a reason to love harder.",
  ];
  const day = new Date().getDate();
  return quotes[day % quotes.length];
}

function getPulseLine(partnerName: string | null) {
  if (partnerName) {
    return `You and ${partnerName} are synced. Pick a memory lane, start a game, or drop a message that turns this moment into a keepsake.`;
  }
  return "Your universe is ready. Send the invite, start the first conversation, and shape this space into your own shared ritual.";
}

function getFocusCards(partnerName: string | null) {
  return [
    {
      title: partnerName ? "Pair bond active" : "Pairing in progress",
      desc: partnerName
        ? "Live connection is unlocked and shared features are ready."
        : "Invite your partner to unlock all shared features.",
      icon: Link2,
      bg: partnerName ? "bg-emerald-600" : "bg-amber-600",
    },
    {
      title: "Living atmosphere",
      desc: "Ambient canvas and motion respond to your journey in real time.",
      icon: Orbit,
      bg: "bg-purple-700",
    },
    {
      title: "AI spark ready",
      desc: "Open Daily, Presence, and Chat to keep emotional momentum alive.",
      icon: Bot,
      bg: "bg-pink-700",
    },
  ];
}

const quickActions = [
  {
    href: "/chat",
    title: "Private Chat",
    desc: "Real-time messages, just for the two of you.",
    icon: MessageCircle,
    bgColor: "bg-purple-600",
    badge: "Core",
  },
  {
    href: "/presence",
    title: "Presence & Touch",
    desc: "Send your heartbeat, a hug, or a silent feeling.",
    icon: Heart,
    bgColor: "bg-pink-600",
    badge: "Favorite",
  },
  {
    href: "/daily",
    title: "Daily Question",
    desc: "One deep question to reconnect every day.",
    icon: HelpCircle,
    bgColor: "bg-indigo-600",
    badge: "Daily",
  },
  {
    href: "/notes",
    title: "Shared Diary",
    desc: "Write together, feel together.",
    icon: BookOpen,
    bgColor: "bg-violet-600",
    badge: "Write",
  },
  {
    href: "/countdown",
    title: "Countdown",
    desc: "Days until you hold each other again.",
    icon: Timer,
    bgColor: "bg-fuchsia-600",
    badge: "Plan",
  },
  {
    href: "/presence#silent",
    title: "Silent Mode",
    desc: "Too empty to speak? She'll know.",
    icon: Heart,
    bgColor: "bg-rose-700",
    badge: "Mood",
  },
  {
    href: "/bloom",
    title: "Bloom Studio",
    desc: "Paint, collage, and transform memories into stickers.",
    icon: WandSparkles,
    bgColor: "bg-pink-600",
    badge: "Create",
  },
  {
    href: "/play",
    title: "The Arcade",
    desc: "Step into your miniature game world and play together.",
    icon: Gamepad2,
    bgColor: "bg-purple-700",
    badge: "Play",
  },
  {
    href: "/cinema",
    title: "Cinema",
    desc: "Watch together in one shared room with sparks and afterglow.",
    icon: Clapperboard,
    bgColor: "bg-slate-700",
    badge: "Watch",
  },
];

const firstImpressionLane = [
  {
    title: "Connect in seconds",
    desc: "Start with chat and make your first heartbeat exchange.",
    icon: MessageCircle,
  },
  {
    title: "Shape your rituals",
    desc: "Daily questions and countdowns turn time into intimacy.",
    icon: Sparkles,
  },
  {
    title: "Create shared memories",
    desc: "Bloom, Arcade, and Cinema turn distance into moments.",
    icon: WandSparkles,
  },
];
