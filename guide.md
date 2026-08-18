# Aurrum CRM - Platform Documentation & Feature Guide

## Overview
Aurrum CRM & Talent Insights platform is an enterprise-grade recruiting and candidate pipeline management solution built with React, Vite, Tailwind CSS, Express, and Firebase Firestore.

## Key Features & Capabilities

### 1. Global CRM Loading Experience
- Shows an immediate global initialization overlay on startup.
- Tracks 5 critical initialization streams in parallel:
  1. User Authentication & RBAC permissions
  2. Candidate Talent Database & Index
  3. Team Directory & Roles
  4. Global System Settings & Limits
  5. Real-time Notifications & Alerts
- Smoothly hides once ready without flashing or blank states.

### 2. Developer-Only Missing Details & Resume Re-Extraction
- Available exclusively to users with the **Developer** role.
- Highlights candidate profiles missing critical fields (Name, Email, Work Experience, Skills, Professional Summary).
- **Batch Reparse ("Reparse All Missing")**: Concurrent worker queue processing with real-time progress indicators (Queued → Processing → Completed/Failed).
- **Individual Re-Extract ("Re-Extract" / "Reparse Resume")**: One-click re-parsing per candidate using the local heuristic & Gemini parsing pipeline, updating records and automatically removing them from the Missing Details list upon completion.

### 3. Role-Based Access Control (RBAC)
- **Admin**: Full system management, team hub, user invitations, archiving, and system settings.
- **Team Leader / Recruiter**: Candidate pipelines, interview tracking, follow-up scheduling, and client assignment.
- **Client**: Secure client portal view of shortlisted candidates and pipeline progress.
- **Developer**: Database metrics, audit logs, backup/export tools, and missing details re-parsing.

### 4. Unified Light & Dark Theme Architecture
- Variable-driven semantic theming ensuring seamless light and dark mode parity using the official brand blue (`#004564`) and primary gold (`#A98B56`) palettes.
