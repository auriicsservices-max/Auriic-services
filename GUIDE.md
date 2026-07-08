# Talent Insights: CV Analytics & Talent Management Dashboard
Last Updated: 2026-07-08

Welcome to the Talent Insights / Aurrum CRM! This comprehensive guide covers both the user-facing workflow instructions and the technical system specifications.

---

## 🚀 Latest Updates (June/July 2026)
- **Advanced AI Chat Assistant with Window Customizations:** Built an integrated Gemini 2.5 Flash chatbot with full chat history tracking, designed to parse, query, and extract CV data.
  - **Fullscreen & Minimize Window States:** Includes interactive workspace customization toggles to run the chat assistant in full-screen mode, minimize it into a persistent background dock, or close it cleanly.
  - **Dynamic Search Precision (Semantic vs. Exact):** Enabled quick-toggle filters allowing recruiters to choose between **Semantic Search** (conceptual synonyms) and **Exact Match** (strict keyword requirement for skills and experience).
  - **Copy Transcript & Individual Message Copying:** Added instant clipboard utilities to export the full conversation transcript or copy specific candidate quick cards.
  - **Interactive Match Clicking:** Outputs structured markdown assessments with quick highlights and interactive candidate selection chips that immediately focus/highlight the matched candidate profiles.
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
- **Quick Theme Toggle:** Switch between Light and Dark mode for comfortable viewing.

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
- **Intelligent CV Parsing:** Uses a robust AI waterfall logic (Gemini -> Claude -> ChatGPT) to extract candidate data (experience, skills, education) in structured JSON format, ensuring high availability.
- **AI Chat Assistant:** Query, parse, rank, and extract resumes directly via natural language using Gemini 2.5 Flash. Features customizable window layouts (Fullscreen workspace, Minimized status dock, Semantic/Exact matching switches, and instant export/copy utilities).
- **Analytics Dashboard:** Visualizes talent distribution, skill trends, and team activity using interactive charts.
- **Talent Management:** Features include shortlisting candidates, updating statuses, and tracking recruiter activities.
- **Multi-Region Coordination:** Beautifully designed timezone widget for real-time tracking and switching between major recruitment hubs (e.g., London BST, Mumbai IST).
- **Proactive Notification System:** Enhanced alerting with "Mark as Read" tracking for team-wide coordination. Notifications follow a standardized format for instant clarity, secured by hardened Firestore rules.
- **Hierarchical Access Control:** Robust role-based permissions allowing Admins and Team Leaders to oversee portfolios while protecting data integrity.
- **Secure Data Handling:** Firestore-backed storage with hardened security rules (ABAC model) for data privacy.

## Technical Stack
- **Frontend:** React 18+, Vite, Tailwind CSS, Recharts for visualizations, React Select for advanced filtering, React-Markdown for AI chat responses.
- **Backend/Services:** Express (server.ts) for API handling, Firebase Firestore (NoSQL) for structured data storage, Firebase Authentication for user access.
- **AI Integration:** Waterfall AI approach utilizing Google Gemini, Anthropic Claude, and OpenAI APIs for resilient resume text parsing, and Google Gemini API for deep chat search and conversational CV evaluation.

## Project Structure
- `/src/components`: Reusable UI components (Analytics charts, modals, data cards).
- `/src/services`: API service logic and parsing services (including robust Gemini parsing with retry logic).
- `/src/lib`: Core utilities (Firebase setup, local CSV/PDF parsing, logging, notifications).
- `/src/contexts`: Shared state management (Auth, Timezone tracking, and Real-time Notification systems).

## Development & Configuration
- **Environment Variables:** Required keys (Gemini API, OpenAI API, Anthropic API, Firebase config) are documented in `.env.example`.
- **Firebase Security:** Follows the "Eight Pillars" of hardened Firestore security. Security definitions are mapped in `firebase-blueprint.json` and implemented in `firestore.rules`.
- **Robustness:** Parsing services incorporate exponential backoff retry logic and provider fallback mechanisms to ensure data extraction reliability.

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
