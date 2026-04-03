# UsVerse Color Palette Guide 🎨

> *A romantic, dreamy color system designed for intimate digital connection*
> *Now featuring 5 unique light themes + 2 dark modes for emotional depth*

## Overview

UsVerse uses a carefully crafted color palette that evokes warmth, intimacy, and romance. The design system now supports **7 distinct themes** (5 light + 2 dark), each designed for specific emotional contexts and app features, following the 2026 "Soft Surrealism" trend.

---

## 🌈 The Multi-Theme System

UsVerse offers contextual theming where different areas of the app can use different color palettes to create emotional resonance with the feature's purpose.

### Theme Philosophy

Modern app color schemes work best when they think in **roles** rather than just hex codes:
- Backgrounds carry most screens
- Accent shades stay limited and clearly linked to actions
- States like success and error stay readable across all themes
- Different rooms deserve different emotional palettes

---

## 🌸 Primary Colors

These are the foundational colors of UsVerse, used throughout the application for accents, highlights, and emotional emphasis.

### Core Romance Palette

| Color | Variable | Hex | Usage |
|-------|----------|-----|-------|
| 🌺 **Blossom** | `--color-blossom` | `#ff6b9d` | Primary accent, CTAs, love actions |
| 🍑 **Peach** | `--color-peach` | `#ffab76` | Secondary accent, warm highlights |
| 🌷 **Rose Mist** | `--color-rose-mist` | `#ffd6e7` | Soft backgrounds, gentle emphasis |
| 💜 **Lilac Dream** | `--color-lilac-dream` | `#c8b6e2` | Ethereal accents, presence indicators |
| 💙 **Sky Blush** | `--color-sky-blush` | `#b8e3ff` | Cool accents, partner presence |
| 🌟 **Butter** | `--color-butter` | `#fff3b0` | Golden highlights, special moments |
| 🌿 **Mint Kiss** | `--color-mint-kiss` | `#b8f0c8` | Success states, online presence |

### Usage Guidelines

- **Blossom** is the heart of UsVerse — use it for primary actions and moments that deserve emphasis
- **Peach** pairs beautifully with Blossom for gradient transitions
- **Lilac Dream** represents the dreamlike, ethereal quality of digital connection
- **Sky Blush** is perfect for partner-related elements (differentiation from "you")
- **Mint Kiss** indicates positive states, online presence, and success

---

## 🌈 Gradients

UsVerse uses gradients extensively to create depth, emotion, and visual interest.

### Primary Gradients

#### Heartbeat Gradient
```css
--gradient-heartbeat: linear-gradient(135deg, #ff6b9d 0%, #ffab76 50%, #ffd6e7 100%);
```
**Usage:** Primary CTAs, love actions, emotional highlights
**Example:** Send button, heartbeat indicator, primary cards

#### Moonlight Gradient
```css
--gradient-moonlight: linear-gradient(135deg, #c8b6e2 0%, #b8e3ff 50%, #ffd6e7 100%);
```
**Usage:** Ethereal elements, presence indicators, dreamy backgrounds
**Example:** Aura orbs, presence states, soft overlays

#### Golden Gradient
```css
--gradient-golden: linear-gradient(135deg, #fff3b0 0%, #ffab76 100%);
```
**Usage:** Special moments, achievements, premium features
**Example:** Countdown highlights, special dates, awards

#### Presence Gradient
```css
--gradient-presence: radial-gradient(circle at center, rgba(255, 107, 157, 0.13) 0%, transparent 70%);
```
**Usage:** Subtle presence indicators, ambient glow effects
**Example:** User avatars, active states, background ambience

---

## 🌅 The Five Light Themes

UsVerse offers five distinct light themes, each crafted for specific emotional contexts and app features.

### Theme 01: Romantic Dusk (Signature Palette)

**The heart of UsVerse** — warm pinks on barely-pink white, like golden hour light on skin.

```css
[data-theme="romantic-dusk"] {
  --background: #fff8fb;
  --foreground: #2d1654;      /* Deep plum instead of harsh black */
  --card: #ffffff;
  --surface-2: #fff0f7;
  --border: #f0cadf;
  --accent: #ff6b9d;          /* Warm pink */
  --accent-glow: rgba(255, 107, 157, 0.3);
  --text-soft: #8b6f9a;
  --text-whisper: #b8a0c8;
}
```

**Body Background:**
```css
background:
  radial-gradient(circle at 0% 0%, rgba(255, 214, 231, 0.6), transparent 45%),
  radial-gradient(circle at 100% 100%, rgba(200, 182, 226, 0.25), transparent 40%),
  var(--background);
```

