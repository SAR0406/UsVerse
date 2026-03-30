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
  ArrowRight,
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

  const greeting = getGreeting();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-purple-300/60 text-sm mb-1">{greeting}</p>
        <h1 className="text-3xl font-bold text-white">
          Welcome back,{" "}
          <span className="gradient-text">{displayName}</span> 💫
        </h1>
        <p className="text-purple-300/50 mt-2 text-sm">
          Your universe is waiting.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="glass-card p-5 hover:border-purple-500/40 transition-all group hover:scale-[1.02]"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${action.bgColor}`}
            >
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-white mb-1">{action.title}</h3>
            <p className="text-xs text-purple-300/50 leading-relaxed mb-3">
              {action.desc}
            </p>
            <div className="flex items-center gap-1 text-purple-400/60 text-xs group-hover:text-purple-400 transition-colors">
              Open <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quote of the day */}
      <div className="glass-card p-6 text-center">
        <Sparkles className="w-5 h-5 text-purple-400 mx-auto mb-3" />
        <p className="text-purple-100 font-light italic text-lg leading-relaxed">
          &ldquo;{getDailyQuote()}&rdquo;
        </p>
        <p className="text-purple-400/40 text-xs mt-3">Daily reminder</p>
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

const quickActions = [
  {
    href: "/chat",
    title: "Private Chat",
    desc: "Real-time messages, just for the two of you.",
    icon: MessageCircle,
    bgColor: "bg-purple-600",
  },
  {
    href: "/presence",
    title: "Presence & Touch",
    desc: "Send your heartbeat, a hug, or a silent feeling.",
    icon: Heart,
    bgColor: "bg-pink-600",
  },
  {
    href: "/daily",
    title: "Daily Question",
    desc: "One deep question to reconnect every day.",
    icon: HelpCircle,
    bgColor: "bg-indigo-600",
  },
  {
    href: "/notes",
    title: "Shared Diary",
    desc: "Write together, feel together.",
    icon: BookOpen,
    bgColor: "bg-violet-600",
  },
  {
    href: "/countdown",
    title: "Countdown",
    desc: "Days until you hold each other again.",
    icon: Timer,
    bgColor: "bg-fuchsia-600",
  },
  {
    href: "/presence#silent",
    title: "Silent Mode",
    desc: "Too empty to speak? She'll know.",
    icon: Heart,
    bgColor: "bg-rose-700",
  },
  {
    href: "/bloom",
    title: "Bloom Studio",
    desc: "Paint, collage, and transform memories into stickers.",
    icon: WandSparkles,
    bgColor: "bg-pink-600",
  },
  {
    href: "/play",
    title: "The Arcade",
    desc: "Step into your miniature game world and play together.",
    icon: Gamepad2,
    bgColor: "bg-purple-700",
  },
];
