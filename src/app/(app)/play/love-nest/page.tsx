"use client";

// Our Home — A couples house management game.
// Rooms, tasks, pet, memories, love meter, cooking mini-game and daily life together.

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  Bath,
  Bed,
  Camera,
  Check,
  ChefHat,
  ChevronLeft,
  Flower2,
  Heart,
  Home,
  Music,
  PawPrint,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";

type RoomId = "bedroom" | "kitchen" | "living" | "bathroom" | "garden";
type PetType = "cat" | "dog" | "bunny" | "hamster";
type TaskCategory = "chore" | "romantic" | "special";
type Tab = "house" | "room" | "pet" | "memories" | "us";

interface Task {
  id: string;
  room: RoomId;
  title: string;
  emoji: string;
  lp: number;
  category: TaskCategory;
  tip: string;
}

interface Pet {
  type: PetType;
  name: string;
  hunger: number;
  happiness: number;
  xp: number;
  createdAt: number;
}

interface Memory {
  id: string;
  title: string;
  emoji: string;
  color: string;
  day: number;
  taskId: string;
}

interface GameState {
  lovePoints: number;
  day: number;
  completedTasks: string[];
  lastResetDay: number;
  pet: Pet | null;
  memories: Memory[];
  p1Name: string;
  p2Name: string;
}

const STORAGE_KEY = "usverse.homestead.v3";

type RoomMeta = {
  title: string;
  emoji: string;
  Icon: React.FC<{ className?: string }>;
  grad: string;
  border: string;
  chip: string;
  desc: string;
};

const ROOM_META: Record<RoomId, RoomMeta> = {
  bedroom: {
    title: "Bedroom", emoji: "\uD83D\uDECF\uFE0F", Icon: Bed,
    grad: "from-violet-950/80 to-purple-900/60", border: "border-purple-500/30",
    chip: "bg-purple-500/20 text-purple-200", desc: "Your cozy sanctuary of rest and romance",
  },
  kitchen: {
    title: "Kitchen", emoji: "\uD83C\uDF73", Icon: ChefHat,
    grad: "from-amber-950/80 to-orange-900/60", border: "border-amber-500/30",
    chip: "bg-amber-500/20 text-amber-200", desc: "Cook, bake and create delicious moments",
  },
  living: {
    title: "Living Room", emoji: "\uD83D\uDECB\uFE0F", Icon: Music,
    grad: "from-teal-950/80 to-cyan-900/60", border: "border-teal-500/30",
    chip: "bg-teal-500/20 text-teal-200", desc: "Dance, play and bond together",
  },
  bathroom: {
    title: "Bathroom", emoji: "\uD83D\uDEC1", Icon: Bath,
    grad: "from-sky-950/80 to-blue-900/60", border: "border-sky-500/30",
    chip: "bg-sky-500/20 text-sky-200", desc: "Morning rituals and sweet surprises",
  },
  garden: {
    title: "Garden", emoji: "\uD83C\uDF38", Icon: Flower2,
    grad: "from-green-950/80 to-emerald-900/60", border: "border-green-500/30",
    chip: "bg-green-500/20 text-green-200", desc: "Nature, stargazing and new beginnings",
  },
};

