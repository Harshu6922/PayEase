# Dashboard Redesign — Command Center

**Date:** 2026-03-21
**Scope:** Dashboard page only (first phase of full-app redesign)
**Status:** Approved by user

---

## Overview

Redesign the payroll manager's dashboard to follow the "Command Center" visual direction: a dark slate header band for immediate authority, a warm off-white body for readability, and gold/amber as a single accent color reserved for the hero metric and primary actions. The sidebar navigation must exactly match the existing `Sidebar.tsx` route structure.

---

## Visual Design System

### Color Palette
| Token | Value | Usage |
|---|---|---|
| Slate 900 | `#1C2333` | Sidebar background, header band, dark widgets |
| Slate 700 | `#2D3748` | Hover states, avatar backgrounds |
| Warm White | `#F7F6F3` | Page body background |
| Card White | `#FFFFFF` | Card surfaces |
| Gold | `#D4A847` | Hero metric, primary CTA, active nav indicator |
| Muted Text | `#6B7A99` | Inactive nav labels, secondary text, header band sub-labels |
| Divider | `#EDECEA` | Card borders, table row dividers |

### Typography
| Role | Font | Weight | Size |
|---|---|---|---|
| Display numbers (hero) | DM Sans | 800 | 52px |
| Display numbers (secondary) | DM Sans | 700 | 32px |
| KPI numbers | DM Sans | 800 | 40px |
| Section headings | DM Sans | 700 | 16px |
| Page title | DM Sans | 800 | 36px |
| Body / labels | Inter | 400–500 | 12–14px |
| Table data | Inter | 500 | 13px |
| Category labels | Inter | 600 | 10px (uppercase, tracked) |

---

## Sidebar

### Brand Header
A 64px-tall header row at the top of the sidebar, separated by a `rgba(255,255,255,0.06)` bottom border. Contains:
- Logo mark: 32×32px rounded square with **gold `#D4A847` background**, letter "P" in `#1C2333` DM Sans Black
- Wordmark: "PayrollApp" in Inter 700, 15px, white `#FFFFFF`
- The `onClose` mobile close button (when present) uses `#6B7A99` icon color on a `rgba(255,255,255,0.06)` hover background

### Navigation Groups
Matches the existing `navigation` array in `Sidebar.tsx` exactly. Five groups:

1. **Overview** — Dashboard
2. **Workforce** — Employees, Attendance, Att. Summary, Daily Attendance, Advances
3. **Commission** — Commission Items, Work Entries
4. **Payroll** — Reports, Payment History, Expenses, Charts
5. **Account** — Settings

### Active State
Gold `#D4A847` background tint (`rgba(212,168,71,0.12)`), gold text and icon, gold dot aligned to right edge.

The Framer Motion `layoutId="sidebar-active-bg"` animated background span is **retained** — do not replace with static CSS. The existing `layoutId="sidebar-active-dot"` dot animation is also retained.

The 3px left gold bar is implemented as an absolutely-positioned `<span>` rendered **after** the `sidebar-active-bg` span inside the link element, so it paints on top of the animated background:
```
position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 20px; background: #D4A847; border-radius: 2px; z-index: 1;
```
No `layoutId` on the bar — it is a static element that appears/disappears with the active state conditionally, not animated independently.

### Inactive State
Muted `#6B7A99` text and icon. Hover: `rgba(255,255,255,0.04)` background fill.

### Group Category Labels
The all-caps group headers ("OVERVIEW", "WORKFORCE", etc.) use `#6B7A99` (Muted Text token), Inter 600, 10px, letter-spacing `0.08em`. This replaces the existing Tailwind classes `text-gray-400 dark:text-gray-500`.

### Footer
Two controls, separated from nav by a `rgba(255,255,255,0.06)` top border:
- **Theme toggle** — retained as-is (cycles Light → Dark → System), styled with `#6B7A99` icon and label, hover `rgba(255,255,255,0.04)`. The sidebar is always-dark but the app body still supports theming, so this control stays.
- **Sign Out** — `#6B7A99` text/icon, hover `rgba(239,68,68,0.12)` red tint with red text (matching existing behavior).

