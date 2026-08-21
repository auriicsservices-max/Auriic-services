# Rectech CRM - Platform Documentation & Feature Guide

## Overview
Rectech CRM is an enterprise-grade recruiting and candidate pipeline management platform built with React, Vite, Tailwind CSS, Express, and Firebase Firestore (Updated for Rectech brand consistency, parallel data loading, and robust serverless Firebase Admin architecture).

## Key Features & Capabilities

### 1. Website Leads → Parse Resume & Automated Candidate Sync
- **WordPress Integration**: Automatically syncs website leads and resume submissions from the WordPress API (`aurrum.co/wp-json/aurrum/v1/crm-leads`).
- **Resume Lead Cards**: Displays resume file names, secure download links, file types, and real-time parsing statuses (*Not Parsed*, *Parsing...*, *Parsed*, *Failed (Queued for Retry)*).
- **One-Click Parse Resume**: Securely fetches resume buffers, extracts raw text, processes files through the Gemini AI resume parser (with heuristic fallback), and validates quality scores.
- **Deduplication & Candidate Creation**: Automatically creates or updates candidate records in Firestore with complete structured JSON data (contact info, work history, education, skills, projects, certifications) while preventing duplicate entries by email and resume URL.
- **Instant UI Refresh**: Automatically updates the Candidate List and AI CV Finder immediately upon successful parsing.

### 2. Centralized Firebase Admin & Serverless Resilience
- **Singleton Admin Initialization**: Centralized `/src/services/firebaseAdmin.ts` module ensures Firebase Admin and Firestore are initialized exactly once, supporting both local development and Vercel/Cloud Run serverless production.
- **Target Database Binding**: Explicitly binds to the `aurrum-production` Firestore database instance, preventing uninitialized database errors across background queues and API route handlers.

### 3. Developer-Only Missing Details & Resume Re-Extraction
- Available exclusively to users with the **Developer** role.
- Identifies and highlights candidate profiles missing critical fields (Name, Email, Work Experience, Skills, Professional Summary).
- **Batch Reparse ("Reparse All Missing")**: Concurrent worker queue processing with real-time progress indicators (Queued → Processing → Completed/Failed).
- **Individual Re-Extract ("Re-Extract" / "Reparse Resume")**: One-click re-parsing per candidate using the local heuristic & Gemini parsing pipeline.

### 4. Role-Based Access Control (RBAC)
- **Admin**: Full system management, team hub, user invitations, archiving, and system settings.
- **Team Leader / Recruiter**: Candidate pipelines, interview tracking, follow-up scheduling, and client assignment.
- **Client**: Secure client portal view of shortlisted candidates and pipeline progress.
- **Developer**: Database metrics, audit logs, backup/export tools, and missing details re-parsing.

### 5. Unified Light & Dark Theme Architecture
- Variable-driven semantic theming ensuring seamless light and dark mode parity using the official brand blue (`#004564`) and primary gold (`#A98B56`) palettes.

