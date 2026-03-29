import Link from "next/link";
import { Heart, Star } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-900/30 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 rounded-full bg-pink-900/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-indigo-900/30 blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-pink-400 animate-heartbeat" />
          <span className="text-xl font-bold gradient-text">UsVerse</span>
        </div>
        <Link
          href="/login"
          className="px-5 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-all hover:scale-105"
        >
          Enter Your Universe
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-20 text-center">
        <div className="animate-float mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-2xl animate-pulse-glow">
            <Heart className="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="gradient-text">Your Private</span>
          <br />
          <span className="text-white">Universe</span>
        </h1>

        <p className="text-lg md:text-xl text-purple-200/80 max-w-2xl mb-10 leading-relaxed">
          Distance doesn&apos;t break love — lack of shared moments does.
          UsVerse is where two people don&apos;t just talk…{" "}
          <span className="text-pink-400 font-medium">
            they live together digitally.
          </span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link
            href="/login"
            className="px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold text-lg hover:opacity-90 hover:scale-105 transition-all shadow-lg shadow-purple-900/40"
          >
            Start Your Universe ✨
          </Link>
          <a
            href="#features"
            className="px-8 py-4 rounded-full border border-purple-500/40 text-purple-200 font-semibold text-lg hover:border-purple-400 hover:text-white transition-all"
          >
            See Features
          </a>
        </div>

        {/* Feature grid */}
        <div
          id="features"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full"
        >
          {features.map((f) => (
            <div
              key={f.title}
              className="glass-card p-6 text-left hover:border-purple-500/40 transition-all"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-purple-200/60 leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quote section */}
      <section className="relative z-10 py-20 px-6 text-center">
        <blockquote className="max-w-3xl mx-auto">
          <p className="text-2xl md:text-3xl text-white font-light leading-relaxed italic">
            &ldquo;Love is not about holding someone close… it is about{" "}
            <span className="shimmer-text font-semibold not-italic">
              creating a space where distance cannot enter.
            </span>
            &rdquo;
          </p>
        </blockquote>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-purple-400/50 text-sm">
        <div className="flex items-center justify-center gap-2">
          <Star className="w-3 h-3" />
          <span>UsVerse — Built with love, for love</span>
          <Star className="w-3 h-3" />
        </div>
      </footer>
    </main>
  );
}

const features = [
  {
    icon: "💓",
    title: "Digital Presence",
    desc: "Let her know you're thinking of her — no words needed. Real-time emotional presence that bridges the distance.",
  },
  {
    icon: "💬",
    title: "Private Chat",
    desc: "A space that belongs only to the two of you. Real-time messages, no noise, just you.",
  },
  {
    icon: "🌙",
    title: "Daily Questions",
    desc: "One question every day. Deep prompts that help you rediscover each other and grow closer.",
  },
  {
    icon: "🫂",
    title: "Virtual Touch",
    desc: "Send a heartbeat, a hug, or a kiss. Physical affection translated into digital sensation.",
  },
  {
    icon: "📖",
    title: "Shared Diary",
    desc: "Write together, feel together. A private journal where both your souls speak.",
  },
  {
    icon: "⏳",
    title: "Countdown",
    desc: "Every day closer. A countdown to when you'll finally hold each other again.",
  },
  {
    icon: "💔",
    title: "Silent Mode",
    desc: "When words fail, silence speaks. Tap 'I feel empty' — she'll know, without a word.",
  },
  {
    icon: "🤖",
    title: "AI Love Assistant",
    desc: "Stuck in silence? The AI suggests what your heart wants to say but can't find words for.",
  },
  {
    icon: "🌌",
    title: "Your Universe",
    desc: "Private, encrypted, just two of you. No ads, no strangers. Only your world.",
  },
];

