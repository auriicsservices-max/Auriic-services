# Talent Insights: CV Analytics & Talent Management Dashboard
Last Updated: 2026-07-13

Welcome to the Talent Insights / Aurrum CRM! This comprehensive guide covers both the user-facing workflow instructions and the technical system specifications.

---

## 🚀 Latest Updates (June/July 2026)
- **Brand Color Theme System:** Rebuilt the entire light and dark theme from the ground up around the platform's brand palette — Blue (`#005472`/`#004564`/`#003649`/`#002D38`/`#003E51`, primary `#004564`) and Gold (`#BC9B66`/`#A98B56`/`#9B7E50`/`#8C6E42`/`#A08151`, primary `#A98B56`). Implemented as a centralized set of CSS custom properties (`talent-insights-theme.css`) with a matching Tailwind config extension, so header, sidebar, tables, badges, buttons, and notifications all re-theme instantly when the Quick Theme Toggle switches `data-theme`.
- **Google AI Studio System Instructions:** Published a dedicated system-instructions reference (`google-ai-studio-system-instructions.md`) for configuring the `gemini-3.5-flash` / `gemini-3.1-flash-lite` waterfall in Google AI Studio, covering the CV Repository chat assistant's search-mode behavior, structured JSON output for resume parsing, and data-privacy guardrails for candidate ranking.
- **Advanced AI Waterfall & Rate-Limit Resilience Pattern:** Implemented a robust multi-tier fallback pipeline for both candidate search queries and resume parsing to seamlessly handle 429 quota and rate-limit errors:
  - **Primary Model:** Runs requests through `gemini-3.5-flash` for state-of-the-art CV analysis and precise semantic matches.
  - **Secondary Fallback Model:** Automatically transitions to `gemini-3.1-flash-lite` if the primary model encounters rate limits (`RESOURCE_EXHAUSTED` / 429 errors).
  - **Offline/Rule-Based Fallback:** Falls back gracefully to local heuristic regex parsing (`localParser.ts`) or search matching (`fallbackFilter`) if all cloud AI models are rate-limited or unavailable, ensuring 100% uptime.
- **Advanced Header & Footer Table Pagination:** Upgraded the candidate database table to feature a streamlined, dual-section (header & footer) pagination interface. Users can dynamically select rows-per-page (20, 50, 100, 200), jump directly to the first page, and transition forward or backward through candidate lists smoothly.
- **Detailed Upload Timestamps:** Upgraded the "Uploaded" candidate column to show exact local dates and times of resume parsing and upload.
- **Personalized Action Notifications:** Rebuilt the notification engine to replace standard "System" messages with rich action metadata attributed directly to the initiating user's name and role (e.g., `Hina Thakkar (Recruiter)`).
- **Comprehensive Timeline Activity Logs:** Built an exhaustive activity log tracking module complete with filter search (Users, Modules, Actions) and standard details. Logs comprehensively capture triggering user details, status metrics (Success, Failed, Warning), purpose parameters, IP addresses, browser/device information, and before/after value states for edits.
- **IP Whitelisting & Access Restriction:** Implemented robust IP-based restriction to ensure the platform is accessible only from specified network locations. Added an `Access Restricted` page for unauthorized requests.
- **Server Stability Improvements:** Enhanced server lifecycle management in Cloud Run by implementing graceful `SIGTERM` handling, ensuring stable service shutdowns during container redeployments.

---

## 📖 User Guide & Operational Manual

### 1. Authentication & Roles
- **Login:** Users sign in seamlessly via Google Authentication.
- **Roles:** The CRM supports various roles such as **Admin**, **Team Leader**, and **Recruiter**.
- **Onboarding:** By default, new users need an invite. Admins must invite or approve a user so they have the proper role before they can interact with the candidate data.

### 2. Dashboard & Timezone Widget
- **Notifications:** Click the bell icon at the top to see updates regarding candidate assignments or system alerts. Notifications display the specific user's name and role (e.g., "Hina Thakkar (Recruiter)") who triggered the action instead of a generic "System" label.
- **Timezone Widget:** Located on the dashboard, it helps you keep track of global team members or candidate timezones when setting up interviews.
- **Quick Theme Toggle:** Switch between Light and Dark mode for comfortable viewing. Both modes now run on the platform's dedicated brand color theme (Blue `#004564` / Gold `#A98B56`), with dark mode independently tuned for contrast rather than a simple color inversion.

