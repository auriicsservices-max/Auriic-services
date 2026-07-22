# Talent Insights / Aurrum CRM - Enterprise Design System

This file contains the persistent instructions, architectural guidelines, and the **Enterprise Design System** for the **Talent Insights / Aurrum CRM** platform. Google AI Studio agents MUST load, respect, and adhere strictly to these rules during all development and modification sessions.

---

## 🎨 Enterprise UI Design System

### 1. Typography (Font: Poppins)
- **Hierarchy**:
  - **Display (Heading 1-3)**: Poppins, 700-800 weight, tight tracking.
  - **Body (Large/Regular/Small)**: Poppins, 400-500 weight, optimal line-height for readability.
  - **UI/Labels/Buttons**: Poppins, 500-600 weight, high legibility.
- **Rules**:
  - Never use opacity for text. Use solid brand-palette colors for all text hierarchies.
  - Body text must meet WCAG AA (4.5:1).
  - Headings/Large text must meet WCAG AA (3:1).

### 2. Brand Palette & Color Tokens
- **Blues (Primary)**: `#005472` (dark-blue), `#004564` (primary-blue), `#003649` (dark-blue-3), `#002D38` (darkest-blue), `#003E51` (dark-blue-2).
- **Golds (Accent)**: `#BC9B66` (gold-light), `#A98B56` (primary-gold), `#9B7E50` (gold-medium), `#8C6E42` (dark-gold), `#A08151` (gold-dark).
- **Status**: Success `#22C55E`, Warning `#F59E0B`, Error `#EF4444`, Info `#3B82F6`.
- **Text Tokens**:
  - `--text-primary`: Darkest Blue (Light) / White (Dark).
  - `--text-secondary`: Dark Blue 3 (Light) / Mid-tone Blue (Dark).
  - `--text-muted`: Dark Blue (Light) / Light Blue (Dark).

### 3. Core Component Rules
- **Sidebar**: Premium, fixed-width, collapsible. Primary-blue (Light) / Darkest-blue (Dark).
- **Cards/Modals**: Subtle elevation shadows, solid background, crisp borders.
- **Inputs/Forms**: Clearly defined borders, solid backgrounds, high-contrast labels.
- **Buttons**: Gold gradient (`#A98B56` -> `#BC9B66`), clear hover/focus states, distinct hierarchy.
- **Tables**: Clean header/row contrast, clear status badges (tinted background + solid text).

---

## 🔒 Security Specifications & Data Invariants

1. **IP-Based Whitelist**: Controlled via `ALLOWED_IPS`. Fail-closed.
2. **Firestore Rules**: Strict adherence to `firestore.rules` and `firebase-blueprint.json`. `uploadedBy` UID validation is required for candidate records.

---

## 🛠️ Backend Services & AI Architecture

1. **AI Waterfall Parsing**:
   - Primary: `gemini-3.5-flash`.
   - Fallback: `gemini-3.1-flash-lite` -> Heuristic/Regex local parsing.
2. **Node Server & Build**:
   - Dev: `tsx server.ts`
   - Build: `vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`
   - Start: `node dist/server.cjs` (Port: 3000, Host: 0.0.0.0).

---

## 📚 Operational Context

- **Roles & Permissions**: Admin, Team Leader, Recruiter.
- **Key Modules**: Dashboard, Candidate Management, Shortlists, Bulk Upload, Internal Chat, Analytics & Reporting, System Settings.
- **Activity Log**: Audit tool tracking User, Module, Action, Status, IP, Browser, etc.
