import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clapperboard,
  Gamepad2,
  Heart,
  MessageCircle,
  Timer,
  WandSparkles,
} from "lucide-react";

const highlights = [
  {
    title: "Live Chat",
    description: "Stay synced with a private, beautiful chat space made for two.",
    icon: MessageCircle,
  },
  {
    title: "Daily Sparks",
    description: "Thoughtful prompts that keep your connection warm and playful.",
    icon: Heart,
  },
  {
    title: "Shared Diary",
    description: "Capture moments, dreams, and memories in one cozy timeline.",
    icon: BookOpen,
  },
  {
    title: "Countdown Magic",
    description: "Feel the excitement rise as special dates draw closer.",
    icon: Timer,
  },
  {
    title: "Bloom + Play",
    description: "Create, doodle, and laugh together with fun interactive moments.",
    icon: Gamepad2,
  },
  {
    title: "Cinema Nights",
    description: "Turn ordinary evenings into tiny date-night experiences.",
    icon: Clapperboard,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="glass-card overflow-hidden p-6 md:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <Pill className="border border-[var(--border)] text-[var(--text-soft)]">
                First impression, unforgettable
              </Pill>
              <h1 className="font-serif text-4xl leading-tight md:text-6xl">
                Your{" "}
                <span className="gradient-text inline-flex items-center gap-2">
                  Love Universe
                  <Heart className="h-8 w-8 animate-heartbeat" />
                </span>
                <br />
                starts here.
              </h1>
              <p className="max-w-2xl text-base text-[var(--text-soft)] md:text-lg">
                UsVerse is a private digital world for couples—chat, memories, countdowns,
                playful experiences, and little sparks of affection in one warm home.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="touch-pressable inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white animate-pulse-glow"
                  style={{ background: "var(--gradient-heartbeat)" }}
                >
                  Enter UsVerse <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#features"
                  className="touch-pressable inline-flex items-center rounded-full border border-[var(--border)] px-6 py-3 text-sm font-semibold text-[var(--foreground)]"
                >
                  Explore features
                </a>
              </div>
            </div>

            <Card className="space-y-4">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-whisper)]">
                Built for two hearts
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Private" value="100%" />
                <Stat label="Moments" value="∞" />
                <Stat label="Features" value="8+" />
                <Stat label="Vibe" value="Love" />
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-black/10 p-4">
                <p className="text-sm text-[var(--text-soft)]">
                  “It feels like someone designed an app around our relationship, not just around
                  tasks.”
                </p>
              </div>
            </Card>
          </div>
        </section>

        <section id="features" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {highlights.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="space-y-4">
              <RoundIcon className="text-white" style={{ background: "var(--gradient-heartbeat)" }}>
                <Icon className="h-5 w-5" />
              </RoundIcon>
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-[var(--text-soft)]">{description}</p>
              </div>
            </Card>
          ))}
        </section>

        <section className="glass-card rounded-3xl p-6 text-center md:p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--text-whisper)]">Ready?</p>
          <h2 className="mt-2 font-serif text-3xl md:text-4xl">
            Make your relationship feel{" "}
            <span className="inline-flex items-center gap-2 gradient-text">
              magical <WandSparkles className="h-6 w-6" />
            </span>
          </h2>
          <Link
            href="/login"
            className="touch-pressable mt-6 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white"
            style={{ background: "var(--gradient-moonlight)" }}
          >
            Create your shared space
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`rounded-3xl bg-[#E7DD93] p-5 min-h-[184px] ${className}`}>{children}</div>;
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-full px-6 py-2 text-2xl leading-none text-center min-w-[120px] ${className ?? ""}`}>
      {children}
    </div>
  );
}

function RoundIcon({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center ${className ?? ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-black/5 p-3">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs uppercase tracking-widest text-[var(--text-whisper)]">{label}</p>
    </div>
  );
}
