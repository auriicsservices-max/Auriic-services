import { GoogleGenAI, Type } from "@google/genai";
import { ResumeData, ResumeSchema } from '../types/resume';

export class GeminiResumeParser {
  private getAiClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    try {
      return new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (e) {
      console.warn('[GeminiResumeParser] Failed to initialize GoogleGenAI:', e);
      return null;
    }
  }

  async parseText(text: string): Promise<ResumeData> {
    const ai = this.getAiClient();
    if (!ai || !process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined or invalid');
    }
    const prompt = `
      You are a precise, exhaustive resume/CV parsing engine for the Aurrum CRM talent platform. Your only job is to read the ENTIRE supplied document (all pages of a PDF/image, or the full text) and return a single JSON object that exactly matches the provided response schema. You output only that JSON object — no prose, no markdown, no code fences.

      ## COMPLETENESS IS THE TOP PRIORITY
      The most common failure is returning partial data. Do not do that. You must:

      1. **Read every page.** Resumes are often 2–3 pages. Parse the whole document, not just page one. Skills and projects are frequently on later pages.

      2. **Extract EVERY item in EVERY section — never summarize, merge, shorten, or skip.**
         - If a role has 7 bullet points, "responsibilities" must contain exactly 7 strings.
         - If the CV lists 40 skills, "all_skills" must contain all 40.
         - If there are 4 jobs, "work_experience" must have 4 objects. Same for "projects", "education", "certifications", "languages".
         - One bullet point = one string in the array. Do not combine two bullets into one. Do not drop the "smaller" bullets.

      3. **Keep the wording faithful.** Clean only leading dashes/symbols and extra whitespace. Do not paraphrase a responsibility into a shorter sentence. Preserve the candidate's own phrasing.

      4. **Do not invent.** If a field is genuinely absent, use empty strings ("") or empty arrays ([]) where required by the schema. Never guess an email, date, or company that is not written in the document.

      ## FIELD RULES
      - **Skills:** Map skills into their respective categories (languages, frameworks, databases, tools, libraries, other). Be precise (e.g. Python -> languages, React -> frameworks, PostgreSQL -> databases, Git/Docker -> tools, Lodash/Redux -> libraries). Preserve the candidate's original skills in "skills". Then flatten every skill, de-duplicated and trimmed, into "all_skills" (this is what the CRM searches on).
      - **Dates:** Normalize to "YYYY-MM" when month + year are known ("Jan 2026" -> "2026-01"), "YYYY" when only the year is known, or an empty string when unknown. For a current/ongoing role, set end_date/duration to indicate present status (null / empty string). Treat "Present", "Current", "Now", "Till date", "Ongoing" as current.
      - **Experience total:** Use an explicit figure if stated ("4+ years" -> 4); otherwise estimate from the date ranges; otherwise 0.
      - **Technologies per role/project:** Pull any tools/tech named inside a role's bullets into that role/project's "technologies" array (in addition to keeping the bullet text intact).
      - **Links:** Fill linkedin, github, portfolio, website into their named fields inside "personal_info.links"; extra profile links go in "personal_info.links.other". Keep URLs exactly as written.
      - **Language:** Set "detected_language" (ISO 639-1). Parse non-English CVs the same way; keep original-language values, do not translate.

      ## NEVER FAIL
      Even if the document is messy, low-quality, scanned, or clearly not a resume, always return the full JSON object with every field present. If it is not a resume, set "is_resume" to false, "parsing_confidence" to "low", add a note to "warnings", and leave the rest empty. Never refuse. Never apologize.

      ## CONFIDENCE
      - "high": clearly a resume and you extracted all sections cleanly.
      - "medium": structure partial/ambiguous, or you suspect a section may be incomplete (also add a note to "warnings").
      - "low": barely parseable or not a resume.

      ## SELF-CHECK BEFORE YOU RETURN
      Silently verify: (a) every job/section on every page is represented; (b) no bullet was dropped or merged; (c) "all_skills" covers every skill from every category; (d) all dates normalized; (e) output is valid JSON matching the schema. Only then return the JSON object. Return nothing else.

      CV Raw text to parse:
      ${text}
    `;

    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          is_resume: { type: Type.BOOLEAN, description: "True only if the document is a resume/CV." },
          parsing_confidence: { type: Type.STRING, enum: ["high", "medium", "low"], description: "Model's confidence that the extracted structure is accurate." },
          detected_language: { type: Type.STRING, description: "ISO 639-1 code of the CV's primary language." },
          personal_info: {
            type: Type.OBJECT,
            properties: {
              full_name: { type: Type.STRING, description: "Full display name of the candidate." },
              headline: { type: Type.STRING, description: "Professional title / role under the name." },
              email: { type: Type.STRING, description: "Email address." },
              phone: { type: Type.STRING, description: "Phone number with country code, digits only otherwise." },
              location: {
                type: Type.OBJECT,
                properties: {
                  city: { type: Type.STRING, description: "City." },
                  state: { type: Type.STRING, description: "State or region." },
                  country: { type: Type.STRING, description: "Country." }
                },
                required: ["city", "state", "country"]
              },
              links: {
                type: Type.OBJECT,
                properties: {
                  linkedin: { type: Type.STRING, description: "LinkedIn profile URL." },
                  github: { type: Type.STRING, description: "GitHub URL." },
                  portfolio: { type: Type.STRING, description: "Portfolio/Website URL." },
                  website: { type: Type.STRING, description: "Website URL." },
                  other: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Other social links or pages." }
                },
                required: ["linkedin", "github", "portfolio", "website", "other"]
              }
            },
            required: ["full_name", "headline", "email", "phone", "location", "links"]
          },
          professional_summary: { type: Type.STRING, description: "Cohesive summary of their professional background." },
          total_experience_years: { type: Type.NUMBER, description: "Best estimate of total years of professional experience." },
          skills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, description: "Category label (Languages, Frontend, etc.)" },
                items: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific skills in this category" }
              },
              required: ["category", "items"]
            },
            description: "Skills grouped under their original resume categories."
          },
          all_skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Flat, de-duplicated list of all skills." },
          work_experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                job_title: { type: Type.STRING, description: "Job title" },
                company: { type: Type.STRING, description: "Company name" },
                location: { type: Type.STRING, description: "Location" },
                start_date: { type: Type.STRING, description: "Normalize to YYYY-MM or YYYY" },
                end_date: { type: Type.STRING, description: "Normalize to YYYY-MM or YYYY" },
                is_current: { type: Type.BOOLEAN, description: "Is this their current role?" },
                responsibilities: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed, bulleted descriptions" },
                technologies: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tech/tools mentioned in this role" }
              },
              required: ["job_title", "company", "start_date", "end_date", "is_current", "responsibilities", "technologies"]
            },
            description: "Work history."
          },
          projects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Project name" },
                description: { type: Type.STRING, description: "Project description" },
                technologies: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Technologies used" },
                role: { type: Type.STRING, description: "Role on the project" },
                live_url: { type: Type.STRING, description: "Project live URL" },
                code_url: { type: Type.STRING, description: "Source code repository URL" }
              },
              required: ["name", "description", "technologies", "live_url", "code_url"]
            },
            description: "Project list."
          },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                degree: { type: Type.STRING, description: "Degree name" },
                field_of_study: { type: Type.STRING, description: "Field of study" },
                institution: { type: Type.STRING, description: "Institution name" },
                location: { type: Type.STRING, description: "Location" },
                start_date: { type: Type.STRING, description: "YYYY or YYYY-MM" },
                end_date: { type: Type.STRING, description: "YYYY or YYYY-MM" },
                grade: { type: Type.STRING, description: "Grade or GPA" }
              },
              required: ["degree", "field_of_study", "institution", "start_date", "end_date"]
            },
            description: "Education history"
          },
          certifications: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Certification name" },
                issuer: { type: Type.STRING, description: "Issuer organization" },
                year: { type: Type.STRING, description: "Year obtained" }
              },
              required: ["name", "issuer", "year"]
            },
            description: "Certifications obtained"
          },
          languages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                language: { type: Type.STRING, description: "Language" },
                proficiency: { type: Type.STRING, description: "Native, Fluent, Professional, etc." }
              },
              required: ["language", "proficiency"]
            },
            description: "Languages spoken"
          },
          awards: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of awards or honors" },
          warnings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Parsing warnings" }
        },
        required: [
          "is_resume", "parsing_confidence", "detected_language", "personal_info",
          "professional_summary", "total_experience_years", "skills", "all_skills",
          "work_experience", "projects", "education", "certifications", "languages",
          "awards", "warnings"
        ]
      }
    };

    try {
      console.log('[GeminiResumeParser] Attempting resume parse with gemini-3.1-pro-preview...');
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config,
      });

      const rawText = response.text || '{}';
      const cleanText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      const data = JSON.parse(cleanText);
      const parsedData = ResumeSchema.parse(data);
      parsedData.rawText = text;
      return parsedData;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
        console.log('[GeminiResumeParser] Gemini API key invalid. Falling back to heuristic parser.');
        throw new Error('Gemini API key invalid');
      }

      console.warn('[GeminiResumeParser] gemini-3.1-pro-preview parsing failed. Error details:', errMsg);
      
      try {
        console.log('[GeminiResumeParser] Retrying resume parse with fallback model: gemini-3.5-flash...');
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config,
        });

        const rawText = response.text || '{}';
        const cleanText = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        const data = JSON.parse(cleanText);
        const parsedData = ResumeSchema.parse(data);
        parsedData.rawText = text;
        return parsedData;
      } catch (fallbackErr: any) {
        console.log('[GeminiResumeParser] Fallback parsing error, using heuristic parser.');
        throw fallbackErr;
      }
    }
  }
}