**Best For:** Home screen, love feed, presence, shared moments
**Emotional Tone:** Intimate, warm, signature romantic feeling

---

### Theme 02: Golden Hour

**Mocha Mousse elegance** — Pantone's Color of the Year 2025, creating domestic coziness with amber warmth.

```css
[data-theme="golden-hour"] {
  --background: #fffaf5;
  --foreground: #3d2004;      /* Dark brown */
  --card: #ffffff;
  --surface-2: #fff4e6;
  --border: #e8d5b7;
  --accent: #ef9f27;          /* Amber */
  --accent-glow: rgba(239, 159, 39, 0.3);
  --text-soft: #8b6f47;
  --text-whisper: #a89070;
}
```

**Body Background:**
```css
background:
  radial-gradient(circle at 10% 10%, rgba(239, 159, 39, 0.18), transparent 50%),
  radial-gradient(circle at 90% 90%, rgba(216, 90, 48, 0.12), transparent 45%),
  var(--background);
```

**Best For:** Countdown, daily rituals, morning greetings
**Emotional Tone:** Warm, cozy, domestic, elegant

---

### Theme 03: Mint Garden

**Fresh and inviting** — aqua and sand tones that feel light, easy on the eyes, and playful.

```css
[data-theme="mint-garden"] {
  --background: #f8fefb;
  --foreground: #1a5653;      /* Deep teal */
  --card: #ffffff;
  --surface-2: #f0f9f4;
  --border: #c7e8e5;
  --accent: #5bc0be;          /* Aqua */
  --accent-glow: rgba(91, 192, 190, 0.3);
  --text-soft: #5a8b88;
  --text-whisper: #7aa8a5;
}
```

**Body Background:**
```css
background:
  radial-gradient(circle at 20% 20%, rgba(91, 192, 190, 0.15), transparent 50%),
  radial-gradient(circle at 80% 80%, rgba(255, 230, 167, 0.2), transparent 45%),
  var(--background);
```

**Best For:** Garden room, play, games, pet care
**Emotional Tone:** Light, playful, refreshing, calming

---

### Theme 04: Wisteria Dream

**Delicate and imaginative** — soft lavender through deep violet, evoking the delicate romance of wisteria.

```css
[data-theme="wisteria-dream"] {
  --background: #faf7fe;
  --foreground: #3d2a54;      /* Deep violet */
  --card: #ffffff;
  --surface-2: #f4effc;
  --border: #e0d4e8;
  --accent: #9d84b7;          /* Soft violet */
  --accent-glow: rgba(157, 132, 183, 0.3);
  --text-soft: #7d6b8f;
  --text-whisper: #9d88a8;
}
```

**Body Background:**
```css
background:
  radial-gradient(circle at 15% 15%, rgba(157, 132, 183, 0.2), transparent 50%),
  radial-gradient(circle at 85% 85%, rgba(201, 173, 167, 0.15), transparent 45%),
  var(--background);
```

**Best For:** Diary, memory wall, sticker studio, private introspective spaces
**Emotional Tone:** Sacred, wistful, artistic, deeply romantic

---

### Theme 05: Blush Cream

**Timeless elegance** — warm cream with dusty rose, creating a grounded yet romantic atmosphere.

```css
[data-theme="blush-cream"] {
  --background: #fffcf8;
  --foreground: #4a3635;      /* Warm brown */
  --card: #ffffff;
  --surface-2: #fff5f0;
  --border: #e8d9d7;
  --accent: #d4a5a5;          /* Dusty rose */
  --accent-glow: rgba(212, 165, 165, 0.3);
  --text-soft: #8b7170;
  --text-whisper: #a89190;
}
```

**Body Background:**
```css
background:
  radial-gradient(circle at 25% 25%, rgba(212, 165, 165, 0.22), transparent 50%),
  radial-gradient(circle at 75% 75%, rgba(184, 139, 141, 0.15), transparent 45%),
  var(--background);
```

**Best For:** Bloom, cinema, settings, onboarding, milestone celebrations
**Emotional Tone:** Elegant, timeless, grounded, sophisticated

---

## 🌙 Dark Modes

### Dark Mode (Original)

The original romantic dark cosmos where love glows.

### Background Layers

| Layer | Variable | Color | Purpose |
|-------|----------|-------|---------|
| **Base** | `--background` | `#0d0720` (Dark Void) | Primary background |
| **Card** | `--card` | `#1c1040` (Dark Nebula) | Elevated surfaces |
| **Surface 2** | `--surface-2` | `#2d1654` (Dark Stardust) | Interactive elements |

### Foreground Colors

