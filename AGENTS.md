# Talent Insights / Aurrum CRM - Enterprise Design System & Guidelines

This file contains the persistent custom instructions, architectural guidelines, theme standards, and the **Enterprise Design System** for the **Talent Insights / Aurrum CRM** platform. All AI Studio agents and developers MUST load, respect, and adhere strictly to these rules during all development, modification, and maintenance sessions.

---

## 🎨 Enterprise UI Design System

### 1. Unified Theme Architecture (Light & Dark Theme Parity)
- **Single Design System**: Light Theme and Dark Theme share the exact same layout, component structure, spacing, typography scale, navigation hierarchy, and functional behavior.
- **Variable-Driven Palette**: Theme switching updates semantic CSS custom properties (`--bg-primary`, `--card-bg`, `--text-primary`, `--border-color`, etc.) seamlessly with smooth transitions without causing layout shifts or page re-renders.
- **Theme Philosophy**:
  - **Light Mode**: Bright, clean, and modern. Pure white (`#FFFFFF`) cards and surfaces layered on a soft neutral canvas (`#F8FAFC`). High-contrast typography in deep navy (`#002D38` / `#003649`). No faded or low-contrast text.
  - **Dark Mode**: Deep brand blues (`#002D38`, `#003E51`, `#003649`) as layered background surfaces instead of harsh pure black (`#000000`). Crisp off-white and pure white typography (`#FFFFFF`, `#E2E8F0`).

---

### 2. Official Brand Palette & Color Tokens

#### Primary Blue Palette
- `#004564` — **Primary Brand Color**
- `#005472` — Dark Blue
- `#003649` — Dark Blue 3
- `#002D38` — Darkest Blue
- `#003E51` — Dark Blue 2

#### Primary Gold Accent Palette
- `#A98B56` — **Primary Gold Accent**
- `#BC9B66` — Gold Light
- `#9B7E50` — Gold Medium
- `#8C6E42` — Dark Gold
- `#A08151` — Gold Dark

#### Status & Semantic Indicators
- **Success**: `#22C55E` (Emerald Green)
- **Warning**: `#F59E0B` (Amber)
- **Error / Danger**: `#EF4444` (Rose / Red)
- **Info**: `#3B82F6` (Sky Blue)

#### Text Tokens & Contrast Rules
- **Light Theme**:
  - `--text-primary`: `#002D38` (Darkest Blue, solid high contrast)
  - `--text-secondary`: `#003649` (Dark Blue 3)
  - `--text-muted`: `#005472` (Readable Mid-Blue)
- **Dark Theme**:
  - `--text-primary`: `#FFFFFF` (Pure White)
  - `--text-secondary`: `#E2E8F0` (Light Slate)
  - `--text-muted`: `#94A3B8` (Soft Gray)

---

### 3. Typography Standards (Font: Poppins)
- **Font Family**: **Poppins** across the entire CRM (`font-sans`).
- **Hierarchy & Scale**:
  - **Display / Headings (H1-H3)**: Poppins, 700-800 weight, tight tracking.
  - **Body Text**: Poppins, 400-500 weight, 1.5–1.6 line height for effortless readability.
  - **Labels, Buttons & Badges**: Poppins, 600-700 weight, uppercase tracking where appropriate.
- **Accessibility & Contrast**:
  - Body text must meet WCAG AA (minimum 4.5:1 contrast ratio).
  - Never use reduced opacity for text hierarchy. Always use solid, high-contrast brand color tokens.

---

### 4. Core Component Specifications

#### Sidebar Navigation
- **Branding & Header**: Premium collapsible design featuring Aurrum CRM gold sparkle emblem.
- **Section Grouping**: Logical categorization into **Core Platform**, **Operations & Insights**, and **Preferences**.
- **Interactive States**:
  - Active tab highlighted with a soft gold accent background and left accent border (`#A98B56`).
  - Smooth hover transitions and floating tooltips when sidebar is collapsed.
- **Footer**: Integrated current user profile summary and role badge (`Recruiter`, `Admin`, `Team Leader`).

#### Cards & Modals
- Built using the standardized `.crm-card` utility class.
- White (`#FFFFFF`) or dark blue (`#003E51`) surface with a crisp 1px border (`var(--border-color)`) and subtle elevation shadow.
- Border radius capped at standard 16px (`--radius-card`) and 24px (`--radius-modal`).

#### Buttons & Interactive Controls
- **Primary Gold Button (`.crm-btn-gold`)**: Gradient `#A98B56` to `#BC9B66` with high-contrast white text and active scale animation.
- **Secondary Button (`.crm-btn-secondary`)**: Surface-colored background with a crisp border, brand blue/gold text, and smooth hover state.
- **Inputs & Form Controls (`.crm-input`, `.crm-label`)**: Solid white or surface background with high-contrast labels, clear focus ring in primary gold, and distinct placeholder text.

#### Tables & Data Views
- Standardized via `.crm-table-container` and `.crm-table`.
- Sticky table headers with high contrast uppercase labels.
- Soft row hover states (`hover:bg-[var(--card-hover-bg)]`) and distinct status badges (`.crm-badge-gold`, `.crm-badge-success`, `.crm-badge-warning`).

---

## 🔒 Security Specifications & Data Invariants

1. **IP-Based Access Restriction**: Controlled via `ALLOWED_IPS`. Fail-closed policy.
2. **Firestore Security Rules**: Strict adherence to `firestore.rules` and `firebase-blueprint.json`. `uploadedBy` UID validation is required for candidate records.

---

## 🛠️ Backend Services & AI Architecture

1. **AI Waterfall Parsing**:
   - Primary: `gemini-3.5-flash` via `@google/genai` SDK.
   - Fallback: `gemini-3.1-flash-lite` -> Heuristic/Regex local fallback.
2. **Node Server & Production Build**:
   - Dev: `tsx server.ts`
   - Build: `vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`
   - Start: `node dist/server.cjs` (Binds to Port `3000`, Host `0.0.0.0`).

---

## 📚 Operational Context & Roles

- **Roles & Permissions**: Admin, Team Leader, Recruiter, Client, Developer.
- **Key Modules**: Dashboard, Candidate Management, CV Repository, Pipeline, Invoices, Analytics, Notifications, System Settings.
- **Activity Log**: Comprehensive audit trail tracking User, Module, Action, Status, IP, and Browser details.
