---
name: Academic Work-Integrated Learning Platform
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#444651'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#00246b'
  on-tertiary: '#ffffff'
  tertiary-container: '#00389a'
  on-tertiary-container: '#8da9ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#dbe1ff'
  tertiary-fixed-dim: '#b4c5ff'
  on-tertiary-fixed: '#00174b'
  on-tertiary-fixed-variant: '#003ea8'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.025em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  code-xs:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

The design system is engineered for multi-stakeholder academic and internship administration. It addresses four distinct user groups: university administrators, faculty practicum coordinators, student interns, and industry site supervisors. The interface balances high-density administrative oversight with high-clarity transactional workflows (evaluations, timesheet sign-offs, placement verifications, and compliance monitoring).

The design style combines **Corporate / Modern** precision with modern analytical ergonomics:
- **Clean Structure & Focus:** Heavy use of deliberate whitespace, crisp hairline boundaries, and restrained color application to prevent fatigue during extended data audits.
- **Accountability & Trust:** Visual hierarchy is disciplined and systematic, projecting collegiate institutional authority alongside contemporary tech agility.
- **Role Parity:** The system smoothly scales from high-density, multi-column reporting grids on coordinator desktops to streamlined, action-oriented task cards on supervisor and student mobile web surfaces.

## Colors

The palette establishes an authoritative institutional foundation contrasted with functional contextual states.