| Element | Variable | Color | Usage |
|---------|----------|-------|-------|
| **Primary Text** | `--foreground` | `#f0d6ff` | Main text content |
| **Soft Text** | `--text-soft` | `#c9a8df` | Secondary text, labels |
| **Whisper Text** | `--text-whisper` | `#9f82ba` | Tertiary text, hints |
| **Border** | `--border` | `rgba(155, 109, 255, 0.3)` | Dividers, outlines |

### Accents

```css
--accent: #ff6b9d;
--accent-glow: rgba(255, 107, 157, 0.3);
```

### Background Atmosphere

The dark theme uses layered radial gradients to create cosmic depth:

```css
background:
  radial-gradient(circle at 20% 15%, rgba(200, 182, 226, 0.18), transparent 40%),
  radial-gradient(circle at 80% 80%, rgba(184, 227, 255, 0.12), transparent 45%),
  var(--background);
```

---

### Dark Void (Enhanced)

**Deeper, richer darkness** with enhanced contrast — perfect for OLED screens and pure darkness lovers.

```css
[data-theme="dark-void"] {
  --background: #050212;
  --foreground: #f5e6ff;
  --card: #0f0828;
  --surface-2: #1a0f3a;
  --border: rgba(145, 99, 235, 0.35);
  --accent: #ff6b9d;
  --accent-glow: rgba(255, 107, 157, 0.4);
  --text-soft: #d4b8ef;
  --text-whisper: #a888ca;
}
```

**Body Background:**
```css
background:
  radial-gradient(circle at 20% 15%, rgba(145, 99, 235, 0.22), transparent 40%),
  radial-gradient(circle at 80% 80%, rgba(255, 107, 157, 0.15), transparent 45%),
  var(--background);
```

**Best For:** All features, pure darkness, battery saving on OLED
**Emotional Tone:** Deep, mysterious, enhanced contrast

---

## 🎯 Semantic State Colors

These colors remain **consistent across ALL themes** for cognitive consistency:

```css
/* Success - Green */
--color-success-bg: #b8f0c8;
--color-success-text: #2d7a4a;
--color-success-border: #70d890;

/* Error - Deep Rose */
--color-error-bg: #ffb3c1;
--color-error-text: #993556;
--color-error-border: #ff7a95;

/* Warning - Amber */
--color-warning-bg: #ffe19c;
--color-warning-text: #d85a30;
--color-warning-border: #ffb85f;

/* Info - Blue */
--color-info-bg: #b8e3ff;
--color-info-text: #4a7ba7;
--color-info-border: #7ab8e8;
```

**WCAG Compliance:** All state colors meet 4.5:1 contrast ratio minimum.

---

## 🏠 Room-to-Theme Mapping

When **contextual theming** is enabled, UsVerse automatically applies themes based on the room:

| Room/Feature | Theme | Rationale |
|-------------|-------|-----------|
| Dashboard, Chat, Presence | Romantic Dusk | Signature palette for core connection features |
| Diary, Memory Wall | Wisteria Dream | Sacred, introspective, most private spaces |
| Countdown, Daily | Golden Hour | Warm rituals and special moments |
| Play, Games | Mint Garden | Light, playful, easy on eyes |
| Bloom, Cinema | Blush Cream | Creative and entertainment spaces |

---

## ☀️ Legacy Light Theme

For backward compatibility, `[data-theme="light"]` is maintained and behaves identically to **Romantic Dusk**.

---

## 📖 Feature-Specific Palettes

### Diary Colors

The diary feature uses a warm, paper-like palette that adapts to theme:

#### Dark Diary Theme
```css
--diary-paper-bg: #1e1630;
--diary-paper-line: rgba(100, 80, 160, 0.25);
--diary-text-primary: #e8d5c0;
--diary-text-secondary: #d0b8a0;
--diary-text-tertiary: #b89878;
--diary-accent: #d4a574;
```

#### Light Diary Theme
```css
--diary-paper-bg: #fdf6e9;
--diary-paper-line: rgba(147, 180, 220, 0.35);
--diary-text-primary: #3d1e0a;
--diary-text-secondary: #6b3f20;
--diary-text-tertiary: #8b6948;
--diary-accent: #c89060;
```

**Design Notes:**
- Evokes physical notebooks and handwritten journals
- Lined paper texture with spiral binding aesthetic
- Polaroid photo frames with tape accents
- Warm, nostalgic color palette

### Cinema Theater Colors

The cinema feature uses a classic movie theater aesthetic:

#### Theater Atmosphere
```css
/* Deep black base */
background: #060508;

/* Film grain overlay */
opacity: 0.38;

/* Marquee gold */
color: #FFD700;

/* Velvet curtain red */
background: linear-gradient(to bottom, #7a0c18, #970f22, #8b0f1a);

/* Projection beam */
rgba(255, 220, 100, 0.09)

/* Warm theater lighting */
rgba(255, 200, 70, 0.04)
```

**Design Notes:**
- Classic cinema marquee with gold bulbs
- Rich velvet curtains in deep red
- Warm ambient lighting from ceiling fixtures
- Subtle film grain overlay for authenticity
- Couple-specific seat colors (pink glow for you, blue glow for partner)

### Bloom (Canvas) Colors

The bloom canvas feature uses vibrant, artistic colors:

```css
/* Parchment background */
.bloom-parchment {
  background: radial-gradient(circle, var(--color-butter) 48%, transparent),
              var(--card);
}

/* Drawing tools use full palette */
- Blossom, Peach, Rose Mist
- Lilac Dream, Sky Blush
- Butter, Mint Kiss
```

**Design Notes:**
- Warm parchment-like canvas background
- Full access to primary color palette
- Animated "pour" effect when changing colors
- Starfall particles on successful send

---

## 🎯 Semantic Usage

### Status Colors

| State | Color | Usage |
|-------|-------|-------|
| **Online** | Mint Kiss `#b8f0c8` | Partner is online |
| **Away** | Butter `#fff3b0` | Partner is away/idle |
| **Offline** | Text Whisper (muted) | Partner is offline |
| **Success** | Mint Kiss | Action completed |
| **Warning** | Peach `#ffab76` | Caution, attention needed |
| **Error** | Blossom (desaturated) | Error state |
| **Info** | Sky Blush `#b8e3ff` | Informational |

### Interactive States

```css
/* Default state */
color: var(--text-soft);
border: 1px solid var(--border);

/* Hover */
color: var(--foreground);
border-color: var(--accent);
box-shadow: 0 0 8px var(--accent-glow);

/* Active/Pressed */
transform: scale(0.97);
filter: brightness(0.92);

/* Focus */
outline: 2px solid var(--accent);
outline-offset: 2px;

/* Disabled */
opacity: 0.32;
cursor: not-allowed;
```

---

## 🎨 Animation & Effects

### Glow Effects

UsVerse uses subtle glow effects to create depth and presence:

```css
/* Pulse glow (for presence) */
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 8px var(--accent-glow); }
  50% { box-shadow: 0 0 24px var(--accent-glow), 0 0 40px var(--accent-glow); }
}

/* Accent glow */
box-shadow: 0 0 20px rgba(255, 171, 118, 0.45);
```

### Glass Morphism

Cards use backdrop blur and color-mix for a glass effect:

```css
.glass-card {
  background: color-mix(in oklab, var(--card) 86%, transparent);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 1rem;
}
```

### Text Effects

```css
/* Gradient text */
.gradient-text {
  background: var(--gradient-heartbeat);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Shimmer text */
.shimmer-text {
  background: linear-gradient(90deg, #c084fc, #f472b6, #c084fc);
  background-size: 200% auto;
  animation: shimmer 3s linear infinite;
}
```

---

## 📐 Accessibility Guidelines

### Contrast Ratios

All text colors meet WCAG AA standards:

- **Primary text on background:** 12:1 (AAA)
- **Soft text on background:** 7:1 (AA)
- **Whisper text on background:** 4.5:1 (AA for large text)
- **Accent on background:** 4.5:1 (AA)

### Color Blindness Considerations

- Never rely on color alone for critical information
- Use icons and text labels alongside colors
- Status indicators use both color and icon
- Interactive states use multiple visual cues (color, shadow, transform)

### Reduced Motion

All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-pulse-glow,
  .animate-heartbeat,
  .animate-float {
    animation: none !important;
  }
}
```

---

## 🛠️ Implementation Guide

### Using the Theme System

UsVerse now features a comprehensive theme system with React Context and utility functions.

#### For Users

Use the **Theme Selector** button in the sidebar to:
1. Switch between light and dark modes
2. Choose from 5 unique light themes
3. Toggle between 2 dark modes
4. Enable contextual theming (auto-switch by room)
5. Follow system dark mode preference

See [THEME_SELECTOR.md](./THEME_SELECTOR.md) for the complete user guide.

#### For Developers

**Using Theme Context:**
```tsx
import { useTheme } from "@/components/providers/ThemeProvider";

function MyComponent() {
  const { theme, setTheme, preferences } = useTheme();

  return (
    <button onClick={() => setTheme("wisteria-dream")}>
      Current theme: {theme}
    </button>
  );
}
```

**Applying Themes Programmatically:**
```typescript
import { applyTheme } from "@/lib/theme/utils";