const TASKS: Task[] = [
  { id: "bd-make", room: "bedroom", title: "Make the bed together", emoji: "\uD83D\uDECF\uFE0F", lp: 5, category: "chore", tip: "A tidy nest starts the day right." },
  { id: "bd-cuddle", room: "bedroom", title: "10-min morning cuddle", emoji: "\uD83E\uDD17", lp: 15, category: "romantic", tip: "Warmth before the world begins." },
  { id: "bd-read", room: "bedroom", title: "Read together at night", emoji: "\uD83D\uDCDA", lp: 10, category: "romantic", tip: "Share a chapter before sleep." },
  { id: "bd-note", room: "bedroom", title: "Leave a pillow love note", emoji: "\uD83D\uDC8C", lp: 12, category: "special", tip: "A secret message to discover." },
  { id: "bd-stars", room: "bedroom", title: "Name a ceiling constellation", emoji: "\u2B50", lp: 8, category: "romantic", tip: "Find shapes together before lights out." },
  { id: "kt-bfast", room: "kitchen", title: "Cook breakfast together", emoji: "\uD83C\uDF73", lp: 10, category: "chore", tip: "Eggs, toast, and morning laughter." },
  { id: "kt-coffee", room: "kitchen", title: "Perfect coffee ritual", emoji: "\u2615", lp: 8, category: "romantic", tip: "Brew their favorite just right." },
  { id: "kt-dinner", room: "kitchen", title: "Special candlelight dinner", emoji: "\uD83C\uDF7D\uFE0F", lp: 20, category: "special", tip: "Candles optional, love required." },
  { id: "kt-dishes", room: "kitchen", title: "Wash dishes together", emoji: "\uD83E\uDEA7", lp: 6, category: "chore", tip: "Teamwork makes it quick and fun." },
  { id: "kt-bake", room: "kitchen", title: "Bake something sweet", emoji: "\uD83E\uDDC1", lp: 15, category: "romantic", tip: "Cookies, cake with love." },
  { id: "lv-dance", room: "living", title: "Living room dance party", emoji: "\uD83D\uDC83", lp: 15, category: "romantic", tip: "Any song, any style, just move together." },
  { id: "lv-movie", room: "living", title: "Movie night with popcorn", emoji: "\uD83C\uDFAC", lp: 10, category: "romantic", tip: "Pick a film and snuggle up." },
  { id: "lv-game", room: "living", title: "Board game challenge", emoji: "\uD83C\uDFB2", lp: 12, category: "chore", tip: "Friendly rivalry, maximum fun." },
  { id: "lv-loves", room: "living", title: "Share 3 things you love", emoji: "\u2764\uFE0F", lp: 20, category: "special", tip: "Take turns. Be specific. Be sincere." },
  { id: "lv-decor", room: "living", title: "Rearrange something together", emoji: "\uD83C\uDFA8", lp: 8, category: "chore", tip: "Fresh eyes on your shared space." },
  { id: "ba-routine", room: "bathroom", title: "Side-by-side morning routine", emoji: "\uD83E\uDDB7", lp: 5, category: "chore", tip: "Brush together for good luck." },
  { id: "ba-mirror", room: "bathroom", title: "Heart on the foggy mirror", emoji: "\uD83E\uDE9E", lp: 10, category: "romantic", tip: "A steamy love message for them." },
  { id: "ba-spa", room: "bathroom", title: "At-home spa evening", emoji: "\uD83D\uDEC1", lp: 18, category: "special", tip: "Face masks, candles, total relaxation." },
  { id: "ba-sticky", room: "bathroom", title: "Sticky note mirror surprise", emoji: "\uD83D\uDCDD", lp: 8, category: "romantic", tip: "Stick one compliment for them to find." },
  { id: "gd-water", room: "garden", title: "Water plants together", emoji: "\uD83C\uDF31", lp: 6, category: "chore", tip: "Give life to your little green family." },
  { id: "gd-stars", room: "garden", title: "Stargazing under the sky", emoji: "\uD83C\uDF0C", lp: 20, category: "special", tip: "Find your star together." },
  { id: "gd-plant", room: "garden", title: "Plant something new", emoji: "\uD83C\uDF33", lp: 15, category: "romantic", tip: "A seed that grows with your love." },
  { id: "gd-picnic", room: "garden", title: "Backyard mini picnic", emoji: "\uD83E\uDDF3", lp: 18, category: "romantic", tip: "Blanket, snacks, and fresh air." },
  { id: "gd-dream", room: "garden", title: "Share one future dream", emoji: "\u2728", lp: 25, category: "special", tip: "One adventure you both want someday." },
];

type PetData = { emoji: string; label: string; idle: string; happy: string; hungry: string };

const PET_DATA: Record<PetType, PetData> = {
  cat: { emoji: "\uD83D\uDC31", label: "Cat", idle: "\uD83D\uDE3A", happy: "\uD83D\uDE38", hungry: "\uD83D\uDE40" },
  dog: { emoji: "\uD83D\uDC36", label: "Dog", idle: "\uD83D\uDC36", happy: "\uD83D\uDC15", hungry: "\uD83D\uDC3E" },
  bunny: { emoji: "\uD83D\uDC30", label: "Bunny", idle: "\uD83D\uDC30", happy: "\uD83D\uDC07", hungry: "\uD83D\uDC3E" },
  hamster: { emoji: "\uD83D\uDC39", label: "Hamster", idle: "\uD83D\uDC39", happy: "\uD83D\uDC3F\uFE0F", hungry: "\uD83E\uDD94" },
};

const LOVE_LEVELS = [
  { min: 0, label: "Just Started", emoji: "\uD83C\uDF31", bar: "bg-emerald-500" },
  { min: 75, label: "Growing Roots", emoji: "\uD83C\uDF3F", bar: "bg-teal-500" },
  { min: 200, label: "Blooming Love", emoji: "\uD83C\uDF38", bar: "bg-pink-500" },
  { min: 400, label: "Deep Connection", emoji: "\uD83D\uDC95", bar: "bg-rose-500" },
  { min: 700, label: "Soulmates", emoji: "\uD83D\uDC9E", bar: "bg-purple-500" },
  { min: 1000, label: "Eternal Love", emoji: "\uD83D\uDC8D", bar: "bg-amber-500" },
];