### 3. Candidates Management
- **Adding Candidates:** Click on the "Add Candidate" button to open the form.
- **AI-Powered Parsing:** When uploading or creating candidates, the system utilizes advanced AI to automatically analyze resume text into a structured, clean format for consistent data management.
- **Editing / Updating:** Click on any candidate to open their details in the candidate details modal. You can log notes, update their pipeline stage (e.g., Screened, Interviewing, Offered), and keep information fresh.
- **CV Repository & Gemini AI Chat Search Assistant:** Keep candidate resumes stored logically and query, parse, or compare candidate resumes directly using natural language conversations.
  - **Customizable Layouts:** Experience absolute focus using the **Fullscreen workspace** toggle, or keep the assistant active in the background using the **Minimize status dock**.
  - **Dynamic Search Precision:** Toggle between **Semantic** and **Exact Match** modes instantly to filter candidates with perfect compliance.
  - **Instant Export / Clipboard Copy:** Copy the complete conversation transcript or individual candidate summaries with a single click.
- **Enhanced Data Columns:** The **Uploaded** column now clearly tracks the full date and local time of candidate entry rather than just the date.
- **Slick Pagination Controls:** Available on both the **header and footer** of the candidate table. You can customize the page size (20, 50, 100, 200 rows), jump to the first page, or step forward/backwards easily.

### 4. Shortlists
- For high-priority candidates or specific job orders, you can add them to a **Shortlist**.
- Use the **Shortlist** module to group and track particular talents you want to keep separate from the general pool.

### 5. Bulk Upload
- If you have a spreadsheet filled with sourced candidates, you do not need to add them 1-by-1.
- Navigate to the **Bulk Upload** section.
- Upload an Excel (`.xlsx`) or CSV file containing your candidates.
- The system will process and import all candidates at once.
- *Note:* The maximum number of records you can upload at once is restricted to Admin users under **System Settings**.

### 6. Internal Chat & Collaboration
- Use the **Internal Chat** to message team members, discuss specific candidates, and share updates securely within the CRM environment.

### 7. Analytics & Reporting
- Access the **Analytics** view to monitor KPIs.
- Track metrics like placements over time, pipeline velocity, candidate sources, and team performance logically to improve recruitment strategies.

### 8. System Settings & User Management *(Requires Admin or Team Leader permissions)*
- **User Management:** Invite new team members, manage their roles (e.g., elevate a Recruiter to a Team Leader), or suspend access.
- **System Settings:** Configure workspace settings, manage bulk upload limits (Restricted to **Admins only**), and maintain system defaults.
- **Modern Activity Timeline & Log Review:** Accessible via Admin controls, the activity log provides an exhaustive, modern timeline UI.
  - **Granular Details:** Tracks User Name, Role, Initials/Avatar, Action, Module, Candidate Name, Purpose description, Before/After values, Date & Time, IP Address, Device/Browser metadata, and Status (Success/Failed/Warning).
  - **Interactive Filters:** Search by query or filter by User, Module, and Actions to audit compliance securely.
- **Migration Tool:** Provided for administrative scaling, allowing seamless data transition between environments.

---

## 🛠️ Technical Specifications & Architecture

## Overview
A full-stack application designed to parse, analyze, and manage resume data. It provides recruiters and hiring teams with actionable insights through dynamic visualizations.

## Key Features
- **Intelligent CV Parsing:** Uses a robust, multi-tiered AI waterfall logic (primary `gemini-3.5-flash` via `@google/genai` -> fallback `gemini-3.1-flash-lite` -> offline heuristic regex parsing via `localParser.ts`) to extract candidate details in structured JSON format, guaranteeing extreme availability even during global rate limiting or quotas depletion.
- **AI Chat Assistant:** Query, parse, rank, and extract resumes directly via natural language using Google Gemini. Features customizable window layouts (Fullscreen workspace, Minimized status dock, Semantic/Exact matching switches, and instant export/copy utilities), fully backed by a local rule-based heuristic search fallback if cloud API quotas are exhausted.
- **Analytics Dashboard:** Visualizes talent distribution, skill trends, and team activity using interactive charts.
- **Talent Management:** Features include shortlisting candidates, updating statuses, and tracking recruiter activities.
- **Multi-Region Coordination:** Beautifully designed timezone widget for real-time tracking and switching between major recruitment hubs (e.g., London BST, Mumbai IST).
- **Proactive Notification System:** Enhanced alerting with "Mark as Read" tracking for team-wide coordination. Notifications follow a standardized format for instant clarity, secured by hardened Firestore rules.
- **Hierarchical Access Control:** Robust role-based permissions allowing Admins and Team Leaders to oversee portfolios while protecting data integrity.
- **Secure Data Handling:** Firestore-backed storage with hardened security rules (ABAC model) for data privacy.
- **Themeable Brand UI:** Comprehensive light/dark design-token system built on the platform's Blue/Gold brand palette, driving header, sidebar, tables, badges, notifications, and interactive states consistently across every screen.

