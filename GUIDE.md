# Talent Insights / Aurrum CRM - Enterprise Design System Documentation & Guide

## 1. Introduction
This document serves as the primary Enterprise Design System Guide for the **Talent Insights / Aurrum CRM** application. It establishes visual standards, component patterns, theme specifications, and operational guidelines required for delivering a consistent, high-performance, and accessible enterprise SaaS experience across both **Light Theme** and **Dark Theme**.

---

## 2. Core Architectural & Design Principles

### Unified Theme Parity (Light & Dark Mode)
- **Single Component Architecture:** Light Theme and Dark Theme share the exact same component structure, typography scale, padding, margin, border-radius, and interactive functionality.
- **Variable-Driven Custom Properties:** Theme switching toggles semantic CSS custom properties (`--bg-primary`, `--card-bg`, `--text-primary`, `--text-muted`, `--border-color`, etc.) smoothly in `200ms–300ms` transitions without page refresh, layout shifts, or component re-renders.
- **Elimination of Hardcoded CSS:** Component code MUST NOT use hardcoded light/dark Tailwind classes like `bg-slate-50`, `dark:bg-slate-900`, `text-indigo-600`, or `dark:text-indigo-400`. All styling must use semantic tokens like `bg-[var(--card-bg)]`, `text-[var(--text-primary)]`, `text-[var(--primary-gold)]`, and `.crm-btn-gold`.

---

## 3. Light Theme vs Dark Theme Standards

### Why Raw Light Themes Fail Without Design Systems
Generic light themes often fail because developers combine default off-white cards with low-contrast gray text (`#94A3B8` or `#64748B`), leading to washed-out labels, illegible table text, and unappealing visual hierarchy. Furthermore, mixing default indigo/slate utility classes creates severe theme misalignment when switching between modes.

### Aurrum Light Theme Standards (Client-Ready & High Contrast)
- **Backgrounds:** Pure white (`#FFFFFF`) cards and modal surfaces layered on a crisp, soft neutral canvas (`#F8FAFC`).
- **Typography:** High-contrast solid dark navy typography (`#002D38` primary, `#003649` secondary, `#005472` muted). Faded gray text is strictly forbidden.
- **Borders & Elevation:** Crisp 1px borders (`#E2E8F0`) with subtle, refined elevation shadows.
- **Accents & Buttons:** Brand Primary Blue (`#004564`) and Primary Gold (`#A98B56`).

### Aurrum Dark Theme Standards (Modern & Comfortable)
- **Backgrounds:** Layered deep brand blue surfaces (`#002D38` canvas, `#003E51` cards) rather than harsh pure black (`#000000`).
- **Typography:** High-contrast off-white and pure white typography (`#FFFFFF` primary, `#E2E8F0` secondary, `#94A3B8` muted).
- **Borders & Elevation:** Subtle dark blue borders (`#005472`) and soft depth shadows.

---

## 4. Typography Specifications (Font: Poppins)
- **Primary Font Family:** **Poppins** across all modules.
- **Hierarchy Rules:**
  - **Headings (H1 - H3):** Poppins 700-800 weight, tight tracking, high-contrast brand tokens (`var(--text-primary)`).
  - **Body Text:** Poppins 400-500 weight, 1.5–1.6 line height for effortless long-session reading.
  - **UI Labels, Badges & Buttons:** Poppins 600-700 weight, medium/tight tracking.
- **Accessibility & Contrast:** Minimum 4.5:1 contrast ratio for body text in both light and dark modes.

---

## 5. Official Brand Palette & CSS Token Architecture

### Primary Palette
- **Primary Brand Blue (`#004564`)**: Main brand color for primary actions, active headers, and focal points.
- **Darkest Blue (`#002D38`)**: Primary text token in light mode, primary background surface in dark mode.
- **Primary Gold Accent (`#A98B56`)**: Primary accent color, active state indicators, and gold button gradients (`#A98B56` to `#BC9B66`).

### CSS Token Mapping (`src/index.css`)

| Semantic Token | Light Theme Value | Dark Theme Value | Usage Description |
| :--- | :--- | :--- | :--- |
| `--bg-primary` | `#F8FAFC` | `#002D38` | Main application canvas background |
| `--bg-secondary` | `#EDF2F7` | `#003649` | Secondary containers, table headers, hover surfaces |
| `--card-bg` | `#FFFFFF` | `#003E51` | Surface for cards, modals, and drawers |
| `--card-hover-bg` | `#F1F5F9` | `#004564` | Row and card hover background |
| `--text-primary` | `#002D38` | `#FFFFFF` | High-contrast main headings and body text |
| `--text-secondary` | `#003649` | `#E2E8F0` | Subtitles, table cell secondary content |
| `--text-muted` | `#005472` | `#94A3B8` | Muted labels, placeholders, timestamps |
| `--border-color` | `#E2E8F0` | `#005472` | Card borders, table dividers, input borders |
| `--primary-gold` | `#A98B56` | `#A98B56` | Primary brand gold accent |

---

## 6. Core Component Library Standards

### Sidebar Navigation
- Premium collapsible navigation with structured section headers (**Core Platform**, **Operations & Insights**, **Preferences**).
- Featuring the Aurrum Gold Sparkle emblem, smooth collapse transitions, active tab left accent line (`#A98B56`), floating tooltips, and bottom user role card.

### Buttons & Interactive Controls
- **Primary Gold Button (`.crm-btn-gold`)**: High-contrast gold gradient button (`#A98B56` -> `#BC9B66`) with active scale feedback.
- **Secondary Button (`.crm-btn-secondary`)**: Clean surface button with custom border and brand color text.
- **Form Inputs (`.crm-input`, `.crm-label`)**: Theme-aware input fields with high-contrast text labels and primary gold focus rings.

### Tables & Data Cards
- Standardized `.crm-table` and `.crm-card` styling across Candidate Repository, Pipeline, Invoice Management, and Analytics views.
- Sticky high-contrast table headers, comfortable padding, and standardized status badges (`.crm-badge-gold`, `.crm-badge-success`, `.crm-badge-warning`, `.crm-badge-error`, `.crm-badge-info`).

---

## 7. Security Specifications & Data Invariants
1. **IP-Based Access Restriction:** Managed via `ALLOWED_IPS` environment variable with fail-closed security.
2. **Firestore Security Rules:** Strict rules enforcing authentication and requiring `uploadedBy` UID validation on candidate records.

---

## 8. Operational Context & Technical Architecture
- **Roles & Permissions:** Admin, Team Leader, Recruiter, Client, Developer.
- **Key Modules:** Dashboard, Candidate List (Candidate Management), Candidate Profile Modal, CV Repository, Pipeline, Combined & Bulk Billing Invoices, Analytics, Notifications, System Settings, Activity Logs.
- **AI Infrastructure & Search Architecture:**
  - **AI Engines:** `gemini-2.5-flash` primary model with `gemini-2.0-flash` fallback for automated CV parsing and CV Repository AI Assistant Search.
  - **AI Chat Assistant in CV Repository:**
    - High-performance natural language search engine (`/api/cv/search-ai`).
    - Supports semantic and exact match precision modes.
    - Automatic candidate dataset fallback: If client candidate list is unpopulated, automatically queries active candidates from Firestore via Firebase Admin SDK (`adminDb`).
    - Resilient Rule-Based Search Fallback: If Gemini API credentials are absent or rate-limited, seamless heuristic keyword and multi-term filter returns candidate matches with structured Markdown summaries.
- **Production Deployment:** Single bundled CommonJS server (`dist/server.cjs`) served via Express on Port `3000` (Host `0.0.0.0`).