const MEMORY_TRIGGERS: Record<string, { title: string; emoji: string }> = {
  "bd-cuddle": { title: "Morning Warmth", emoji: "\uD83C\uDF05" },
  "bd-note": { title: "A Secret Message", emoji: "\uD83D\uDC8C" },
  "kt-dinner": { title: "Candlelight Evening", emoji: "\uD83D\uDD6F\uFE0F" },
  "lv-dance": { title: "Our Dance Moment", emoji: "\uD83D\uDC83" },
  "lv-loves": { title: "Words of Love", emoji: "\u2764\uFE0F" },
  "ba-spa": { title: "Spa Night Magic", emoji: "\uD83D\uDEC1" },
  "gd-stars": { title: "Starlit Dream", emoji: "\uD83C\uDF0C" },
  "gd-dream": { title: "Future Together", emoji: "\u2728" },
};

const MEMORY_COLORS = [
  "#ff6b9d", "#ffab76", "#c8b6e2", "#b8e3ff",
  "#b8f0c8", "#fff3b0", "#ffd6e7", "#a8e6cf",
];

const RECIPES = [
  { name: "Romantic Pasta", steps: ["\uD83C\uDF5D", "\uD83E\uDDC4", "\uD83E\uDEB2", "\uD83E\uDDC0"] as string[], reward: 20 },
  { name: "Love Smoothie", steps: ["\uD83C\uDF53", "\uD83C\uDF4C", "\uD83E\uDD5B", "\uD83C\uDF6F"] as string[], reward: 15 },
  { name: "Sweet Pancakes", steps: ["\uD83E\uDD5A", "\uD83E\uDD5B", "\uD83C\uDF6F", "\uD83E\uDDC8"] as string[], reward: 15 },
];

const ALL_INGREDIENTS = [
  "\uD83C\uDF5D", "\uD83E\uDDC4", "\uD83E\uDEB2", "\uD83E\uDDC0",
  "\uD83C\uDF53", "\uD83C\uDF4C", "\uD83E\uDD5B", "\uD83C\uDF6F",
  "\uD83E\uDD5A", "\uD83E\uDDC8", "\uD83C\uDF4B", "\uD83C\uDF3F", "\uD83E\uDDC5", "\uD83E\uDD55",
];

function makeId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getLoveLevel(points: number) {
  let level = LOVE_LEVELS[0];
  for (const l of LOVE_LEVELS) { if (points >= l.min) level = l; }
  return level;
}

function getNextLevel(points: number) {
  for (const l of LOVE_LEVELS) { if (points < l.min) return l; }
  return null;
}

function getDefaultState(): GameState {
  return { lovePoints: 0, day: 1, completedTasks: [], lastResetDay: 0, pet: null, memories: [], p1Name: "You", p2Name: "Your Love" };
}

function loadState(): GameState {
  if (typeof window === "undefined") return getDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    return { ...getDefaultState(), ...(JSON.parse(raw) as Partial<GameState>) };
  } catch { return getDefaultState(); }
}

