# Talent Insights / Aurrum CRM - Platform Documentation & Feature Guide

## Overview
Talent Insights / Aurrum CRM is an enterprise-grade recruiting, candidate pipeline management, and AI-powered talent intelligence platform built with React, Vite, Tailwind CSS, Express, and Firebase Firestore (`aurrum-production`). It features robust serverless Firebase Admin initialization, secure file upload verification, AI-driven resume parsing (Gemini AI waterfall parser), and comprehensive Role-Based Access Control (RBAC).

---

## Key Features & Capabilities

### 1. Robust Resume Upload, Validation & AI Parsing Pipeline
- **Multi-Format Support**: Securely processes PDF, DOCX, and DOC files via drag-and-drop or file picker.
- **Data URI & URL Ingestion**: Supports direct data URIs, secure external URLs (Cloud Storage, AWS S3, GitHub, WordPress webhooks), and robust fallback buffer handlers.
- **AI Waterfall Parser**: Integrates Gemini AI (`gemini-3.5-flash`) with advanced heuristic fallback and self-healing extraction for names, emails, phones, skills, work history, education, and certifications.
- **Duplicate Prevention & Retry Queues**: Automatically detects duplicates by email, phone, or LinkedIn URL, and manages failed parses cleanly in the `resume_import_queue` with retry logic.

### 2. Centralized Firebase Admin & Serverless Resilience
- **Singleton Admin Initialization**: Centralized `/src/services/firebaseAdmin.ts` module ensures Firebase Admin and Firestore are initialized exactly once, supporting both local development and Vercel/Cloud Run serverless production without proxy or credential errors.
- **Target Database Binding**: Explicitly binds to the `aurrum-production` Firestore database instance across API routes, background workers, and NODE-CRON pollers.

### 3. Developer-Only Missing Details & Resume Re-Extraction
- Available exclusively to users with the **Developer** role.
- Identifies and highlights candidate profiles missing critical fields (Name, Email, Work Experience, Skills, Professional Summary).
- **Batch Reparse ("Reparse All Missing")**: Concurrent worker queue processing with real-time progress indicators.
- **Individual Re-Extract ("Re-Extract" / "Reparse Resume")**: One-click re-parsing per candidate using the local heuristic & Gemini parsing pipeline.

### 4. Role-Based Access Control (RBAC) & Security
- **Roles**: Admin, Team Leader, Recruiter, Client, Developer.
- **Security**: IP whitelist enforcement (`ALLOWED_IPS`), Firestore security rules (`firestore.rules`), and audit logging across all candidate actions.

### 5. Unified Light & Dark Theme Architecture
- Variable-driven semantic theming ensuring seamless light and dark mode parity using the official brand blue (`#004564`) and primary gold (`#A98B56`) palettes with Poppins typography.


