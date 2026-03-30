"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  BookOpen,
  HelpCircle,
  Timer,
  WandSparkles,
  LogOut,
  Home,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/presence", label: "Presence", icon: Heart },
  { href: "/daily", label: "Daily", icon: HelpCircle },
  { href: "/notes", label: "Diary", icon: BookOpen },
  { href: "/countdown", label: "Countdown", icon: Timer },
  { href: "/bloom", label: "Bloom", icon: WandSparkles },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 glass-card rounded-none border-r border-purple-500/10 z-40 p-4">
        <div className="flex items-center gap-2 px-2 py-4 mb-6">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center animate-pulse-glow">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">UsVerse</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                    : "text-purple-300/50 hover:text-purple-300 hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all mt-4"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-card rounded-none border-t border-purple-500/10">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all ${
                  active ? "text-purple-400" : "text-purple-400/40"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