function saveState(state: GameState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function shuffleOptions(correct: string, pool: string[]): string[] {
  const decoys = pool.filter((i) => i !== correct).slice(0, 3);
  return [correct, ...decoys].sort(() => Math.random() - 0.5);
}

function CookingGame({ onComplete, onClose }: { onComplete: (lp: number) => void; onClose: () => void }) {
  const [recipeIdx] = useState(() => Math.floor(Math.random() * RECIPES.length));
  const recipe = RECIPES[recipeIdx];
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [done, setDone] = useState(false);
  const [options, setOptions] = useState<string[]>(() => shuffleOptions(recipe.steps[0], ALL_INGREDIENTS));

  const tap = useCallback((ingr: string) => {
    if (done) return;
    if (ingr === recipe.steps[step]) {
      const next = step + 1;
      if (next >= recipe.steps.length) {
        setDone(true);
        setTimeout(() => onComplete(recipe.reward), 1200);
      } else {
        setStep(next);
        setOptions(shuffleOptions(recipe.steps[next], ALL_INGREDIENTS));
        setWrong(false);
      }
    } else {
      setWrong(true);
      setTimeout(() => setWrong(false), 600);
    }
  }, [done, recipe, step, onComplete]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 20 }}
        className="glass-card p-6 max-w-sm w-full text-center space-y-5">
        <div className="text-4xl">{"\uD83C\uDF73"}</div>
        <h3 className="text-white font-bold text-lg">{recipe.name}</h3>
        {done ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="space-y-3 py-4">
            <div className="text-5xl">{"\uD83C\uDF89"}</div>
            <p className="text-emerald-300 font-semibold text-lg">Delicious! +{recipe.reward} Love Points</p>
          </motion.div>
        ) : (
          <>
            <p className="text-purple-200/80 text-sm">
              Add ingredient <span className="text-white font-semibold">{step + 1}</span> of{" "}
              <span className="text-white font-semibold">{recipe.steps.length}</span>
            </p>
            <div className="flex justify-center gap-2">
              {recipe.steps.map((s, i) => (
                <div key={i} className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl border transition-all ${
                  i < step ? "bg-emerald-500/25 border-emerald-400/40" :
                  i === step ? "bg-purple-500/30 border-purple-400/60 animate-pulse" :
                  "bg-white/5 border-white/10"}`}>
                  {i < step ? s : i === step ? "?" : "\u00B7"}
                </div>
              ))}
            </div>
            <motion.div animate={wrong ? { x: [-4, 4, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-2 gap-3">
              {options.map((ingr) => (
                <button key={ingr} type="button" onClick={() => tap(ingr)}
                  className="text-4xl h-16 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all border border-white/10">
                  {ingr}
                </button>
              ))}
            </motion.div>
            {wrong && <p className="text-rose-300 text-sm">Not that one, try another!</p>}
          </>
        )}
        <button type="button" onClick={onClose} className="text-xs text-purple-300/50 hover:text-purple-200 transition-colors">
          Skip mini-game
        </button>
      </motion.div>
    </motion.div>
  );
}

function PetPanel({ pet, onFeed, onPlay, onAdopt }: {
  pet: Pet | null; onFeed: () => void; onPlay: () => void; onAdopt: (type: PetType, name: string) => void;
}) {
  const [nameInput, setNameInput] = useState("");
  const [selectedType, setSelectedType] = useState<PetType>("cat");
  const [bounce, setBounce] = useState(false);

  const animatePet = () => { setBounce(true); setTimeout(() => setBounce(false), 600); };

  if (!pet) {
    return (
      <div className="space-y-5">
        <div className="glass-card p-6 text-center space-y-3">
          <div className="text-5xl">{"\uD83D\uDC3E"}</div>
          <h2 className="text-white font-bold text-xl">Adopt a Pet</h2>
          <p className="text-purple-200/70 text-sm">Choose a companion to share your home with!</p>
        </div>
        <div className="glass-card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(PET_DATA) as [PetType, PetData][]).map(([type, data]) => (
              <button key={type} type="button" onClick={() => setSelectedType(type)}
                className={`p-4 rounded-xl border text-center transition-all ${
                  selectedType === type ? "border-purple-400/60 bg-purple-500/20" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                <div className="text-3xl mb-1">{data.emoji}</div>
                <div className="text-white text-sm font-medium">{data.label}</div>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-sm text-purple-200/80">Give your pet a name</label>
            <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Mochi, Luna, Biscuit" maxLength={20}
              className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2 text-white placeholder:text-purple-300/40 focus:outline-none focus:border-purple-400/60 text-sm" />
          </div>
          <button type="button" disabled={!nameInput.trim()} onClick={() => onAdopt(selectedType, nameInput.trim())}
            className="w-full py-3 rounded-xl bg-purple-600/70 hover:bg-purple-600/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors">
            {nameInput.trim() ? `Welcome home, ${nameInput.trim()}!` : "Name your pet first"}
          </button>
        </div>
      </div>
    );
  }

  const data = PET_DATA[pet.type];
  const petEmoji = pet.hunger < 25 ? data.hungry : pet.happiness > 70 ? data.happy : data.idle;
  const petLevel = Math.floor(pet.xp / 50) + 1;

  return (
    <div className="space-y-4">
      <div className="glass-card p-6 text-center space-y-3">
        <motion.div animate={bounce ? { y: [-14, 0] } : { y: 0 }} transition={{ type: "spring", stiffness: 420, damping: 10 }}
          className="text-6xl cursor-pointer select-none" onClick={() => { animatePet(); onPlay(); }}>
          {petEmoji}
        </motion.div>
        <h2 className="text-white font-bold text-xl">{pet.name}</h2>
        <div className="flex justify-center gap-3 text-xs text-purple-200/70">
          <span className="px-2 py-1 bg-white/10 rounded-full">{data.label}</span>
          <span className="px-2 py-1 bg-purple-500/20 rounded-full text-purple-200">Lv {petLevel}</span>
        </div>
      </div>
      <div className="glass-card p-5 space-y-4">
        {[
          { label: "\uD83E\uDDB4 Hunger", value: pet.hunger, color: "bg-amber-500" },
          { label: "\uD83D\uDE0A Happiness", value: pet.happiness, color: "bg-pink-500" },
          { label: "\u2B50 XP", value: (pet.xp % 50) * 2, color: "bg-purple-500" },
        ].map((stat) => (
          <div key={stat.label} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-purple-200/80">{stat.label}</span>
              <span className="text-white font-medium">{stat.value}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div className={`h-full ${stat.color} rounded-full`} animate={{ width: `${stat.value}%` }} transition={{ duration: 0.5 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => { animatePet(); onFeed(); }} disabled={pet.hunger >= 100}
          className="py-3 rounded-xl bg-amber-500/70 hover:bg-amber-500/90 disabled:opacity-40 text-white font-medium transition-colors">
          Feed
        </button>
        <button type="button" onClick={() => { animatePet(); onPlay(); }} disabled={pet.happiness >= 100}
          className="py-3 rounded-xl bg-pink-500/70 hover:bg-pink-500/90 disabled:opacity-40 text-white font-medium transition-colors">
          Play
        </button>
      </div>
      {pet.hunger < 30 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-amber-300 text-sm">
          {pet.name} is hungry! Feed them soon
        </motion.p>
      )}
    </div>
  );
}

function MemoryCard({ memory, index }: { memory: Memory; index: number }) {
  const rotate = ((index % 5) - 2) * 1.5;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8, rotate: rotate - 5 }} animate={{ opacity: 1, scale: 1, rotate }}
      whileHover={{ scale: 1.06, rotate: 0, zIndex: 10 }} transition={{ delay: index * 0.06 }} className="relative cursor-pointer">
      <div className="rounded-xl p-4 text-center shadow-lg border space-y-2"
        style={{ backgroundColor: memory.color + "22", borderColor: memory.color + "55" }}>
        <div className="text-4xl">{memory.emoji}</div>
        <p className="text-white text-xs font-semibold leading-tight">{memory.title}</p>
        <p className="text-white/40 text-[10px]">Day {memory.day}</p>
      </div>
    </motion.div>
  );
}

function HouseMap({ completedTasks, onRoomClick }: { completedTasks: string[]; onRoomClick: (room: RoomId) => void }) {
  const rooms: RoomId[] = ["bedroom", "kitchen", "living", "bathroom", "garden"];
  return (
    <div className="grid grid-cols-2 gap-3">
      {rooms.map((roomId) => {
        const meta = ROOM_META[roomId];
        const roomTasks = TASKS.filter((t) => t.room === roomId);
        const done = roomTasks.filter((t) => completedTasks.includes(t.id)).length;
        const total = roomTasks.length;
        const pct = total > 0 ? (done / total) * 100 : 0;
        return (
          <motion.button key={roomId} type="button" onClick={() => onRoomClick(roomId)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className={`glass-card p-4 text-left space-y-3 border ${meta.border} bg-gradient-to-br ${meta.grad} transition-colors ${roomId === "garden" ? "col-span-2" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl mb-1">{meta.emoji}</div>
                <div className="text-white font-semibold text-sm">{meta.title}</div>
                <div className="text-white/50 text-xs mt-0.5">{meta.desc}</div>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full ${meta.chip}`}>{done}/{total}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-white/40 rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
            </div>
            {done === total && total > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-emerald-300 flex items-center gap-1">
                <Check className="w-3 h-3" />All done!
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

function RoomView({ roomId, completedTasks, onToggle, onOpenCooking, onBack }: {
  roomId: RoomId; completedTasks: string[]; onToggle: (id: string) => void; onOpenCooking: () => void; onBack: () => void;
}) {
  const meta = ROOM_META[roomId];
  const tasks = TASKS.filter((t) => t.room === roomId);
  const categoryLabel: Record<TaskCategory, string> = { chore: "\uD83E\uDDF9 Chore", romantic: "\uD83D\uDC95 Romantic", special: "\u2728 Special" };
  return (
    <div className="space-y-4">
      <div className={`glass-card p-5 border ${meta.border} bg-gradient-to-br ${meta.grad}`}>
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-3 transition-colors">
          <ChevronLeft className="w-4 h-4" />Back to house
        </button>
        <div className="text-3xl mb-2">{meta.emoji}</div>
        <h2 className="text-white font-bold text-xl">{meta.title}</h2>
        <p className="text-white/60 text-sm mt-1">{meta.desc}</p>
        {roomId === "kitchen" && (
          <button type="button" onClick={onOpenCooking}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/70 hover:bg-amber-500/90 text-white text-sm font-medium transition-colors">
            <ChefHat className="w-4 h-4" />Cook Together (mini-game)
          </button>
        )}
      </div>
      <div className="space-y-2">
        {tasks.map((task) => {
          const isDone = completedTasks.includes(task.id);
          return (
            <motion.button key={task.id} type="button" onClick={() => onToggle(task.id)} whileTap={{ scale: 0.98 }}
              className={`w-full glass-card p-4 text-left flex items-start gap-3 border transition-colors ${
                isDone ? "border-emerald-400/40 bg-emerald-400/5" : "border-white/10 hover:border-white/20"}`}>
              <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                isDone ? "border-emerald-400 bg-emerald-400/20" : "border-white/30"}`}>
                {isDone && <Check className="w-3 h-3 text-emerald-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">{task.emoji}</span>
                  <span className={`font-medium text-sm ${isDone ? "text-white/50 line-through" : "text-white"}`}>{task.title}</span>
                </div>
                <p className="text-white/40 text-xs mt-1">{task.tip}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-purple-200/60">{categoryLabel[task.category]}</span>
                  <span className="text-[10px] text-rose-300/80 flex items-center gap-0.5">
                    <Heart className="w-2.5 h-2.5" />+{task.lp} LP
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default function LoveNestPage() {
  const [state, setState] = useState<GameState>(loadState);
  const [tab, setTab] = useState<Tab>("house");
  const [activeRoom, setActiveRoom] = useState<RoomId>("living");
  const [cookingOpen, setCookingOpen] = useState(false);
  const [newMemory, setNewMemory] = useState(false);
  const [editingNames, setEditingNames] = useState(false);
  const [nameP1, setNameP1] = useState(() => loadState().p1Name);
  const [nameP2, setNameP2] = useState(() => loadState().p2Name);

  useEffect(() => { saveState(state); }, [state]);

  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => {
        if (!prev.pet) return prev;
        return { ...prev, pet: { ...prev.pet, hunger: Math.max(0, prev.pet.hunger - 3), happiness: Math.max(0, prev.pet.happiness - 2) } };
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    setState((prev) => {
      const alreadyDone = prev.completedTasks.includes(taskId);
      const task = TASKS.find((t) => t.id === taskId);
      if (!task) return prev;
      const newCompleted = alreadyDone ? prev.completedTasks.filter((id) => id !== taskId) : [...prev.completedTasks, taskId];
      const newLp = Math.max(0, prev.lovePoints + (alreadyDone ? -task.lp : task.lp));
      let newMemories = prev.memories;
      if (!alreadyDone && MEMORY_TRIGGERS[taskId]) {
        const trigger = MEMORY_TRIGGERS[taskId];
        newMemories = [...prev.memories, {
          id: makeId(), title: trigger.title, emoji: trigger.emoji,
          color: MEMORY_COLORS[prev.memories.length % MEMORY_COLORS.length],
          day: prev.day, taskId,
        }];
        setTimeout(() => { setNewMemory(true); setTimeout(() => setNewMemory(false), 3000); }, 100);
      }
      return { ...prev, completedTasks: newCompleted, lovePoints: newLp, memories: newMemories };
    });
  }, []);

  const handleCookingComplete = useCallback((lp: number) => {
    setState((prev) => ({ ...prev, lovePoints: prev.lovePoints + lp }));
    setCookingOpen(false);
  }, []);

  const handleFeedPet = useCallback(() => {
    setState((prev) => {
      if (!prev.pet) return prev;
      return { ...prev, pet: { ...prev.pet, hunger: Math.min(100, prev.pet.hunger + 30), xp: prev.pet.xp + 5 } };
    });
  }, []);

  const handlePlayPet = useCallback(() => {
    setState((prev) => {
      if (!prev.pet) return prev;
      return { ...prev, pet: { ...prev.pet, happiness: Math.min(100, prev.pet.happiness + 25), xp: prev.pet.xp + 8 }, lovePoints: prev.lovePoints + 2 };
    });
  }, []);

  const handleAdoptPet = useCallback((type: PetType, name: string) => {
    setState((prev) => ({ ...prev, pet: { type, name, hunger: 80, happiness: 90, xp: 0, createdAt: Date.now() } }));
  }, []);

  const handleNewDay = useCallback(() => {
    setState((prev) => ({ ...prev, day: prev.day + 1, completedTasks: [], lastResetDay: prev.day }));
  }, []);

  const handleSaveNames = useCallback(() => {
    setState((prev) => ({ ...prev, p1Name: nameP1.trim() || "You", p2Name: nameP2.trim() || "Your Love" }));
    setEditingNames(false);
  }, [nameP1, nameP2]);

  const handleReset = useCallback(() => {
    const fresh = getDefaultState();
    setState(fresh);
    setNameP1(fresh.p1Name);
    setNameP2(fresh.p2Name);
  }, []);

  const loveLevel = getLoveLevel(state.lovePoints);
  const nextLevel = getNextLevel(state.lovePoints);
  const progressPct = nextLevel ? ((state.lovePoints - loveLevel.min) / (nextLevel.min - loveLevel.min)) * 100 : 100;

  const TABS: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { id: "house", label: "House", Icon: Home },
    { id: "room", label: "Room", Icon: Star },
    { id: "pet", label: "Pet", Icon: PawPrint },
    { id: "memories", label: "Memories", Icon: Camera },
    { id: "us", label: "Us", Icon: Heart },
  ];

  if (!hydrated) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="glass-card p-8 text-center">
          <div className="text-4xl mb-3 animate-heartbeat">{"\uD83C\uDFE0"}</div>
          <p className="text-purple-200/70 text-sm">Loading your home</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-8">
      <header className="glass-card p-5 border border-rose-400/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-pink-200/70 text-xs tracking-wide uppercase mb-2">
              <Home className="w-3.5 h-3.5" />Couples House Game
            </div>
            <h1 className="text-2xl font-bold text-white">Our Home {"\uD83C\uDFE1"}</h1>
            <p className="text-purple-200/60 text-xs mt-1">{state.p1Name} &amp; {state.p2Name} &middot; Day {state.day}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-white font-bold text-lg">{state.lovePoints} LP</div>
            <div className="text-xs text-purple-200/60">Love Points</div>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-white/70">{loveLevel.emoji} {loveLevel.label}</span>
            {nextLevel && <span className="text-white/40">{nextLevel.min - state.lovePoints} LP to {nextLevel.label}</span>}
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div className={`h-full ${loveLevel.bar} rounded-full`} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
          </div>
        </div>
      </header>

      <div className="glass-card p-1.5 flex gap-1">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-[10px] font-medium transition-colors ${
              tab === id ? "bg-purple-600/60 text-white" : "text-purple-200/60 hover:text-purple-200/90 hover:bg-white/5"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

          {tab === "house" && (
            <div className="space-y-4">
              <HouseMap completedTasks={state.completedTasks} onRoomClick={(room) => { setActiveRoom(room); setTab("room"); }} />
              <div className="glass-card p-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-white font-bold text-lg">{state.completedTasks.length}</div>
                  <div className="text-purple-200/60 text-[10px]">Tasks Done</div>
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{state.memories.length}</div>
                  <div className="text-purple-200/60 text-[10px]">Memories</div>
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{state.pet ? PET_DATA[state.pet.type].emoji : "\u2014"}</div>
                  <div className="text-purple-200/60 text-[10px]">{state.pet ? state.pet.name : "No pet yet"}</div>
                </div>
              </div>
              <button type="button" onClick={handleNewDay}
                className="w-full py-3 glass-card border border-purple-500/30 text-purple-200 hover:text-white hover:border-purple-400/60 text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />Start New Day (Day {state.day + 1})
              </button>
            </div>
          )}

          {tab === "room" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ROOM_META) as RoomId[]).map((roomId) => (
                  <button key={roomId} type="button" onClick={() => setActiveRoom(roomId)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      activeRoom === roomId ? "bg-purple-600/70 text-white" : "bg-white/10 text-purple-200/70 hover:bg-white/15"}`}>
                    {ROOM_META[roomId].emoji} {ROOM_META[roomId].title}
                  </button>
                ))}
              </div>
              <RoomView roomId={activeRoom} completedTasks={state.completedTasks} onToggle={toggleTask} onOpenCooking={() => setCookingOpen(true)} onBack={() => setTab("house")} />
            </div>
          )}

          {tab === "pet" && (
            <PetPanel pet={state.pet} onFeed={handleFeedPet} onPlay={handlePlayPet} onAdopt={handleAdoptPet} />
          )}

          {tab === "memories" && (
            <div className="space-y-4">
              <div className="glass-card p-4 border border-rose-400/20">
                <div className="flex items-center gap-2 text-pink-200/70 text-xs uppercase tracking-wide mb-2">
                  <Camera className="w-3.5 h-3.5" />Memory Gallery
                </div>
                <p className="text-white/60 text-sm">Complete special {"\u2728"} tasks to capture memories together.</p>
              </div>
              {state.memories.length === 0 ? (
                <div className="glass-card p-8 text-center space-y-3">
                  <div className="text-5xl">{"\uD83D\uDCF8"}</div>
                  <p className="text-white/60 text-sm">No memories yet.</p>
                  <p className="text-purple-200/40 text-xs">Complete romantic and special tasks to start your collection!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {state.memories.map((mem, i) => <MemoryCard key={mem.id} memory={mem} index={i} />)}
                </div>
              )}
            </div>
          )}

          {tab === "us" && (
            <div className="space-y-4">
              <div className="glass-card p-6 text-center space-y-4">
                <div className="text-4xl animate-heartbeat">{"\uD83D\uDC95"}</div>
                <div className="flex justify-center gap-6">
                  <div>
                    <div className="text-white font-bold">{state.p1Name}</div>
                    <div className="text-purple-200/50 text-xs">Partner 1</div>
                  </div>
                  <div className="text-2xl self-center">{"\uD83E\uDD1D"}</div>
                  <div>
                    <div className="text-white font-bold">{state.p2Name}</div>
                    <div className="text-purple-200/50 text-xs">Partner 2</div>
                  </div>
                </div>
                <div className="flex justify-center gap-3 flex-wrap">
                  <span className="px-3 py-1.5 bg-rose-500/20 text-rose-200 rounded-full text-xs">{"\u2764\uFE0F"} {state.lovePoints} Love Points</span>
                  <span className="px-3 py-1.5 bg-purple-500/20 text-purple-200 rounded-full text-xs">{"\uD83D\uDCC5"} Day {state.day}</span>
                  <span className="px-3 py-1.5 bg-amber-500/20 text-amber-200 rounded-full text-xs">{loveLevel.emoji} {loveLevel.label}</span>
                </div>
              </div>

              <div className="glass-card p-5 space-y-4">
                <h3 className="text-white font-semibold">Couple Profile</h3>
                {editingNames ? (
                  <div className="space-y-3">
                    {[{ label: "Your name", value: nameP1, set: setNameP1 }, { label: "Partner's name", value: nameP2, set: setNameP2 }].map((field) => (
                      <div key={field.label} className="space-y-1">
                        <label className="text-xs text-purple-200/70">{field.label}</label>
                        <input type="text" value={field.value} maxLength={20} onChange={(e) => field.set(e.target.value)}
                          className="w-full rounded-xl bg-white/10 border border-white/15 px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-400/60" />
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button type="button" onClick={handleSaveNames} className="flex-1 py-2 rounded-xl bg-purple-600/70 hover:bg-purple-600/90 text-white text-sm font-medium transition-colors">Save</button>
                      <button type="button" onClick={() => setEditingNames(false)} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 text-sm transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setEditingNames(true)} className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-purple-200 text-sm transition-colors">
                    {"\u270F\uFE0F"} Edit couple names
                  </button>
                )}
              </div>

              <div className="glass-card p-5 space-y-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-300" />Achievements
                </h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "First Task", emoji: "\uD83C\uDF1F", done: state.completedTasks.length >= 1 },
                    { label: "5 Tasks Done", emoji: "\uD83C\uDFC5", done: state.completedTasks.length >= 5 },
                    { label: "First Memory", emoji: "\uD83D\uDCF8", done: state.memories.length >= 1 },
                    { label: "Pet Adopted", emoji: "\uD83D\uDC3E", done: state.pet !== null },
                    { label: "100 Love Points", emoji: "\uD83D\uDC95", done: state.lovePoints >= 100 },
                    { label: "All Rooms Visited", emoji: "\uD83C\uDFE0", done: (["bedroom", "kitchen", "living", "bathroom", "garden"] as RoomId[]).every((r) => TASKS.filter((t) => t.room === r).some((t) => state.completedTasks.includes(t.id))) },
                    { label: "Soulmates (700+ LP)", emoji: "\uD83D\uDC9E", done: state.lovePoints >= 700 },
                  ].map((a) => (
                    <div key={a.label} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${a.done ? "bg-emerald-500/15" : "bg-white/5 opacity-50"}`}>
                      <span className="text-xl">{a.emoji}</span>
                      <span className={a.done ? "text-white" : "text-white/40"}>{a.label}</span>
                      {a.done && <Check className="w-4 h-4 text-emerald-400 ml-auto" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card p-5 space-y-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-300" />About the Game
                </h3>
                <p className="text-purple-200/60 text-xs leading-relaxed">
                  Our Home is a shared virtual household game for couples. Complete chores and romantic tasks, grow your Love Points, care for your pet, and build a gallery of memories. Use New Day to reset tasks and play every single day.
                </p>
                <button type="button" onClick={handleReset} className="text-xs text-rose-400/60 hover:text-rose-400 transition-colors">Reset all progress</button>
              </div>

              <div className="text-center">
                <Link href="/play" className="text-xs text-purple-300/50 hover:text-purple-200 transition-colors">
                  {"\u2190"} Back to Play Universe
                </Link>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {cookingOpen && <CookingGame onComplete={handleCookingComplete} onClose={() => setCookingOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {newMemory && (
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-purple-900/90 backdrop-blur-sm border border-purple-400/30 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-xl">
            <Camera className="w-4 h-4 text-pink-300" />
            <span className="text-white text-sm font-medium">Memory captured! {"\uD83D\uDCF8"}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