## Technical Stack
- **Frontend:** React 18+, Vite, Tailwind CSS, Recharts for visualizations, React Select for advanced filtering, React-Markdown for AI chat responses.
- **Theming:** Centralized CSS custom-property design tokens (`talent-insights-theme.css`) for light/dark mode, consumed through a Tailwind config extension (`tailwind.theme.extend.js`) mapping brand, neutral, semantic, and component-level tokens to utility classes.
- **Backend/Services:** Express (server.ts) for API handling, Firebase Firestore (NoSQL) for structured data storage, Firebase Authentication for user access.
- **AI Integration:** Waterfall AI approach utilizing Google Gemini SDK (`@google/genai` with models `gemini-3.5-flash` and `gemini-3.1-flash-lite`), and Anthropic/OpenAI fallback wrappers for resilient resume text parsing and conversational CV evaluation.

## Project Structure
- `/src/components`: Reusable UI components (Analytics charts, modals, data cards).
- `/src/services`: API service logic and parsing services (including robust Gemini parsing with retry logic and multi-tier model fallbacks).
- `/src/lib`: Core utilities (Firebase setup, local CSV/PDF parsing, logging, notifications).
- `/src/contexts`: Shared state management (Auth, Timezone tracking, and Real-time Notification systems).
- `/src/styles/talent-insights-theme.css`: Centralized light/dark design-token definitions (brand Blue/Gold scales, neutrals, semantic colors, component tokens).
- `/docs/google-ai-studio-system-instructions.md`: Reference system-instructions file for configuring the Gemini waterfall in Google AI Studio.

## Development & Configuration
- **Environment Variables:** Required keys (Gemini API, OpenAI API, Anthropic API, Firebase config) are documented in `.env.example`.
- **Firebase Security:** Follows the "Eight Pillars" of hardened Firestore security. Security definitions are mapped in `firebase-blueprint.json` and implemented in `firestore.rules`.
- **Robustness:** Parsing and search assistant services incorporate exponential backoff, robust model waterfall transitions (shifting to `gemini-3.1-flash-lite` on quota errors), and rule-based heuristic filters to ensure high availability and data extraction reliability under all conditions.
- **Theme Tokens:** Import `talent-insights-theme.css` once at the app root; merge `tailwind.theme.extend.js` into `theme.extend` in `tailwind.config.js`. The Quick Theme Toggle sets `data-theme="light" | "dark"` on the root element — no per-component theme logic required.
- **AI Studio Configuration:** Paste the contents of `google-ai-studio-system-instructions.md` into the System Instructions field in Google AI Studio when configuring or testing the `gemini-3.5-flash` / `gemini-3.1-flash-lite` models used by the CV Repository chat assistant and resume parser.

## Deployment
- The project uses a Vite-based build system. 
- Production build: `npm run build`
- Production start: Handled by custom configuration for the serverless environment.

---

## 🔒 Enterprise Security: IP-Based Gatekeeper Protection

A secure, high-performance IP verification gatekeeper has been integrated into both the full-stack server backend (`/api/check-ip`) and the React client startup hook (`App.tsx`). This system restricts CRM loading entirely unless the visitor connects from an authorized subnet.

### 🛠️ Folder & File Architecture
1. **API Server (`/server.ts`)**: Integrates the `/api/check-ip` router using secure proxy headers.
2. **Access Denied Screen (`/src/components/AccessDenied.tsx`)**: Renders a highly polished visual interface for blocked connections, equipped with a diagnostic output, administrators request details, and a quick re-verify action.
3. **Core Entry controller (`/src/App.tsx`)**: Integrates the startup blocking query which prevents unauthorized nodes from mounting the application trees.

