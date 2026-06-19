# Talent Insights: CV Analytics & Talent Management Dashboard

## 🚀 Latest Updates (June 2026)
- **IP Whitelisting & Access Restriction:** Implemented robust IP-based restriction to ensure the platform is accessible only from specified network locations. Added an `Access Restricted` page for unauthorized requests.
- **Server Stability Improvements:** Enhanced server lifecycle management in Cloud Run by implementing graceful `SIGTERM` handling, ensuring stable service shutdowns during container redeployments.

## Overview
A full-stack application designed to parse, analyze, and manage resume data. It provides recruiters and hiring teams with actionable insights through dynamic visualizations.

## Key Features
- **Intelligent CV Parsing:** Uses AI to extract candidate data (experience, skills, education) in structured JSON format.
- **Analytics Dashboard:** Visualizes talent distribution, skill trends, and team activity using interactive charts.
- **Talent Management:** Features include shortlisting candidates, updating statuses, and tracking recruiter activities.
- **Multi-Region Coordination:** Beautifully designed timezone widget for real-time tracking and switching between major recruitment hubs (e.g., London BST, Mumbai IST).
- **Proactive Notification System:** Enhanced alerting with "Mark as Read" tracking for team-wide coordination. Notifications follow a standardized format for instant clarity.
- **Hierarchical Access Control:** Robust role-based permissions allowing Admins and Team Leaders to oversee portfolios while protecting data integrity.
- **Secure Data Handling:** Firestore-backed storage with hardened security rules (ABAC model) for data privacy.

## Technical Stack
- **Frontend:** React 18+, Vite, Tailwind CSS, Recharts for visualizations, React Select for advanced filtering.
- **Backend/Services:** Express (server.ts) for API handling, Firebase Firestore (NoSQL) for structured data storage, Firebase Authentication for user access.
- **AI Integration:** Google Gemini API (`@google/genai` SDK) for intelligent, robust parsing of resume text.

## Project Structure
- `/src/components`: Reusable UI components (Analytics charts, modals, data cards).
- `/src/services`: API service logic and parsing services (including robust Gemini parsing with retry logic).
- `/src/lib`: Core utilities (Firebase setup, local CSV/PDF parsing, logging, notifications).
- `/src/contexts`: Shared state management (Auth, Timezone tracking, and Real-time Notification systems).

## Development & Configuration
- **Environment Variables:** Required keys (Gemini API, Firebase config) are documented in `.env.example`.
- **Firebase Security:** Follows the "Eight Pillars" of hardened Firestore security. Security definitions are mapped in `firebase-blueprint.json` and implemented in `firestore.rules`.
- **Robustness:** Parsing services incorporate exponential backoff retry logic for API interactions to ensure data extraction reliability.

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
*Generated Documentation for Talent Insights Platform*
