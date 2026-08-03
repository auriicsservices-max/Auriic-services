# Aurrum CRM / Talent Insights - Deployment & User Guide

Welcome to **Aurrum CRM**, an enterprise-grade recruitment and talent intelligence platform built with React, TypeScript, Tailwind CSS, Express, and Firebase.

---

## 🚀 Deployment Guide (Vercel & Production)

### 1. Build Configuration on Vercel
When deploying to Vercel, ensure your project settings are configured as follows:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`
- **Start Command**: `npm start`

`vercel.json` and `package.json` are pre-configured to output build artifacts directly into the `dist/` directory with `dist/server.cjs` for full-stack API routing.

### 2. Environment Variables
Configure the following environment variables in your Vercel or hosting project settings:
- `GEMINI_API_KEY`: Server-side API key for AI resume parsing, candidate matching, and Boolean search generation.
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, etc. (if using Firebase authentication/firestore).

---

## 🛠️ Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server (Express + Vite middleware on port 3000):
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
4. Start production server:
   ```bash
   npm start
   ```

---

## 🌟 Key Features
- **AI Resume Parsing**: Drag & drop or upload candidate CVs (PDF/DOCX) for automated structured extraction (skills, experience, education, salary, notice period).
- **Client Pipeline Portal**: Shareable client interview pipelines with feedback ratings and stage management.
- **Talent Insights Dashboard**: Analytics on hiring funnel conversion, skill availability, and experience breakdowns.
- **Advanced Boolean Search**: Natural language to Boolean search query builder powered by Gemini.
- **Enterprise Theme Engine**: Seamless Light and Dark theme parity adhering to Aurrum Brand Palette (`#004564` brand blue and `#A98B56` gold accent).