---

## Header Band

Full-width dark slate band (`#1C2333`) at the top of the main content area.

**Left side:**
- Month label: Inter 500, 11px, `#6B7A99` (Muted Text token), all-caps, tracked
- Page title "Dashboard": DM Sans 800, 36px, white

**Right side:**
- Month picker button: ghost style with border, shows current month
- "Run Payroll" primary CTA: gold background `#D4A847`, dark text `#1C2333`, Inter 600 13px

**Hero metric row** (within the header band):
- Label: "TOTAL PAYROLL THIS MONTH" — Inter 500, 11px, all-caps, muted
- Value: DM Sans 800, 52px, gold `#D4A847`
- MoM badge: green background pill with up arrow and percentage
- "vs last month" label in muted text
- Vertical divider → "PENDING PAYMENTS" value in white DM Sans 700, 32px
- Vertical divider → "PAID OUT" value in white DM Sans 700, 32px

---

## KPI Cards Row

Four equal-width white cards (`border-radius: 14px`, `border: 1px solid #EDECEA`) laid out in a 4-column grid.

### Card 1 — Total Employees
- Big number: `24` (DM Sans 800, 40px)
- Sub-label: "Active this month"
- Breakdown badges: 14 Salaried (indigo), 6 Commission (gold), 4 Daily (green)
- Icon: people icon on gold-tinted background

### Card 2 — Attendance Today
- Big number: `21 / 24` (DM Sans 800, 40px + muted `/24`)
- Sub-label: "Present · 3 absent"
- Progress bar: green fill at 87.5%
- Icon: checkmark on green-tinted background

### Card 3 — Advances Outstanding
- Big number: `₨ 38,000` (DM Sans 800, 40px)
- Sub-label: "Across 7 employees"
- Warning badge: "₨ 12,000 due this month" in amber pill
- Icon: clock on gold-tinted background

### Card 4 — Expenses This Month
- Big number: `₨ 56,200` (DM Sans 800, 40px)
- Sub-label: "12 transactions logged"
- Trend badge: "+8.4% vs last month" in red pill with down arrow
- Icon: list icon on red-tinted background

---

## Bottom Row

Two-column layout: Employee Overview table (flex: 2) + Right Panel (flex: 1).

### Employee Overview Table
White card with header "Employee Overview" and "View all →" link in gold.

Columns: Employee (avatar + name) | Type (badge) | Attendance (mini progress bar + fraction) | Payable (amount, right-aligned)

Four preview rows showing one of each employee type. Avatar initials colored by type (indigo = salaried, amber = commission, green = daily).

### Right Panel (stacked)

**Quick Actions card:**
- Primary: "Mark Attendance" — dark slate background, gold `+` icon
- Secondary actions: Log Work Entry, Add Expense, View Reports — warm off-white background with border

**Payment Status widget:**
- Dark slate background (`#1C2333`)
- Three rows: Fully Paid (green), Partially Paid (gold), Unpaid (red) with employee counts
- Stacked progress bar at bottom showing proportions

---

## Implementation Notes

- Replace existing indigo accent (`indigo-600`, `indigo-50`, `indigo-700`) with gold `#D4A847` and slate `#1C2333` tokens across the dashboard page only.
- The sidebar color scheme changes from `bg-white dark:bg-gray-900` to always-dark `#1C2333` — this is a persistent sidebar, not theme-dependent. Replace all existing Tailwind border classes on the sidebar (`border-gray-100 dark:border-gray-700`, `border-gray-200 dark:border-gray-700`) with `border border-white/[0.06]` (i.e., `rgba(255,255,255,0.06)`).
- Font families (DM Sans, Inter) are already available in the project. If not, add via `next/font/google`.
- All KPI data is real — pulled from existing Supabase queries already used on the dashboard.
- The "Run Payroll" button maps to the existing payroll trigger action.
- No new routes or data fetching — purely a visual layer change on the existing dashboard page and sidebar component.
