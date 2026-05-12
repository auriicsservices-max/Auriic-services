# Talent Insights: CV Analytics & Talent Management Dashboard

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
*Generated Documentation for Talent Insights Platform*