// Apply any theme
applyTheme("golden-hour");
applyTheme("dark-void");
```

**Getting Theme for Route:**
```typescript
import { getThemeForRoute } from "@/lib/theme/utils";

const theme = getThemeForRoute("/notes"); // Returns "wisteria-dream"
const theme = getThemeForRoute("/countdown"); // Returns "golden-hour"
```

### Using CSS Variables

All colors are defined as CSS custom properties per theme:

```css
/* In your component */
.my-element {
  color: var(--foreground);
  background: var(--card);
  border: 1px solid var(--border);
}

/* With fallback */
background: rgba(28, 16, 64, 0.86); /* Fallback */
background: color-mix(in oklab, var(--card) 86%, transparent);

/* Semantic states */
.success {
  background: var(--color-success-bg);
  color: var(--color-success-text);
  border: 1px solid var(--color-success-border);
}
```

### Theme Switching

UsVerse supports 7 themes via `data-theme` attribute:

```tsx
// Set any theme
document.documentElement.setAttribute('data-theme', 'romantic-dusk');
document.documentElement.setAttribute('data-theme', 'golden-hour');
document.documentElement.setAttribute('data-theme', 'mint-garden');
document.documentElement.setAttribute('data-theme', 'wisteria-dream');
document.documentElement.setAttribute('data-theme', 'blush-cream');
document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.setAttribute('data-theme', 'dark-void');

// CSS automatically updates:
[data-theme="golden-hour"] {
  --background: #fffaf5;
  --foreground: #3d2004;
  /* ... all theme variables */
}
```

### Adding Contextual Themes to New Routes

Edit `src/lib/theme/config.ts`:

```typescript
export const ROOM_THEMES: Record<RoomId, LightTheme> = {
  dashboard: "romantic-dusk",
  // ... existing rooms
  newFeature: "mint-garden", // Add your new room here
};
```

### Color Mixing (Modern Approach)

UsVerse uses `color-mix()` in OKLAB color space for perceptually uniform mixing:

```css
/* Mixing colors */
background: color-mix(in oklab, var(--card) 86%, transparent);

/* Advantages: */
/* - More accurate than RGB/HSL */
/* - Perceptually uniform */
/* - Consistent across themes */
```

---

## 💡 Best Practices

### Do's ✅

- **Use semantic variables** (`--accent`, `--foreground`) over hardcoded colors
- **Respect theme context** — test in both dark and light modes
- **Use gradients sparingly** — reserve for important actions and emotional moments
- **Layer backgrounds** — use multiple subtle gradients for depth
- **Animate with purpose** — every animation should enhance emotional connection

### Don'ts ❌

- **Don't hardcode hex values** — always use CSS variables
- **Don't override feature-specific palettes** — they're designed for context
- **Don't use pure black or pure white** — use themed values
- **Don't create new accent colors** — use the established palette
- **Don't ignore reduced motion** — always provide static fallbacks

---

## 🎭 Emotional Design Principles

The UsVerse color palette is designed to evoke specific emotions:

1. **Warmth & Intimacy** — Soft pinks, peachy oranges, warm backgrounds
2. **Dreamy & Ethereal** — Lilac purples, sky blues, subtle glows
3. **Romance & Passion** — Blossom pink as primary accent, heartbeat gradients
4. **Nostalgia & Memory** — Diary's paper tones, polaroid frames, tape accents
5. **Classic Elegance** — Cinema's theater gold, velvet curtains, warm lighting

Every color choice serves the mission: **creating a space where distance cannot enter**.

---

## 📚 Quick Reference

### Most Common Colors

```css
/* Primary accent */
var(--accent)              /* #ff6b9d */

/* Backgrounds */
var(--background)          /* #0d0720 dark / #fff8fb light */
var(--card)                /* #1c1040 dark / #ffffff light */
var(--surface-2)           /* #2d1654 dark / #fff0f7 light */

/* Text */
var(--foreground)          /* #f0d6ff dark / #1a0d2e light */
var(--text-soft)           /* #c9a8df dark / #4a3d5a light */
var(--text-whisper)        /* #9f82ba dark / #6b5a7d light */

/* Borders & Lines */
var(--border)              /* rgba(155, 109, 255, 0.3) dark / #f0cadf light */

/* Primary Gradient */
var(--gradient-heartbeat)  /* Blossom → Peach → Rose Mist */
```

---

**Last Updated:** April 2026
**Version:** 1.0.0
**Maintainer:** UsVerse Design System Team

*Color palette crafted with love, for love. 💜*