---

### 💻 Environment Variables Configuration

To modify or deploy the allowlist programmatically, register the following key in your deployment environment or locally in `.env`:

```env
# Comma-separated list of premium IP addresses authorized to view the system.
ALLOWED_IPS=223.236.122.154,103.240.204.183
```

- **Live Fallbacks:** If `ALLOWED_IPS` is undefined, the Gatekeeper automatically configures access restrictions using the standard defaults: `223.236.122.154` and `103.240.204.183`.
- **Local Dev Loopback Exception:** For seamless testing, connections originating from `127.0.0.1` and `localhost` are permitted automatically during local development.

---

### 🚀 Vercel Deployment Instructions

1. **Upload project code** to your linked GitHub repository.
2. Go to your **Vercel Dashboard** and select **Project Settings** -> **Environment Variables**.
3. Create a new variable:
   - **Key:** `ALLOWED_IPS`
   - **Value:** `223.236.122.154,103.240.204.183` (or your chosen list, separated by commas).
4. Click **Add** to submit.
5. Trigger a deployment by pushing code or clicking **Redeploy** on Vercel to load the new config.
6. Once deployed, any external client with a non-whitelisted IP address will receive an HTTP 403 Forbidden with a beautiful Access Denied security screen.

---

### 🛡️ Production Security Recommendations

* **Load Balancer Proxy Trust:** Vercel utilizes an automated reverse-proxy schema. The router is pre-configured to read `x-forwarded-for` and `x-real-ip` which Vercel populates safely. Do not trust generic `req.ip` if you are using custom middleware over-rides.
* **Fail-Closed Architecture:** The React launcher implements a strict fail-closed state. If the `/api/check-ip` endpoint experiences any database or serverless cold-start timeout, the user is kept blocked until a healthy response confirms authorized network credentials.

---

## 🎨 Theme System: Brand Color Tokens (Light & Dark)

A centralized design-token theme has been implemented across the full CRM, replacing ad-hoc component colors with a single source of truth built on the platform's brand palette: Blue (primary `#004564`, full scale `#005472`/`#004564`/`#003649`/`#002D38`/`#003E51`) and Gold (primary `#A98B56`, full scale `#BC9B66`/`#A98B56`/`#9B7E50`/`#8C6E42`/`#A08151`). Header, sidebar, tables, role badges, notifications, and buttons all consume the same tokens, so switching modes re-themes the entire app instantly with zero per-component logic.

### 🛠️ Folder & File Architecture
1. **Design Tokens (`/src/styles/talent-insights-theme.css`)**: Defines all CSS custom properties for `:root` / `[data-theme="light"]` and `[data-theme="dark"]` — brand scales, neutrals, semantic colors (success/warning/danger/info), surfaces, text, borders, interactive states, and component-level tokens (table, badges, notifications).
2. **Tailwind Mapping (`/tailwind.theme.extend.js`)**: Extends `theme.extend.colors` so utility classes (`bg-primary`, `bg-brand-gold-500`, `text-text-primary`, `bg-surface`) resolve to the CSS variables automatically.
3. **Quick Theme Toggle (existing, Dashboard)**: Now simply sets `data-theme="light" | "dark"` on the root element — the token system handles the rest.

---

### 💻 Environment Variables Configuration

No environment variables are required for theming — tokens are static CSS values checked into `talent-insights-theme.css`. If a future requirement calls for tenant-specific branding, the recommended pattern is to override individual `--brand-*` custom properties per-tenant at runtime rather than introducing new env vars.

---

### 🛡️ Production Design Recommendations

* **Dark mode is independently tuned, not inverted.** Raw `#004564`/`#A98B56` values are too close to the dark background to clear WCAG AA on their own, so dark-mode variants lighten both brand hues specifically for contrast.
* **Single point of change.** Semantic colors (success/warning/danger/info) are centralized as `--color-*` tokens; update them once in `talent-insights-theme.css` rather than hunting through components.
* **Recheck contrast after wiring into real components** — token-level contrast was validated at a glance, but exact pairings depend on final font sizes and weights.

---
*Generated Documentation for Talent Insights Platform*