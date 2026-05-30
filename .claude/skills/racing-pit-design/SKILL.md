---
name: racing-pit-design
description: Apply the Racing Pit design system when building any UI for this project. Use this skill when asked to create components, pages, layouts, or any visual element in the Racing Pit Next.js app.
---

# Racing Pit Design System

Always follow this design system when building UI for the Racing Pit project.

## Visual Direction

**Aesthetic**: Modern liquid glass — airy white surfaces with frosted glass depth, floating above a soft gradient mesh. Premium, editorial, clean. Inspired by premium data products and Bloomberg-style racing dashboards.

**Character**: The app tracks horses, jockeys, and bets — it should feel like a high-end sporting intelligence tool. Confident, not flashy. Refinement over decoration.

## Color Palette

CSS custom properties are defined in `src/app/globals.css`. Use them directly or via Tailwind classes.

### Racing Green (primary accent)
| Token | Hex | Usage |
|---|---|---|
| `--green-900` / `text-green-900` | `#0D2B1E` | Headings, strong emphasis |
| `--green-800` / `bg-green-800` | `#1B4332` | Primary buttons, key UI |
| `--green-700` / `text-green-700` | `#2D6A4F` | Hover states |
| `--green-600` / `text-green-600` | `#40916C` | Labels, accents, icons |
| `--green-200` | `#B7E4C7` | Borders, dividers |
| `--green-50` | `#F0FAF3` | Subtle backgrounds |

### Racing Navy (secondary accent)
| Token | Hex | Usage |
|---|---|---|
| `--navy-800` / `bg-navy-800` | `#0F2D52` | Secondary buttons, alt headings |
| `--navy-600` | `#2356A0` | Links, interactive elements |
| `--navy-50` | `#EFF6FF` | Subtle navy tints |

### Neutrals
- Background: `--background` (`#F5F7F5`) with a soft green/navy mesh gradient (applied via `background-image` on `body`)
- Text primary: `--text-primary` (`#0A1612`)
- Text secondary: `--text-secondary` (`#4A6058`)
- Text tertiary: `--text-tertiary` (`#94A3A6`)

**NEVER use**: pure black (#000), generic grey (#9CA3AF), purple, orange, or any color outside this palette.

## Typography

Two fonts are loaded:

| Font | Variable | Use for |
|---|---|---|
| **Fraunces** (serif) | `--font-display` / `--font-fraunces` | Headings, display text, numbers |
| **Geist Sans** | `--font-body` / `--font-geist-sans` | Body, UI labels, captions |

### Typography classes (defined in globals.css)
- `.display-2xl` — Hero headlines, 3–5.5rem, weight 300
- `.display-xl` — Section titles, 2.25–4rem, weight 300
- `.display-lg` — Card headings, 1.75–2.75rem, weight 400
- `.display-md` — Sub-headings, 1.375–2rem, weight 400
- `.font-display` — Apply Fraunces to any element

**Rule**: All headings use `.display-*` classes with Fraunces. Never use Geist or a sans-serif for headings. Use italic Fraunces (`<em>`) for stylistic emphasis in headlines.

## Glass System

Three glass surface levels:

```tsx
// Light glass — default card surface
<div className="glass rounded-[var(--radius-xl)]">

// Heavy glass — modals, nav, prominent panels
<div className="glass-heavy rounded-[var(--radius-xl)]">

// Subtle glass — backgrounds, secondary areas
<div className="glass-subtle rounded-[var(--radius-xl)]">
```

Always apply `backdrop-filter` by using the `.glass*` CSS class — do not inline `backdrop-filter` manually.

## Radius Scale

Use CSS variables for border-radius, never arbitrary pixel values:
- `--radius-sm` (8px) — chips, tags, small inputs
- `--radius-md` (14px) — inputs, small buttons
- `--radius-lg` (20px) — illustration slots, images
- `--radius-xl` (28px) — cards (default)
- `--radius-2xl` (36px) — large panels
- `--radius-pill` (9999px) — pill buttons, badges

## UI Components

All reusable components live in `src/components/ui/` and are exported from `src/components/ui/index.ts`.

### GlassCard
```tsx
import { GlassCard } from "@/components/ui";

<GlassCard variant="default" radius="xl" padding="md">
  {/* variant: "default" | "heavy" | "subtle" */}
  {/* radius: "md" | "lg" | "xl" | "2xl" */}
  {/* padding: "sm" | "md" | "lg" | "xl" */}
</GlassCard>
```

### Button
```tsx
import { Button } from "@/components/ui";

<Button variant="primary" size="md">Label</Button>
{/* variant: "primary" (green) | "secondary" (navy) | "ghost" | "glass" */}
{/* size: "sm" | "md" | "lg" */}
```

### IllustrationSlot
Swappable placeholder that renders a styled dashed placeholder when no `src` is provided, and the actual image once one is available.

```tsx
import { IllustrationSlot } from "@/components/ui";

// Placeholder (design phase)
<IllustrationSlot alt="Race track" label="Race track illustration" aspectClass="aspect-video" />

// Real image (production)
<IllustrationSlot src="/images/race-track.jpg" alt="Race track" aspectClass="aspect-video" />
```

## Illustration & Image Guidelines

- All image areas use `<IllustrationSlot>` — never raw `<img>` or placeholder divs.
- Aspect ratios: `aspect-video` (16:9) for hero/feature images, `aspect-square` for icons/avatars, `aspect-[21/9]` for full-width banners.
- When real illustrations arrive, drop the `src` prop into the existing `<IllustrationSlot>` — no refactoring needed.
- Images should use the green-to-navy gradient as a backdrop color (already built into `.illustration-slot::before`).

## Layout Principles

- **Whitespace**: Generous. Never crowded. Let the glass surfaces breathe.
- **Hierarchy**: One dominant heading (Fraunces display), supporting body text (Geist), data in Fraunces display size.
- **Grid**: 1-col mobile, 3-col desktop for feature grids; use `gap-4` to `gap-6` between glass cards.
- **Max width**: `max-w-5xl` (1024px) for main content, centered with `mx-auto`.
- **Page padding**: `px-6 py-12` at the page level.

## What to NEVER do

- Use `Inter`, `Roboto`, `Arial`, or any generic sans-serif for headings
- Use purple, orange, or colors outside the green/navy/white palette
- Inline `backdrop-filter` styles — use the `.glass*` utility classes
- Use `rounded-lg` (Tailwind default) instead of the `--radius-*` variables
- Create raw `<div>` placeholder boxes — always use `<IllustrationSlot>`
- Use dark mode — this is a light-only design (no `dark:` classes)
- Use solid white backgrounds — always use glass surfaces over the mesh gradient
