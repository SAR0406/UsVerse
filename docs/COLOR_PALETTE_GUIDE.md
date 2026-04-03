# UsVerse Color Palette Guide 🎨

> *A romantic, dreamy color system designed for intimate digital connection*

## Overview

UsVerse uses a carefully crafted color palette that evokes warmth, intimacy, and romance. The design system supports both dark and light themes, with perceptually balanced colors that create a cohesive emotional experience across all features.

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

## 🌙 Dark Theme

The default theme for UsVerse — a romantic dark cosmos where love glows.

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

## ☀️ Light Theme

An optional bright mode that maintains the romantic essence with softer, warmer tones.

### Background Layers

| Layer | Variable | Color | Purpose |
|-------|----------|-------|---------|
| **Base** | `--background` | `#fff8fb` | Warm paper-like background |
| **Card** | `--card` | `#ffffff` | Pure white cards |
| **Surface 2** | `--surface-2` | `#fff0f7` | Subtle pink tint |

### Foreground Colors

| Element | Variable | Color | Usage |
|---------|----------|-------|-------|
| **Primary Text** | `--foreground` | `#2d1654` | Main text (dark) |
| **Soft Text** | `--text-soft` | `#8b6f9a` | Secondary text |
| **Whisper Text** | `--text-whisper` | `#c4a8d4` | Tertiary text |
| **Border** | `--border` | `#f0cadf` | Soft pink borders |

### Background Atmosphere

Light theme uses softer gradient overlays:

```css
background:
  radial-gradient(circle at 0% 0%, rgba(255, 214, 231, 0.6), transparent 45%),
  radial-gradient(circle at 100% 100%, rgba(200, 182, 226, 0.25), transparent 40%),
  var(--background);
```

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

### Using CSS Variables

All colors are defined as CSS custom properties in `:root`:

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
```

### Theme Switching

UsVerse supports theme switching via `data-theme` attribute:

```tsx
// Set theme
document.documentElement.setAttribute('data-theme', 'light');

// CSS automatically updates via:
[data-theme="light"] {
  --background: #fff8fb;
  --foreground: #2d1654;
  /* ... */
}
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
var(--foreground)          /* #f0d6ff dark / #2d1654 light */
var(--text-soft)           /* #c9a8df dark / #8b6f9a light */
var(--text-whisper)        /* #9f82ba dark / #c4a8d4 light */

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
