# Rectech CRM - Platform Documentation & Feature Guide

## Overview
Rectech CRM is an enterprise-grade recruiting and candidate pipeline management platform built with React, Vite, Tailwind CSS, Express, and Firebase Firestore (Updated for Rectech brand consistency and parallel data loading).

## Key Features & Capabilities

### 1. Rectech Branding & Global Loading Experience
- Consistent Rectech visual branding across the platform, headers, login, and initialization screens.
- Robust global CRM initialization overlay tracking 5 critical data streams in parallel (Auth & RBAC, Candidates & Index, Team Directory, System Settings, and Notifications).
- Seamless Dashboard loading skeletons preventing layout jumps or content flashing before all required critical data is ready.

### 2. Developer-Only Missing Details & Resume Re-Extraction
- Available exclusively to users with the **Developer** role.
- Identifies and highlights candidate profiles missing critical fields (Name, Email, Work Experience, Skills, Professional Summary).
- **Batch Reparse ("Reparse All Missing")**: Concurrent worker queue processing with real-time progress indicators (Queued → Processing → Completed/Failed).
- **Individual Re-Extract ("Re-Extract" / "Reparse Resume")**: One-click re-parsing per candidate using the local heuristic & Gemini parsing pipeline, updating records and automatically removing them from the Missing Details list upon completion.

### 3. Role-Based Access Control (RBAC)
- **Admin**: Full system management, team hub, user invitations, archiving, and system settings.
- **Team Leader / Recruiter**: Candidate pipelines, interview tracking, follow-up scheduling, and client assignment.
- **Client**: Secure client portal view of shortlisted candidates and pipeline progress.
- **Developer**: Database metrics, audit logs, backup/export tools, and missing details re-parsing.

### 4. Unified Light & Dark Theme Architecture
- Variable-driven semantic theming ensuring seamless light and dark mode parity using the official brand blue (`#004564`) and primary gold (`#A98B56`) palettes.