### Primary, Secondary, and Neutral
- **Primary Navy (`#1E3A8A` / `#0F172A`):** Core institutional blue for key navigation, brand headers, primary call-to-actions, and emphasized typography. Deep slate `#0F172A` serves as the dominant high-contrast foreground color.
- **Secondary Teal (`#0D9488` / `#14B8A6`):** Applied strictly as an interactive accent—active tabs, key metrics highlights, completion indicators, and contextual progress rings.
- **Tertiary Royal Blue (`#2563EB`):** Dedicated to procedural milestones, student submissions, and actionable review triggers.
- **Surface Neutrals (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`, `#E2E8F0`):** Pure white cards layered over soft slate base backgrounds (`#F8FAFC`), bordered with subtle slate boundaries (`#E2E8F0`) to ensure contrast without visual bulk.

### Semantic Status Hierarchy
The badge and notification system adheres to strict semantic discipline:
- **Active / Approved:** Deep Emerald (`#047857`) text on Light Mint (`#ECFDF5`) background with `#A7F3D0` outline.
- **Pending / Action Required:** Dark Amber (`#B45309`) text on Warm Amber (`#FFFBEB`) background with `#FDE68A` outline.
- **Submitted / In Progress:** Royal Blue (`#1D4ED8`) text on Ice Blue (`#EFF6FF`) background with `#BFDBFE` outline.
- **Rejected / Overdue / Flagged:** Rose Red (`#BE123C`) text on Soft Rose (`#FFE4E6`) background with `#FECDD3` outline.
- **Completed:** Forest Pine (`#14532D`) text on Pale Pine (`#DCFCE7`) background with `#86EFAC` outline.
- **Cancelled / Inactive:** Cool Gray (`#475569`) text on Slate Gray (`#F1F5F9`) background with `#CBD5E1` outline.

## Typography

The typographic engine pairs **Manrope** for structured, confident headlines with **Inter** for readable, neutral UI microcopy and analytical tables. **JetBrains Mono** is introduced for precision metadata: student identification numbers, verification hashes, shift timestamps, and requirement codes.

- **Numbers & Data:** Inter features tabular lining figures (`tnum`) across all data grids, ensuring vertical alignment across hours rendered, completion percentages, and dates.
- **Hierarchy Rules:** Section titles rely on Manrope Semi-Bold and Bold weights with tight tracking (`-0.02em`). Form inputs and table cells default strictly to `body-md` (14px) and `body-sm` (12px) to guarantee readability without excessive row height bloat.

## Layout & Spacing

The layout is built on an adaptive 12-column grid prioritizing data density and vertical scanability.

- **Desktop (1024px+):** Fixed 260px collapsible sidebar for administrative roles, paired with a fluid main canvas containing a 12-column subgrid. Gutters are locked to `1.5rem` (`gutter-desktop`) with `2rem` outer canvas padding (`margin-desktop`).
- **Tablet (768px - 1023px):** Collapsed iconography rail (64px) with dynamic multi-column layouts adapting to 6 columns. Margin scales down to `1.5rem` (`margin-tablet`).
- **Mobile (< 768px):** Single-column stack with persistent bottom-sheet or bottom-bar navigation for quick timesheet approvals and student check-ins. Margin tightens to `1rem` (`margin`).
- **Density Scaling:** Tables, forms, and lists use a tight `0.5rem` (`space-sm`) and `0.75rem` (`space-md`) vertical padding cadence to accommodate high-volume student rosters without infinite vertical scrolling.

## Elevation & Depth

Visual hierarchy uses a refined **low-contrast outline and subtle ambient shadow** model. Heavy dropshadows are prohibited to avoid cluttering dense tabular data.

- **Layer 0 (Base Canvas):** `#F8FAFC` base application background.
- **Layer 1 (Card & Module Surfaces):** Solid `#FFFFFF` enclosed by a 1px border of `#E2E8F0`. Shadow is an ambient diffusion: `0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`.
- **Layer 2 (Dropdowns, Popovers, Date Pickers):** Elevated `#FFFFFF` surfaces with subtle border `#CBD5E1` and focused lift: `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)`.
- **Layer 3 (Modals & Evaluation Drawers):** High-level overlay backdropped by `#0F172A` at 40% opacity with backdrop blur (4px), using depth: `0 20px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.06)`.
- **Data Rows & Dividers:** Subtle horizontal separator lines rendered strictly at 1px using `#F1F5F9` for inner rows and `#E2E8F0` for table headers and summaries.

## Shapes

The interface employs a balanced corner radius scale (`roundedness: 2` — default base `0.5rem` / `8px`):
- **Base Elements (Buttons, Inputs, Row Selectors, Badges):** `8px` (`0.5rem`) for a clean, professional, and accessible touch target.
- **Cards, Panels, and Table Enclosures:** `12px` to `16px` (`rounded-lg` to `rounded-xl`) outer perimeter, ensuring analytical blocks are neatly sectioned.
- **Pill Modifiers:** Reserved exclusively for status indicators, workflow step badges, and counter pills (`rounded-full` / `9999px`) to immediately distinguish categorical statuses from interactive rectangular buttons.

## Components

### Buttons
- **Primary:** Background `#1E3A8A`, text `#FFFFFF`, radius `8px`. Hover: `#172554`. Focus: ring 2px `#0D9488` with 2px offset.
- **Secondary (Teal Action):** Background `#0D9488`, text `#FFFFFF`, radius `8px`. Hover: `#0F766E`. Reserved for generative actions (e.g., "Log Hours", "Approve DTR", "Sign Clearance").
- **Outline / Ghost:** Border 1px `#CBD5E1`, text `#0F172A`, background transparent. Hover: `#F1F5F9`.
- **Destructive:** Background `#FFF1F2`, border 1px `#FECDD3`, text `#BE123C`. Hover: `#FFE4E6`.

### Status Badges & Chips
- Formed as a compact pill (`height: 24px`, padding `0.25rem 0.625rem`, font `label-sm` or `code-xs`).
- Uses a tinted background, coordinating 1px hairline border, and deep tone text matching the semantic status specification.
- May include a leading 6px solid circular status dot.

### Dense Data Tables
- **Header:** Background `#F8FAFC`, bottom border 1px `#CBD5E1`, font `label-sm`, uppercase, color `#475569`.
- **Row:** Height `44px` (dense) to `52px` (standard). Hover state uses `#F8FAFC`. Selected state uses `#F0FDFA` with a leading 3px `#0D9488` border.
- **Cell Content:** Body font `13px/14px`, numerical IDs and hours rendered in `JetBrains Mono` with right-alignment for totals.

### Form Inputs & Select Fields
- Border 1px `#CBD5E1`, background `#FFFFFF`, radius `8px`, height `38px` (`dense`) or `44px` (`default`).
- Focus state: border `#0D9488`, outline box-shadow `0 0 0 3px rgba(13, 148, 136, 0.15)`.
- Helper labels sit 4px above the field in `label-md` `#334155`. Error messages sit 4px below in `#BE123C`.

### Cards & Metrics Summaries
- **Stat Cards:** Background `#FFFFFF`, border 1px `#E2E8F0`, padding `space-lg`. Metric numbers set in `Manrope` Bold (28px) with small secondary change indicator chip and secondary accent label.
- **Student Profile Snapshot Card:** Two-column split layout displaying student metadata, completed-to-required hour progress bar (styled in `#0D9488`), and company supervisor contact chip.

### Checkboxes & Radio Controls
- Checkbox: 16x16px, border 1.5px `#94A3B8`, radius `4px`. Checked: background `#1E3A8A`, icon `#FFFFFF`.
- Radio: 16x16px circle, checked: ring `#1E3A8A` with inner filled core `#1E3A8A`.