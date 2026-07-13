# Custom Agent Instructions (AGENTS.md)

This file contains the persistent custom instructions, architectural guidelines, and system specifications for the **Talent Insights / Aurrum CRM** platform. Google AI Studio agents MUST load, respect, and adhere strictly to these rules during all development and modification sessions.

---

## 🎨 Visual Identity & Core UX Guidelines

1. **Project Name & Context**:
   - Standard Name: **Talent Insights / Aurrum CRM**
   - Purpose: Professional CRM for CV repository management, bulk resume uploading, analytics reporting, and internal team collaboration.

2. **Core UI Features**:
   - **Timezone Widget:** Accessible on the main dashboard for coordinates tracking of candidate/client timezones.
   - **Advanced Dual-Pagination Table:** Candidates database table MUST support both header and footer pagination. It should offer rows-per-page selections (`20`, `50`, `100`, `200`) and first/last page jumping.
   - **AI Chat Assistant Window Toggles:** The chat assistant MUST support layout customization: full-screen workspace, minimized background dock, or closed state.
   - **Transcript Utilities:** Must include copy conversation transcripts, individual bubble copying, and clicking on candidate matches to highlight profile rows.
   - **Detailed Upload Timestamps:** The "Uploaded" column in the candidates table MUST show exact dates and local times of the resume ingestion.

3. **Theme & Styling**:
   - Respect the **Theme Toggle** supporting comfortable Light and Dark mode variations.
   - Use Tailwind CSS utility classes exclusively. Avoid custom `.css` files unless overriding existing Tailwind layers.

---

## 🔒 Security Specifications & Data Invariants

1. **IP-Based Whitelist Gatekeeper**:
   - Renders a blocked screen (`AccessDenied.tsx`) if the client IP is unauthorized.
   - Controlled via the `ALLOWED_IPS` environment variable (comma-separated). Default fallback IPs if undefined: `223.236.122.154` and `103.240.204.183`.
   - **Local loopbacks** (`localhost`, `127.0.0.1`) are exempted automatically during development.
   - Fail-closed logic: The system blocks access if the verification server has a cold-start timeout or fails.

2. **Firestore Security Invariants**:
   - `candidates` documents MUST have an `uploadedBy` UID matching the creating user (or team/role authorization).
   - `direct_messages` documents MUST include the authenticated user's UID in the `participants` list.
   - `users` collections can be read by authenticated users, but the `role` field MUST only be editable by Admins.
   - All Firestore transactions MUST comply with `firestore.rules` and the security pillars defined in `firebase-blueprint.json`.

---

## 🛠️ Backend Services & AI Architecture

1. **AI Waterfall Parsing Pattern**:
   - **Primary Model:** `gemini-3.5-flash` via the `@google/genai` SDK for resume parsing and chat queries.
   - **Secondary Fallback Model:** `gemini-3.1-flash-lite` if the primary model encounters rate limiting (`RESOURCE_EXHAUSTED` / 429 quota errors).
   - **Offline/Rule-Based Fallback:** If all AI models are rate-limited or unavailable, fall back gracefully to local heuristic regex parsing (such as `localParser.ts`) or offline matching instead of failing completely.
   - **Security constraint:** Gemini API keys must remain strictly on the backend (`server.ts` or server services), never exposed to client-side pages.

2. **Node Server & Production Build**:
   - Dev Command: `tsx server.ts`
   - Build Command: `vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`
   - Start Command: `node dist/server.cjs`
   - Port Binding: Always bind the server to port `3000` and host `0.0.0.0`.

---

## 📚 General Coding Guidelines

- **lucide-react** is the only approved icon library. Do not import or create custom SVG elements.
- **react-markdown** MUST be wrapped in a styling container (e.g., `<div className="markdown-body">`) rather than passing custom `className` props to the ReactMarkdown element itself.
- **Activity Timeline Logging:** Logging must include detailed context (Username, Role, Initials/Avatar, Action, Module, Purpose description, Before/After fields, Date & Time, Client IP, and Browser/Device Agent metadata).
