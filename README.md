# UsVerse — Your Private Universe 🌌

> *"Love is not about holding someone close… it is about creating a space where distance cannot enter."*

**UsVerse** is a **Shared Life App** — a private digital universe for two people in a long-distance relationship. Not just a chat app. A place where you don't just talk… you **live together digitally**.

---

## ✨ Features

| Feature | Description |
|---|---|
| **💓 Presence & Touch** | Send a heartbeat, hug, or "I'm thinking of you" — her phone feels it |
| **💬 Private Chat** | Real-time encrypted chat with AI message suggestions |
| **🌙 Daily Question** | 31 rotating deep questions to reconnect every day |
| **💔 Silent Mode** | Tap "I feel empty…" — she sees "He misses you but can't say it 💔" |
| **📖 Shared Diary** | Write together, feel together — a private journal for two |
| **⏳ Countdown** | Live countdown timer to the next time you hold each other |
| **🤖 AI Love Assistant** | Stuck in silence? AI suggests what your heart wants to say |

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/SAR0406/UsVerse.git
cd UsVerse
npm install
```

### 2. Set Up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of [`supabase/schema.sql`](./supabase/schema.sql)
3. Copy your project URL and anon key from **Settings → API**

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NVIDIA_API_KEY=nvapi-your-key
NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NIM_CHAT_MODEL=meta/llama-3.1-8b-instruct
NIM_TIMEOUT_MS=8000
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 💫

### 5. Available Commands

```bash
npm run dev    # Start development server
npm run lint   # Run ESLint
npm run build  # Build for production
npm run start  # Start production server
```

---

## 🧠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Supabase (Auth + Realtime + PostgreSQL) |
| AI Inference | NVIDIA NIM API (chat suggestions) |
| Realtime | Supabase Realtime Channels |
| Auth | Supabase Auth (email/password) |

### AI Suggestions API (NVIDIA NIM)

UsVerse uses a Next.js Route Handler at:

- `POST /api/ai/suggestions`

It is authenticated, rate-limited, and uses NVIDIA NIM chat-completions to generate emotional chat suggestions.
If the AI endpoint is unavailable, it falls back to curated local suggestions.

---

## 🗃️ Database Schema

See [`supabase/schema.sql`](./supabase/schema.sql) for the complete schema with RLS policies.

Tables:
- `profiles` — user profiles linked to auth
- `couples` — pairs two users with an invite code
- `messages` — private chat messages
- `daily_answers` — answers to daily questions
- `shared_notes` — shared diary entries
- `presence_events` — heartbeats, "thinking of you", silent mode

---

## 🌌 How It Works

1. **Sign up** at `/login`
2. A unique **invite code** is generated for you
3. **Share the code** with your partner — they enter it to join your universe
4. You're now connected 💫

---

## ❓ Troubleshooting

| Issue | Solution |
|---|---|
| Invite code not accepted | Make sure both users are logged in, then retry with the 8-character uppercase code. |
| Too many attempts error | Wait 1 minute before trying to join again (rate limit protection). |
| Daily question not loading | First connect with your partner in Chat so couple-based features are available. |
| Messages fail to send | Check your internet connection and try again. API errors are shown in the chat composer. |
| Countdown not updating | Refresh the page after saving dates. |

---

## 🔐 Privacy & Security

- Row Level Security (RLS) ensures only the two of you can see your data
- No third parties, no ads, no data sharing
- Everything is private to your couple

---

*Built with love, for love. 💜*
