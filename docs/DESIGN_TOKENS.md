# Design Tokens & Guidelines — BPMN Studio

This document specifies the design tokens, visual aesthetics, color roles, typography scale, radius geometry, and styling standards for **BPMN Studio**, designed after modern productivity and financial dashboard benchmarks (Donezo & Neatclever).

---

## 1. Color Palette & Roles

The design system is grounded in a distinctive, rich **Forest Emerald / Pine Green** brand identity paired with a clean **Warm Sage Canvas**, crisp white surfaces, and an energizing **Warm Amber** accent.

### A. Core Theme Variables

| Token                    | Light Theme Value                    | Dark Theme Value                    | Role / Usage                                                                     |
| ------------------------ | ------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------- |
| `--primary`              | `oklch(0.44 0.145 152)` (`#166838`)  | `oklch(0.52 0.15 152)` (`#1F874C`)  | Hero brand color, primary CTA buttons, active sidebar items, key highlight cards |
| `--primary-foreground`   | `oklch(0.99 0 0)` (`#FFFFFF`)        | `oklch(0.99 0 0)` (`#FFFFFF`)       | Text and icon contrast on primary background                                     |
| `--secondary`            | `oklch(0.96 0.038 152)` (`#E8F7EC`)  | `oklch(0.22 0.04 152)` (`#132B1E`)  | Soft mint/sage badge background, secondary action buttons                        |
| `--secondary-foreground` | `oklch(0.35 0.12 152)` (`#13502C`)   | `oklch(0.92 0.06 152)` (`#B8F2CE`)  | Text and icon on secondary elements                                              |
| `--background`           | `oklch(0.985 0.003 150)` (`#F7F9F7`) | `oklch(0.12 0.014 150)` (`#0B110D`) | App shell canvas background (ultra-clean airy canvas / obsidian forest)          |
| `--foreground`           | `oklch(0.16 0.015 150)` (`#121814`)  | `oklch(0.97 0.006 150)` (`#F3F7F4`) | Base text typography                                                             |
| `--card`                 | `oklch(1 0 0)` (`#FFFFFF`)           | `oklch(0.16 0.018 150)` (`#131D17`) | Surface panels, workspace cards, popovers                                        |
| `--card-foreground`      | `oklch(0.16 0.015 150)`              | `oklch(0.97 0.006 150)`             | Card content text                                                                |
| `--muted`                | `oklch(0.955 0.01 150)`              | `oklch(0.20 0.02 150)`              | Inset containers, table headers, inactive tab list                               |
| `--muted-foreground`     | `oklch(0.48 0.025 150)` (`#526257`)  | `oklch(0.70 0.025 150)`             | Secondary labels, descriptions, metadata                                         |
| `--border`               | `oklch(0.935 0.006 150)` (`#E4E8E5`) | `oklch(0.26 0.02 150 / 75%)`        | Delicate soft dividing line and container border                                 |
| `--ring`                 | `oklch(0.44 0.145 152)`              | `oklch(0.72 0.18 152)`              | Keyboard focus ring & selection outline                                          |

### B. Flow Diagram Semantic Colors

Flow block types are cleanly distinguished using semantic tones harmonious with the Forest Emerald palette:

| Block Type                 | Variable            | Color Value            | Description       |
| -------------------------- | ------------------- | ---------------------- | ----------------- |
| **Sequential (SEQ)**       | `--color-flow-seq`  | `oklch(0.48 0.12 155)` | Forest Pine Green |
| **Exclusive Choice (XOR)** | `--color-flow-xor`  | `oklch(0.70 0.15 75)`  | Warm Golden Amber |
| **Parallel (AND)**         | `--color-flow-and`  | `oklch(0.62 0.12 185)` | Fresh Teal Mint   |
| **Loop (LOOP)**            | `--color-flow-loop` | `oklch(0.62 0.14 25)`  | Soft Coral Rose   |

### C. Status Badge Semantic Tones

| Status                    | Background (Light) | Text (Light) | Background (Dark)          | Text (Dark) |
| ------------------------- | ------------------ | ------------ | -------------------------- | ----------- |
| **Completed / Success**   | `#E8F5E9`          | `#1B5436`    | `rgba(16, 185, 129, 0.15)` | `#6EE7B7`   |
| **In Progress / Warning** | `#FEF3C7`          | `#B45309`    | `rgba(245, 158, 11, 0.15)` | `#FCD34D`   |
| **Pending / Review**      | `#FEE2E2`          | `#B91C1C`    | `rgba(239, 68, 68, 0.15)`  | `#FCA5A5`   |

---

## 2. Geometry & Corner Radii

The design system embraces modern, friendly pill and soft-card curvatures:

| Token                      | Value    | Tailwind Class   | Usage                                            |
| -------------------------- | -------- | ---------------- | ------------------------------------------------ |
| `--radius-sm`              | `8px`    | `rounded-lg`     | Small tags, compact badges, inner table controls |
| `--radius` / `--radius-lg` | `12px`   | `rounded-xl`     | Buttons, inputs, tab triggers, dialogs           |
| `--radius-card`            | `18px`   | `rounded-2xl`    | Block cards, timesheet card, metric stats        |
| `--radius-surface`         | `22px`   | `rounded-[22px]` | Workspace panels, floating sidebar, drawer       |
| Full Pill                  | `9999px` | `rounded-full`   | Status badges, icon buttons, counter tags        |

---

## 3. Typography Scale

Typography uses **Mona Sans** across all roles with high legibility and balanced proportions:

| Role                       | Font Family      | Size            | Weight           | Line Height |
| -------------------------- | ---------------- | --------------- | ---------------- | ----------- |
| **Heading 1 / Page Title** | Mona Sans        | `24px` - `28px` | `600` (SemiBold) | `32px`      |
| **Heading 2 / Section**    | Mona Sans        | `18px` - `20px` | `600` (SemiBold) | `26px`      |
| **Card / Title**           | Mona Sans        | `14px` - `16px` | `600` (SemiBold) | `22px`      |
| **Body / Standard**        | Mona Sans        | `13px` - `14px` | `400` / `500`    | `20px`      |
| **Caption / Helper**       | Mona Sans        | `11px` - `12px` | `400` / `500`    | `16px`      |
| **Mono Values / Metrics**  | GeistMono / Mono | `12px` - `14px` | `500` / `600`    | `18px`      |

---

## 4. Elevation & Shadows

Depth is kept clean and diffused without harsh black dropshadows:

- **Surface Card**: `shadow-xs` (`0 1px 2px 0 rgba(0, 0, 0, 0.03)`).
- **Floating Panel / Sidebar**: `shadow-xs` with `border border-border/70`.
- **Active / Hover State**: Subtle elevation lift with `shadow-sm` or `ring-2 ring-primary/20`.

---

## 5. Implementation Rules for Contributors

1. **Always use theme tokens**: Never hardcode colors like `bg-green-600` or `text-zinc-800` when semantic tokens (`bg-primary`, `text-primary-foreground`, `text-foreground`, `bg-card`) exist.
2. **Card & Surface Backgrounds**: All cards and dialogs must use `bg-card text-card-foreground` over `bg-background`.
3. **Pill & Button Standards**: Primary call-to-action buttons use `variant="default"` (`bg-primary text-primary-foreground rounded-xl`).
4. **Interactive Focus**: Ensure all custom interactive controls specify `focus-visible:ring-ring/50 focus-visible:ring-[3px]`.
