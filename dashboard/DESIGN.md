# Design System: IoT Design System
**Project ID:** 18018319440039617117

## 1. Visual Theme & Atmosphere
The interface defines a **technical, high-contrast IoT aesthetic**. It balances a "Midnight" dark mode for low-light environments with a "Paper" light mode. The vibe is **utilitarian but refined**, using distinct orange accents for branding and active states against deep brownish-black backgrounds.

## 2. Color Palette & Roles

### Primary & Brand
*   **Primary Orange** (`#f48c25`): Used for branding, main action buttons, active icons, and high-visibility states.
*   **Background Light** (`#f8f7f5`): Off-white/beige for light mode backgrounds.
*   **Background Dark** (`#221910`): "Midnight" - A deep, warm black used as the main page background in dark mode.

### Status Colors
*   **Success Green** (`#10b981`): Emerald-500. Used for "Operational", "Online", "Sync Complete".
*   **Warning Amber** (`#f59e0b`): Amber-500. Used for "Warning", "Voltage Drop".
*   **Danger Red** (`#f43f5e`): Rose-500. Used for "Critical", "Error", "Offline".

### Neutrals (Dark Mode Context)
*   **Slate 900** (`#0f172a`): Used for card backgrounds (`bg-slate-900` / `dark:bg-slate-900`) to separate content from the Midnight background.
*   **Slate 500/400**: Used for secondary text (`text-slate-500`, `text-slate-400`).
*   **Slate 100/200**: Used for primary text in dark mode (`text-slate-100`).

## 3. Typography Rules
*   **Font Family:** "Inter", sans-serif.
*   **Display:** Bold/Black weights for numbers and hero text.
*   **Body:** Medium/Regular for labels and data.
*   **Monospace:** Used effectively for IDs and payloads (e.g., `iot/sensors/node_01`).

## 4. Component Stylings

*   **Buttons:**
    *   **Primary:** Rounded-lg (`8px`), Background `#f48c25`, White text.
    *   **Secondary/Icon:** Background `slate-100` (light) or `slate-800` (dark), Text `slate-600`/`slate-400`.

*   **Cards/Containers:**
    *   **Shape:** `rounded-xl` (12px) is standard.
    *   **Shadow:** `.soft-shadow` (`0 4px 20px -2px rgba(0, 0, 0, 0.05)`).
    *   **Background:** `bg-white` (light) or `bg-slate-900` (dark).
    *   **Border:** `border-slate-200` (light) or `border-slate-800` (dark).

*   **Inputs:**
    *   **Style:** Rounded-lg, bg-slate-50 (light) or bg-slate-800 (dark).
    *   **Focus:** Border `#f48c25` (`focus:border-primary`).

## 5. Layout Principles
*   **Spacing:** `gap-6` and `gap-8` are common.
*   **Sidebar:** Fixed width (w-64), distinct background (white/slate-900) vs page background.
*   **Grid:** Responsive grids (`grid-cols-1` -> `grid-cols-4`).

## 6. Icons
*   **Style:** Material Symbols Outlined (rounded, stroke-like).
*   **Usage:** Often enclosed in rounded-lg containers with `bg-slate-100` or `bg-primary`.
